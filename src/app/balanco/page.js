'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import styles from './Balanco.module.css';
import { useContabil } from '../../context/ContabilContext';

export default function Balanco() {
  const [dataRef, setDataRef] = useState(new Date().toISOString().split('T')[0]);
  const { getBalanco } = useContabil();

  const balanco = useMemo(() => {
    return getBalanco(dataRef);
  }, [dataRef, getBalanco]);

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Arredondar para comparação
  const roundedAtivo = Math.round(balanco.totalAtivo * 100) / 100;
  const roundedPassivoPL = Math.round((balanco.totalPassivo + balanco.totalPL) * 100) / 100;
  const isEquilibrado = roundedAtivo === roundedPassivoPL;
  const diff = Math.abs(roundedAtivo - roundedPassivoPL);

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>⚖️ Balanço Patrimonial</h1>
          
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
          <div className={styles.column}>
            <div className={styles.section}>
              <div className={`${styles.sectionHeader} ${styles.ativoHeader}`}>
                ATIVO
              </div>
              {balanco.ativo.map(conta => (
                <div key={conta.codigo} className={styles.row}>
                  <span>{conta.codigo} - {conta.nome}</span>
                  <span className={styles.value}>{formatCurrency(conta.valor)}</span>
                </div>
              ))}
            </div>
            <div className={styles.total}>
              <span>TOTAL DO ATIVO</span>
              <span>{formatCurrency(balanco.totalAtivo)}</span>
            </div>
          </div>

          <div className={styles.column}>
            <div className={styles.section}>
              <div className={`${styles.sectionHeader} ${styles.passivoHeader}`}>
                PASSIVO
              </div>
              {balanco.passivo.map(conta => (
                <div key={conta.codigo} className={styles.row}>
                  <span>{conta.codigo} - {conta.nome}</span>
                  <span className={styles.value}>{formatCurrency(conta.valor)}</span>
                </div>
              ))}
              <div className={styles.subtotal}>
                <span>Subtotal Passivo</span>
                <span className={styles.value}>{formatCurrency(balanco.totalPassivo)}</span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={`${styles.sectionHeader} ${styles.plHeader}`}>
                PATRIMÔNIO LÍQUIDO
              </div>
              {balanco.pl.map(conta => (
                <div key={conta.codigo} className={styles.row}>
                  <span>{conta.codigo} - {conta.nome}</span>
                  <span className={styles.value}>{formatCurrency(conta.valor)}</span>
                </div>
              ))}
              <div className={styles.row}>
                <span>Resultado do Exercício</span>
                <span className={styles.value}>{formatCurrency(balanco.dreResultado)}</span>
              </div>
              <div className={styles.subtotal}>
                <span>Subtotal PL</span>
                <span className={styles.value}>{formatCurrency(balanco.totalPL)}</span>
              </div>
            </div>

            <div className={styles.total}>
              <span>TOTAL PASSIVO + PL</span>
              <span>{formatCurrency(balanco.totalPassivo + balanco.totalPL)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.statusCard} ${isEquilibrado ? styles.statusOk : styles.statusError}`}>
          {isEquilibrado ? (
            <>
              <span>✅ Balanço Equilibrado</span>
            </>
          ) : (
            <>
              <span>❌ Balanço Desbalanceado</span>
              <span className={styles.diff}>Diferença: {formatCurrency(diff)}</span>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
