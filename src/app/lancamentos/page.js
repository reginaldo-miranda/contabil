'use client';

import { useState, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import { useContabil } from '../../context/ContabilContext';
import FormLancamento from '../../components/FormLancamento';
import styles from './Lancamentos.module.css';

const normalizeStr = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const cleanAlphanumeric = (str) => {
  if (!str) return '';
  return normalizeStr(str).replace(/[^a-z0-9]/g, '');
};

export default function LancamentosPage() {
  const { lancamentos, addLancamento, updateLancamento, deleteLancamento } = useContabil();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] = useState(null);
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredLancamentos = useMemo(() => {
    const rawSearch = normalizeStr(busca).trim();
    if (!rawSearch) {
      return (lancamentos || []).filter(lanc => {
        const dataStr = typeof lanc.data === 'string' ? lanc.data.substring(0, 10) : new Date(lanc.data).toISOString().substring(0, 10);
        if (dataInicio && dataStr < dataInicio) return false;
        if (dataFim && dataStr > dataFim) return false;
        return true;
      });
    }

    // 1. Detectar busca explícita por documento (ex: "doc 9", "doc: 9", "doc9", "documento 9", "nº 9", "no 9", "#9")
    const docPrefixRegex = /^(?:doc|doc:|documento|documento:|n|no|nº|#)\s*([a-z0-9\-_./]+)$/i;
    const docMatch = rawSearch.match(docPrefixRegex);
    const targetDocNumber = docMatch ? docMatch[1].trim() : null;

    // 2. Detectar se digitou apenas um número puro (ex: "9" ou "65")
    const isPureNumber = /^\d+$/.test(rawSearch);

    // 3. Tokens para busca geral de texto
    const tokens = rawSearch.split(/\s+/).filter(Boolean);

    return (lancamentos || []).filter(lanc => {
      // Filtro por data do cabeçalho
      const dataStr = typeof lanc.data === 'string' ? lanc.data.substring(0, 10) : new Date(lanc.data).toISOString().substring(0, 10);
      if (dataInicio && dataStr < dataInicio) return false;
      if (dataFim && dataStr > dataFim) return false;

      const docStr = String(lanc.documento || lanc.id || '').trim();
      const cleanDocStr = cleanAlphanumeric(docStr);
      const docDigits = docStr.replace(/\D/g, '');
      const parsedDocNum = docDigits ? parseInt(docDigits, 10) : NaN;

      // CASO A: Usuário digitou prefixo explícito de documento (ex: "doc 9", "nº 65")
      if (targetDocNumber) {
        const cleanTarget = cleanAlphanumeric(targetDocNumber);
        const targetDigits = targetDocNumber.replace(/\D/g, '');
        const parsedTargetNum = targetDigits ? parseInt(targetDigits, 10) : NaN;

        if (docStr.toLowerCase() === targetDocNumber.toLowerCase()) return true;
        if (cleanDocStr && cleanDocStr === cleanTarget) return true;
        if (!isNaN(parsedDocNum) && !isNaN(parsedTargetNum) && parsedDocNum === parsedTargetNum) return true;
        if (lanc.id && !isNaN(parsedTargetNum) && Number(lanc.id) === parsedTargetNum) return true;
        if (docStr.toLowerCase().startsWith(targetDocNumber.toLowerCase())) return true;
        if (docDigits && targetDigits && docDigits.startsWith(targetDigits)) return true;
        return false;
      }

      // CASO B: Usuário digitou um número puro (ex: "9" ou "65")
      if (isPureNumber) {
        const numVal = parseInt(rawSearch, 10);

        // 1. Bate se o Documento/ID for exatamente esse número ou começar por ele
        if (docStr === rawSearch) return true;
        if (lanc.id && Number(lanc.id) === numVal) return true;
        if (!isNaN(parsedDocNum) && parsedDocNum === numVal) return true;
        if (docStr.startsWith(rawSearch)) return true;
        if (docDigits && docDigits.startsWith(rawSearch)) return true;

        // 2. Bate se o histórico contiver esse número como palavra isolada (ex: "NF 9" ou "Lote 9")
        const histNorm = normalizeStr(lanc.historico);
        const histWords = histNorm.split(/[^a-z0-9]+/).filter(Boolean);
        if (histWords.includes(rawSearch)) return true;

        // 3. Bate se o valor for exatamente esse valor ou começar por ele
        const valNum = parseFloat(lanc.valor) || (lanc.partidas && lanc.partidas[0] ? parseFloat(lanc.partidas[0].valor) : 0);
        const valStr = String(valNum);
        if (valStr.startsWith(rawSearch) || valStr === rawSearch) return true;

        // 4. Bate se alguma conta tiver esse código exato
        if (lanc.contaDebito && (lanc.contaDebito.codigo === rawSearch || cleanAlphanumeric(lanc.contaDebito.codigo) === rawSearch)) return true;
        if (lanc.contaCredito && (lanc.contaCredito.codigo === rawSearch || cleanAlphanumeric(lanc.contaCredito.codigo) === rawSearch)) return true;
        if (lanc.partidas && lanc.partidas.some(p => p.contaCodigo === rawSearch || cleanAlphanumeric(p.contaCodigo) === rawSearch)) return true;

        return false;
      }

      // CASO C: Busca geral por texto / palavras múltiplas
      const histNorm = normalizeStr(lanc.historico);
      let contasText = '';
      if (lanc.contaDebito) contasText += ` ${normalizeStr(lanc.contaDebito.codigo)} ${normalizeStr(lanc.contaDebito.nome)}`;
      if (lanc.contaCredito) contasText += ` ${normalizeStr(lanc.contaCredito.codigo)} ${normalizeStr(lanc.contaCredito.nome)}`;
      if (lanc.partidas) {
        lanc.partidas.forEach(p => {
          contasText += ` ${normalizeStr(p.contaCodigo)} ${normalizeStr(p.contaNome)}`;
        });
      }

      // Datas formatadas (só incluídas se o usuário digitou uma barra "/" ou hífen "-")
      let datasText = '';
      if (rawSearch.includes('/') || rawSearch.includes('-')) {
        const [y, m, d] = dataStr.split('-');
        datasText = ` ${d}/${m}/${y} ${d}/${m} ${dataStr}`;
      }

      const searchableBlob = `${normalizeStr(docStr)} ${histNorm} ${contasText} ${datasText}`;

      return tokens.every(token => {
        return searchableBlob.includes(token);
      });
    });
  }, [lancamentos, dataInicio, dataFim, busca]);

  const handleSalvar = async (lancamentoData) => {
    let success = false;
    if (lancamentoEditando) {
      success = await updateLancamento(lancamentoEditando.id, lancamentoData);
    } else {
      success = await addLancamento(lancamentoData);
    }
    if (success) {
      setIsModalOpen(false);
      setLancamentoEditando(null);
    }
    return success;
  };

  const handleNovoLancamento = () => {
    setLancamentoEditando(null);
    setIsModalOpen(true);
  };

  const handleEditar = (e, lanc) => {
    e.stopPropagation();
    setLancamentoEditando(lanc);
    setIsModalOpen(true);
  };

  const handleExcluir = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este lançamento contábil?')) {
      await deleteLancamento(id);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const cleanStr = typeof dateStr === 'string' ? dateStr.substring(0, 10) : new Date(dateStr).toISOString().substring(0, 10);
    const [y, m, d] = cleanStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val) || 0);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Lançamentos Contábeis</h1>
            <p className={styles.subtitle}>Livro Diário com Partida Dobrada (MySQL)</p>
          </div>
          <button className={styles.btnPrimary} onClick={handleNovoLancamento}>
            + Novo Lançamento
          </button>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.searchGroup}>
            <label>Buscar Lançamento</label>
            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input 
                type="text" 
                placeholder="Buscar por Nº Doc, histórico, conta, valor..."
                value={busca} 
                onChange={e => setBusca(e.target.value)}
                className={styles.searchInput}
              />
              {busca && (
                <button 
                  type="button" 
                  className={styles.clearSearchBtn}
                  onClick={() => setBusca('')}
                  title="Limpar texto da busca"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label>Data Início</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Data Fim</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)}
              className={styles.input}
            />
          </div>
          {(busca || dataInicio || dataFim) && (
            <button 
              onClick={() => { setBusca(''); setDataInicio(''); setDataFim(''); }}
              className={styles.btnClearAll}
              title="Limpar todos os filtros aplicados"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className={styles.content}>
          {filteredLancamentos.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📖</div>
              <h3>Nenhum lançamento registrado</h3>
              <p>Clique em "+ Novo Lançamento" para cadastrar.</p>
            </div>
          ) : (
            <div className={styles.lancamentosList}>
              {filteredLancamentos.map(lanc => {
                const isExpanded = expandedId === lanc.id;
                const valorExibido = lanc.valor || (lanc.partidas && lanc.partidas[0] ? lanc.partidas[0].valor : 0);
                
                return (
                  <div key={lanc.id} className={styles.lancamentoCard}>
                    <div className={styles.cardHeader} onClick={() => toggleExpand(lanc.id)}>
                      <div className={styles.cardInfo}>
                        <span className={styles.date}>{formatDate(lanc.data)}</span>
                        <span className={styles.doc}>Doc: {lanc.documento || lanc.id}</span>
                        <span className={styles.hist}>{lanc.historico}</span>
                      </div>
                      <div className={styles.cardActions}>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent)', marginRight: '8px' }}>
                          {formatCurrency(valorExibido)}
                        </span>
                        <button 
                          className={styles.btnEdit} 
                          title="Editar lançamento"
                          onClick={(e) => handleEditar(e, lanc)}
                        >
                          ✏️
                        </button>
                        <button 
                          className={styles.btnDelete} 
                          title="Excluir lançamento"
                          onClick={(e) => handleExcluir(e, lanc.id)}
                        >
                          🗑️
                        </button>
                        <span className={styles.expandIcon}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className={styles.partidasList}>
                        {lanc.contaDebito ? (
                          <>
                            <div className={styles.partidaItem}>
                              <div className={styles.partidaInfo}>
                                <span className={styles.debitoTag}>D (Débito)</span>
                                <span className={styles.contaCodigo}>{lanc.contaDebito.codigo}</span>
                                <span className={styles.contaNome}>{lanc.contaDebito.nome}</span>
                              </div>
                              <span className={styles.partidaValor}>{formatCurrency(lanc.valor)}</span>
                            </div>
                            <div className={styles.partidaItem}>
                              <div className={styles.partidaInfo}>
                                <span className={styles.creditoTag}>C (Crédito)</span>
                                <span className={styles.contaCodigo}>{lanc.contaCredito.codigo}</span>
                                <span className={styles.contaNome}>{lanc.contaCredito.nome}</span>
                              </div>
                              <span className={styles.partidaValor}>{formatCurrency(lanc.valor)}</span>
                            </div>
                          </>
                        ) : (
                          (lanc.partidas || []).map((partida, idx) => (
                            <div key={idx} className={styles.partidaItem}>
                              <div className={styles.partidaInfo}>
                                <span className={partida.tipo === 'D' ? styles.debitoTag : styles.creditoTag}>
                                  {partida.tipo}
                                </span>
                                <span className={styles.contaCodigo}>{partida.contaCodigo}</span>
                                <span className={styles.contaNome}>{partida.contaNome}</span>
                              </div>
                              <span className={styles.partidaValor}>
                                {formatCurrency(partida.valor)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <FormLancamento 
          lancamentoParaEditar={lancamentoEditando}
          onSalvar={handleSalvar} 
          onFechar={() => {
            setIsModalOpen(false);
            setLancamentoEditando(null);
          }} 
        />
      )}
    </div>
  );
}
