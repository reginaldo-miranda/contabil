'use client';

import { useState, useEffect } from 'react';
import styles from './SeletorEmpresa.module.css';

export default function SeletorEmpresa({ onEmpresaChange }) {
  const [empresas, setEmpresas] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', cnpj: '' });

  const loadEmpresas = async () => {
    try {
      const res = await fetch('/api/empresas');
      if (res.ok) {
        const data = await res.json();
        setEmpresas(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id.toString());
          if (onEmpresaChange) onEmpresaChange(data[0].id.toString());
        }
      }
    } catch (e) {
      console.error("Erro ao buscar empresas:", e);
    }
  };

  useEffect(() => {
    loadEmpresas();
  }, []);

  const handleChange = (e) => {
    const id = e.target.value;
    setSelectedId(id);
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
        await loadEmpresas();
        setSelectedId(nova.id.toString());
        if (onEmpresaChange) onEmpresaChange(nova.id.toString());
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
          value={selectedId} 
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
