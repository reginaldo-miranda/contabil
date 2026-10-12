'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { useContabil } from '@/context/ContabilContext';
import styles from './Fiscal.module.css';

const formatarMoeda = (valor) => {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatarPorcentagem = (valor) => {
  return (Number(valor || 0) * 100).toFixed(2) + '%';
};

export default function FiscalPage() {
  const { empresaId, refreshData } = useContabil();

  // Competência padrão: Mês atual
  const hoje = new Date();
  const mesFormatado = String(hoje.getMonth() + 1).padStart(2, '0');
  const [competencia, setCompetencia] = useState(`${hoje.getFullYear()}-${mesFormatado}`);
  const [anexo, setAnexo] = useState('ANEXO_I');
  const [abaAtiva, setAbaAtiva] = useState('upload'); // 'upload' | 'notas' | 'apuracao' | 'integracao'

  // Estados de Upload
  const [arquivosSelecionados, setArquivosSelecionados] = useState([]);
  const [uploadando, setUploadando] = useState(false);
  const [statusProgresso, setStatusProgresso] = useState('');
  const [resultadoUpload, setResultadoUpload] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Estados de Dados Fiscais
  const [notas, setNotas] = useState([]);
  const [carregandoNotas, setCarregandoNotas] = useState(false);
  const [buscaNota, setBuscaNota] = useState('');
  const [notaExpandidaId, setNotaExpandidaId] = useState(null);

  // Estados de Apuração
  const [apuracao, setApuracao] = useState(null);
  const [carregandoApuracao, setCarregandoApuracao] = useState(false);

  // Estados de Integração Contábil
  const [previewIntegracao, setPreviewIntegracao] = useState(null);
  const [carregandoPreview, setCarregandoPreview] = useState(false);
  const [integrando, setIntegrando] = useState(false);
  const [contasDisponiveis, setContasDisponiveis] = useState([]);
  const [contaDebitoVendaPadrao, setContaDebitoVendaPadrao] = useState('');
  const [contaCreditoVendaPadrao, setContaCreditoVendaPadrao] = useState('');
  const [contaDebitoImpostoPadrao, setContaDebitoImpostoPadrao] = useState('');
  const [contaCreditoImpostoPadrao, setContaCreditoImpostoPadrao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');

  // Carrega dados ao trocar empresa, competência, anexo ou aba
  useEffect(() => {
    if (empresaId) {
      carregarNotas();
      carregarDadosApuracao();
      if (abaAtiva === 'integracao') {
        handleCarregarPreviewIntegracao();
      }
    }
  }, [empresaId, competencia, anexo, abaAtiva]);

  const carregarNotas = async () => {
    if (!empresaId) return;
    try {
      setCarregandoNotas(true);
      const res = await fetch(`/api/fiscal/notas?empresaId=${empresaId}&competencia=${competencia}`);
      if (res.ok) {
        const data = await res.json();
        setNotas(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoNotas(false);
    }
  };

  const carregarDadosApuracao = async () => {
    if (!empresaId) return;
    try {
      setCarregandoApuracao(true);
      const res = await fetch(`/api/fiscal/apuracao?empresaId=${empresaId}&competencia=${competencia}&anexo=${anexo}`);
      if (res.ok) {
        const data = await res.json();
        setApuracao(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoApuracao(false);
    }
  };

  // Processa uma lista de arquivos imediatamente
  const processarArquivos = async (listaArquivos) => {
    if (!listaArquivos || listaArquivos.length === 0) return;
    if (!empresaId) {
      setMensagemErro('Selecione uma empresa ativa antes de importar notas fiscais.');
      return;
    }

    try {
      setUploadando(true);
      setStatusProgresso(`Enviando e auditando ${listaArquivos.length} arquivo(s)...`);
      setMensagemErro('');
      setMensagemSucesso('');

      const formData = new FormData();
      formData.append('empresaId', empresaId);

      listaArquivos.forEach((arq) => {
        formData.append('arquivos', arq);
      });

      const res = await fetch('/api/fiscal/importar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.erro || 'Falha ao processar arquivos');
      }

      setResultadoUpload(data);
      setArquivosSelecionados([]);
      setMensagemSucesso(`✅ Sucesso! ${data.totalNotasLidas} nota(s) importada(s), sendo ${data.itensMonofasicosAuditados} item(ns) com benefício fiscal identificado.`);
      
      // Se detectou a competência da nota importada, atualiza automaticamente a tela para esse mês!
      if (data.competenciaDetectada) {
        setCompetencia(data.competenciaDetectada);
      }

      // Atualiza notas e apuração automaticamente
      await carregarNotas();
      await carregarDadosApuracao();
      setAbaAtiva('apuracao');
    } catch (err) {
      setMensagemErro(err.message);
    } finally {
      setUploadando(false);
      setStatusProgresso('');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setArquivosSelecionados(files);
      processarArquivos(files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setArquivosSelecionados(files);
      processarArquivos(files);
    }
  };

  // Salvar Apuração no Banco
  const handleSalvarApuracao = async () => {
    if (!apuracao?.apuracao || !empresaId) return;
    try {
      const ap = apuracao.apuracao;
      const res = await fetch('/api/fiscal/apuracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: empresaId,
          competencia,
          anexo,
          rbt12: ap.rbt12,
          faturamentoTotal: ap.faturamentoTotal,
          faturamentoMonofasico: ap.faturamentoMonofasico,
          faturamentoSt: ap.faturamentoSt,
          aliquotaNominal: ap.aliquotaNominal,
          parcelaDeduzir: ap.parcelaDeduzir,
          aliquotaEfetiva: ap.aliquotaEfetiva,
          valorDasSemOtimizacao: ap.valorDasSemOtimizacao,
          valorDasFinal: ap.valorDasFinal,
          economiaGerada: ap.economiaGerada,
        }),
      });

      if (res.ok) {
        setMensagemSucesso('Apuração fiscal gravada com sucesso!');
        carregarDadosApuracao();
      }
    } catch (err) {
      setMensagemErro('Erro ao salvar apuração');
    }
  };

  // Gerar Pré-visualização da Integração Contábil
  const handleCarregarPreviewIntegracao = async () => {
    if (!empresaId) return;
    try {
      setCarregandoPreview(true);
      setMensagemErro('');
      const res = await fetch('/api/fiscal/integrar-contabil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: empresaId,
          competencia,
          preview: true,
          contaDebitoVendaId: contaDebitoVendaPadrao || undefined,
          contaCreditoVendaId: contaCreditoVendaPadrao || undefined,
          contaDebitoImpostoId: contaDebitoImpostoPadrao || undefined,
          contaCreditoImpostoId: contaCreditoImpostoPadrao || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);
      setPreviewIntegracao(data);

      if (data.contasDisponiveis) {
        setContasDisponiveis(data.contasDisponiveis);
      }
      if (data.contasSugeridas) {
        if (!contaDebitoVendaPadrao && data.contasSugeridas.debitoVendaId) {
          setContaDebitoVendaPadrao(data.contasSugeridas.debitoVendaId);
        }
        if (!contaCreditoVendaPadrao && data.contasSugeridas.creditoVendaId) {
          setContaCreditoVendaPadrao(data.contasSugeridas.creditoVendaId);
        }
        if (!contaDebitoImpostoPadrao && data.contasSugeridas.debitoImpostoId) {
          setContaDebitoImpostoPadrao(data.contasSugeridas.debitoImpostoId);
        }
        if (!contaCreditoImpostoPadrao && data.contasSugeridas.creditoImpostoId) {
          setContaCreditoImpostoPadrao(data.contasSugeridas.creditoImpostoId);
        }
      }
    } catch (err) {
      setMensagemErro('Erro ao carregar prévia: ' + err.message);
    } finally {
      setCarregandoPreview(false);
    }
  };

  // Altera conta individual de uma linha na tabela
  const handleAlterarContaLinha = (index, campo, novoId) => {
    if (!previewIntegracao?.lancamentos) return;
    const contaIdNum = Number(novoId) || null;
    const novosLancamentos = [...previewIntegracao.lancamentos];
    const contaObj = contasDisponiveis.find((c) => c.id === contaIdNum);
    novosLancamentos[index] = {
      ...novosLancamentos[index],
      [campo]: contaIdNum,
      [campo === 'contaDebitoId' ? 'contaDebitoNome' : 'contaCreditoNome']: contaObj ? `${contaObj.codigo} - ${contaObj.nome}` : 'Conta não selecionada'
    };
    setPreviewIntegracao({
      ...previewIntegracao,
      lancamentos: novosLancamentos
    });
  };

  // Altera conta padrão global e replica para todas as linhas correspondentes
  const handleMudarContaPadrao = (tipo, novoId) => {
    const contaIdNum = Number(novoId) || null;
    const contaObj = contasDisponiveis.find((c) => c.id === contaIdNum);

    if (tipo === 'debitoVenda') {
      setContaDebitoVendaPadrao(contaIdNum || '');
      if (previewIntegracao?.lancamentos) {
        const atualizados = previewIntegracao.lancamentos.map((l) => {
          if (l.tipo === 'VENDA_NFE') {
            return {
              ...l,
              contaDebitoId: contaIdNum,
              contaDebitoNome: contaObj ? `${contaObj.codigo} - ${contaObj.nome}` : l.contaDebitoNome
            };
          }
          return l;
        });
        setPreviewIntegracao({ ...previewIntegracao, lancamentos: atualizados });
      }
    } else if (tipo === 'creditoVenda') {
      setContaCreditoVendaPadrao(contaIdNum || '');
      if (previewIntegracao?.lancamentos) {
        const atualizados = previewIntegracao.lancamentos.map((l) => {
          if (l.tipo === 'VENDA_NFE') {
            return {
              ...l,
              contaCreditoId: contaIdNum,
              contaCreditoNome: contaObj ? `${contaObj.codigo} - ${contaObj.nome}` : l.contaCreditoNome
            };
          }
          return l;
        });
        setPreviewIntegracao({ ...previewIntegracao, lancamentos: atualizados });
      }
    } else if (tipo === 'debitoImposto') {
      setContaDebitoImpostoPadrao(contaIdNum || '');
      if (previewIntegracao?.lancamentos) {
        const atualizados = previewIntegracao.lancamentos.map((l) => {
          if (l.tipo === 'APURACAO_DAS') {
            return {
              ...l,
              contaDebitoId: contaIdNum,
              contaDebitoNome: contaObj ? `${contaObj.codigo} - ${contaObj.nome}` : l.contaDebitoNome
            };
          }
          return l;
        });
        setPreviewIntegracao({ ...previewIntegracao, lancamentos: atualizados });
      }
    } else if (tipo === 'creditoImposto') {
      setContaCreditoImpostoPadrao(contaIdNum || '');
      if (previewIntegracao?.lancamentos) {
        const atualizados = previewIntegracao.lancamentos.map((l) => {
          if (l.tipo === 'APURACAO_DAS') {
            return {
              ...l,
              contaCreditoId: contaIdNum,
              contaCreditoNome: contaObj ? `${contaObj.codigo} - ${contaObj.nome}` : l.contaCreditoNome
            };
          }
          return l;
        });
        setPreviewIntegracao({ ...previewIntegracao, lancamentos: atualizados });
      }
    }
  };

  // Confirmar e Gravar Lançamentos Contábeis
  const handleConfirmarIntegracao = async () => {
    if (!empresaId) return;
    try {
      setIntegrando(true);
      setMensagemErro('');
      const res = await fetch('/api/fiscal/integrar-contabil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId: empresaId,
          competencia,
          preview: false,
          contaDebitoVendaId: contaDebitoVendaPadrao || undefined,
          contaCreditoVendaId: contaCreditoVendaPadrao || undefined,
          contaDebitoImpostoId: contaDebitoImpostoPadrao || undefined,
          contaCreditoImpostoId: contaCreditoImpostoPadrao || undefined,
          lancamentos: previewIntegracao?.lancamentos,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.erro);

      setMensagemSucesso(data.mensagem || 'Lançamentos contábeis criados com sucesso no Diário!');
      setPreviewIntegracao(null);
      await carregarNotas();
      await carregarDadosApuracao();
      if (refreshData) refreshData();
    } catch (err) {
      setMensagemErro('Erro ao integrar: ' + err.message);
    } finally {
      setIntegrando(false);
    }
  };

  // Filtro de Notas
  const notasFiltradas = notas.filter((n) => {
    if (!buscaNota) return true;
    const termo = buscaNota.toLowerCase();
    return (
      n.numero?.toLowerCase().includes(termo) ||
      n.chaveAcesso?.toLowerCase().includes(termo) ||
      n.emitenteNome?.toLowerCase().includes(termo) ||
      n.destinatarioNome?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.mainContent}>
        {/* CABEÇALHO */}
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>📑 Módulo Fiscal & Escrituração de XMLs</h1>
            <p className={styles.subtitle}>
              Importação em lote de notas fiscais, auditoria de produtos monofásicos e apuração do Simples Nacional com integração contábil.
            </p>
          </div>

          <div className={styles.controlesCompetencia}>
            <div className={styles.controleGrupo}>
              <label>Competência:</label>
              <input
                type="month"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                className={styles.inputCompetencia}
              />
            </div>

            <div className={styles.controleGrupo}>
              <label>Regime / Anexo:</label>
              <select
                value={anexo}
                onChange={(e) => setAnexo(e.target.value)}
                className={styles.selectAnexo}
              >
                <option value="ANEXO_I">Simples Nacional (Anexo I - Comércio)</option>
                <option value="ANEXO_III">Simples Nacional (Anexo III - Serviços)</option>
              </select>
            </div>
          </div>
        </header>

        {/* FEEDBACK BANNERS */}
        {mensagemSucesso && (
          <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid #34d399', color: '#34d399', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {mensagemSucesso}</span>
            <button onClick={() => setMensagemSucesso('')} style={{ background: 'transparent', border: 'none', color: '#34d399', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {mensagemErro && (
          <div style={{ background: 'rgba(251, 113, 133, 0.15)', border: '1px solid #fb7185', color: '#fb7185', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {mensagemErro}</span>
            <button onClick={() => setMensagemErro('')} style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* BARRA DE ABAS */}
        <div className={styles.tabsBar}>
          <button
            className={`${styles.tabBtn} ${abaAtiva === 'upload' ? styles.tabAtiva : ''}`}
            onClick={() => setAbaAtiva('upload')}
          >
            📤 Importar XMLs / ZIP
          </button>
          <button
            className={`${styles.tabBtn} ${abaAtiva === 'notas' ? styles.tabAtiva : ''}`}
            onClick={() => setAbaAtiva('notas')}
          >
            📋 Notas Escrituradas ({notas.length})
          </button>
          <button
            className={`${styles.tabBtn} ${abaAtiva === 'apuracao' ? styles.tabAtiva : ''}`}
            onClick={() => setAbaAtiva('apuracao')}
          >
            💰 Apuração & Painel de Economia
          </button>
          <button
            className={`${styles.tabBtn} ${abaAtiva === 'integracao' ? styles.tabAtiva : ''}`}
            onClick={() => {
              setAbaAtiva('integracao');
              handleCarregarPreviewIntegracao();
            }}
          >
            ⚡ Integração Contábil (Diário)
          </button>
        </div>

        {/* ABA 1: UPLOAD DE ARQUIVOS */}
        {abaAtiva === 'upload' && (
          <section className={styles.uploadSection}>
            <div
              className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploadando && fileInputRef.current?.click()}
            >
              <div className={styles.dropzoneIcon}>{uploadando ? '⏳' : '📁'}</div>
              <h3 className={styles.dropzoneTitle}>
                {uploadando ? 'Processando e Auditando XMLs...' : 'Arraste seus arquivos XML ou pasta compactada (.ZIP) aqui'}
              </h3>
              <p className={styles.dropzoneText}>
                {uploadando
                  ? statusProgresso || 'Aguarde enquanto o sistema lê os itens, audita produtos monofásicos e calcula os tributos...'
                  : 'Suporta múltiplos arquivos .xml de NF-e (Modelo 55) e NFC-e (Modelo 65), ou um arquivo compactado .zip contendo todas as notas fiscais do mês.'}
              </p>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".xml,.zip"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={uploadando}
              />
              {!uploadando && (
                <button
                  type="button"
                  className={styles.btnUpload}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Selecionar Arquivos do Computador
                </button>
              )}
            </div>

            {/* LISTA DE ARQUIVOS PRONTOS */}
            {arquivosSelecionados.length > 0 && !uploadando && (
              <div className={styles.listaArquivosSelecionados}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  Arquivos selecionados ({arquivosSelecionados.length}):
                </h4>
                {arquivosSelecionados.slice(0, 5).map((arq, i) => (
                  <div key={i} className={styles.itemArquivo}>
                    <span>📄 {arq.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {(arq.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
                {arquivosSelecionados.length > 5 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    ... e mais {arquivosSelecionados.length - 5} arquivos.
                  </p>
                )}
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                  <button
                    className={styles.btnPrimario}
                    onClick={() => processarArquivos(arquivosSelecionados)}
                    disabled={uploadando}
                  >
                    🚀 Processar e Auditar Notas Fiscais
                  </button>
                  <button
                    className={styles.btnSecundario}
                    onClick={() => setArquivosSelecionados([])}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ABA 2: NOTAS ESCRITURADAS */}
        {abaAtiva === 'notas' && (
          <section>
            <div className={styles.toolbarTabela}>
              <input
                type="text"
                placeholder="Buscar por nº da nota, chave de acesso ou nome..."
                value={buscaNota}
                onChange={(e) => setBuscaNota(e.target.value)}
                className={styles.buscaInput}
              />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Exibindo <strong>{notasFiltradas.length}</strong> de {notas.length} notas na competência {competencia}
              </div>
            </div>

            {carregandoNotas ? (
              <div className={styles.alertaVazio}>Carregando notas fiscais...</div>
            ) : notasFiltradas.length === 0 ? (
              <div className={styles.alertaVazio}>
                Nenhuma nota fiscal encontrada para a competência {competencia}. Faça o upload na aba de Importação!
              </div>
            ) : (
              <div className={styles.tabelaContainer}>
                <table className={styles.tabelaFiscal}>
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Data</th>
                      <th>Operação</th>
                      <th>Emitente / Destinatário</th>
                      <th>Valor Total</th>
                      <th>Auditoria Monofásicos</th>
                      <th>Status Contábil</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notasFiltradas.map((n) => {
                      const temMonofasico = n.itens?.some((i) => i.monofasico);
                      const temSt = n.itens?.some((i) => i.substituicaoTributaria);
                      const isExpanded = notaExpandidaId === n.id;

                      return (
                        <tr key={n.id} style={{ cursor: 'pointer' }} onClick={() => setNotaExpandidaId(isExpanded ? null : n.id)}>
                          <td style={{ fontWeight: 600 }}>{n.numero}</td>
                          <td>{new Date(n.dataEmissao).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: n.tipoOperacao === 'SAIDA' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(96, 165, 250, 0.1)', color: n.tipoOperacao === 'SAIDA' ? 'var(--ativo)' : 'var(--pl)' }}>
                              {n.tipoOperacao === 'SAIDA' ? 'Venda (Saída)' : 'Compra (Entrada)'}
                            </span>
                          </td>
                          <td>
                            <div>{n.tipoOperacao === 'SAIDA' ? n.destinatarioNome || 'Consumidor Final' : n.emitenteNome}</div>
                            <small style={{ color: 'var(--text-muted)' }}>{n.tipoOperacao === 'SAIDA' ? n.destinatarioCpfCnpj : n.emitenteCnpj}</small>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatarMoeda(n.valorTotal)}</td>
                          <td>
                            {temMonofasico && (
                              <span className={styles.badgeMonofasico}>⚡ PIS/COFINS Monofásico</span>
                            )}
                            {temSt && (
                              <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginLeft: '0.3rem' }}>
                                ICMS-ST
                              </span>
                            )}
                            {!temMonofasico && !temSt && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tributação Normal</span>
                            )}
                          </td>
                          <td>
                            {n.integradaContabil ? (
                              <span className={styles.badgeSucesso}>✓ No Diário</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pendente</span>
                            )}
                          </td>
                          <td>
                            <button
                              style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', padding: '0.2rem 0.6rem', borderRadius: '4px', cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotaExpandidaId(isExpanded ? null : n.id);
                              }}
                            >
                              {isExpanded ? '▲ Fechar' : '▼ Itens'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ABA 3: APURAÇÃO & PAINEL DE ECONOMIA GERADA */}
        {abaAtiva === 'apuracao' && (
          <section>
            {carregandoApuracao ? (
              <div className={styles.alertaVazio}>Calculando apuração tributária...</div>
            ) : !apuracao?.apuracao ? (
              <div className={styles.alertaVazio}>Sem dados para apuração na competência selecionada.</div>
            ) : (
              <>
                {/* GRID DE MÉTRICAS & O CARD DE ECONOMIA GERADA */}
                <div className={styles.gridMetricas}>
                  {/* CARD 1: FATURAMENTO */}
                  <div className={styles.cardMetrica}>
                    <div className={styles.cardMetricaLabel}>
                      <span>Faturamento Total Escriturado</span>
                      <span>📊</span>
                    </div>
                    <div className={styles.cardMetricaValor}>
                      {formatarMoeda(apuracao.apuracao.faturamentoTotal)}
                    </div>
                    <div className={styles.cardMetricaDetalhe}>
                      {apuracao.totalNotas} notas fiscais emitidas no mês
                    </div>
                  </div>

                  {/* CARD 2: MONOFÁSICOS AUDITADOS */}
                  <div className={styles.cardMetrica}>
                    <div className={styles.cardMetricaLabel}>
                      <span>Receita com Monofásicos & ST</span>
                      <span>🔍</span>
                    </div>
                    <div className={styles.cardMetricaValor} style={{ color: 'var(--despesa)' }}>
                      {formatarMoeda(apuracao.apuracao.faturamentoMonofasico + apuracao.apuracao.faturamentoSt)}
                    </div>
                    <div className={styles.cardMetricaDetalhe}>
                      Itens com benefício fiscal identificados na leitura do XML
                    </div>
                  </div>

                  {/* CARD 3: DAS SEM OTIMIZAÇÃO VS DAS FINAL */}
                  <div className={styles.cardMetrica}>
                    <div className={styles.cardMetricaLabel}>
                      <span>Guia DAS a Recolher (Otimizada)</span>
                      <span>📑</span>
                    </div>
                    <div className={styles.cardMetricaValor}>
                      {formatarMoeda(apuracao.apuracao.valorDasFinal)}
                    </div>
                    <div className={styles.cardMetricaDetalhe}>
                      Valor original sem auditoria: <strike>{formatarMoeda(apuracao.apuracao.valorDasSemOtimizacao)}</strike>
                    </div>
                  </div>

                  {/* CARD 4: O GRANDE DIFERENCIAL - ECONOMIA GERADA PARA O CLIENTE */}
                  <div className={`${styles.cardMetrica} ${styles.cardDestaqueEconomia}`}>
                    <div className={styles.cardMetricaLabel} style={{ color: 'var(--ativo)' }}>
                      <span>💰 Economia Gerada no Mês</span>
                      <span className={styles.badgeSucesso}>ContábilPro Intelligence</span>
                    </div>
                    <div className={`${styles.cardMetricaValor} ${styles.cardMetricaValorDestaque}`}>
                      {formatarMoeda(apuracao.apuracao.economiaGerada)}
                    </div>
                    <div className={styles.cardMetricaDetalhe} style={{ color: 'var(--ativo)' }}>
                      Redução real de <strong>{formatarPorcentagem(apuracao.apuracao.economiaPercentual / 100)}</strong> no imposto pela segregação legal de PIS/COFINS e ICMS-ST!
                    </div>
                  </div>
                </div>

                {/* MEMÓRIA DE CÁLCULO DA LEI COMPLEMENTAR 123 */}
                <div className={styles.memoriaCalculoBox}>
                  <div className={styles.memoriaCalculoHeader}>
                    <h3 style={{ color: 'var(--text-primary)' }}>
                      🧮 Memória de Cálculo Oficial — Simples Nacional ({apuracao.apuracao.anexoNome})
                    </h3>
                    <button className={styles.btnPrimario} onClick={handleSalvarApuracao}>
                      💾 Salvar Apuração Fiscal
                    </button>
                  </div>

                  <div className={styles.gridCalculo}>
                    <div className={styles.itemCalculo}>
                      <span className={styles.itemCalculoLabel}>RBT12 (Últimos 12 Meses):</span>
                      <div className={styles.itemCalculoValor}>{formatarMoeda(apuracao.apuracao.rbt12)}</div>
                    </div>
                    <div className={styles.itemCalculo}>
                      <span className={styles.itemCalculoLabel}>Faixa no Anexo:</span>
                      <div className={styles.itemCalculoValor}>Faixa {apuracao.apuracao.faixa}</div>
                    </div>
                    <div className={styles.itemCalculo}>
                      <span className={styles.itemCalculoLabel}>Alíquota Nominal:</span>
                      <div className={styles.itemCalculoValor}>{formatarPorcentagem(apuracao.apuracao.aliquotaNominal)}</div>
                    </div>
                    <div className={styles.itemCalculo}>
                      <span className={styles.itemCalculoLabel}>Parcela a Deduzir:</span>
                      <div className={styles.itemCalculoValor}>{formatarMoeda(apuracao.apuracao.parcelaDeduzir)}</div>
                    </div>
                    <div className={styles.itemCalculo}>
                      <span className={styles.itemCalculoLabel}>Alíquota Efetiva:</span>
                      <div className={styles.itemCalculoValor} style={{ color: 'var(--accent)' }}>
                        {formatarPorcentagem(apuracao.apuracao.aliquotaEfetiva)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* ABA 4: INTEGRAÇÃO CONTÁBIL COM O LIVRO DIÁRIO */}
        {abaAtiva === 'integracao' && (
          <section className={styles.cardIntegracao}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  ⚡ Integração Automática com o Livro Diário
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Confira abaixo os lançamentos de partidas dobradas que serão gravados no Livro Diário da contabilidade.
                </p>
              </div>
              <button
                className={styles.btnPrimario}
                onClick={handleConfirmarIntegracao}
                disabled={integrando || !previewIntegracao?.lancamentos?.length}
              >
                {integrando ? 'Gravando no Diário...' : '✓ Confirmar e Integrar no Diário'}
              </button>
            </div>

            {carregandoPreview ? (
              <div className={styles.alertaVazio}>Carregando conferência prévia dos lançamentos...</div>
            ) : !previewIntegracao?.lancamentos || previewIntegracao.lancamentos.length === 0 ? (
              <div className={styles.alertaVazio}>
                <p style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>
                  Não há lançamentos fiscais pendentes de integração na competência <strong>{competencia}</strong>.
                </p>
                {previewIntegracao?.competenciasPendentes && previewIntegracao.competenciasPendentes.length > 0 && (
                  <div style={{ background: 'rgba(129, 140, 248, 0.08)', border: '1px solid rgba(129, 140, 248, 0.3)', padding: '1.25rem 2rem', borderRadius: '12px', display: 'inline-block', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                      💡 Encontramos notas pendentes em outro período:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {previewIntegracao.competenciasPendentes.map((comp) => (
                        <button
                          key={comp}
                          className={styles.btnPrimario}
                          onClick={() => {
                            setCompetencia(comp);
                          }}
                        >
                          👉 Mudar para {comp}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* PAINEL DE CONTAS PADRÃO DO LOTE */}
                <div className={styles.configContasBox}>
                  <div className={styles.configContasHeader}>
                    <span className={styles.configContasTitle}>
                      ⚙️ Selecionar Contas Contábeis Padrão para este Lote
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Você pode alterar o padrão do lote aqui ou personalizar cada nota diretamente na tabela abaixo.
                    </span>
                  </div>
                  <div className={styles.configContasGrid}>
                    <div className={styles.configContaItem}>
                      <label className={styles.configContaLabel}>
                        <span style={{ color: 'var(--ativo)' }}>●</span> Débito das Vendas (Ativo / Clientes / Caixa):
                      </label>
                      <select
                        className={`${styles.selectConta} ${styles.selectDebito}`}
                        value={contaDebitoVendaPadrao || ''}
                        onChange={(e) => handleMudarContaPadrao('debitoVenda', e.target.value)}
                      >
                        <option value="">Selecione a conta...</option>
                        {contasDisponiveis.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.codigo} - {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.configContaItem}>
                      <label className={styles.configContaLabel}>
                        <span style={{ color: 'var(--passivo)' }}>●</span> Crédito das Vendas (Receita / Mercadorias):
                      </label>
                      <select
                        className={`${styles.selectConta} ${styles.selectCredito}`}
                        value={contaCreditoVendaPadrao || ''}
                        onChange={(e) => handleMudarContaPadrao('creditoVenda', e.target.value)}
                      >
                        <option value="">Selecione a conta...</option>
                        {contasDisponiveis.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.codigo} - {c.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {previewIntegracao.lancamentos.some((l) => l.tipo === 'APURACAO_DAS') && (
                      <>
                        <div className={styles.configContaItem}>
                          <label className={styles.configContaLabel}>
                            <span style={{ color: 'var(--ativo)' }}>●</span> Débito da Provisão do Simples (Despesa / Impostos):
                          </label>
                          <select
                            className={`${styles.selectConta} ${styles.selectDebito}`}
                            value={contaDebitoImpostoPadrao || ''}
                            onChange={(e) => handleMudarContaPadrao('debitoImposto', e.target.value)}
                          >
                            <option value="">Selecione a conta...</option>
                            {contasDisponiveis.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codigo} - {c.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.configContaItem}>
                          <label className={styles.configContaLabel}>
                            <span style={{ color: 'var(--passivo)' }}>●</span> Crédito do Simples a Recolher (Passivo Circulante):
                          </label>
                          <select
                            className={`${styles.selectConta} ${styles.selectCredito}`}
                            value={contaCreditoImpostoPadrao || ''}
                            onChange={(e) => handleMudarContaPadrao('creditoImposto', e.target.value)}
                          >
                            <option value="">Selecione a conta...</option>
                            {contasDisponiveis.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.codigo} - {c.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* TABELA DE LANÇAMENTOS COM SELEÇÃO LINHA A LINHA */}
                <div className={styles.tabelaContainer}>
                  <table className={styles.tabelaFiscal}>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Documento</th>
                        <th style={{ minWidth: '220px' }}>Conta Débito</th>
                        <th style={{ minWidth: '220px' }}>Conta Crédito</th>
                        <th>Valor (R$)</th>
                        <th>Histórico Rastreável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewIntegracao.lancamentos.map((l, i) => (
                        <tr key={i}>
                          <td>{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                          <td style={{ fontWeight: 600 }}>{l.documento}</td>
                          <td>
                            <select
                              className={`${styles.selectContaTabela} ${styles.selectDebito}`}
                              value={l.contaDebitoId || ''}
                              onChange={(e) => handleAlterarContaLinha(i, 'contaDebitoId', e.target.value)}
                              title={l.contaDebitoNome}
                            >
                              <option value="">Selecione a conta...</option>
                              {contasDisponiveis.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.codigo} - {c.nome}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className={`${styles.selectContaTabela} ${styles.selectCredito}`}
                              value={l.contaCreditoId || ''}
                              onChange={(e) => handleAlterarContaLinha(i, 'contaCreditoId', e.target.value)}
                              title={l.contaCreditoNome}
                            >
                              <option value="">Selecione a conta...</option>
                              {contasDisponiveis.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.codigo} - {c.nome}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatarMoeda(l.valor)}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{l.historico}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
