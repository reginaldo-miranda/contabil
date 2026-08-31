'use client';
import { useState, useMemo } from 'react';
import Sidebar from '../../components/Sidebar';
import styles from './Dre.module.css';
import { useContabil } from '../../context/ContabilContext';

export default function DRE() {
  const dataInicial = new Date();
  dataInicial.setDate(1);
  const [dataInicio, setDataInicio] = useState(dataInicial.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  
  const { getDRE } = useContabil();

  const dre = useMemo(() => {
    return getDRE(dataInicio, dataFim);
  }, [dataInicio, dataFim, getDRE]);

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isLucro = dre.resultado > 0;
  const isPrejuizo = dre.resultado < 0;
  
  let resultadoClass = styles.nulo;
  let resultadoText = 'NULO';
  
  if (isLucro) {
    resultadoClass = styles.lucro;
    resultadoText = 'LUCRO';
  } else if (isPrejuizo) {
    resultadoClass = styles.prejuizo;
    resultadoText = 'PREJUÍZO';
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>📈 DRE</h1>
          <p className={styles.subtitle}>Demonstração do Resultado do Exercício</p>
          
          <div className={styles.filterBar}>
            <div className={styles.inputGroup}>
              <label>Data Início</label>
              <input 
                type="date" 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)} 
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Data Fim</label>
              <input 
                type="date" 
                value={dataFim} 
                onChange={(e) => setDataFim(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <div className={`${styles.sectionHeader} ${styles.receitasHeader}`}>
              RECEITAS
            </div>
            {dre.receitas.map(conta => (
              <div key={conta.codigo} className={styles.row}>
                <span>{conta.codigo} - {conta.nome}</span>
                <span className={styles.value}>{formatCurrency(conta.valor)}</span>
              </div>
            ))}
            <div className={styles.subtotal}>
              <span>Total de Receitas</span>
              <span className={styles.value}>{formatCurrency(dre.totalReceitas)}</span>
            </div>
          </div>

          <div className={styles.section}>
            <div className={`${styles.sectionHeader} ${styles.despesasHeader}`}>
              DESPESAS
            </div>
            {dre.despesas.map(conta => (
              <div key={conta.codigo} className={styles.row}>
                <span>{conta.codigo} - {conta.nome}</span>
                <span className={styles.value}>{formatCurrency(conta.valor)}</span>
              </div>
            ))}
            <div className={styles.subtotal}>
              <span>Total de Despesas</span>
              <span className={styles.value}>{formatCurrency(dre.totalDespesas)}</span>
            </div>
          </div>

          <div className={`${styles.resultadoFinal} ${resultadoClass}`}>
            <span>RESULTADO DO EXERCÍCIO ({resultadoText})</span>
            <span>{formatCurrency(Math.abs(dre.resultado))}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
