'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import SeletorEmpresa from '../../components/SeletorEmpresa';
import styles from './Dre.module.css';

export default function Dre() {
  const [empresaId, setEmpresaId] = useState(null);
  const [dreData, setDreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default dates: Jan 1st of current year to last day of current month
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    if (empresaId && dataInicio && dataFim) {
      fetchDre(empresaId);
    } else {
      setDreData(null);
    }
  }, [empresaId, dataInicio, dataFim]);

  const fetchDre = async (id = empresaId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/dre?empresaId=${id}&dataInicio=${dataInicio}&dataFim=${dataFim}`);
      const data = await res.json();
      if (res.ok) {
        setDreData(data);
      } else {
        setError(data.erro || 'Erro ao gerar a DRE.');
      }
    } catch (err) {
      console.error('Erro ao buscar DRE:', err);
      setError('Erro de conexão ao buscar dados da DRE.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatarValor = (val) => {
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    return val < 0 ? `(${formatted})` : formatted;
  };

  // Calculate vertical analysis percentage (AV)
  const calcularAV = (valor, receitaBruta) => {
    if (!receitaBruta || receitaBruta === 0) return '0,0%';
    const pct = (valor / receitaBruta) * 100;
    return `${pct.toFixed(1)}%`.replace('.', ',');
  };

  const getReceitaBrutaValor = () => {
    if (!dreData) return 0;
    const rb = dreData.linhas.find(l => l.key === 'receitaBruta');
    return rb ? rb.valor : 0;
  };

  const receitaBruta = getReceitaBrutaValor();

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.titleIcon}>📈</span>
            <div>
              <h1 className={styles.title}>Demonstração do Resultado (DRE)</h1>
              <p className={styles.subtitle}>Relatório de desempenho financeiro</p>
            </div>
          </div>
          <SeletorEmpresa onEmpresaChange={setEmpresaId} />
        </header>

        {empresaId ? (
          <div className={styles.content}>
            {error && (
              <div className={styles.errorArea}>
                {error}
              </div>
            )}

            {/* Filters */}
            <div className={styles.filterCard}>
              <div className={styles.filterGrid}>
                <div className={styles.filterGroup}>
                  <label>Data Inicial</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label>Data Final</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Calculando Demonstração do Resultado...</p>
              </div>
            ) : !dreData || dreData.linhas.every(l => l.valor === 0) ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📈</div>
                <h3>Sem movimentações no período</h3>
                <p>Nenhuma conta de receita ou despesa obteve lançamentos no intervalo de datas selecionado.</p>
              </div>
            ) : (
              <div className={styles.reportWrapper}>
                <div className={styles.reportHeader}>
                  <h2>Demonstração do Resultado do Exercício</h2>
                  <p>Período: {new Date(dataInicio).toLocaleDateString('pt-BR')} a {new Date(dataFim).toLocaleDateString('pt-BR')}</p>
                </div>

                <div className={styles.dreTable}>
                  <div className={`${styles.row} ${styles.tableHeader}`}>
                    <div className={styles.descCol}>Descrição do Faturamento e Despesas</div>
                    <div className={styles.valCol}>Valor (R$)</div>
                    <div className={styles.avCol}>A.V. (%)</div>
                  </div>

                  {dreData.linhas.map((linha) => {
                    const hasDetails = linha.details && linha.details.length > 0;
                    const hasSubItems = linha.subItems && linha.subItems.length > 0;
                    const isExpandable = hasDetails || hasSubItems;
                    const isExpanded = !!expandedRows[linha.key];
                    
                    const isResultadoPositivo = linha.key === 'resultadoLiquido' && linha.valor >= 0;
                    const isResultadoNegativo = linha.key === 'resultadoLiquido' && linha.valor < 0;

                    let rowStyle = styles.standardRow;
                    if (linha.isSubtotal) {
                      rowStyle = styles.subtotalRow;
                    }
                    if (linha.key === 'resultadoLiquido') {
                      rowStyle = isResultadoPositivo ? styles.lucroRow : styles.prejuizoRow;
                    }

                    return (
                      <div key={linha.key} className={styles.rowContainer}>
                        <div 
                          className={`${styles.row} ${rowStyle} ${isExpandable ? styles.clickableRow : ''}`}
                          onClick={() => isExpandable && toggleExpand(linha.key)}
                        >
                          <div className={styles.descCol}>
                            {isExpandable && (
                              <span className={`${styles.expandArrow} ${isExpanded ? styles.arrowDown : ''}`}>▶</span>
                            )}
                            {linha.label}
                          </div>
                          <div className={styles.valCol}>{formatarValor(linha.valor)}</div>
                          <div className={styles.avCol}>{calcularAV(linha.valor, receitaBruta)}</div>
                        </div>

                        {/* Details (Analytical Accounts) */}
                        {isExpanded && hasDetails && (
                          <div className={styles.detailsContainer}>
                            {linha.details.map((det, index) => (
                              <div key={index} className={styles.detailsRow}>
                                <div className={styles.descCol}>
                                  <span className={styles.detailsCode}>{det.codigo}</span>
                                  <span>{det.nome}</span>
                                </div>
                                <div className={styles.valCol}>{formatarValor(det.valor)}</div>
                                <div className={styles.avCol}>{calcularAV(det.valor, receitaBruta)}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Sub-Items (like Pessoal, Adm, Financeiro under Despesas Operacionais) */}
                        {isExpanded && hasSubItems && (
                          <div className={styles.subItemsContainer}>
                            {linha.subItems.map((sub, idx) => {
                              const subKey = `${linha.key}-${idx}`;
                              const isSubExpanded = !!expandedRows[subKey];
                              const subHasDetails = sub.details && sub.details.length > 0;

                              return (
                                <div key={idx} className={styles.subItemBlock}>
                                  <div 
                                    className={`${styles.row} ${styles.subItemRow} ${subHasDetails ? styles.clickableRow : ''}`}
                                    onClick={() => subHasDetails && toggleExpand(subKey)}
                                  >
                                    <div className={styles.descCol}>
                                      {subHasDetails && (
                                        <span className={`${styles.expandArrow} ${isSubExpanded ? styles.arrowDown : ''}`}>▶</span>
                                      )}
                                      {sub.label}
                                    </div>
                                    <div className={styles.valCol}>{formatarValor(sub.valor)}</div>
                                    <div className={styles.avCol}>{calcularAV(sub.valor, receitaBruta)}</div>
                                  </div>

                                  {isSubExpanded && subHasDetails && (
                                    <div className={styles.detailsContainer} style={{ borderLeftColor: 'rgba(255,255,255,0.05)' }}>
                                      {sub.details.map((det, dIdx) => (
                                        <div key={dIdx} className={styles.detailsRow}>
                                          <div className={styles.descCol}>
                                            <span className={styles.detailsCode}>{det.codigo}</span>
                                            <span>{det.nome}</span>
                                          </div>
                                          <div className={styles.valCol}>{formatarValor(det.valor)}</div>
                                          <div className={styles.avCol}>{calcularAV(det.valor, receitaBruta)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Selecione uma empresa para visualizar a Demonstração do Resultado (DRE).
          </div>
        )}
      </main>
    </div>
  );
}
