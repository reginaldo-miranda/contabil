'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SeletorEmpresa from './SeletorEmpresa';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: '🏠', disabled: false },
    { href: '/plano-de-contas', label: 'Plano de Contas', icon: '📋', disabled: false },
    { href: '/lancamentos', label: 'Lançamentos', icon: '📝', disabled: false },
    { href: '/diario', label: 'Livro Diário', icon: '📒', disabled: false },
    { href: '/razao', label: 'Livro Razão', icon: '📖', disabled: false },
    { href: '/balancete', label: 'Balancete', icon: '📄', disabled: false },
    { href: '/dre', label: 'DRE', icon: '📈', disabled: false },
    { href: '/balanco', label: 'Balanço Patrimonial', icon: '⚖️', disabled: false },
    { href: '/backup', label: 'Backup & Restauração', icon: '💾', disabled: false },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <span className={styles.logoIcon}>📊</span>
        <span className={styles.logoText}>ContábilPro</span>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
        <SeletorEmpresa />
      </div>

      <nav className={styles.nav}>
        {links.map((link, index) => {
          const isActive = pathname === link.href || 
            (link.href !== '/' && pathname.startsWith(link.href));

          return link.disabled ? (
            <div key={index} className={`${styles.navItem} ${styles.disabled}`}>
              <span className={styles.icon}>{link.icon}</span>
              <span className={styles.label}>{link.label}</span>
              <span className={styles.badge}>Em breve</span>
            </div>
          ) : (
            <Link key={index} href={link.href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.icon}>{link.icon}</span>
              <span className={styles.label}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <span>v2.0 — Partida Dobrada</span>
      </div>
    </aside>
  );
}
