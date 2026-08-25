'use client';

import styles from './ModalConfirmacao.module.css';

export default function ModalConfirmacao({
  isOpen,
  titulo = 'Atenção - Restauração de Backup',
  mensagem = 'Deseja realmente restaurar este backup? Todos os dados atuais do banco serão substituídos.',
  nomeArquivo,
  onConfirmar,
  onCancelar,
  carregando = false,
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onCancelar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.icon}>⚠️</span>
          <h2 className={styles.title}>{titulo}</h2>
        </div>

        <div className={styles.content}>
          <p>{mensagem}</p>
          {nomeArquivo && (
            <div>
              Arquivo selecionado: <span className={styles.fileName}>{nomeArquivo}</span>
            </div>
          )}
          <div className={styles.alertBox}>
            <strong>Aviso importante:</strong> Esta ação irá restaurar o estado do banco de dados exatamente conforme o arquivo. Alterações não salvas no backup serão perdidas.
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancelar}
            onClick={onCancelar}
            disabled={carregando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnConfirmar}
            onClick={onConfirmar}
            disabled={carregando}
          >
            {carregando ? 'Restaurando...' : 'Sim, Restaurar Backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
