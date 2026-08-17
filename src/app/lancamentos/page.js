'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import SeletorEmpresa from '../../components/SeletorEmpresa';
import FormLancamento from '../../components/FormLancamento';
import AutocompleteConta from '../../components/AutocompleteConta';
import styles from './Lancamentos.module.css';

export default function Lancamentos() {
  const [empresaId, setEmpresaId] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters & Pagination State
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroConta, setFiltroConta] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [showForm, setShowForm] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState(null);

  useEffect(() => {
    if (empresaId) {
      setPagina(1);
      fetchLancamentos(empresaId, 1);
    } else {
      setLancamentos([]);
    }
  }, [empresaId, dataInicio, dataFim, filtroConta]);

  const fetchLancamentos = async (id = empresaId, pageNum = pagina) => {
    if (!id) return;
    setLoading(true);
    setError('');

    let url = `/api/lancamentos?empresaId=${id}&page=${pageNum}&limit=12`;
    if (dataInicio) url += `&dataInicio=${dataInicio}`;
    if (dataFim) url += `&dataFim=${dataFim}`;
    if (filtroConta) url += `&contaId=${filtroConta.id}`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLancamentos(data.lancamentos);
        setTotalPaginas(data.paginas);
        setTotalItems(data.total);
      } else {
        setError(data.erro || 'Erro ao carregar lançamentos contábeis.');
      }
    } catch (err) {
      console.error('Erro ao buscar lançamentos:', err);
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (novaPagina) => {
    if (novaPagina < 1 || novaPagina > totalPaginas) return;
    setPagina(novaPagina);
    fetchLancamentos(empresaId, novaPagina);
  };

  const handleExcluir = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento contábil?')) {
      setError('');
      try {
        const res = await fetch(`/api/lancamentos/${id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (res.ok) {
          // If deleted last item of current page and page > 1, go to previous page
          const nextPage = (lancamentos.length === 1 && pagina > 1) ? pagina - 1 : pagina;
          setPagina(nextPage);
          fetchLancamentos(empresaId, nextPage);
        } else {
          setError(data.erro || 'Erro ao excluir o lançamento.');
        }
      } catch (err) {
        console.error('Erro ao excluir:', err);
        setError('Erro de conexão com o servidor.');
      }
    }
  };

  const handleSave = () => {
    setShowForm(false);
    fetchLancamentos(empresaId, pagina);
  };

  const handleEditClick = (lanc) => {
    setEditingLancamento(lanc);
    setShowForm(true);
  };

  const handleNewClick = () => {
    setEditingLancamento(null);
    setShowForm(true);
  };

  const formatarData = (dataStr) => {
    const d = new Date(dataStr);
    // Use UTC values to prevent timezone offset issues in formatting
    const dia = String(d.getUTCDate()).padStart(2, '0');
    const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
    const ano = d.getUTCFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatarValor = (valor) => {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const getGrupoClass = (grupo) => {
    return grupo ? styles[grupo.toLowerCase()] : '';
  };

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <span className={styles.titleIcon}>📝</span>
            <div>
              <h1 className={styles.title}>Lançamentos Contábeis</h1>
              <p className={styles.subtitle}>Livro Diário da empresa</p>
            </div>
          </div>
          <SeletorEmpresa onEmpresaChange={setEmpresaId} />
        </header>

        {empresaId ? (
          <div className={styles.content}>
            {error && (
              <div className={styles.errorArea}>
                {error}
              </div>
            )}

            {/* Filter Panel */}
            <div className={styles.filterCard}>
              <div className={styles.filterGrid}>
                <div className={styles.filterGroup}>
                  <label>Data Inicial</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label>Data Final</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className={styles.filterInput}
                  />
                </div>

                <div className={styles.filterGroup} style={{ flex: 2 }}>
                  <label>Filtrar por Conta Contábil (Débito ou Crédito)</label>
                  <div className={styles.autocompleteWrapper}>
                    <AutocompleteConta
                      empresaId={empresaId}
                      onSelect={setFiltroConta}
                      initialConta={filtroConta}
                      placeholder="Busque por código ou nome..."
                    />
                    {filtroConta && (
                      <button 
                        onClick={() => setFiltroConta(null)} 
                        className={styles.clearFilterBtn}
                        title="Limpar filtro"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.btnArea}>
                  <button onClick={handleNewClick} className={styles.btnPrimary}>
                    <span className={styles.btnIcon}>+</span> Novo Lançamento
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Carregando lançamentos...</p>
              </div>
            ) : lancamentos.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📝</div>
                <h3>Nenhum lançamento encontrado</h3>
                <p>Comece adicionando um lançamento ou limpe os filtros para ver mais.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Conta de Débito (D)</th>
                      <th>Conta de Crédito (C)</th>
                      <th>Histórico (Descrição)</th>
                      <th style={{ textAlign: 'right' }}>Valor</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentos.map((lanc) => (
                      <tr key={lanc.id} className={styles.tableRow}>
                        <td className={styles.dateCol}>{formatarData(lanc.data)}</td>
                        <td>
                          <div className={styles.contaCol}>
                            <span className={`${styles.contaCodigo} ${getGrupoClass(lanc.contaDebito.grupo)}`}>
                              {lanc.contaDebito.codigo}
                            </span>
                            <span className={styles.contaNome}>{lanc.contaDebito.nome}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.contaCol}>
                            <span className={`${styles.contaCodigo} ${getGrupoClass(lanc.contaCredito.grupo)}`}>
                              {lanc.contaCredito.codigo}
                            </span>
                            <span className={styles.contaNome}>{lanc.contaCredito.nome}</span>
                          </div>
                        </td>
                        <td className={styles.historicoCol} title={lanc.historico}>
                          {lanc.historico}
                        </td>
                        <td className={styles.valueCol}>{formatarValor(lanc.valor)}</td>
                        <td className={styles.actionsCol}>
                          <div className={styles.actionsGroup}>
                            <button 
                              onClick={() => handleEditClick(lanc)} 
                              className={styles.actionBtn}
                              title="Editar lançamento"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleExcluir(lanc.id)} 
                              className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              title="Excluir lançamento"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPaginas > 1 && (
                  <div className={styles.pagination}>
                    <button
                      onClick={() => handlePageChange(pagina - 1)}
                      disabled={pagina === 1}
                      className={styles.pageBtn}
                    >
                      ← Anterior
                    </button>
                    <span className={styles.pageInfo}>
                      Página {pagina} de {totalPaginas} ({totalItems} lançamentos)
                    </span>
                    <button
                      onClick={() => handlePageChange(pagina + 1)}
                      disabled={pagina === totalPaginas}
                      className={styles.pageBtn}
                    >
                      Próximo →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            Selecione uma empresa para gerenciar os lançamentos contábeis.
          </div>
        )}

        {showForm && (
          <FormLancamento
            lancamento={editingLancamento}
            empresaId={empresaId}
            onSalvar={handleSave}
            onFechar={() => setShowForm(false)}
          />
        )}
      </main>
    </div>
  );
}
