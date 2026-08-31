'use client';

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import SeletorEmpresa from '../components/SeletorEmpresa';
import { useContabil } from '../context/ContabilContext';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [empresaId, setEmpresaId] = useState(null);
  const { getStats, lancamentos } = useContabil();

  const stats = getStats();

  // Últimos 5 lançamentos
  const ultimosLancamentos = [...lancamentos]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  const formatDate = (d) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const formatCurrency = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>Visão geral do sistema contábil</p>
          </div>
          <SeletorEmpresa onEmpresaChange={setEmpresaId} />
        </header>

        {!empresaId ? (
          <div className={styles.welcomeState}>
            <h2>Bem-vindo ao ContábilPro! 👋</h2>
            <p>Para começar, crie ou selecione uma empresa no seletor acima.</p>
          </div>
        ) : (
          <div className={styles.content}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🔢</div>
                <div className={styles.statInfo}>
                  <h3>Total de Contas</h3>
                  <p>{stats.total}</p>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📄</div>
                <div className={styles.statInfo}>
                  <h3>Analíticas</h3>
                  <p>{stats.analiticas}</p>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📁</div>
                <div className={styles.statInfo}>
                  <h3>Sintéticas</h3>
                  <p>{stats.sinteticas}</p>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📝</div>
                <div className={styles.statInfo}>
                  <h3>Lançamentos</h3>
                  <p>{stats.lancamentosTotal}</p>
                </div>
              </div>
            </div>

            <div className={styles.quickAccess}>
              <h2>Acesso Rápido</h2>
              <div className={styles.actionsGrid}>
                <Link href="/plano-de-contas" className={styles.actionCard}>
                  <div className={styles.actionIcon}>📋</div>
                  <div className={styles.actionContent}>
                    <h3>Plano de Contas</h3>
                    <p>Gerenciar estrutura contábil</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>

                <Link href="/lancamentos" className={styles.actionCard}>
                  <div className={styles.actionIcon}>📝</div>
                  <div className={styles.actionContent}>
                    <h3>Lançamentos</h3>
                    <p>Registrar partida dobrada</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>

                <Link href="/diario" className={styles.actionCard}>
                  <div className={styles.actionIcon}>📒</div>
                  <div className={styles.actionContent}>
                    <h3>Livro Diário</h3>
                    <p>Registro cronológico</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>

                <Link href="/razao" className={styles.actionCard}>
                  <div className={styles.actionIcon}>📖</div>
                  <div className={styles.actionContent}>
                    <h3>Livro Razão</h3>
                    <p>Extrato por conta</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>

                <Link href="/balancete" className={styles.actionCard}>
                  <div className={styles.actionIcon}>📄</div>
                  <div className={styles.actionContent}>
                    <h3>Balancete</h3>
                    <p>Verificação de saldos</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>

                <Link href="/dre" className={styles.actionCard}>
                  <div className={styles.actionIcon}>📈</div>
                  <div className={styles.actionContent}>
                    <h3>DRE</h3>
                    <p>Resultado do exercício</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>

                <Link href="/balanco" className={styles.actionCard}>
                  <div className={styles.actionIcon}>⚖️</div>
                  <div className={styles.actionContent}>
                    <h3>Balanço Patrimonial</h3>
                    <p>Posição patrimonial</p>
                  </div>
                  <span className={styles.actionArrow}>→</span>
                </Link>
              </div>
            </div>

            {ultimosLancamentos.length > 0 && (
              <div className={styles.recentSection}>
                <h2>Últimos Lançamentos</h2>
                <div className={styles.recentList}>
                  {ultimosLancamentos.map(lc => {
                    const val = lc.valor || (lc.partidas ? lc.partidas.filter(p => p.tipo === 'D').reduce((s, p) => s + p.valor, 0) : 0);
                    return (
                      <div key={lc.id} className={styles.recentItem}>
                        <span className={styles.recentDate}>{formatDate(lc.data)}</span>
                        <span className={styles.recentDesc}>{lc.historico}</span>
                        <span className={styles.recentValue}>{formatCurrency(val)}</span>
                      </div>
                    );
                  })}
                </div>
                <Link href="/lancamentos" className={styles.verTodos}>Ver todos →</Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
