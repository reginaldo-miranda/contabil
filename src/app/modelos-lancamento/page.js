'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import SeletorContaComBusca from '@/components/SeletorContaComBusca';
import { useContabil } from '@/context/ContabilContext';
import styles from './ModelosLancamento.module.css';

const normalizeStr = (str) => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export default function ModelosLancamentoPage() {
  const {
    empresaId,
    modelosLancamento,
    addModeloLancamento,
    updateModeloLancamento,
    deleteModeloLancamento,
    getContasAnaliticas,
  } = useContabil();

  const contas = getContasAnaliticas();

  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [modeloEditando, setModeloEditando] = useState(null);

  // Form states
  const [descricao, setDescricao] = useState('');
  const [historico, setHistorico] = useState('');
  const [contaDebitoId, setContaDebitoId] = useState('');
  const [contaCreditoId, setContaCreditoId] = useState('');
  const [erroModal, setErroModal] = useState('');
  const [salvando, setSalvando] = useState(false);

  const modelosFiltrados = useMemo(() => {
    const termo = normalizeStr(busca).trim();
    if (!termo) return modelosLancamento || [];

    return (modelosLancamento || []).filter((m) => {
      const matchDesc = normalizeStr(m.descricao).includes(termo);
      const matchHist = normalizeStr(m.historico).includes(termo);
      const matchDeb =
        normalizeStr(m.contaDebito?.nome).includes(termo) ||
        normalizeStr(m.contaDebito?.codigo).includes(termo);
      const matchCred =
        normalizeStr(m.contaCredito?.nome).includes(termo) ||
        normalizeStr(m.contaCredito?.codigo).includes(termo);

      return matchDesc || matchHist || matchDeb || matchCred;
    });
  }, [modelosLancamento, busca]);

  const abrirModalCriar = () => {
    setModeloEditando(null);
    setDescricao('');
    setHistorico('');
    setContaDebitoId('');
    setContaCreditoId('');
    setErroModal('');
    setModalAberto(true);
  };

  const abrirModalEditar = (modelo) => {
    setModeloEditando(modelo);
    setDescricao(modelo.descricao || '');
    setHistorico(modelo.historico || '');
    setContaDebitoId(modelo.contaDebitoId ? String(modelo.contaDebitoId) : '');
    setContaCreditoId(modelo.contaCreditoId ? String(modelo.contaCreditoId) : '');
    setErroModal('');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModeloEditando(null);
    setErroModal('');
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setErroModal('');

    if (!descricao.trim()) {
      setErroModal('Informe um título/descrição para o modelo.');
      return;
    }
    if (!historico.trim()) {
      setErroModal('Informe o histórico padrão do lançamento.');
      return;
    }
    if (!contaDebitoId) {
      setErroModal('Selecione a conta de Débito pré-definida.');
      return;
    }
    if (!contaCreditoId) {
      setErroModal('Selecione a conta de Crédito pré-definida.');
      return;
    }
    if (String(contaDebitoId) === String(contaCreditoId)) {
      setErroModal('A conta de débito e a de crédito não podem ser a mesma.');
      return;
    }

    try {
      setSalvando(true);
      if (modeloEditando) {
        await updateModeloLancamento({
          id: modeloEditando.id,
          descricao,
          historico,
          contaDebitoId: parseInt(contaDebitoId),
          contaCreditoId: parseInt(contaCreditoId),
        });
      } else {
        await addModeloLancamento({
          descricao,
          historico,
          contaDebitoId: parseInt(contaDebitoId),
          contaCreditoId: parseInt(contaCreditoId),
        });
      }
      fecharModal();
    } catch (err) {
      setErroModal(err.message || 'Erro ao salvar o modelo de lançamento.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id, nome) => {
    if (window.confirm(`Deseja realmente excluir o modelo "${nome}"?`)) {
      try {
        await deleteModeloLancamento(id);
      } catch (err) {
        alert(err.message || 'Erro ao excluir modelo.');
      }
    }
  };

  return (
    <div className={styles.container}>
      <Sidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.titleRow}>
              <h1>⚡ Modelos de Lançamento</h1>
              <button type="button" className={styles.btnPrimary} onClick={abrirModalCriar}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                + Novo Modelo
              </button>
            </div>
            <p>
              Cadastre padrões de histórico com débito e crédito pré-definidos para preencher
              lançamentos em segundos.
            </p>
          </div>
        </div>

        <div className={styles.topBar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por descrição, histórico ou contas..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={styles.searchInput}
            />
            {busca && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setBusca('')}
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.topBarActions}>
            <div className={styles.statsBadge}>
              Total: <strong>{modelosLancamento?.length || 0}</strong> modelo(s)
            </div>
            <button type="button" className={styles.btnPrimaryCompact} onClick={abrirModalCriar}>
              + Novo Modelo
            </button>
          </div>
        </div>

        <div className={styles.card}>
          {modelosFiltrados.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>⚡</span>
              <h3>Nenhum modelo de lançamento encontrado</h3>
              <p>
                {busca
                  ? 'Nenhum modelo corresponde aos termos da sua pesquisa.'
                  : 'Crie seu primeiro modelo de lançamento para automatizar os preenchimentos mais frequentes (ex: Débito em conta CEF pagamento jogo, Tarifas bancárias, Aluguel).'}
              </p>
              {!busca && (
                <button type="button" className={styles.btnPrimary} onClick={abrirModalCriar}>
                  + Criar Primeiro Modelo
                </button>
              )}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Identificador / Nome</th>
                    <th>Histórico Padrão</th>
                    <th>Conta Débito</th>
                    <th>Conta Crédito</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {modelosFiltrados.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className={styles.modeloNome}>{m.descricao}</span>
                      </td>
                      <td>
                        <div className={styles.historicoPreview} title={m.historico}>
                          {m.historico}
                        </div>
                      </td>
                      <td>
                        <div className={styles.contaBadge}>
                          <span className={styles.tagDebito}>D</span>
                          <span
                            className={styles.contaInfo}
                            title={`${m.contaDebito?.codigo || ''} - ${m.contaDebito?.nome || ''}`}
                          >
                            <strong>{m.contaDebito?.codigo}</strong> {m.contaDebito?.nome}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.contaBadge}>
                          <span className={styles.tagCredito}>C</span>
                          <span
                            className={styles.contaInfo}
                            title={`${m.contaCredito?.codigo || ''} - ${m.contaCredito?.nome || ''}`}
                          >
                            <strong>{m.contaCredito?.codigo}</strong> {m.contaCredito?.nome}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.btnAction}
                            onClick={() => abrirModalEditar(m)}
                            title="Editar modelo"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnAction} ${styles.btnDelete}`}
                            onClick={() => handleExcluir(m.id, m.descricao)}
                            title="Excluir modelo"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL CRIAR / EDITAR */}
      {modalAberto && (
        <div className={styles.modalOverlay} onClick={fecharModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {modeloEditando ? '✏️ Editar Modelo de Lançamento' : '⚡ Novo Modelo de Lançamento'}
              </h2>
              <button type="button" className={styles.btnClose} onClick={fecharModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSalvar} className={styles.modalForm}>
              <div className={styles.modalBody}>
                {erroModal && <div className={styles.errorBanner}>⚠️ {erroModal}</div>}

                <div className={styles.formGroup}>
                  <label htmlFor="mod-desc">Nome do Modelo / Identificador *</label>
                  <input
                    id="mod-desc"
                    type="text"
                    placeholder="Ex: Débito em conta caixa econômica pagamento jogo"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    required
                    autoFocus
                  />
                  <span className={styles.helpText}>
                    Nome descritivo que aparecerá na busca rápida ao fazer novos lançamentos.
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="mod-hist">Histórico Padrão *</label>
                  <textarea
                    id="mod-hist"
                    rows={3}
                    placeholder="Ex: Débito em conta Caixa Econômica pagamento jogo ref."
                    value={historico}
                    onChange={(e) => setHistorico(e.target.value)}
                    required
                  />
                  <span className={styles.helpText}>
                    Texto base que será preenchido no lançamento. Você continuará podendo editar
                    ou complementar na hora de lançar.
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label>Conta de Débito Pré-definida (Aplicação do recurso) *</label>
                  <SeletorContaComBusca
                    contas={contas}
                    value={contaDebitoId}
                    onChange={(val) => setContaDebitoId(val)}
                    placeholder="Buscar conta de Débito (código ou nome)..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Conta de Crédito Pré-definida (Origem do recurso) *</label>
                  <SeletorContaComBusca
                    contas={contas}
                    value={contaCreditoId}
                    onChange={(val) => setContaCreditoId(val)}
                    placeholder="Buscar conta de Crédito (código ou nome)..."
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={fecharModal}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : modeloEditando ? 'Salvar Alterações' : 'Cadastrar Modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
