'use client';

import Link from 'next/link';

export default function AcessoBloqueado({ moduloNome = 'este módulo' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      minHeight: '60vh',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(251, 113, 133, 0.15)',
        border: '1px solid rgba(251, 113, 133, 0.3)',
        color: '#fb7185',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        marginBottom: '1.5rem',
      }}>
        🔒
      </div>
      <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 700 }}>
        Acesso Restrito
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Você não possui permissão para acessar {moduloNome} nesta empresa. Solicite autorização ao Administrador.
      </p>
      <Link
        href="/"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
          color: '#fff',
          padding: '0.7rem 1.5rem',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: '0 4px 12px var(--accent-glow)',
        }}
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
