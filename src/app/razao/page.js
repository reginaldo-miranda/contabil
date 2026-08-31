'use client';
import React, { useState, useMemo } from 'react';
import styles from './Razao.module.css';
import Sidebar from '../../components/Sidebar';
import { useContabil } from '../../context/ContabilContext';
import SeletorContaComBusca from '../../components/SeletorContaComBusca';

export default function Razao() {
  const { getContasAnaliticas, getLancamentosPorConta, getSaldoConta } = useContabil();
  const contas = getContasAnaliticas();
  
  const [contaSelecionada, setContaSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const formatCurrency = (val) => {
    return (parseFloat(val) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const cleanStr = typeof dateStr === 'string' ? dateStr.substring(0, 10) : new Date(dateStr).toISOString().substring(0, 10);
    const [y, m, d] = cleanStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const contaData = useMemo(() => {
    if (!contaSelecionada) return null;
    return contas.find(c => String(c.id) === String(contaSelecionada) || String(c.codigo) === String(contaSelecionada));
  }, [contaSelecionada, contas]);

  const razaoData = useMemo(() => {
    if (!contaData) return null;

    let lancamentos = getLancamentosPorConta(contaData.id, dataInicio, dataFim, contaData.codigo) || [];
    lancamentos = [...lancamentos].sort((a, b) => new Date(a.data) - new Date(b.data));

    let saldoAnteriorInfo = null;
    let saldoAcumulado = 0;

    if (dataInicio) {
      const msDiaAnterior = new Date(dataInicio).getTime() - 86400000;
      const dataAnterior = new Date(msDiaAnterior).toISOString().split('T')[0];
      saldoAnteriorInfo = getSaldoConta(contaData.id, dataAnterior);
      
      const valSaldoAnt = saldoAnteriorInfo?.saldo || 0;
      saldoAcumulado = valSaldoAnt;
    }

    // Identifica todos os IDs de contas que pertencem a este grupo/sintética (ex: código "4" pega "4", "4.1", "4.2.2.09.001")
    const matchIds = new Set(
      contas
        .filter(c => c.id === contaData.id || String(c.codigo).startsWith(String(contaData.codigo)))
        .map(c => c.id)
    );

    const matchCodigos = new Set(
      contas
        .filter(c => c.id === contaData.id || String(c.codigo).startsWith(String(contaData.codigo)))
        .map(c => c.codigo)
    );

    const isMatchConta = (cId, cObj) => {
      if (!cId && !cObj) return false;
      if (matchIds.has(cId) || matchIds.has(cObj?.id)) return true;
      if (matchCodigos.has(cId) || matchCodigos.has(cObj?.codigo)) return true;
      return false;
    };

    const transactions = [];
    (lancamentos || []).forEach(l => {
      let debitoVal = 0;
      let creditoVal = 0;

      if (isMatchConta(l.contaDebitoId, l.contaDebito)) {
        debitoVal = parseFloat(l.valor) || 0;
      }
      if (isMatchConta(l.contaCreditoId, l.contaCredito)) {
        creditoVal = parseFloat(l.valor) || 0;
      }

      if (l.partidas) {
        l.partidas.filter(p => isMatchConta(p.contaId, p)).forEach(p => {
          if (p.tipo === 'D') debitoVal += parseFloat(p.valor) || 0;
          if (p.tipo === 'C') creditoVal += parseFloat(p.valor) || 0;
        });
      }

      if (debitoVal > 0 || creditoVal > 0) {
        if (contaData.natureza === 'D' || contaData.natureza === 'Devedora') {
          saldoAcumulado += (debitoVal - creditoVal);
        } else {
          saldoAcumulado += (creditoVal - debitoVal);
        }

        transactions.push({
          id: `${l.id}-${contaData.id}`,
          data: l.data,
          documento: l.documento || l.id,
          historico: l.historico,
          debito: debitoVal,
          credito: creditoVal,
          saldo: saldoAcumulado
        });
      }
    });

    return {
      saldoAnterior: saldoAnteriorInfo ? saldoAnteriorInfo.saldo : 0,
      transactions,
      saldoFinal: saldoAcumulado
    };
  }, [contaData, dataInicio, dataFim, getLancamentosPorConta, getSaldoConta]);

  const getGrupoColorClass = (grupo) => {
    switch (grupo?.toUpperCase()) {
      case 'ATIVO': return styles.grupoAtivo;
      case 'PASSIVO': return styles.grupoPassivo;
      case 'PATRIMÔNIO LÍQUIDO': return styles.grupoPl;
      case 'RECEITAS': return styles.grupoReceita;
      case 'DESPESAS': return styles.grupoDespesa;
      default: return '';
    }
  };

  const getSaldoColorClass = (valor) => {
    if (valor > 0) return styles.saldoPositivo;
    if (valor < 0) return styles.saldoNegativo;
    return '';
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>📖 Livro Razão</h1>
            <p>Extrato por conta contábil</p>
          </div>
        </header>

        <section className={styles.filterBar}>
          <div className={styles.filterGroup} style={{ flex: 2, minWidth: '300px' }}>
            <label>Conta Contábil:</label>
            <SeletorContaComBusca
              contas={contas}
              value={contaSelecionada}
              onChange={val => setContaSelecionada(val)}
              placeholder="Selecione uma conta contábil..."
            />
          </div>
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

        {contaData && razaoData && (
          <section className={styles.content}>
            <div className={`${styles.accountHeader} ${getGrupoColorClass(contaData.grupo)}`}>
              <div className={styles.accountInfo}>
                <h2>{contaData.codigo} - {contaData.nome}</h2>
                <div className={styles.accountMeta}>
                  <span>Natureza: {contaData.natureza === 'D' ? 'Devedora' : 'Credora'}</span>
                  <span>Grupo: {contaData.grupo}</span>
                </div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.transactionsTable}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Documento</th>
                    <th>Histórico</th>
                    <th className={styles.numberCol}>Débito</th>
                    <th className={styles.numberCol}>Crédito</th>
                    <th className={styles.numberCol}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {dataInicio && (
                    <tr className={styles.saldoAnteriorRow}>
                      <td colSpan="5"><strong>SALDO ANTERIOR</strong></td>
                      <td className={`${styles.numberCol} ${getSaldoColorClass(razaoData.saldoAnterior)}`}>
                        <strong>{formatCurrency(Math.abs(razaoData.saldoAnterior))} {razaoData.saldoAnterior >= 0 ? 'D' : 'C'}</strong>
                      </td>
                    </tr>
                  )}
                  
                  {razaoData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={styles.emptyTable}>Nenhuma movimentação no período.</td>
                    </tr>
                  ) : (
                    razaoData.transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.data)}</td>
                        <td>{tx.documento || '-'}</td>
                        <td>{tx.historico}</td>
                        <td className={styles.numberCol}>{tx.debito > 0 ? formatCurrency(tx.debito) : ''}</td>
                        <td className={styles.numberCol}>{tx.credito > 0 ? formatCurrency(tx.credito) : ''}</td>
                        <td className={`${styles.numberCol} ${getSaldoColorClass(tx.saldo)}`}>
                          {formatCurrency(Math.abs(tx.saldo))} {tx.saldo >= 0 ? 'D' : 'C'}
                        </td>
                      </tr>
                    ))
                  )}

                  <tr className={styles.saldoFinalRow}>
                    <td colSpan="5"><strong>SALDO FINAL</strong></td>
                    <td className={`${styles.numberCol} ${getSaldoColorClass(razaoData.saldoFinal)}`}>
                      <strong>{formatCurrency(Math.abs(razaoData.saldoFinal))} {razaoData.saldoFinal >= 0 ? 'D' : 'C'}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
