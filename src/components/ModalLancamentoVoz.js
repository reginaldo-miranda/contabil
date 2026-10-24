'use client';

import { useState, useEffect } from 'react';
import { useContabil } from '@/context/ContabilContext';
import styles from './ModalLancamentoVoz.module.css';

// Helper para calcular o próximo código analítico sob uma conta pai
function calcularProximoCodigoFilho(codigoPai, todasContas) {
  const filhas = todasContas.filter(c => c.codigo.startsWith(codigoPai + '.'));
  if (filhas.length === 0) {
    return `${codigoPai}.001`;
  }
  let maxNum = 0;
  let padLen = 3;
  filhas.forEach(f => {
    const parts = f.codigo.split('.');
    const last = parts[parts.length - 1];
    const n = parseInt(last, 10);
    if (!isNaN(n)) {
      if (n > maxNum) maxNum = n;
      padLen = Math.max(padLen, last.length);
    }
  });
  const proximo = String(maxNum + 1).padStart(padLen, '0');
  return `${codigoPai}.${proximo}`;
}

export default function ModalLancamentoVoz({ resultado, textoOriginal, onClose, onSucesso }) {
  const { empresaId, refreshData } = useContabil();

  const interpretacao = resultado?.interpretacao || {};
  const [data, setData] = useState(interpretacao.data || new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState(interpretacao.valor ? String(interpretacao.valor) : '');
  const [historico, setHistorico] = useState(interpretacao.historico || '');
  const [documento, setDocumento] = useState(interpretacao.documento || '');

  const [contaDebitoId, setContaDebitoId] = useState(interpretacao.contaDebito?.id ? String(interpretacao.contaDebito.id) : '');
  const [contaCreditoId, setContaCreditoId] = useState(interpretacao.contaCredito?.id ? String(interpretacao.contaCredito.id) : '');

  // Gestão de sugestão de nova conta
  const [sugestao, setSugestao] = useState(interpretacao.sugestao || null);
  const [criarContaAuto, setCriarContaAuto] = useState(interpretacao.sugerirNovaConta || false);
  const [nomeNovaConta, setNomeNovaConta] = useState(interpretacao.sugestao?.nome || '');

  const [contas, setContas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo: 'sucesso' | 'erro', msg: '' }

  // Carregar contas analíticas da empresa para os selects
  useEffect(() => {
    if (!empresaId) return;
    fetch(`/api/contas?empresaId=${empresaId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setContas(data);
        }
      })
      .catch(err => console.error('Erro ao carregar contas:', err));
  }, [empresaId]);

  const analiticas = contas.filter(c => c.tipo === 'A' || c.tipo === 'Analítica');

  const handleSalvar = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const valNum = parseFloat(valor.replace(',', '.'));
    if (isNaN(valNum) || valNum <= 0) {
      setFeedback({ tipo: 'erro', msg: 'Informe um valor válido maior que zero.' });
      return;
    }

    if (!historico.trim()) {
      setFeedback({ tipo: 'erro', msg: 'Informe o histórico do lançamento.' });
      return;
    }

    setSalvando(true);

    try {
      let finalDebitoId = contaDebitoId;
      let finalCreditoId = contaCreditoId;

      // 1. Se o usuário marcou para criar nova conta sugerida
      if (criarContaAuto && sugestao && nomeNovaConta.trim()) {
        const codigoPai = sugestao.contaPaiCodigo || '4.2.2';
        const novoCodigo = calcularProximoCodigoFilho(codigoPai, contas);

        const resNovaConta = await fetch('/api/contas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: novoCodigo,
            nome: nomeNovaConta.trim(),
            empresaId: parseInt(empresaId, 10),
            contaPaiId: sugestao.contaPaiId,
            tipo: 'A',
            grupo: sugestao.grupo || (sugestao.tipoDestino === 'DEBITO' ? 'DESPESA' : 'PASSIVO'),
            natureza: sugestao.tipoDestino === 'DEBITO' ? 'D' : 'C',
          })
        });

        if (!resNovaConta.ok) {
          const errData = await resNovaConta.json();
          throw new Error(errData.erro || 'Falha ao criar nova conta sugerida');
        }

        const novaContaCriada = await resNovaConta.json();

        if (sugestao.tipoDestino === 'DEBITO') {
          finalDebitoId = String(novaContaCriada.id);
        } else {
          finalCreditoId = String(novaContaCriada.id);
        }
      }

      if (!finalDebitoId) {
        setFeedback({ tipo: 'erro', msg: 'Selecione a Conta Débito para continuar.' });
        setSalvando(false);
        return;
      }

      if (!finalCreditoId) {
        setFeedback({ tipo: 'erro', msg: 'Selecione a Conta Crédito para continuar.' });
        setSalvando(false);
        return;
      }

      if (finalDebitoId === finalCreditoId) {
        setFeedback({ tipo: 'erro', msg: 'A Conta Débito e Crédito não podem ser a mesma conta.' });
        setSalvando(false);
        return;
      }

      // 2. Gravar o lançamento contábil
      const payloadLancamento = {
        data: data.includes('T') ? data : `${data}T00:00:00.000Z`,
        valor: valNum,
        historico: historico.trim(),
        documento: documento.trim() || null,
        contaDebitoId: parseInt(finalDebitoId, 10),
        contaCreditoId: parseInt(finalCreditoId, 10),
        empresaId: parseInt(empresaId, 10),
      };

      const resLanc = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadLancamento)
      });

      if (!resLanc.ok) {
        const errData = await resLanc.json();
        throw new Error(errData.erro || 'Falha ao registrar lançamento.');
      }

      setFeedback({ tipo: 'sucesso', msg: 'Lançamento gravado com sucesso!' });
      if (refreshData) await refreshData();
      if (onSucesso) onSucesso();

      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err) {
      console.error(err);
      setFeedback({ tipo: 'erro', msg: err.message || 'Erro ao processar lançamento.' });
      setSalvando(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && !salvando) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.iconOrb}>🎙️</div>
            <div>
              <h2 className={styles.title}>Confirmar Lançamento por Voz</h2>
              <span className={styles.badgeMotor}>
                {resultado?.motor === 'gemini-1.5-flash' ? '✨ Interpretado com IA (Gemini)' : '⚙️ Interpretado por Regras Contábeis'}
              </span>
            </div>
          </div>
          <button type="button" className={styles.btnClose} onClick={onClose} disabled={salvando}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSalvar}>
          <div className={styles.body}>
            {/* O que foi ouvido */}
            <div className={styles.textoOuvidoBox}>
              <div className={styles.textoOuvidoLabel}>
                <span>🗣️ Comando reconhecido:</span>
              </div>
              <div className={styles.textoOuvidoContent}>
                &ldquo;{textoOriginal}&rdquo;
              </div>
            </div>

            {/* Mensagem de Feedback */}
            {feedback && (
              <div className={feedback.tipo === 'sucesso' ? styles.feedbackSucesso : styles.feedbackErro}>
                {feedback.tipo === 'sucesso' ? '✅ ' : '⚠️ '}
                {feedback.msg}
              </div>
            )}

            {/* Sugestão de Criação de Conta (se identificada) */}
            {sugestao && (
              <div className={styles.sugestaoBanner}>
                <span className={styles.sugestaoIcon}>💡</span>
                <div style={{ flex: 1 }}>
                  <div className={styles.sugestaoTexto}>
                    A conta <strong>&ldquo;{sugestao.nome}&rdquo;</strong> não foi encontrada.
                    Sugerimos criá-la sob o grupo <strong>{sugestao.contaPaiCodigo} - {sugestao.contaPaiNome}</strong>.
                  </div>
                  <label className={styles.sugestaoCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={criarContaAuto} 
                      onChange={(e) => setCriarContaAuto(e.target.checked)} 
                    />
                    <span>Criar subconta <strong>{nomeNovaConta}</strong> automaticamente</span>
                  </label>
                  {criarContaAuto && (
                    <div style={{ marginTop: '8px' }}>
                      <input 
                        type="text" 
                        className={styles.input} 
                        style={{ fontSize: '0.85rem', padding: '6px 10px' }}
                        value={nomeNovaConta} 
                        onChange={(e) => setNomeNovaConta(e.target.value)} 
                        placeholder="Nome da nova conta"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Data e Valor */}
            <div className={styles.grid2Col}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Data do Lançamento</label>
                <input 
                  type="date" 
                  required 
                  className={styles.input} 
                  value={data} 
                  onChange={(e) => setData(e.target.value)} 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  className={styles.input} 
                  placeholder="0,00"
                  value={valor} 
                  onChange={(e) => setValor(e.target.value)} 
                />
              </div>
            </div>

            {/* Conta Débito (Destino) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Conta Débito (Destino / Despesa / Fornecedor)</span>
                {interpretacao.contaDebito && (
                  <span style={{ color: 'var(--ativo)', fontSize: '0.75rem', fontWeight: 'normal' }}>
                    ✓ Identificada pela IA
                  </span>
                )}
              </label>
              {criarContaAuto && sugestao?.tipoDestino === 'DEBITO' ? (
                <div style={{ padding: '10px 12px', background: 'rgba(129, 140, 248, 0.1)', borderRadius: '6px', border: '1px dashed var(--accent)', color: 'var(--accent)', fontSize: '0.9rem' }}>
                  ✨ Será criada como: <strong>{nomeNovaConta}</strong> (sob {sugestao.contaPaiCodigo})
                </div>
              ) : (
                <select 
                  className={styles.select} 
                  value={contaDebitoId} 
                  onChange={(e) => setContaDebitoId(e.target.value)}
                  required={!(criarContaAuto && sugestao?.tipoDestino === 'DEBITO')}
                >
                  <option value="">Selecione a conta de débito...</option>
                  {analiticas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nome} {c.reduzido ? `[${c.reduzido}]` : ''} ({c.grupo})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Conta Crédito (Origem) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <span>Conta Crédito (Origem / Caixa / Banco / Cartão)</span>
                {interpretacao.contaCredito && (
                  <span style={{ color: 'var(--receita)', fontSize: '0.75rem', fontWeight: 'normal' }}>
                    ✓ Identificada pela IA
                  </span>
                )}
              </label>
              {criarContaAuto && sugestao?.tipoDestino === 'CREDITO' ? (
                <div style={{ padding: '10px 12px', background: 'rgba(129, 140, 248, 0.1)', borderRadius: '6px', border: '1px dashed var(--accent)', color: 'var(--accent)', fontSize: '0.9rem' }}>
                  ✨ Será criada como: <strong>{nomeNovaConta}</strong> (sob {sugestao.contaPaiCodigo})
                </div>
              ) : (
                <select 
                  className={styles.select} 
                  value={contaCreditoId} 
                  onChange={(e) => setContaCreditoId(e.target.value)}
                  required={!(criarContaAuto && sugestao?.tipoDestino === 'CREDITO')}
                >
                  <option value="">Selecione a conta de crédito...</option>
                  {analiticas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} - {c.nome} {c.reduzido ? `[${c.reduzido}]` : ''} ({c.grupo})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Histórico */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Histórico do Lançamento</label>
              <input 
                type="text" 
                required 
                className={styles.input} 
                value={historico} 
                onChange={(e) => setHistorico(e.target.value)} 
                placeholder="Ex: Pagamento referente a..."
              />
            </div>

            {/* Documento (Opcional) */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Documento / NF (Opcional)</label>
              <input 
                type="text" 
                className={styles.input} 
                value={documento} 
                onChange={(e) => setDocumento(e.target.value)} 
                placeholder="Ex: NF-123, DOC-456..."
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button 
              type="button" 
              className={styles.btnSecundario} 
              onClick={onClose} 
              disabled={salvando}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className={styles.btnPrimario} 
              disabled={salvando}
            >
              {salvando ? 'Gravando...' : '✓ Confirmar e Gravar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
