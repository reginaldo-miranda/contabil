'use client';

import { useState, useMemo } from 'react';
import { useContabil } from '../context/ContabilContext';
import FormConta from './FormConta';
import SeletorContaComBusca from './SeletorContaComBusca';
import styles from './FormLancamento.module.css';

export default function FormLancamento({ onSalvar, onFechar }) {
  const { empresaId, getContasAnaliticas, refreshData } = useContabil();
  const contas = getContasAnaliticas();

  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [documento, setDocumento] = useState('');
  const [historico, setHistorico] = useState('');
  const [debitos, setDebitos] = useState([{ id: 1, contaId: '', valor: '' }]);
  const [creditos, setCreditos] = useState([{ id: 2, contaId: '', valor: '' }]);
  const [showFormConta, setShowFormConta] = useState(false);
  const [loading, setLoading] = useState(false);

  // Totais
  const totalDebitos = useMemo(() => {
    return debitos.reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0);
  }, [debitos]);

  const totalCreditos = useMemo(() => {
    return creditos.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0);
  }, [creditos]);

  const diferenca = Math.abs(totalDebitos - totalCreditos);
  const hasValues = totalDebitos > 0 || totalCreditos > 0;
  const isBalanced = totalDebitos > 0 && diferenca < 0.001;

  // Handler Débitos
  const handleAddDebito = () => {
    setDebitos([...debitos, { id: Date.now(), contaId: '', valor: '' }]);
  };
  const handleRemoveDebito = (id) => {
    if (debitos.length > 1) {
      setDebitos(debitos.filter(d => d.id !== id));
    }
  };
  const handleDebitoChange = (id, field, value) => {
    setDebitos(debitos.map(d => d.id === id ? { ...d, [field]: value } : d));
    // Se for alteracao no valor e houver exatamente 1 Debito e 1 Credito, autopreenche o Credito
    if (field === 'valor' && debitos.length === 1 && creditos.length === 1) {
      setCreditos(creditos.map(c => ({ ...c, valor: value })));
    }
  };

  // Handler Créditos
  const handleAddCredito = () => {
    setCreditos([...creditos, { id: Date.now(), contaId: '', valor: '' }]);
  };
  const handleRemoveCredito = (id) => {
    if (creditos.length > 1) {
      setCreditos(creditos.filter(c => c.id !== id));
    }
  };
  const handleCreditoChange = (id, field, value) => {
    setCreditos(creditos.map(c => c.id === id ? { ...c, [field]: value } : c));
    // Se for alteracao no valor e houver exatamente 1 Debito e 1 Credito, autopreenche o Debito
    if (field === 'valor' && debitos.length === 1 && creditos.length === 1) {
      setDebitos(debitos.map(d => ({ ...d, valor: value })));
    }
  };

  const isFormValid = () => {
    if (!data || !documento || !historico) return false;
    if (!isBalanced) return false;

    for (let d of debitos) {
      if (!d.contaId || !(parseFloat(d.valor) > 0)) return false;
    }
    for (let c of creditos) {
      if (!c.contaId || !(parseFloat(c.valor) > 0)) return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);

    // Para compatibilidade com a API MySQL existente (salva a partida principal e lança os dados)
    const success = await onSalvar({
      data,
      documento,
      historico,
      empresaId: parseInt(empresaId),
      contaDebitoId: parseInt(debitos[0].contaId),
      contaCreditoId: parseInt(creditos[0].contaId),
      valor: totalDebitos,
      debitos: debitos.map(d => ({ contaId: parseInt(d.contaId), valor: parseFloat(d.valor) })),
      creditos: creditos.map(c => ({ contaId: parseInt(c.contaId), valor: parseFloat(c.valor) }))
    });

    setLoading(false);
    if (success) {
      onFechar();
    }
  };

  const handleContaCriada = async (novaConta) => {
    try {
      const res = await fetch('/api/contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novaConta, empresaId: parseInt(empresaId), tipo: 'A' })
      });
      if (res.ok) {
        if (refreshData) await refreshData();
        setShowFormConta(false);
      } else {
        const err = await res.json();
        alert(err.erro || "Erro ao cadastrar nova conta");
      }
    } catch (e) {
      alert("Erro ao salvar conta no banco");
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} style={{ maxWidth: '750px' }}>
        <div className={styles.header} style={{ padding: '10px 16px' }}>
          <h2 className={styles.title} style={{ fontSize: '1rem' }}>Lançamento por Partida Dobrada</h2>
          <button type="button" className={styles.closeButton} onClick={onFechar}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} style={{ padding: '12px 16px', gap: '8px', overflowY: 'auto', maxHeight: '78vh' }}>
          <div className={styles.formGrid} style={{ gap: '10px' }}>
            <div className={styles.formGroup}>
              <label>Data</label>
              <input 
                type="date" 
                value={data} 
                onChange={e => setData(e.target.value)} 
                required 
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Documento / Ref.</label>
              <input 
                type="text" 
                value={documento} 
                onChange={e => setDocumento(e.target.value)} 
                required 
                className={styles.input}
                placeholder="Ex: NF-00123"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Histórico Contábil</label>
            <textarea 
              value={historico} 
              onChange={e => setHistorico(e.target.value)} 
              required 
              className={styles.textarea}
              placeholder="Descrição do lançamento..."
              rows={1}
              style={{ minHeight: '36px', height: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Partidas de Débito e Crédito</span>
            <button 
              type="button" 
              onClick={() => setShowFormConta(true)}
              style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            >
              + Nova Conta Analítica
            </button>
          </div>

          {/* DÉBITOS */}
          <div style={{ background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '8px 10px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--ativo)', fontWeight: 'bold', fontSize: '12px' }}>Contas de DÉBITO (D)</span>
              <button type="button" onClick={handleAddDebito} style={{ background: 'var(--ativo)', color: '#000', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                + Add Débito
              </button>
            </div>
            {debitos.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', gap: '8px', marginBottom: idx === debitos.length - 1 ? 0 : '4px', alignItems: 'center' }}>
                <SeletorContaComBusca 
                  contas={contas}
                  value={item.contaId}
                  onChange={val => handleDebitoChange(item.id, 'contaId', val)}
                  placeholder="Selecione a conta de débito..."
                />
                <input 
                  type="number" step="0.01" min="0.01" value={item.valor} 
                  onChange={e => handleDebitoChange(item.id, 'valor', e.target.value)}
                  className={styles.input} style={{ width: '110px', padding: '4px 8px' }} placeholder="Valor" required
                />
                {debitos.length > 1 && (
                  <button type="button" onClick={() => handleRemoveDebito(item.id)} style={{ background: 'transparent', color: '#fb7185', border: 'none', cursor: 'pointer', fontSize: '14px' }}>&times;</button>
                )}
              </div>
            ))}
          </div>

          {/* CRÉDITOS */}
          <div style={{ background: 'rgba(251, 113, 133, 0.05)', border: '1px solid rgba(251, 113, 133, 0.2)', padding: '8px 10px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--passivo)', fontWeight: 'bold', fontSize: '12px' }}>Contas de CRÉDITO (C)</span>
              <button type="button" onClick={handleAddCredito} style={{ background: 'var(--passivo)', color: '#000', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                + Add Crédito
              </button>
            </div>
            {creditos.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', gap: '8px', marginBottom: idx === creditos.length - 1 ? 0 : '4px', alignItems: 'center' }}>
                <SeletorContaComBusca 
                  contas={contas}
                  value={item.contaId}
                  onChange={val => handleCreditoChange(item.id, 'contaId', val)}
                  placeholder="Selecione a conta de crédito..."
                />
                <input 
                  type="number" step="0.01" min="0.01" value={item.valor} 
                  onChange={e => handleCreditoChange(item.id, 'valor', e.target.value)}
                  className={styles.input} style={{ width: '110px', padding: '4px 8px' }} placeholder="Valor" required
                />
                {creditos.length > 1 && (
                  <button type="button" onClick={() => handleRemoveCredito(item.id)} style={{ background: 'transparent', color: '#fb7185', border: 'none', cursor: 'pointer', fontSize: '14px' }}>&times;</button>
                )}
              </div>
            ))}
          </div>

          {/* PAINEL DE BALANÇO (∑D = ∑C) */}
          <div style={{ 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center', 
            padding: '6px 10px', 
            borderRadius: '6px', 
            background: !hasValues ? 'rgba(255, 255, 255, 0.05)' : (isBalanced ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)'), 
            border: `1px solid ${!hasValues ? 'var(--border-glass)' : (isBalanced ? 'var(--ativo)' : 'var(--passivo)')}`, 
            fontSize: '12px' 
          }}>
            <div>
              <span style={{ marginRight: '12px', color: 'var(--ativo)', fontWeight: 'bold' }}>Débitos: {formatCurrency(totalDebitos)}</span>
              <span style={{ color: 'var(--passivo)', fontWeight: 'bold' }}>Créditos: {formatCurrency(totalCreditos)}</span>
            </div>
            <div>
              {!hasValues ? (
                <span style={{ color: 'var(--text-muted)' }}>ℹ️ Preencha as contas e valores</span>
              ) : isBalanced ? (
                <span style={{ color: 'var(--ativo)', fontWeight: 'bold' }}>✓ Equilibrado (D = C)</span>
              ) : (
                <span style={{ color: 'var(--passivo)', fontWeight: 'bold' }}>⚠️ Diferença: {formatCurrency(diferenca)}</span>
              )}
            </div>
          </div>

          <div className={styles.footer} style={{ padding: '6px 0 0 0', background: 'transparent', borderTop: 'none' }}>
            <button type="button" onClick={onFechar} className={styles.btnCancel} style={{ padding: '5px 12px', fontSize: '12px' }}>Cancelar</button>
            <button type="submit" disabled={!isFormValid() || loading} className={styles.btnSave} style={{ padding: '5px 16px', fontSize: '12px' }}>
              {loading ? 'Salvando...' : 'Salvar Lançamento (MySQL)'}
            </button>
          </div>
        </form>

        {showFormConta && (
          <FormConta 
            empresaId={parseInt(empresaId)}
            onSalvar={handleContaCriada}
            onFechar={() => setShowFormConta(false)}
          />
        )}
      </div>
    </div>
  );
}
