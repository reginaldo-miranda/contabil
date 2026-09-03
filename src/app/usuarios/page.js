'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useContabil } from '@/context/ContabilContext';
import Sidebar from '@/components/Sidebar';
import styles from './Usuarios.module.css';

const MODULOS_SISTEMA = [
  { id: 'plano-de-contas', nome: 'Plano de Contas', icon: '📋' },
  { id: 'lancamentos', nome: 'Lançamentos Contábeis', icon: '📝' },
  { id: 'diario', nome: 'Livro Diário', icon: '📒' },
  { id: 'razao', nome: 'Livro Razão', icon: '📖' },
  { id: 'balancete', nome: 'Balancete de Verificação', icon: '📄' },
  { id: 'dre', nome: 'DRE (Demonstração do Resultado)', icon: '📈' },
  { id: 'balanco', nome: 'Balanço Patrimonial', icon: '⚖️' },
  { id: 'backup', nome: 'Backup & Restauração', icon: '💾' },
];

export default function UsuariosPage() {
  const router = useRouter();
  const { usuario } = useContabil();

  const [usuarios, setUsuarios] = useState([]);
  const [todasEmpresas, setTodasEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erroGeral, setErroGeral] = useState('');

  // Estados do Modal
  const [modalAberto, setModalAberto] = useState(false);
  const [modalModo, setModalModo] = useState('criar'); // 'criar' | 'editar'
  const [modalErro, setModalErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Campos do formulário
  const [editId, setEditId] = useState(null);
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);

  // Mapa de empresas: { [empresaId]: { selecionada: boolean, papel: 'ADMIN' | 'OPERADOR', permissoes: string[] } }
  const [empresasConfig, setEmpresasConfig] = useState({});

  const carregarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      setErroGeral('');
      const res = await fetch('/api/usuarios');
      if (!res.ok) {
        if (res.status === 403) {
          router.push('/');
          return;
        }
        throw new Error('Erro ao carregar usuários');
      }
      const data = await res.json();
      setUsuarios(data.usuarios || []);
      setTodasEmpresas(data.todasEmpresas || []);
    } catch (err) {
      setErroGeral('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (usuario && usuario.email !== 'admin@contabil.com') {
      router.push('/');
      return;
    }
    carregarUsuarios();
  }, [usuario, router, carregarUsuarios]);

  const abrirModalCriar = () => {
    setModalModo('criar');
    setEditId(null);
    setFormNome('');
    setFormEmail('');
    setFormSenha('');
    setFormAtivo(true);
    setModalErro('');

    // Iniciar empresas desmarcadas com todos os módulos pré-selecionados por padrão
    const inicial = {};
    todasEmpresas.forEach((emp) => {
      inicial[emp.id] = {
        selecionada: false,
        papel: 'OPERADOR',
        permissoes: MODULOS_SISTEMA.map((m) => m.id),
      };
    });
    setEmpresasConfig(inicial);
    setModalAberto(true);
  };

  const abrirModalEditar = (u) => {
    setModalModo('editar');
    setEditId(u.id);
    setFormNome(u.nome);
    setFormEmail(u.email);
    setFormSenha('');
    setFormAtivo(u.ativo);
    setModalErro('');

    const inicial = {};
    todasEmpresas.forEach((emp) => {
      const vinculo = u.empresas?.find((ue) => ue.empresaId === emp.id);
      if (vinculo) {
        inicial[emp.id] = {
          selecionada: true,
          papel: vinculo.papel || 'OPERADOR',
          permissoes: Array.isArray(vinculo.permissoes)
            ? vinculo.permissoes
            : MODULOS_SISTEMA.map((m) => m.id),
        };
      } else {
        inicial[emp.id] = {
          selecionada: false,
          papel: 'OPERADOR',
          permissoes: MODULOS_SISTEMA.map((m) => m.id),
        };
      }
    });
    setEmpresasConfig(inicial);
    setModalAberto(true);
  };

  const toggleEmpresaCheck = (empresaId) => {
    setEmpresasConfig((prev) => ({
      ...prev,
      [empresaId]: {
        ...prev[empresaId],
        selecionada: !prev[empresaId]?.selecionada,
      },
    }));
  };

  const setEmpresaPapel = (empresaId, papel) => {
    setEmpresasConfig((prev) => ({
      ...prev,
      [empresaId]: {
        ...prev[empresaId],
        papel,
      },
    }));
  };

  const togglePermissao = (empresaId, moduloId) => {
    setEmpresasConfig((prev) => {
      const current = prev[empresaId]?.permissoes || [];
      const updated = current.includes(moduloId)
        ? current.filter((id) => id !== moduloId)
        : [...current, moduloId];
      return {
        ...prev,
        [empresaId]: {
          ...prev[empresaId],
          permissoes: updated,
        },
      };
    });
  };

  const marcarTodasPermissoes = (empresaId, marcar) => {
    setEmpresasConfig((prev) => ({
      ...prev,
      [empresaId]: {
        ...prev[empresaId],
        permissoes: marcar ? MODULOS_SISTEMA.map((m) => m.id) : [],
      },
    }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setModalErro('');
    setSalvando(true);

    const empresasPayload = [];
    Object.entries(empresasConfig).forEach(([empId, conf]) => {
      if (conf.selecionada) {
        empresasPayload.push({
          empresaId: parseInt(empId, 10),
          papel: conf.papel,
          permissoes: conf.papel === 'OPERADOR' ? conf.permissoes : null,
        });
      }
    });

    try {
      if (modalModo === 'criar') {
        const res = await fetch('/api/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: formNome,
            email: formEmail,
            senha: formSenha,
            empresas: empresasPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalErro(data.erro || 'Erro ao criar usuário');
          setSalvando(false);
          return;
        }
      } else {
        const res = await fetch(`/api/usuarios/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: formNome,
            email: formEmail,
            ativo: formAtivo,
            senha: formSenha ? formSenha : undefined,
            empresas: empresasPayload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setModalErro(data.erro || 'Erro ao atualizar usuário');
          setSalvando(false);
          return;
        }
      }

      setModalAberto(false);
      await carregarUsuarios();
    } catch (err) {
      setModalErro('Erro de comunicação com o servidor');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (u) => {
    if (u.email === 'admin@contabil.com') {
      alert('Não é permitido excluir o Administrador Geral');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário "${u.nome}" (${u.email})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${u.id}`, { method: 'DELETE' });
      if (res.ok) {
        await carregarUsuarios();
      } else {
        const data = await res.json();
        alert(data.erro || 'Erro ao excluir');
      }
    } catch (e) {
      alert('Erro de conexão');
    }
  };

  return (
    <div className={styles.container}>
      <Sidebar />

      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1>👥 Gestão de Usuários & Acessos</h1>
            <p>Gerencie os usuários do sistema, vínculos com empresas e permissões de operadores</p>
          </div>
          <button className={styles.btnPrimary} onClick={abrirModalCriar}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Usuário
          </button>
        </div>

        {erroGeral && <div className={styles.modalError}>{erroGeral}</div>}

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statInfo}>
              <h3>{usuarios.length}</h3>
              <p>Total de Usuários</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🏢</div>
            <div className={styles.statInfo}>
              <h3>{todasEmpresas.length}</h3>
              <p>Empresas no Sistema</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>⚡</div>
            <div className={styles.statInfo}>
              <h3>{usuarios.filter((u) => u.ativo).length}</h3>
              <p>Usuários Ativos</p>
            </div>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>Usuários Cadastrados</div>
          </div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Status</th>
                <th>Empresas & Papéis</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    Carregando usuários...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum usuário cadastrado além do administrador.
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const inicial = u.nome ? u.nome.charAt(0).toUpperCase() : 'U';
                  const isAdminGeral = u.email === 'admin@contabil.com';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>{inicial}</div>
                          <div className={styles.userMeta}>
                            <strong>{u.nome}</strong>
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.ativo ? (
                          <span className={styles.badgeActive}>● Ativo</span>
                        ) : (
                          <span className={styles.badgeInactive}>● Inativo</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.companiesBadges}>
                          {isAdminGeral ? (
                            <span className={`${styles.badgeCompany} ${styles.badgeCompanyAdmin}`}>
                              👑 Super Admin (Todas as Empresas)
                            </span>
                          ) : u.empresas && u.empresas.length > 0 ? (
                            u.empresas.map((ue) => {
                              const isOp = ue.papel === 'OPERADOR';
                              const countModulos = Array.isArray(ue.permissoes)
                                ? ue.permissoes.length
                                : MODULOS_SISTEMA.length;

                              return (
                                <span
                                  key={ue.empresa.id}
                                  className={`${styles.badgeCompany} ${
                                    isOp ? styles.badgeCompanyOp : styles.badgeCompanyAdmin
                                  }`}
                                  title={
                                    isOp
                                      ? `Operador com ${countModulos} módulos liberados`
                                      : 'Administrador da Empresa'
                                  }
                                >
                                  {ue.empresa.nome} ({ue.papel}
                                  {isOp && ` - ${countModulos} mód.`})
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              Nenhuma empresa vinculada
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                          {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            className={styles.btnAction}
                            onClick={() => abrirModalEditar(u)}
                            title="Editar dados e permissões"
                          >
                            Editar & Acessos
                          </button>
                          {!isAdminGeral && (
                            <button
                              className={`${styles.btnAction} ${styles.btnActionDanger}`}
                              onClick={() => handleExcluir(u)}
                              title="Excluir usuário"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {modalAberto && (
        <div className={styles.modalOverlay} onClick={() => !salvando && setModalAberto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{modalModo === 'criar' ? 'Novo Usuário' : 'Editar Usuário & Permissões'}</h2>
              <button
                className={styles.btnClose}
                onClick={() => setModalAberto(false)}
                disabled={salvando}
              >
                ✕
              </button>
            </div>

            {modalErro && <div className={styles.modalError}>{modalErro}</div>}

            <form onSubmit={handleSalvar}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nome Completo</label>
                  <input
                    type="text"
                    required
                    className={styles.input}
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: João da Silva"
                    disabled={salvando}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>E-mail</label>
                  <input
                    type="email"
                    required
                    className={styles.input}
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="joao@contabil.com"
                    disabled={salvando || formEmail === 'admin@contabil.com'}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {modalModo === 'criar' ? 'Senha de Acesso' : 'Redefinir Senha (Opcional)'}
                  </label>
                  <input
                    type="password"
                    required={modalModo === 'criar'}
                    className={styles.input}
                    value={formSenha}
                    onChange={(e) => setFormSenha(e.target.value)}
                    placeholder={modalModo === 'criar' ? 'Mínimo 6 dígitos' : 'Deixe em branco para manter'}
                    disabled={salvando}
                  />
                </div>

                {modalModo === 'editar' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status da Conta</label>
                    <select
                      className={styles.input}
                      value={formAtivo ? 'true' : 'false'}
                      onChange={(e) => setFormAtivo(e.target.value === 'true')}
                      disabled={salvando || formEmail === 'admin@contabil.com'}
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo (Bloquear acesso)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className={styles.sectionTitle}>
                <span>🏢</span> Empresas Autorizadas & Permissões Granulares
              </div>

              {formEmail === 'admin@contabil.com' ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  O Administrador Geral tem acesso automático e total a todas as empresas do sistema.
                </p>
              ) : todasEmpresas.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                  Nenhuma empresa cadastrada no sistema.
                </p>
              ) : (
                todasEmpresas.map((emp) => {
                  const conf = empresasConfig[emp.id] || {
                    selecionada: false,
                    papel: 'OPERADOR',
                    permissoes: [],
                  };

                  return (
                    <div
                      key={emp.id}
                      className={`${styles.companyCardItem} ${
                        conf.selecionada ? styles.companyCardActive : ''
                      }`}
                    >
                      <div className={styles.companyRowTop}>
                        <label className={styles.companyCheckLabel}>
                          <input
                            type="checkbox"
                            checked={conf.selecionada}
                            onChange={() => toggleEmpresaCheck(emp.id)}
                            disabled={salvando}
                          />
                          <span>{emp.nome}</span>
                          {emp.cnpj && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({emp.cnpj})
                            </span>
                          )}
                        </label>

                        {conf.selecionada && (
                          <select
                            className={styles.roleSelect}
                            value={conf.papel}
                            onChange={(e) => setEmpresaPapel(emp.id, e.target.value)}
                            disabled={salvando}
                          >
                            <option value="ADMIN">Administrador (Total)</option>
                            <option value="OPERADOR">Operador (Permissões)</option>
                          </select>
                        )}
                      </div>

                      {/* Seletor de Permissões para Operador */}
                      {conf.selecionada && conf.papel === 'OPERADOR' && (
                        <div className={styles.permissionsBox}>
                          <div className={styles.permissionsHeader}>
                            <span>Módulos Permitidos para esta empresa:</span>
                            <div>
                              <button
                                type="button"
                                className={styles.btnTextQuick}
                                onClick={() => marcarTodasPermissoes(emp.id, true)}
                                disabled={salvando}
                              >
                                Marcar Todos
                              </button>
                              |
                              <button
                                type="button"
                                className={styles.btnTextQuick}
                                onClick={() => marcarTodasPermissoes(emp.id, false)}
                                disabled={salvando}
                              >
                                Desmarcar Todos
                              </button>
                            </div>
                          </div>

                          <div className={styles.modulesGrid}>
                            {MODULOS_SISTEMA.map((mod) => {
                              const checked = conf.permissoes?.includes(mod.id);
                              return (
                                <label key={mod.id} className={styles.moduleCheck}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermissao(emp.id, mod.id)}
                                    disabled={salvando}
                                  />
                                  <span>
                                    {mod.icon} {mod.nome}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={() => setModalAberto(false)}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={salvando}>
                  {salvando ? 'Salvando...' : modalModo === 'criar' ? 'Criar Usuário' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
