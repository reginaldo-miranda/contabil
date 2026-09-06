'use client';

import { useState, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import { useContabil } from '../../context/ContabilContext';
import FormLancamento from '../../components/FormLancamento';
import styles from './Lancamentos.module.css';

export default function LancamentosPage() {
  const { lancamentos, addLancamento, updateLancamento, deleteLancamento } = useContabil();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lancamentoEditando, setLancamentoEditando] = useState(null);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredLancamentos = useMemo(() => {
    return (lancamentos || []).filter(lanc => {
      let keep = true;
      const dataStr = typeof lanc.data === 'string' ? lanc.data.substring(0, 10) : new Date(lanc.data).toISOString().substring(0, 10);
      if (dataInicio && dataStr < dataInicio) keep = false;
      if (dataFim && dataStr > dataFim) keep = false;
      return keep;
    });
  }, [lancamentos, dataInicio, dataFim]);

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
          {(dataInicio || dataFim) && (
            <button 
              onClick={() => { setDataInicio(''); setDataFim(''); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', alignSelf: 'flex-end', paddingBottom: '8px' }}
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
