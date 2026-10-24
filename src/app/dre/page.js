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

  // DRE do período filtrado
  const dre = useMemo(() => {
    return getDRE(dataInicio, dataFim);
  }, [dataInicio, dataFim, getDRE]);

  // Ano de referência extraído da data fim
  const anoReferencia = useMemo(() => {
    if (!dataFim) return new Date().getFullYear();
    const parts = dataFim.split('-');
    const year = parseInt(parts[0], 10);
    return isNaN(year) ? new Date().getFullYear() : year;
  }, [dataFim]);

  // DRE do acumulado anual completo (01/01 a 31/12)
  const dreAnual = useMemo(() => {
    return getDRE(`${anoReferencia}-01-01`, `${anoReferencia}-12-31`);
  }, [anoReferencia, getDRE]);

  const formatCurrency = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDateBR = (isoStr) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Margens líquidas (%)
  const margemFiltrada = useMemo(() => {
    if (!dre.totalReceitas || dre.totalReceitas === 0) return 0;
    return (dre.resultado / dre.totalReceitas) * 100;
  }, [dre]);

  const margemAnual = useMemo(() => {
    if (!dreAnual.totalReceitas || dreAnual.totalReceitas === 0) return 0;
    return (dreAnual.resultado / dreAnual.totalReceitas) * 100;
  }, [dreAnual]);

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

  // Atalhos rápidos de período
  const handleMesAtual = () => {
    const hoje = new Date();
    const a = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, '0');
    const d = String(hoje.getDate()).padStart(2, '0');
    setDataInicio(`${a}-${m}-01`);
    setDataFim(`${a}-${m}-${d}`);
  };

  const handleMesAnterior = () => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    
    const fmt = (dt) => {
      const a = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${a}-${m}-${d}`;
    };

    setDataInicio(fmt(primeiroDia));
    setDataFim(fmt(ultimoDia));
  };

  const handleAnoTodo = () => {
    setDataInicio(`${anoReferencia}-01-01`);
    setDataFim(`${anoReferencia}-12-31`);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>📈 DRE</h1>
          <p className={styles.subtitle}>Demonstração do Resultado do Exercício</p>
        </div>

        {/* Barra de Filtros e Atalhos Rápidos */}
        <div className={styles.filterBar}>
          <div className={styles.filterInputs}>
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

          <div className={styles.quickFilters}>
            <span className={styles.quickLabel}>Atalhos:</span>
            <button type="button" onClick={handleMesAtual} className={styles.quickBtn}>
              📅 Mês Atual
            </button>
            <button type="button" onClick={handleMesAnterior} className={styles.quickBtn}>
              ⏪ Mês Anterior
            </button>
            <button type="button" onClick={handleAnoTodo} className={styles.quickBtn}>
              🌐 Ano Todo ({anoReferencia})
            </button>
          </div>
        </div>

        {/* Dashboard Comparativo: Período Filtrado vs Acumulado Anual */}
        <div className={styles.dashboardGrid}>
          {/* Card 1: Período Filtrado */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div>
                <div className={styles.kpiTitle}>
                  <span>📅 Período Selecionado</span>
                </div>
                <div className={styles.kpiSubtitle}>
                  {formatDateBR(dataInicio)} até {formatDateBR(dataFim)}
                </div>
              </div>
              <span className={styles.kpiTag}>Filtrado</span>
            </div>

            <div className={styles.kpiRows}>
              <div className={styles.kpiRow}>
                <span>Receitas Totais</span>
                <span className={`${styles.kpiVal} ${styles.kpiReceita}`}>
                  {formatCurrency(dre.totalReceitas)}
                </span>
              </div>
              <div className={styles.kpiRow}>
                <span>Despesas Totais</span>
                <span className={`${styles.kpiVal} ${styles.kpiDespesa}`}>
                  {formatCurrency(dre.totalDespesas)}
                </span>
              </div>
            </div>

            <div className={styles.kpiResultadoBox}>
              <span className={`${styles.kpiResultadoLabel} ${isLucro ? styles.lucro : isPrejuizo ? styles.prejuizo : styles.nulo}`}>
                {dre.resultado >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido'}
              </span>
              <span className={`${styles.kpiResultadoValor} ${isLucro ? styles.lucro : isPrejuizo ? styles.prejuizo : styles.nulo}`}>
                {formatCurrency(Math.abs(dre.resultado))}
              </span>
            </div>

            <div className={styles.kpiMargem}>
              <span>Margem Líquida</span>
              <span>{margemFiltrada.toFixed(1)}%</span>
            </div>
          </div>

          {/* Card 2: Acumulado Anual */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div>
                <div className={styles.kpiTitle}>
                  <span>🌐 Acumulado Anual ({anoReferencia})</span>
                </div>
                <div className={styles.kpiSubtitle}>
                  01/01/{anoReferencia} até 31/12/{anoReferencia}
                </div>
              </div>
              <span className={`${styles.kpiTag} ${styles.kpiTagAnual}`}>Ano Todo</span>
            </div>

            <div className={styles.kpiRows}>
              <div className={styles.kpiRow}>
                <span>Receitas Totais do Ano</span>
                <span className={`${styles.kpiVal} ${styles.kpiReceita}`}>
                  {formatCurrency(dreAnual.totalReceitas)}
                </span>
              </div>
              <div className={styles.kpiRow}>
                <span>Despesas Totais do Ano</span>
                <span className={`${styles.kpiVal} ${styles.kpiDespesa}`}>
                  {formatCurrency(dreAnual.totalDespesas)}
                </span>
              </div>
            </div>

            <div className={styles.kpiResultadoBox}>
              <span className={`${styles.kpiResultadoLabel} ${dreAnual.resultado > 0 ? styles.lucro : dreAnual.resultado < 0 ? styles.prejuizo : styles.nulo}`}>
                {dreAnual.resultado >= 0 ? 'Lucro Acumulado' : 'Prejuízo Acumulado'}
              </span>
              <span className={`${styles.kpiResultadoValor} ${dreAnual.resultado > 0 ? styles.lucro : dreAnual.resultado < 0 ? styles.prejuizo : styles.nulo}`}>
                {formatCurrency(Math.abs(dreAnual.resultado))}
              </span>
            </div>

            <div className={styles.kpiMargem}>
              <span>Margem Líquida Anual</span>
              <span>{margemAnual.toFixed(1)}%</span>
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
