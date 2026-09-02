'use client';

import { useState } from 'react';
import { useContabil } from '../context/ContabilContext';
import styles from './SeletorEmpresa.module.css';

export default function SeletorEmpresa({ onEmpresaChange }) {
  const { empresaId, setEmpresaId, empresas, loadEmpresas } = useContabil();
  const [showForm, setShowForm] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', cnpj: '' });

  const handleChange = (e) => {
    const id = e.target.value;
    setEmpresaId(id);
    if (onEmpresaChange) onEmpresaChange(id);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novaEmpresa.nome) return;

    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaEmpresa)
      });
      if (res.ok) {
        const nova = await res.json();
        if (loadEmpresas) await loadEmpresas();
        const newId = nova.id.toString();
        setEmpresaId(newId);
        if (onEmpresaChange) onEmpresaChange(newId);
        setShowForm(false);
        setNovaEmpresa({ nome: '', cnpj: '' });
      } else {
        const err = await res.json();
        alert(err.erro || "Erro ao criar empresa");
      }
    } catch (e) {
      alert("Erro ao conectar à API");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.selectorWrapper}>
        <select 
          className={styles.select} 
          value={empresaId || ''} 
          onChange={handleChange}
        >
          {empresas.length === 0 && <option value="">Nenhuma empresa</option>}
          {empresas.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.nome}</option>
          ))}
        </select>
        <button 
          className={styles.addButton} 
          onClick={() => setShowForm(!showForm)}
          title="Nova Empresa"
        >
          +
        </button>
      </div>

      {showForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Nova Empresa</h3>
            <form onSubmit={handleAdd}>
              <div className={styles.formGroup}>
                <label>Nome da Empresa</label>
                <input 
                  type="text" 
                  value={novaEmpresa.nome}
                  onChange={e => setNovaEmpresa({...novaEmpresa, nome: e.target.value})}
                  required 
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>CNPJ</label>
                <input 
                  type="text" 
                  value={novaEmpresa.cnpj}
                  onChange={e => setNovaEmpresa({...novaEmpresa, cnpj: e.target.value})}
                  className={styles.input}
                />
              </div>
              <div className={styles.actions}>
                <button type="button" onClick={() => setShowForm(false)} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" className={styles.btnSave}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
