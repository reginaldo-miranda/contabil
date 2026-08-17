'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import SeletorEmpresa from '../../components/SeletorEmpresa';
import styles from './Balancete.module.css';

export default function Balancete() {
  const [empresaId, setEmpresaId] = useState(null);
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Default dates: first and last day of current month
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [nivelMax, setNivelMax] = useState('all');

  // Totals state
  const [totais, setTotais] = useState({
    anteriorDevedor: 0,
    anteriorCredor: 0,
    debitos: 0,
    creditos: 0,
    atualDevedor: 0,
    atualCredor: 0
  });

  useEffect(() => {
    if (empresaId && dataInicio && dataFim) {
      fetchBalancete(empresaId);
    } else {
      setDados([]);
    }
  }, [empresaId, dataInicio, dataFim]);

  useEffect(() => {
    if (dados.length > 0) {
      calculateTotals();
    }
  }, [dados]);

  const fetchBalancete = async (id = empresaId) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/balancete?empresaId=${id}&dataInicio=${dataInicio}&dataFim=${dataFim}`);
      const data = await res.json();
      if (res.ok) {
        setDados(data);
      } else {
        setError(data.erro || 'Erro ao gerar o Balancete.');
      }
    } catch (err) {
      console.error('Erro ao buscar balancete:', err);
      setError('Erro de conexão ao buscar dados do balancete.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    let anteriorDevedor = 0;
    let anteriorCredor = 0;
    let debitos = 0;
    let creditos = 0;
    let atualDevedor = 0;
    let atualCredor = 0;

    // Filter only analytical accounts to prevent double-counting of synthetic parents
    const analiticas = dados.filter(c => c.tipo === 'A');

    for (const c of analiticas) {
      // 1. Debits & Credits of the period
      debitos += c.debitos;
      creditos += c.creditos;

      // 2. Opening Balance (Saldo Anterior)
      if (c.natureza === 'D') {
        if (c.saldoAnterior >= 0) {
          anteriorDevedor += c.saldoAnterior;
        } else {
          anteriorCredor += Math.abs(c.saldoAnterior);
        }
      } else { // nature 'C'
        if (c.saldoAnterior >= 0) {
          anteriorCredor += c.saldoAnterior;
        } else {
          anteriorDevedor += Math.abs(c.saldoAnterior);
        }
      }

      // 3. Closing Balance (Saldo Atual)
      if (c.natureza === 'D') {
        if (c.saldoAtual >= 0) {
          atualDevedor += c.saldoAtual;
        } else {
          atualCredor += Math.abs(c.saldoAtual);
        }
      } else { // nature 'C'
        if (c.saldoAtual >= 0) {
          atualCredor += c.saldoAtual;
        } else {
          atualDevedor += Math.abs(c.saldoAtual);
        }
      }
    }

    setTotais({
      anteriorDevedor,
      anteriorCredor,
      debitos,
      creditos,
      atualDevedor,
      atualCredor
    });
  };

  // Filter accounts list by user selected level
  const contasFiltradas = dados.filter(c => {
    if (nivelMax === 'all') return true;
    return c.nivel <= parseInt(nivelMax);
  });

  const formatarValor = (val) => {
    return parseFloat(val).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Helper to show indicator (D or C)
  const formatarSaldo = (valor, natureza) => {
    const absVal = Math.abs(valor);
    if (absVal === 0) return { val: '0,00', ind: '' };

    let ind = natureToIndicator(valor, natureza);
    return {
      val: formatarValor(absVal),
      ind
    };
  };

  const natureToIndicator = (valor, natureza) => {
    if (natureza === 'D') {
      return valor >= 0 ? 'D' : 'C';
    } else {
      return valor >= 0 ? 'C' : 'D';
    }
  };

  const getGrupoClass = (grupo) => {
    return grupo ? styles[grupo.toLowerCase()] : '';
  };

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.titleIcon}>📄</span>
            <div>
              <h1 className={styles.title}>Balancete de Verificação</h1>
              <p className={styles.subtitle}>Relatório de saldos e movimentações</p>
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

            {/* Filters Card */}
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

                <div className={styles.filterGroup}>
                  <label>Nível de Detalhe</label>
                  <select
                    value={nivelMax}
                    onChange={e => setNivelMax(e.target.value)}
                    className={styles.filterInput}
                  >
                    <option value="all">Todas as contas (Completo)</option>
                    <option value="1">Nível 1 (Grupos principais)</option>
                    <option value="2">Nível 2 (Subgrupos)</option>
                    <option value="3">Nível 3 (Contas sintéticas primárias)</option>
                    <option value="4">Nível 4 (Sub-sintéticas)</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Gerando Balancete contábil...</p>
              </div>
            ) : contasFiltradas.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <h3>Sem dados no balancete</h3>
                <p>Nenhuma conta ou lançamento cadastrado para esta empresa no período selecionado.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Classificação / Descrição</th>
                      <th style={{ textAlign: 'right' }}>Saldo Anterior</th>
                      <th style={{ textAlign: 'right' }}>Débito (Período)</th>
                      <th style={{ textAlign: 'right' }}>Crédito (Período)</th>
                      <th style={{ textAlign: 'right' }}>Saldo Atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contasFiltradas.map((c) => {
                      const isSintetica = c.tipo === 'S';
                      const rowClass = isSintetica ? styles.rowSintetica : styles.rowAnalitica;
                      const anterior = formatarSaldo(c.saldoAnterior, c.natureza);
                      const atual = formatarSaldo(c.saldoAtual, c.natureza);

                      return (
                        <tr key={c.id} className={`${styles.tableRow} ${rowClass}`}>
                          <td className={`${styles.codigoCol} ${getGrupoClass(c.grupo)}`}>
                            {c.codigo}
                          </td>
                          <td 
                            className={styles.nomeCol}
                            style={{ paddingLeft: `${(c.nivel - 1) * 16 + 16}px` }}
                          >
                            <span className={styles.typeIcon}>{isSintetica ? '📁' : '📄'}</span>
                            {c.nome}
                          </td>
                          <td className={styles.valueCol}>
                            <span className={styles.valueText}>{anterior.val}</span>
                            <span className={`${styles.indicator} ${anterior.ind === 'D' ? styles.indD : styles.indC}`}>
                              {anterior.ind}
                            </span>
                          </td>
                          <td className={`${styles.valueCol} ${styles.movCol}`}>
                            {c.debitos > 0 ? formatarValor(c.debitos) : '-'}
                          </td>
                          <td className={`${styles.valueCol} ${styles.movCol}`}>
                            {c.creditos > 0 ? formatarValor(c.creditos) : '-'}
                          </td>
                          <td className={styles.valueCol}>
                            <span className={styles.valueText}>{atual.val}</span>
                            <span className={`${styles.indicator} ${atual.ind === 'D' ? styles.indD : styles.indC}`}>
                              {atual.ind}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td colSpan={2}>Totais de Verificação (Analíticos)</td>
                      
                      {/* Saldo Anterior Total */}
                      <td className={styles.valueCol}>
                        <div className={styles.totalsGroup}>
                          <div>Devedor: {formatarValor(totais.anteriorDevedor)}</div>
                          <div>Credor: {formatarValor(totais.anteriorCredor)}</div>
                        </div>
                      </td>
                      
                      {/* Movimentos do Período */}
                      <td className={styles.valueCol}>
                        {formatarValor(totais.debitos)}
                      </td>
                      <td className={styles.valueCol}>
                        {formatarValor(totais.creditos)}
                      </td>

                      {/* Saldo Atual Total */}
                      <td className={styles.valueCol}>
                        <div className={styles.totalsGroup}>
                          <div>Devedor: {formatarValor(totais.atualDevedor)}</div>
                          <div>Credor: {formatarValor(totais.atualCredor)}</div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Selecione uma empresa para visualizar o Balancete de Verificação.
          </div>
        )}
      </main>
    </div>
  );
}
