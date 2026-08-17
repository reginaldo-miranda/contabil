'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';
import SeletorEmpresa from '../components/SeletorEmpresa';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [empresaId, setEmpresaId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    analiticas: 0,
    sinteticas: 0,
    grupos: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (empresaId) {
      fetchStats(empresaId);
    } else {
      setStats({ total: 0, analiticas: 0, sinteticas: 0, grupos: 0 });
    }
  }, [empresaId]);

  const fetchStats = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contas?empresaId=${id}`);
      if (res.ok) {
        const contas = await res.json();
        const total = contas.length;
        const analiticas = contas.filter(c => c.tipo === 'A').length;
        const sinteticas = contas.filter(c => c.tipo === 'S').length;
        
        // Count unique groups
        const uniqueGroups = new Set(contas.map(c => c.grupo));
        
        setStats({
          total,
          analiticas,
          sinteticas,
          grupos: uniqueGroups.size || 0
        });
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

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
            {loading ? (
              <div className={styles.loadingState} style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center' }}>
                Carregando estatísticas...
              </div>
            ) : (
              <>
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
                    <div className={styles.statIcon}>🗂️</div>
                    <div className={styles.statInfo}>
                      <h3>Grupos</h3>
                      <p>{stats.grupos}</p>
                    </div>
                  </div>
                </div>

                <div className={styles.quickAccess}>
                  <h2>Acesso Rápido</h2>
                  <div className={styles.actionCard}>
                    <div className={styles.actionIcon}>📋</div>
                    <div className={styles.actionContent}>
                      <h3>Plano de Contas</h3>
                      <p>Gerencie a estrutura de contas contábeis da empresa selecionada.</p>
                    </div>
                    <Link href="/plano-de-contas" className={styles.actionBtn}>
                      Acessar →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
