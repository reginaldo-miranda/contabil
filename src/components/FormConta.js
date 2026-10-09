'use client';

import { useState, useEffect } from 'react';
import { useContabil } from '../context/ContabilContext';
import styles from './FormConta.module.css';

const normalizeTipo = (tipo) => {
  if (!tipo) return 'S';
  return (tipo === 'A' || tipo === 'Analítica') ? 'A' : 'S';
};

const normalizeNatureza = (nat) => {
  if (!nat) return 'D';
  return (nat === 'C' || nat === 'Credora') ? 'C' : 'D';
};

export default function FormConta({ conta, contaPai, empresaId: empresaIdProp, onSalvar, onFechar }) {
  const { empresaId: empresaIdContext } = useContabil();
  const empresaId = empresaIdProp || empresaIdContext;
  const isEdit = !!conta;
  
  const [formData, setFormData] = useState({
    codigo: '',
    reduzido: '',
    nome: '',
    tipo: 'S',
    natureza: 'D',
    grupo: 'ATIVO',
    nivel: 1
  });

  useEffect(() => {
    if (conta) {
      setFormData({
        codigo: conta.codigo || '',
        reduzido: conta.reduzido != null ? String(conta.reduzido) : '',
        nome: conta.nome || '',
        tipo: normalizeTipo(conta.tipo),
        natureza: normalizeNatureza(conta.natureza),
        grupo: conta.grupo || 'ATIVO',
        nivel: conta.nivel || 1
      });
    } else if (contaPai) {
      // Auto-fill defaults for child
      setFormData({
        codigo: contaPai.codigo ? `${contaPai.codigo}.` : '',
        reduzido: '',
        nome: '',
        tipo: 'A',
        natureza: normalizeNatureza(contaPai.natureza),
        grupo: contaPai.grupo || 'ATIVO',
        nivel: (contaPai.nivel || 1) + 1
      });
    }
  }, [conta, contaPai]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.codigo || !formData.nome) return;
    
    // Simulate API call
    const savedData = {
      id: conta ? conta.id : undefined,
      ...formData,
      reduzido: formData.tipo === 'A'
        ? (formData.reduzido && formData.reduzido.trim() !== '' ? parseInt(formData.reduzido, 10) : undefined)
        : null,
      empresaId
    };
    
    onSalvar(savedData);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Editar Conta' : 'Nova Conta'}</h2>
          <button className={styles.closeBtn} onClick={onFechar}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.parentInfo}>
            <span className={styles.parentLabel}>Conta Pai:</span>
            <span className={styles.parentValue}>
              {contaPai ? `${contaPai.codigo} - ${contaPai.nome}` : 'Nenhuma (conta raiz)'}
            </span>
          </div>
          
          <div className={styles.row}>
            <div className={styles.group}>
              <label>Código</label>
              <input 
                type="text" 
                required
                value={formData.codigo}
                onChange={e => setFormData({...formData, codigo: e.target.value})}
                placeholder="Ex: 1.1.1.01.001"
              />
            </div>
            
            <div className={styles.group}>
              <label>Nível</label>
              <input 
                type="number" 
                min="1" max="5"
                required
                value={formData.nivel}
                onChange={e => setFormData({...formData, nivel: parseInt(e.target.value) || 1})}
              />
            </div>
          </div>
          
          <div className={styles.group}>
            <label>Nome</label>
            <input 
              type="text" 
              required
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
            />
          </div>
          
          <div className={styles.row}>
            <div className={styles.group}>
              <label>Tipo</label>
              <select 
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="S">Sintética</option>
                <option value="A">Analítica</option>
              </select>
            </div>

            {formData.tipo === 'A' && (
              <div className={styles.group}>
                <label title="Número sequencial de atalho para lançamentos">
                  Cód. Reduzido <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>(auto)</span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.reduzido}
                  onChange={e => setFormData({...formData, reduzido: e.target.value})}
                  placeholder="Automático"
                />
              </div>
            )}
            
            <div className={styles.group}>
              <label>Natureza</label>
              <select 
                value={formData.natureza}
                onChange={e => setFormData({...formData, natureza: e.target.value})}
              >
                <option value="D">Devedora</option>
                <option value="C">Credora</option>
              </select>
            </div>
            
            <div className={styles.group}>
              <label>Grupo</label>
              <select 
                value={formData.grupo}
                onChange={e => setFormData({...formData, grupo: e.target.value})}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="PASSIVO">PASSIVO</option>
                <option value="PL">PL</option>
                <option value="RECEITA">RECEITA</option>
                <option value="DESPESA">DESPESA</option>
              </select>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button type="button" onClick={onFechar} className={styles.btnCancel}>Cancelar</button>
            <button type="submit" className={styles.btnSave}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
