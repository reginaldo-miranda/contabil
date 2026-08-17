'use client';

import { useState, useEffect } from 'react';
import AutocompleteConta from './AutocompleteConta';
import styles from './FormLancamento.module.css';

export default function FormLancamento({ lancamento, empresaId, onSalvar, onFechar }) {
  const isEdit = !!lancamento;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    valor: '',
    historico: '',
    contaDebitoId: null,
    contaCreditoId: null
  });

  const [selectedDebito, setSelectedDebito] = useState(null);
  const [selectedCredito, setSelectedCredito] = useState(null);

  useEffect(() => {
    if (lancamento) {
      setFormData({
        data: new Date(lancamento.data).toISOString().split('T')[0],
        valor: lancamento.valor.toString(),
        historico: lancamento.historico,
        contaDebitoId: lancamento.contaDebitoId,
        contaCreditoId: lancamento.contaCreditoId
      });
      setSelectedDebito(lancamento.contaDebito);
      setSelectedCredito(lancamento.contaCredito);
    } else {
      setFormData({
        data: new Date().toISOString().split('T')[0],
        valor: '',
        historico: '',
        contaDebitoId: null,
        contaCreditoId: null
      });
      setSelectedDebito(null);
      setSelectedCredito(null);
    }
  }, [lancamento]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.data || !formData.valor || !formData.historico || !formData.contaDebitoId || !formData.contaCreditoId) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (formData.contaDebitoId === formData.contaCreditoId) {
      setError('A conta de débito não pode ser igual à conta de crédito.');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      data: formData.data,
      valor: parseFloat(formData.valor),
      historico: formData.historico.trim(),
      contaDebitoId: parseInt(formData.contaDebitoId),
      contaCreditoId: parseInt(formData.contaCreditoId),
      empresaId: parseInt(empresaId)
    };

    try {
      const url = isEdit ? `/api/lancamentos/${lancamento.id}` : '/api/lancamentos';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        onSalvar(data);
      } else {
        setError(data.erro || 'Erro ao salvar o lançamento.');
      }
    } catch (err) {
      console.error('Erro de conexão:', err);
      setError('Erro de conexão ao tentar salvar o lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDebito = (conta) => {
    setSelectedDebito(conta);
    setFormData(prev => ({ ...prev, contaDebitoId: conta ? conta.id : null }));
  };

  const handleSelectCredito = (conta) => {
    setSelectedCredito(conta);
    setFormData(prev => ({ ...prev, contaCreditoId: conta ? conta.id : null }));
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button className={styles.closeBtn} onClick={onFechar}>✕</button>
        </div>

        {error && (
          <div className={styles.errorMsg}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.group}>
              <label>Data</label>
              <input
                type="date"
                required
                value={formData.data}
                onChange={e => setFormData({ ...formData, data: e.target.value })}
              />
            </div>

            <div className={styles.group}>
              <label>Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.valor}
                onChange={e => setFormData({ ...formData, valor: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.group}>
            <label>Conta de Débito (Aplicação dos Recursos)</label>
            <AutocompleteConta
              empresaId={empresaId}
              onSelect={handleSelectDebito}
              initialConta={selectedDebito}
              placeholder="Busque a conta devedora..."
            />
          </div>

          <div className={styles.group}>
            <label>Conta de Crédito (Origem dos Recursos)</label>
            <AutocompleteConta
              empresaId={empresaId}
              onSelect={handleSelectCredito}
              initialConta={selectedCredito}
              placeholder="Busque a conta credora..."
            />
          </div>

          <div className={styles.group}>
            <label>Histórico (Descrição do Fato Contábil)</label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Recebimento de clientes ref. venda conforme nota fiscal nº 1023."
              value={formData.historico}
              onChange={e => setFormData({ ...formData, historico: e.target.value })}
            />
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onFechar} className={styles.btnCancel} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
