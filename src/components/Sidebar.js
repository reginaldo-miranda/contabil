'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContabil } from '@/context/ContabilContext';
import SeletorEmpresa from './SeletorEmpresa';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout, temPermissao } = useContabil();

  const todosLinks = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: '🏠' },
    { id: 'plano-de-contas', href: '/plano-de-contas', label: 'Plano de Contas', icon: '📋' },
    { id: 'lancamentos', href: '/lancamentos', label: 'Lançamentos', icon: '📝' },
    { id: 'diario', href: '/diario', label: 'Livro Diário', icon: '📒' },
    { id: 'razao', href: '/razao', label: 'Livro Razão', icon: '📖' },
    { id: 'balancete', href: '/balancete', label: 'Balancete', icon: '📄' },
    { id: 'dre', href: '/dre', label: 'DRE', icon: '📈' },
    { id: 'balanco', href: '/balanco', label: 'Balanço Patrimonial', icon: '⚖️' },
    { id: 'backup', href: '/backup', label: 'Backup & Restauração', icon: '💾' },
  ];

  // Adicionar item de Gestão de Usuários exclusivamente para o Administrador Geral
  if (usuario?.email === 'admin@contabil.com') {
    todosLinks.push({ id: 'usuarios', href: '/usuarios', label: 'Gestão de Usuários', icon: '👥' });
  }

  // Filtrar links conforme as permissões do usuário na empresa atual
  const links = todosLinks.filter((link) => {
    if (link.id === 'dashboard' || link.id === 'usuarios') return true;
    return temPermissao(link.id);
  });

  const inicial = usuario?.nome ? usuario.nome.charAt(0).toUpperCase() : 'U';

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <span className={styles.logoIcon}>📊</span>
        <span className={styles.logoText}>ContábilPro</span>
      </div>

      <div className={styles.empresaWrapper}>
        <SeletorEmpresa />
      </div>

      <nav className={styles.nav}>
        {links.map((link, index) => {
          const isActive = pathname === link.href || 
            (link.href !== '/' && pathname.startsWith(link.href));

          return (
            <Link key={index} href={link.href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.icon}>{link.icon}</span>
              <span className={styles.label}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        {usuario && (
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{inicial}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName} title={usuario.nome}>{usuario.nome}</span>
              <span className={styles.userEmail} title={usuario.email}>{usuario.email}</span>
            </div>
            <button
              type="button"
              className={styles.btnLogout}
              onClick={logout}
              title="Encerrar sessão"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        )}
        <div className={styles.version}>v2.0 — Partida Dobrada</div>
      </div>
    </aside>
  );
}

