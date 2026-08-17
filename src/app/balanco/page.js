'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import SeletorEmpresa from '../../components/SeletorEmpresa';
import styles from './Balanco.module.css';

export default function Balanco() {
  const [empresaId, setEmpresaId] = useState(null);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default limit date: today
  const [dataLimite, setDataLimite] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    if (empresaId && dataLimite) {
      fetchBalanco(empresaId);
    } else {
      setDados(null);
    }
  }, [empresaId, dataLimite]);

  const fetchBalanco = async (id = empresaId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/balanco?empresaId=${id}&dataLimite=${dataLimite}`);
      const data = await res.json();
      if (res.ok) {
        setDados(data);
      } else {
        setError(data.erro || 'Erro ao gerar o Balanço Patrimonial.');
      }
    } catch (err) {
      console.error('Erro ao buscar balanço:', err);
      setError('Erro de conexão ao buscar dados do balanço.');
    } finally {
      setLoading(false);
    }
  };

  const formatarValor = (val) => {
    const absVal = Math.abs(val);
    const formatted = absVal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatted;
  };

  const formatarSaldo = (valor, natureza) => {
    if (Math.abs(valor) < 0.01) return { val: '0,00', ind: '' };
    
    // For Balance Sheet, everything should ideally match its typical nature (Positive value)
    // If it's negative, it means it's inverted (e.g. depreciation)
    let ind = 'D';
    if (natureza === 'D') {
      ind = valor >= 0 ? 'D' : 'C';
    } else {
      ind = valor >= 0 ? 'C' : 'D';
    }

    return {
      val: formatarValor(valor),
      ind
    };
  };

  const getGrupoClass = (grupo) => {
    return grupo ? styles[grupo.toLowerCase()] : '';
  };

  // Only show accounts that have balance (different from 0)
  const filterNonZero = (list) => {
    if (!list) return [];
    return list.filter(c => Math.abs(c.valor) >= 0.01);
  };

  const ativosFiltrados = dados ? filterNonZero(dados.ativo) : [];
  const passivosPLFiltrados = dados ? filterNonZero(dados.passivoPL) : [];

  const diferenca = dados ? (dados.totalAtivo - dados.totalPassivoPL) : 0.0;
  const isEquilibrado = Math.abs(diferenca) < 0.01;

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.titleIcon}>⚖️</span>
            <div>
              <h1 className={styles.title}>Balanço Patrimonial</h1>
              <p className={styles.subtitle}>Situação patrimonial da empresa</p>
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
                  <label>Data da Posição Patrimonial</label>
                  <input
                    type="date"
                    value={dataLimite}
                    onChange={e => setDataLimite(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Consolidando Balanço Patrimonial...</p>
              </div>
            ) : !dados || (ativosFiltrados.length === 0 && passivosPLFiltrados.length === 0) ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>⚖️</div>
                <h3>Sem saldos a exibir</h3>
                <p>Nenhuma conta de Ativo, Passivo ou Patrimônio Líquido possui saldo na data selecionada.</p>
              </div>
            ) : (
              <div className={styles.reportContainer}>
                
                {/* Side-by-Side Columns */}
                <div className={styles.columnsGrid}>
                  
                  {/* Left Column: ATIVO */}
                  <div className={styles.columnCard}>
                    <div className={styles.columnHeader}>
                      <h2>ATIVO (Bens e Direitos)</h2>
                    </div>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Conta</th>
                            <th style={{ textAlign: 'right' }}>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ativosFiltrados.map(c => {
                            const isSintetica = c.tipo === 'S';
                            const rowClass = isSintetica ? styles.rowSintetica : styles.rowAnalitica;
                            const saldo = formatarSaldo(c.valor, c.natureza);

                            return (
                              <tr key={c.id} className={`${styles.tableRow} ${rowClass}`}>
                                <td className={`${styles.codigoCol} ${getGrupoClass(c.grupo)}`}>
                                  {c.codigo}
                                </td>
                                <td 
                                  className={styles.nomeCol}
                                  style={{ paddingLeft: `${(c.nivel - 1) * 12 + 12}px` }}
                                >
                                  {c.nome}
                                </td>
                                <td className={styles.valueCol}>
                                  <span>{saldo.val}</span>
                                  <span className={`${styles.indicator} ${saldo.ind === 'D' ? styles.indD : styles.indC}`}>
                                    {saldo.ind}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className={styles.columnFooter}>
                      <span>Total do Ativo</span>
                      <span className={styles.footerVal}>{formatarValor(dados.totalAtivo)} D</span>
                    </div>
                  </div>

                  {/* Right Column: PASSIVO E PATRIMÔNIO LÍQUIDO */}
                  <div className={styles.columnCard}>
                    <div className={styles.columnHeader}>
                      <h2>PASSIVO E PL (Obrigações e Capital)</h2>
                    </div>
                    <div className={styles.tableWrapper}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Conta</th>
                            <th style={{ textAlign: 'right' }}>Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {passivosPLFiltrados.map(c => {
                            const isSintetica = c.tipo === 'S';
                            // Special check for virtual account
                            const isVirtual = c.codigo === '2.3.99';
                            const rowClass = isSintetica ? styles.rowSintetica : (isVirtual ? styles.rowVirtual : styles.rowAnalitica);
                            const saldo = formatarSaldo(c.valor, c.natureza);

                            return (
                              <tr key={c.id} className={`${styles.tableRow} ${rowClass}`}>
                                <td className={`${styles.codigoCol} ${getGrupoClass(c.grupo)}`}>
                                  {c.codigo}
                                </td>
                                <td 
                                  className={styles.nomeCol}
                                  style={{ paddingLeft: `${(c.nivel - 1) * 12 + 12}px` }}
                                >
                                  {c.nome}
                                </td>
                                <td className={styles.valueCol}>
                                  <span>{saldo.val}</span>
                                  <span className={`${styles.indicator} ${saldo.ind === 'D' ? styles.indD : styles.indC}`}>
                                    {saldo.ind}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className={styles.columnFooter}>
                      <span>Total do Passivo + PL</span>
                      <span className={styles.footerVal}>{formatarValor(dados.totalPassivoPL)} C</span>
                    </div>
                  </div>

                </div>

                {/* Balance Status Indicator */}
                <div className={`${styles.statusCard} ${isEquilibrado ? styles.statusSuccess : styles.statusWarning}`}>
                  <div className={styles.statusIcon}>⚖️</div>
                  <div className={styles.statusText}>
                    {isEquilibrado ? (
                      <>
                        <h3>Balanço Patrimonial Equilibrado</h3>
                        <p>O total do Ativo é exatamente igual à soma do Passivo e do Patrimônio Líquido. Diferença: R$ 0,00</p>
                      </>
                    ) : (
                      <>
                        <h3>Balanço Patrimonial Desequilibrado!</h3>
                        <p>Existe uma diferença de {formatarValor(diferenca)} entre o Ativo e a soma do Passivo + PL. Verifique os lançamentos contábeis.</p>
                      </>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Selecione uma empresa para visualizar o Balanço Patrimonial.
          </div>
        )}
      </main>
    </div>
  );
}
