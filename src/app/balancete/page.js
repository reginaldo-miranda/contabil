'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import styles from './Balancete.module.css';
import { useContabil } from '../../context/ContabilContext';

export default function Balancete() {
  const [dataRef, setDataRef] = useState(new Date().toISOString().split('T')[0]);
  const { getSaldosTodas } = useContabil();

  const saldos = useMemo(() => {
    return getSaldosTodas(dataRef);
  }, [dataRef, getSaldosTodas]);

  const totalDevedor = saldos.reduce((acc, curr) => acc + (curr.saldoDevedor || 0), 0);
  const totalCredor = saldos.reduce((acc, curr) => acc + (curr.saldoCredor || 0), 0);
  
  // Arredondar para evitar problemas de float no JS
  const roundedDevedor = Math.round(totalDevedor * 100) / 100;
  const roundedCredor = Math.round(totalCredor * 100) / 100;
  const isEquilibrado = roundedDevedor === roundedCredor;
  const diff = Math.abs(roundedDevedor - roundedCredor);

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getGrupoClass = (grupo) => {
    switch (grupo) {
      case 'ATIVO': return styles.tagAtivo;
      case 'PASSIVO': return styles.tagPassivo;
      case 'PL': return styles.tagPL;
      case 'RECEITA': return styles.tagReceita;
      case 'DESPESA': return styles.tagDespesa;
      default: return '';
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>📄 Balancete de Verificação</h1>
          <div className={styles.filterBar}>
            <div className={styles.inputGroup}>
              <label>Data de Referência</label>
              <input 
                type="date" 
                value={dataRef} 
                onChange={(e) => setDataRef(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Conta</th>
                  <th className={styles.right}>Saldo Devedor</th>
                  <th className={styles.right}>Saldo Credor</th>
                </tr>
              </thead>
              <tbody>
                {saldos.map((conta) => (
                  <tr key={conta.codigo}>
                    <td>{conta.codigo}</td>
                    <td className={getGrupoClass(conta.grupo)}>{conta.nome}</td>
                    <td className={styles.right}>{conta.saldoDevedor > 0 ? formatCurrency(conta.saldoDevedor) : '-'}</td>
                    <td className={styles.right}>{conta.saldoCredor > 0 ? formatCurrency(conta.saldoCredor) : '-'}</td>
                  </tr>
                ))}
                <tr className={styles.footerRow}>
                  <td colSpan={2}>TOTAIS</td>
                  <td className={styles.right}>{formatCurrency(totalDevedor)}</td>
                  <td className={styles.right}>{formatCurrency(totalCredor)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${styles.statusCard} ${isEquilibrado ? styles.statusOk : styles.statusError}`}>
          {isEquilibrado ? (
            <>
              <span>✅ Balancete Equilibrado</span>
            </>
          ) : (
            <>
              <span>❌ Balancete Desbalanceado</span>
              <span className={styles.diff}>Diferença: {formatCurrency(diff)}</span>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
