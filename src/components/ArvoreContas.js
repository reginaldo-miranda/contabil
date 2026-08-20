'use client';

import { useState, useEffect } from 'react';
import styles from './ArvoreContas.module.css';

const normalizeStr = (str) => 
  str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text, highlight) => {
  if (!highlight) return text;
  const escaped = escapeRegExp(highlight);
  try {
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <span key={index} className={styles.highlight}>{part}</span> : part
    );
  } catch (e) {
    return text;
  }
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
  const isSintetica = conta.tipo === 'S' || hasChildren;
  
  const grupoClass = conta.grupo ? styles[conta.grupo.toLowerCase()] : '';

  // Check if matches search (case-insensitive e insensível a acentos)
  const normBusca = normalizeStr(busca);
  const matchesSearch = busca && normBusca.length > 0 && (
    normalizeStr(conta.codigo).includes(normBusca) || 
    normalizeStr(conta.nome).includes(normBusca)
  );

  // If searching and this or children match, keep expanded
  const shouldExpand = busca ? true : expanded;

  return (
    <div className={styles.nodeContainer}>
      <div 
        data-match={matchesSearch ? "true" : undefined}
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
  useEffect(() => {
    if (busca && busca.trim() !== '') {
      const timer = setTimeout(() => {
        const firstMatch = document.querySelector('[data-match="true"]');
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [busca]);

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
