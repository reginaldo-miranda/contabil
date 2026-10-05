'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useContabil } from '@/context/ContabilContext';
import SeletorEmpresa from './SeletorEmpresa';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const pathname = usePathname();
  const { usuario, logout, temPermissao } = useContabil();
  const [ambiente, setAmbiente] = useState(null);
  const [modalDesligarAberto, setModalDesligarAberto] = useState(false);
  const [statusDesligamento, setStatusDesligamento] = useState('idle'); // 'idle' | 'enviando' | 'sucesso'

  useEffect(() => {
    fetch('/api/ambiente')
      .then((res) => res.json())
      .then((data) => setAmbiente(data))
      .catch(() => {});
  }, []);

  const handleConfirmarDesligamento = async () => {
    try {
      setStatusDesligamento('enviando');
      const res = await fetch('/api/sistema/desligar', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Falha ao processar desligamento');
      }
      setStatusDesligamento('sucesso');
    } catch (err) {
      console.error(err);
      alert('Não foi possível enviar o comando para desligar o sistema.');
      setStatusDesligamento('idle');
      setModalDesligarAberto(false);
    }
  };

  const todosLinks = [
    { id: 'dashboard', href: '/', label: 'Dashboard', icon: '🏠' },
    { id: 'plano-de-contas', href: '/plano-de-contas', label: 'Plano de Contas', icon: '📋' },
    { id: 'lancamentos', href: '/lancamentos', label: 'Lançamentos', icon: '📝' },
    { id: 'modelos-lancamento', href: '/modelos-lancamento', label: 'Modelos de Lançamento', icon: '⚡' },
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
    if (link.id === 'modelos-lancamento') return temPermissao('lancamentos');
    return temPermissao(link.id);
  });

  const inicial = usuario?.nome ? usuario.nome.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <div className={styles.logoHeader}>
            <span className={styles.logoIcon}>📊</span>
            <span className={styles.logoText}>ContábilPro</span>
          </div>
          {ambiente && (
            <div
              className={`${styles.ambienteBadge} ${ambiente.isCloud ? styles.ambienteNuvem : styles.ambienteLocal}`}
              title={`Banco ativo: ${ambiente.label}`}
            >
              <span className={styles.ambienteDot}></span>
              <span>{ambiente.isCloud ? '☁️ Nuvem (Aiven)' : '🟢 Banco Local'}</span>
            </div>
          )}
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
              <div className={styles.userActions}>
                <button
                  type="button"
                  className={styles.btnLogout}
                  onClick={logout}
                  title="Encerrar sessão (Logout)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className={styles.btnPower}
                  onClick={() => setModalDesligarAberto(true)}
                  title="Desligar Sistema e Serviços"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className={styles.version}>v2.0 — Partida Dobrada</div>
        </div>
      </aside>

      {/* Modal de Confirmação de Desligamento */}
      {modalDesligarAberto && (
        <div className={styles.modalBackdrop} onClick={() => statusDesligamento !== 'enviando' && setModalDesligarAberto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconAlert}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
              </div>
              <h3 className={styles.modalTitle}>Desligar Sistema Completo?</h3>
            </div>

            <p className={styles.modalDesc}>
              Esta ação irá parar o servidor do ContábilPro e finalizar os serviços locais em execução na máquina:
            </p>

            <div className={styles.modalInfoList}>
              <div>• Encerra o processo do servidor web (Next.js / PM2)</div>
              <div>• Libera a porta de rede 3000</div>
              <div>• {ambiente?.isCloud ? 'Mantém o banco na nuvem seguro e inalterado' : 'Finaliza o serviço local do banco de dados (MySQL)'}</div>
            </div>

            <div className={styles.modalButtons}>
              <button
                type="button"
                className={styles.btnCancelar}
                onClick={() => setModalDesligarAberto(false)}
                disabled={statusDesligamento === 'enviando'}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnDesligarConfirm}
                onClick={handleConfirmarDesligamento}
                disabled={statusDesligamento === 'enviando'}
              >
                {statusDesligamento === 'enviando' ? 'Desligando...' : 'Sim, Desligar Sistema'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tela Cheia de Sistema Encerrado */}
      {statusDesligamento === 'sucesso' && (
        <div className={styles.shutdownFullOverlay}>
          <div className={styles.shutdownCard}>
            <div className={styles.shutdownIconBadge}>✓</div>
            <h2 className={styles.shutdownTitle}>Sistema Encerrado</h2>
            <p className={styles.shutdownMessage}>
              O servidor do <strong>ContábilPro</strong> e os serviços foram finalizados com sucesso.
              <br /><br />
              Você já pode fechar esta aba do navegador com segurança.
            </p>
            <button
              type="button"
              className={styles.shutdownCloseBtn}
              onClick={() => window.close()}
            >
              Fechar Aba
            </button>
          </div>
        </div>
      )}
    </>
  );
}
