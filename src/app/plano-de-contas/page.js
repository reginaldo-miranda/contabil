'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import SeletorEmpresa from '../../components/SeletorEmpresa';
import BarraBusca from '../../components/BarraBusca';
import ArvoreContas from '../../components/ArvoreContas';
import FormConta from '../../components/FormConta';
import styles from './PlanoContas.module.css';

export default function PlanoContas() {
  const [empresaId, setEmpresaId] = useState(null);
  const [contas, setContas] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingConta, setEditingConta] = useState(null);
  const [contaPai, setContaPai] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (empresaId) {
      loadContas(empresaId);
    } else {
      setContas([]);
    }
  }, [empresaId]);

  const loadContas = async (id = empresaId) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/contas/arvore?empresaId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setContas(data);
      } else {
        const errData = await res.json();
        setError(errData.erro || 'Erro ao carregar o plano de contas');
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
      setError('Erro de conexão ao buscar plano de contas');
    } finally {
      setLoading(false);
    }
  };

  const handleCarregarPlano = async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contas/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId }),
      });
      const data = await res.json();
      if (res.ok) {
        loadContas(empresaId);
      } else {
        setError(data.erro || 'Erro ao carregar o plano padrão CFC');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
      setError('Erro de conexão ao carregar o plano padrão');
      setLoading(false);
    }
  };

  const handleNovaConta = () => {
    setEditingConta(null);
    setContaPai(null);
    setShowForm(true);
  };

  const handleEditar = (conta) => {
    setEditingConta(conta);
    setContaPai(null);
    setShowForm(true);
  };

  const handleAdicionarFilha = (pai) => {
    setEditingConta(null);
    setContaPai(pai);
    setShowForm(true);
  };

  const handleExcluir = async (conta) => {
    if (window.confirm(`Tem certeza que deseja excluir a conta ${conta.codigo} - ${conta.nome}?`)) {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/contas/${conta.id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (res.ok) {
          loadContas(empresaId);
        } else {
          setError(data.erro || 'Erro ao excluir conta');
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro de conexão:', err);
        setError('Erro de conexão ao tentar excluir conta');
        setLoading(false);
      }
    }
  };

  const handleSalvar = () => {
    setShowForm(false);
    loadContas(empresaId);
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.titleIcon}>📋</span>
            <div>
              <h1 className={styles.title}>Plano de Contas</h1>
              <p className={styles.subtitle}>Estrutura contábil da empresa</p>
            </div>
          </div>
          <SeletorEmpresa onEmpresaChange={setEmpresaId} />
        </header>

        {empresaId ? (
          <div className={styles.content}>
            {error && (
              <div className={styles.errorArea} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid #f43f5e', color: '#f43f5e', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                {error}
              </div>
            )}

            <div className={styles.actionBar}>
              <BarraBusca onBusca={setBusca} />
              
              <div className={styles.actionButtons}>
                {contas.length === 0 && !loading && (
                  <button onClick={handleCarregarPlano} className={styles.btnSecondary}>
                    Carregar Plano CFC
                  </button>
                )}
                <button onClick={handleNovaConta} className={styles.btnPrimary}>
                  <span className={styles.btnIcon}>+</span> Nova Conta
                </button>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Carregando contas...</p>
              </div>
            ) : (
              <ArvoreContas 
                contas={contas}
                busca={busca}
                onEditar={handleEditar}
                onExcluir={handleExcluir}
                onAdicionarFilha={handleAdicionarFilha}
              />
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Selecione ou crie uma empresa para gerenciar o plano de contas.
          </div>
        )}

        {showForm && (
          <FormConta 
            conta={editingConta}
            contaPai={contaPai}
            empresaId={empresaId}
            onSalvar={handleSalvar}
            onFechar={() => setShowForm(false)}
          />
        )}
      </main>
    </div>
  );
}
