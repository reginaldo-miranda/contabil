'use client';

import { useState } from 'react';
import styles from './ArvoreContas.module.css';

const highlightText = (text, highlight) => {
  if (!highlight) return text;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return parts.map((part, index) => 
    part.toLowerCase() === highlight.toLowerCase() ? 
      <span key={index} className={styles.highlight}>{part}</span> : part
  );
};

const ContaNode = ({ 
  conta, 
  level, 
  busca, 
  onEditar, 
  onExcluir, 
  onAdicionarFilha,
  isLast
}) => {
  const [expanded, setExpanded] = useState(level <= 2);
  
  const hasChildren = conta.contasFilhas && conta.contasFilhas.length > 0;
  const isSintetica = conta.tipo === 'S';
  
  const grupoClass = conta.grupo ? styles[conta.grupo.toLowerCase()] : '';

  // Check if matches search
  const matchesSearch = busca && (
    conta.codigo.toLowerCase().includes(busca.toLowerCase()) || 
    conta.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // If searching and this or children match, keep expanded
  const shouldExpand = busca ? true : expanded;

  return (
    <div className={styles.nodeContainer}>
      <div 
        className={`${styles.nodeRow} ${matchesSearch ? styles.matchRow : ''}`} 
        style={{ paddingLeft: `${level * 24}px` }}
      >
        <div className={styles.hierarchyLines}>
          {/* Vertical line connecting siblings is handled by CSS before/after on nodeContainer */}
        </div>
        
        <button 
          className={`${styles.expandBtn} ${!isSintetica ? styles.invisible : ''} ${shouldExpand ? styles.expanded : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          ▶
        </button>
        
        <span className={styles.typeIcon}>
          {isSintetica ? '📁' : '📄'}
        </span>
        
        <span className={`${styles.codigo} ${grupoClass}`}>
          {highlightText(conta.codigo, busca)}
        </span>
        
        <span className={styles.nome}>
          {highlightText(conta.nome, busca)}
        </span>
        
        {conta.natureza && (
          <span className={`${styles.naturezaBadge} ${conta.natureza === 'D' ? styles.badgeD : styles.badgeC}`}>
            {conta.natureza === 'D' ? 'D' : 'C'}
          </span>
        )}
        
        <div className={styles.actions}>
          {isSintetica && (
            <button onClick={() => onAdicionarFilha(conta)} title="Adicionar Filha" className={styles.actionBtn}>➕</button>
          )}
          <button onClick={() => onEditar(conta)} title="Editar" className={styles.actionBtn}>✏️</button>
          <button onClick={() => onExcluir(conta)} title="Excluir" className={`${styles.actionBtn} ${styles.deleteBtn}`}>🗑️</button>
        </div>
      </div>
      
      {isSintetica && shouldExpand && hasChildren && (
        <div className={styles.childrenContainer}>
          {conta.contasFilhas.map((filha, index) => (
            <ContaNode 
              key={filha.id} 
              filha={filha} // Wait, the key says key={filha.id} and we need to pass conta={filha}
              conta={filha} 
              level={level + 1}
              busca={busca}
              onEditar={onEditar}
              onExcluir={onExcluir}
              onAdicionarFilha={onAdicionarFilha}
              isLast={index === conta.contasFilhas.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function ArvoreContas({ contas, busca, onEditar, onExcluir, onAdicionarFilha }) {
  if (!contas || contas.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🌱</div>
        <h3>Nenhuma conta cadastrada</h3>
        <p>Comece adicionando uma nova conta ou carregando o plano padrão.</p>
      </div>
    );
  }

  return (
    <div className={styles.treeContainer}>
      {contas.map((conta, index) => (
        <ContaNode 
          key={conta.id} 
          conta={conta} 
          level={0}
          busca={busca}
          onEditar={onEditar}
          onExcluir={onExcluir}
          onAdicionarFilha={onAdicionarFilha}
          isLast={index === contas.length - 1}
        />
      ))}
    </div>
  );
}
