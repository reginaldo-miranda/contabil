'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Sidebar';
import ModalConfirmacao from '../../components/ModalConfirmacao';
import styles from './Backup.module.css';

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  
  const [mensagem, setMensagem] = useState(null); // { tipo: 'sucesso' | 'erro', texto: '' }

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetBackup, setTargetBackup] = useState(null); // { type: 'local' | 'external', filename?: string, file?: File }

  const fileInputRef = useRef(null);

  useEffect(() => {
    carregarBackups();
  }, []);

  const carregarBackups = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/backup');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      } else {
        exibirMensagem('erro', 'Não foi possível carregar a lista de backups.');
      }
    } catch (err) {
      console.error('Erro ao carregar backups:', err);
      exibirMensagem('erro', 'Erro ao conectar ao servidor para buscar backups.');
    } finally {
      setLoadingList(false);
    }
  };

  const exibirMensagem = (tipo, texto) => {
    setMensagem({ tipo, texto });
    setTimeout(() => {
      setMensagem(null);
    }, 6000);
  };

  const handleCriarBackup = async () => {
    setCreatingBackup(true);
    setMensagem(null);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        exibirMensagem('sucesso', `Backup '${data.backup.filename}' criado com sucesso!`);
        carregarBackups();
      } else {
        exibirMensagem('erro', data.error || 'Erro ao gerar backup.');
      }
    } catch (err) {
      console.error('Erro ao criar backup:', err);
      exibirMensagem('erro', 'Falha de conexão ao criar backup.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleSolicitarRestauracaoLocal = (filename) => {
    setTargetBackup({ type: 'local', filename });
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql')) {
        exibirMensagem('erro', 'Selecione um arquivo de backup com extensão .sql.');
        return;
      }
      setTargetBackup({ type: 'external', filename: file.name, file });
      setModalOpen(true);
    }
  };

  const handleConfirmarRestauracao = async () => {
    if (!targetBackup) return;

    setRestoringBackup(true);
    setMensagem(null);

    try {
      let res;
      if (targetBackup.type === 'external') {
        const formData = new FormData();
        formData.append('file', targetBackup.file);

        res = await fetch('/api/backup/restore', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: targetBackup.filename }),
        });
      }

      const data = await res.json();

      if (res.ok) {
        exibirMensagem('sucesso', 'Banco de dados restaurado com sucesso!');
        carregarBackups();
      } else {
        exibirMensagem('erro', data.error || 'Erro ao restaurar o banco de dados.');
      }
    } catch (err) {
      console.error('Erro ao restaurar backup:', err);
      exibirMensagem('erro', 'Falha de comunicação ao restaurar backup.');
    } finally {
      setRestoringBackup(false);
      setModalOpen(false);
      setTargetBackup(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatarTamanho = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatarData = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR');
  };

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Backup & Restauração</h1>
            <p className={styles.subtitle}>Gerencie cópias de segurança do banco de dados do sistema</p>
          </div>

          <div className={styles.headerActions}>
            <input
              type="file"
              accept=".sql"
              ref={fileInputRef}
              className={styles.hiddenInput}
              onChange={handleFileChange}
            />

            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => fileInputRef.current?.click()}
              disabled={creatingBackup || restoringBackup}
            >
              📥 Restaurar de Arquivo Externo
            </button>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleCriarBackup}
              disabled={creatingBackup || restoringBackup}
            >
              {creatingBackup ? '⚙️ Criando Backup...' : '💾 Criar Novo Backup'}
            </button>
          </div>
        </header>

        {mensagem && (
          <div
            className={`${styles.alert} ${
              mensagem.tipo === 'sucesso' ? styles.alertSuccess : styles.alertError
            }`}
          >
            <span>{mensagem.texto}</span>
            <button className={styles.closeAlert} onClick={() => setMensagem(null)}>
              ✕
            </button>
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>📂 Histórico de Backups Locais</h2>
            <button
              type="button"
              className={styles.btnIcon}
              onClick={carregarBackups}
              disabled={loadingList}
            >
              🔄 Atualizar Lista
            </button>
          </div>

          {loadingList ? (
            <div className={styles.emptyState}>Carregando backups salvos...</div>
          ) : backups.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>💾</span>
              <p>Nenhum backup encontrado na pasta local.</p>
              <p>Clique em <strong>"Criar Novo Backup"</strong> para gerar a primeira cópia de segurança.</p>
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome do Arquivo</th>
                    <th>Data e Hora de Criação</th>
                    <th>Tamanho</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((item) => (
                    <tr key={item.filename}>
                      <td className={styles.fileNameCell}>{item.filename}</td>
                      <td>{formatarData(item.createdAt)}</td>
                      <td>{formatarTamanho(item.size)}</td>
                      <td>
                        <div className={styles.tableActions}>
                          <a
                            href={`/api/backup/download/${item.filename}`}
                            download={item.filename}
                            className={styles.btnIcon}
                          >
                            ⬇️ Baixar
                          </a>
                          <button
                            type="button"
                            className={`${styles.btnIcon} ${styles.btnRestoreIcon}`}
                            onClick={() => handleSolicitarRestauracaoLocal(item.filename)}
                            disabled={creatingBackup || restoringBackup}
                          >
                            ⚠️ Restaurar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <ModalConfirmacao
        isOpen={modalOpen}
        nomeArquivo={targetBackup?.filename}
        onConfirmar={handleConfirmarRestauracao}
        onCancelar={() => {
          setModalOpen(false);
          setTargetBackup(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        carregando={restoringBackup}
      />
    </div>
  );
}
