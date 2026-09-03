'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useContabil } from '@/context/ContabilContext';
import styles from './Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { setUsuario, loadEmpresas } = useContabil();

  const [tab, setTab] = useState('login'); // 'login' | 'registro'
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  // Formulário Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');

  // Formulário Registro
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regConfirmaSenha, setRegConfirmaSenha] = useState('');
  const [regNomeEmpresa, setRegNomeEmpresa] = useState('');
  const [regCnpjEmpresa, setRegCnpjEmpresa] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, senha: loginSenha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || 'Erro ao realizar login');
        setLoading(false);
        return;
      }

      if (data.usuario) {
        setUsuario(data.usuario);
      }

      await loadEmpresas();
      router.push('/');
      router.refresh();
    } catch (err) {
      setErro('Erro de conexão ao servidor');
      setLoading(false);
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setErro('');

    if (regSenha !== regConfirmaSenha) {
      setErro('As senhas não coincidem');
      return;
    }

    if (regSenha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: regNome,
          email: regEmail,
          senha: regSenha,
          nomeEmpresa: regNomeEmpresa,
          cnpjEmpresa: regCnpjEmpresa,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.erro || 'Erro ao cadastrar usuário');
        setLoading(false);
        return;
      }

      if (data.usuario) {
        setUsuario(data.usuario);
      }

      await loadEmpresas();
      router.push('/');
      router.refresh();
    } catch (err) {
      setErro('Erro de conexão ao servidor');
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glowOrb} />

      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
              <path d="M6 6h10"/>
              <path d="M6 10h10"/>
              <path d="M6 14h6"/>
            </svg>
          </div>
          <h1 className={styles.title}>Contábil<span>Pro</span></h1>
          <p className={styles.subtitle}>Gestão Contábil Multi-Empresa</p>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'login' ? styles.active : ''}`}
            onClick={() => { setTab('login'); setErro(''); }}
          >
            Acessar Conta
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'registro' ? styles.active : ''}`}
            onClick={() => { setTab('registro'); setErro(''); }}
          >
            Criar Nova Conta
          </button>
        </div>

        {erro && (
          <div className={styles.error}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{erro}</span>
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>E-mail</label>
              <input
                type="email"
                required
                className={styles.input}
                placeholder="exemplo@contabil.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Senha</label>
              <input
                type="password"
                required
                className={styles.input}
                placeholder="Sua senha de acesso"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? <div className={styles.spinner} /> : 'Entrar no Sistema'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegistro} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Seu Nome Completo</label>
              <input
                type="text"
                required
                className={styles.input}
                placeholder="Ex: Carlos Silva"
                value={regNome}
                onChange={(e) => setRegNome(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>E-mail de Acesso</label>
              <input
                type="email"
                required
                className={styles.input}
                placeholder="carlos@empresa.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Senha</label>
                <input
                  type="password"
                  required
                  className={styles.input}
                  placeholder="Mínimo 6 dígitos"
                  value={regSenha}
                  onChange={(e) => setRegSenha(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Confirmar Senha</label>
                <input
                  type="password"
                  required
                  className={styles.input}
                  placeholder="Repita a senha"
                  value={regConfirmaSenha}
                  onChange={(e) => setRegConfirmaSenha(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.divider}>Primeira Empresa</div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Razão Social / Nome da Empresa</label>
              <input
                type="text"
                required
                className={styles.input}
                placeholder="Ex: Minha Empresa LTDA"
                value={regNomeEmpresa}
                onChange={(e) => setRegNomeEmpresa(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>CNPJ (Opcional)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="00.000.000/0001-00"
                value={regCnpjEmpresa}
                onChange={(e) => setRegCnpjEmpresa(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? <div className={styles.spinner} /> : 'Concluir Cadastro e Entrar'}
            </button>
          </form>
        )}

        <div className={styles.footerInfo}>
          Ambiente Seguro com Criptografia de Ponta a Ponta
        </div>
      </div>
    </div>
  );
}
