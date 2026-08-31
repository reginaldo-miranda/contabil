'use client';
import React, { useState, useMemo } from 'react';
import styles from './Diario.module.css';
import Sidebar from '../../components/Sidebar';
import { useContabil } from '../../context/ContabilContext';

export default function Diario() {
  const { lancamentos } = useContabil();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const lancamentosFiltrados = useMemo(() => {
    let filtered = [...(lancamentos || [])];
    
    if (dataInicio) {
      filtered = filtered.filter(l => l.data >= dataInicio);
    }
    if (dataFim) {
      filtered = filtered.filter(l => l.data <= dataFim);
    }
    
    return filtered.sort((a, b) => new Date(a.data) - new Date(b.data));
  }, [lancamentos, dataInicio, dataFim]);

  const totais = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, lancamento) => {
      if (lancamento.contaDebito && lancamento.contaCredito) {
        const val = parseFloat(lancamento.valor) || 0;
        acc.debitos += val;
        acc.creditos += val;
      } else if (lancamento.partidas) {
        lancamento.partidas.forEach(p => {
          if (p.tipo === 'D') acc.debitos += (parseFloat(p.valor) || 0);
          if (p.tipo === 'C') acc.creditos += (parseFloat(p.valor) || 0);
        });
      }
      return acc;
    }, { debitos: 0, creditos: 0 });
  }, [lancamentosFiltrados]);

  const formatCurrency = (val) => {
    return (parseFloat(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const cleanStr = typeof dateStr === 'string' ? dateStr.substring(0, 10) : new Date(dateStr).toISOString().substring(0, 10);
    const [y, m, d] = cleanStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>📒 Livro Diário</h1>
            <p>Registro cronológico de lançamentos</p>
          </div>
        </header>

        <section className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Data Início:</label>
            <input 
              type="date" 
              value={dataInicio} 
              onChange={e => setDataInicio(e.target.value)} 
              className={styles.input}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Data Fim:</label>
            <input 
              type="date" 
              value={dataFim} 
              onChange={e => setDataFim(e.target.value)} 
              className={styles.input}
            />
          </div>
        </section>

        <section className={styles.content}>
          {lancamentosFiltrados.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhum lançamento encontrado no período.</p>
            </div>
          ) : (
            <div className={styles.lancamentosList}>
              {lancamentosFiltrados.map((lancamento) => (
                <div key={lancamento.id} className={styles.lancamentoEntry}>
                  <div className={styles.lancamentoHeader}>
                    <span className={styles.lancamentoDate}>{formatDate(lancamento.data)}</span>
                    <span className={styles.lancamentoDoc}>Doc: {lancamento.documento || lancamento.id || '-'}</span>
                    <span className={styles.lancamentoHist}>{lancamento.historico}</span>
                  </div>
                  <table className={styles.partidasTable}>
                    <thead>
                      <tr>
                        <th>Conta</th>
                        <th className={styles.debitoCol}>Débito</th>
                        <th className={styles.creditoCol}>Crédito</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lancamento.contaDebito ? (
                        <>
                          <tr>
                            <td>{lancamento.contaDebito.codigo} - {lancamento.contaDebito.nome}</td>
                            <td className={styles.debitoCol}>{formatCurrency(lancamento.valor)}</td>
                            <td className={styles.creditoCol}></td>
                          </tr>
                          <tr>
                            <td>{lancamento.contaCredito.codigo} - {lancamento.contaCredito.nome}</td>
                            <td className={styles.debitoCol}></td>
                            <td className={styles.creditoCol}>{formatCurrency(lancamento.valor)}</td>
                          </tr>
                        </>
                      ) : (
                        (lancamento.partidas || []).map((partida, idx) => (
                          <tr key={idx}>
                            <td>{partida.contaCodigo} - {partida.contaNome}</td>
                            <td className={styles.debitoCol}>
                              {partida.tipo === 'D' ? formatCurrency(partida.valor) : ''}
                            </td>
                            <td className={styles.creditoCol}>
                              {partida.tipo === 'C' ? formatCurrency(partida.valor) : ''}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
              
              <div className={styles.totalRow}>
                <div className={styles.totalLabel}>TOTAL DO PERÍODO</div>
                <div className={styles.totalValues}>
                  <span className={styles.totalDebito}>Débito: {formatCurrency(totais.debitos)}</span>
                  <span className={styles.totalCredito}>Crédito: {formatCurrency(totais.creditos)}</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
