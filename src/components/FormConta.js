'use client';

import { useState, useEffect } from 'react';
import styles from './FormConta.module.css';

export default function FormConta({ conta, contaPai, empresaId, onSalvar, onFechar }) {
  const isEdit = !!conta;
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    tipo: 'S', // 'S' (Sintética) ou 'A' (Analítica)
    natureza: 'D', // 'D' (Devedora) ou 'C' (Credora)
    grupo: 'ATIVO',
    nivel: 1
  });

  useEffect(() => {
    if (conta) {
      setFormData({
        codigo: conta.codigo || '',
        nome: conta.nome || '',
        tipo: conta.tipo || 'S',
        natureza: conta.natureza || 'D',
        grupo: conta.grupo || 'ATIVO',
        nivel: conta.nivel || 1
      });
    } else if (contaPai) {
      // Auto-fill defaults for child account
      setFormData({
        codigo: contaPai.codigo + '.',
        nome: '',
        tipo: 'A',
        natureza: contaPai.natureza,
        grupo: contaPai.grupo,
        nivel: contaPai.nivel + 1
      });
    } else {
      setFormData({
        codigo: '',
        nome: '',
        tipo: 'S',
        natureza: 'D',
        grupo: 'ATIVO',
        nivel: 1
      });
    }
  }, [conta, contaPai]);

  // Dynamically update Grupo and Nível based on the code entered
  const handleCodigoChange = (e) => {
    const code = e.target.value;
    const parts = code.split('.').filter(p => p !== '');
    const calculatedNivel = parts.length || 1;
    
    // Auto-detect group based on first digit of code
    let calculatedGrupo = 'ATIVO';
    if (code.startsWith('1')) calculatedGrupo = 'ATIVO';
    else if (code.startsWith('2.3')) calculatedGrupo = 'PL';
    else if (code.startsWith('2')) calculatedGrupo = 'PASSIVO';
    else if (code.startsWith('3')) calculatedGrupo = 'RECEITA';
    else if (code.startsWith('4')) calculatedGrupo = 'DESPESA';

    setFormData({
      ...formData,
      codigo: code,
      nivel: calculatedNivel,
      grupo: calculatedGrupo
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nome.trim()) return;
    setError('');

    const payload = {
      codigo: formData.codigo.trim(),
      nome: formData.nome.trim(),
      tipo: formData.tipo,
      natureza: formData.natureza,
      nivel: parseInt(formData.nivel) || 1,
      grupo: formData.grupo,
      contaPaiId: contaPai ? contaPai.id : (conta ? conta.contaPaiId : null),
      empresaId: parseInt(empresaId)
    };

    try {
      const url = isEdit ? `/api/contas/${conta.id}` : '/api/contas';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        onSalvar(data);
      } else {
        setError(data.erro || 'Erro ao salvar conta contábil');
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
      setError('Erro de conexão ao tentar salvar a conta');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Editar Conta' : 'Nova Conta'}</h2>
          <button className={styles.closeBtn} onClick={onFechar}>✕</button>
        </div>
        
        {error && <div className={styles.errorMsg} style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.1)', border: '1px solid #f43f5e', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.parentInfo}>
            <span className={styles.parentLabel}>Conta Pai:</span>
            <span className={styles.parentValue}>
              {contaPai ? `${contaPai.codigo} - ${contaPai.nome}` : (conta && conta.contaPai ? `${conta.contaPai.codigo} - ${conta.contaPai.nome}` : 'Nenhuma (conta raiz)')}
            </span>
          </div>
          
          <div className={styles.row}>
            <div className={styles.group}>
              <label>Código</label>
              <input 
                type="text" 
                required
                value={formData.codigo}
                onChange={handleCodigoChange}
                placeholder="Ex: 1.1.1.01.001"
              />
            </div>
            
            <div className={styles.group}>
              <label>Nível (calculado)</label>
              <input 
                type="number" 
                min="1" max="5"
                required
                disabled
                value={formData.nivel}
              />
            </div>
          </div>
          
          <div className={styles.group}>
            <label>Nome da Conta</label>
            <input 
              type="text" 
              required
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
              placeholder="Ex: Caixa Geral"
            />
          </div>
          
          <div className={styles.row}>
            <div className={styles.group}>
              <label>Tipo</label>
              <select 
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
              >
                <option value="S">Sintética (agrupadora)</option>
                <option value="A">Analítica (recebe lançamentos)</option>
              </select>
            </div>
            
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
              <label>Grupo (detectado)</label>
              <select 
                value={formData.grupo}
                disabled
                onChange={e => setFormData({...formData, grupo: e.target.value})}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="PASSIVO">PASSIVO</option>
                <option value="PL">PATRIMÔNIO LÍQUIDO</option>
                <option value="RECEITA">RECEITA</option>
                <option value="DESPESA">CUSTOS/DESPESAS</option>
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
