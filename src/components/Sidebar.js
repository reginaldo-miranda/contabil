'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: '🏠', disabled: false },
    { href: '/plano-de-contas', label: 'Plano de Contas', icon: '📋', disabled: false },
    { href: '/lancamentos', label: 'Lançamentos', icon: '📝', disabled: false },
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

      <nav className={styles.nav}>
        {links.map((link, index) => {
          const isActive = pathname === link.href;
          const isDashboard = link.href === '/' && pathname === '/';
          const isPlano = link.href === '/plano-de-contas' && pathname.startsWith('/plano-de-contas');
          const isLancamento = link.href === '/lancamentos' && pathname.startsWith('/lancamentos');
          const isBalancete = link.href === '/balancete' && pathname.startsWith('/balancete');
          const isDre = link.href === '/dre' && pathname.startsWith('/dre');
          const isBalanco = link.href === '/balanco' && pathname.startsWith('/balanco');
          const isBackup = link.href === '/backup' && pathname.startsWith('/backup');
          const activeClass = (isActive || isPlano || isLancamento || isBalancete || isDre || isBalanco || isBackup || isDashboard) && !link.disabled ? styles.active : '';

          return link.disabled ? (
            <div key={index} className={`${styles.navItem} ${styles.disabled}`}>
              <span className={styles.icon}>{link.icon}</span>
              <span className={styles.label}>{link.label}</span>
              <span className={styles.badge}>Em breve</span>
            </div>
          ) : (
            <Link key={index} href={link.href} className={`${styles.navItem} ${activeClass}`}>
              <span className={styles.icon}>{link.icon}</span>
              <span className={styles.label}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <span>v1.0</span>
      </div>
    </aside>
  );
}
