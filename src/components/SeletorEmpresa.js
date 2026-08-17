'use client';

import { useState, useEffect } from 'react';
import styles from './SeletorEmpresa.module.css';

export default function SeletorEmpresa({ onEmpresaChange }) {
  const [empresas, setEmpresas] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState({ nome: '', cnpj: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch('/api/empresas');
      if (res.ok) {
        const data = await res.json();
        setEmpresas(data);
        if (data.length > 0) {
          setSelectedId(data[0].id.toString());
          if (onEmpresaChange) onEmpresaChange(data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar empresas:', err);
    }
  };

  const handleChange = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    if (onEmpresaChange) onEmpresaChange(id ? parseInt(id) : null);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novaEmpresa.nome.trim()) return;
    setError('');

    try {
      const res = await fetch('/api/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaEmpresa),
      });

      const data = await res.json();

      if (res.ok) {
        const novasEmpresas = [...empresas, data];
        setEmpresas(novasEmpresas);
        setSelectedId(data.id.toString());
        if (onEmpresaChange) onEmpresaChange(data.id);
        setShowForm(false);
        setNovaEmpresa({ nome: '', cnpj: '' });
      } else {
        setError(data.erro || 'Erro ao criar empresa');
      }
    } catch (err) {
      console.error('Erro ao adicionar empresa:', err);
      setError('Erro de conexão com o servidor');
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
          <option value="">Selecione uma empresa...</option>
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
            {error && <div className={styles.errorMsg} style={{ color: '#f43f5e', marginBottom: '10px', fontSize: '14px' }}>{error}</div>}
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
                  placeholder="00.000.000/0001-00"
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
