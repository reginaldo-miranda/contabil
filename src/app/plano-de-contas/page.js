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

  useEffect(() => {
    if (empresaId) {
      loadContas();
    } else {
      setContas([]);
    }
  }, [empresaId]);

  const loadContas = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contas/arvore?empresaId=${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        setContas(data);
      }
    } catch (e) {
      console.error("Erro ao carregar árvore de contas:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCarregarPlano = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contas/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaId: parseInt(empresaId) })
      });
      if (res.ok) {
        await loadContas();
      } else {
        alert("Erro ao carregar plano padrão");
      }
    } catch (e) {
      alert("Erro ao conectar à API");
    } finally {
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
      try {
        const res = await fetch(`/api/contas/${conta.id}`, { method: 'DELETE' });
        if (res.ok) {
          loadContas();
        } else {
          const err = await res.json();
          alert(err.erro || "Erro ao excluir conta");
        }
      } catch (e) {
        alert("Erro ao excluir conta no banco");
      }
    }
  };

  const handleSalvar = async (dados) => {
    try {
      const isEdit = !!editingConta;
      const url = isEdit ? `/api/contas/${editingConta.id}` : '/api/contas';
      const method = isEdit ? 'PUT' : 'POST';

      const body = {
        ...dados,
        empresaId: parseInt(empresaId),
        contaPaiId: contaPai ? contaPai.id : dados.contaPaiId,
        tipo: dados.tipo === 'Sintética' ? 'S' : (dados.tipo === 'Analítica' ? 'A' : dados.tipo),
        natureza: dados.natureza === 'Devedora' ? 'D' : (dados.natureza === 'Credora' ? 'C' : dados.natureza)
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowForm(false);
        loadContas();
      } else {
        const err = await res.json();
        alert(err.erro || "Erro ao salvar conta");
      }
    } catch (e) {
      alert("Erro ao conectar à API");
    }
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
            <div className={styles.actionBar}>
              <BarraBusca onBusca={setBusca} />
              
              <div className={styles.actionButtons}>
                {contas.length === 0 && (
                  <button onClick={handleCarregarPlano} className={styles.btnSecondary}>
                    Carregar Plano CFC
                  </button>
                )}
                <button onClick={handleNovaConta} className={styles.btnPrimary}>
                  <span className={styles.btnIcon}>+</span> Nova Conta
                </button>
                {contas.length > 0 && (
                  <button onClick={() => window.print()} className={styles.btnSecondary}>
                    🖨️ Salvar PDF
                  </button>
                )}
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
