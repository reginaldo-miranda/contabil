'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ArvoreContas.module.css';

const normalizeStr = (str) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const highlightText = (text, highlight) => {
  if (!highlight) return text;
  const normText = normalizeStr(text);
  const normHighlight = normalizeStr(highlight);
  if (!normText.includes(normHighlight)) return text;
  
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, index) => 
    normalizeStr(part) === normHighlight ? 
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
  isLast,
  firstMatchId
}) => {
  const [expanded, setExpanded] = useState(level <= 2);
  const nodeRowRef = useRef(null);
  
  const filhas = conta.contasFilhas || conta.filhas || [];
  const hasChildren = filhas.length > 0;
  const isSintetica = conta.tipo === 'Sintética' || conta.tipo === 'S';
  
  const grupoClass = conta.grupo ? styles[conta.grupo.toLowerCase()] : '';

  const normBusca = normalizeStr(busca);
  const matchesSearch = normBusca !== '' && (
    normalizeStr(conta.codigo).includes(normBusca) || 
    normalizeStr(conta.nome).includes(normBusca)
  );

  const isFirstMatch = firstMatchId && firstMatchId === conta.id;

  useEffect(() => {
    if (isFirstMatch && nodeRowRef.current) {
      setTimeout(() => {
        if (nodeRowRef.current) {
          nodeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [isFirstMatch, busca]);

  // Reset scroll and collapse state when search is cleared
  useEffect(() => {
    if (!busca || busca.trim() === '') {
      setExpanded(level <= 2);
    }
  }, [busca, level]);

  const shouldExpand = (busca && busca.trim() !== '') ? true : expanded;

  return (
    <div className={styles.nodeContainer}>
      <div 
        ref={nodeRowRef}
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
          <span className={`${styles.naturezaBadge} ${conta.natureza === 'Devedora' ? styles.badgeD : styles.badgeC}`}>
            {conta.natureza === 'Devedora' ? 'D' : 'C'}
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
          {filhas.map((filha, index) => (
            <ContaNode 
              key={filha.id} 
              conta={filha} 
              level={level + 1}
              busca={busca}
              onEditar={onEditar}
              onExcluir={onExcluir}
              onAdicionarFilha={onAdicionarFilha}
              isLast={index === filhas.length - 1}
              firstMatchId={firstMatchId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function ArvoreContas({ contas, busca, onEditar, onExcluir, onAdicionarFilha }) {
  const firstMatchIdRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    firstMatchIdRef.current = null;
    if (!busca || busca.trim() === '') {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    } else if (contas && contas.length > 0) {
      const normB = normalizeStr(busca);
      const findFirst = (nodes) => {
        for (let n of nodes) {
          const match = normalizeStr(n.codigo).includes(normB) || normalizeStr(n.nome).includes(normB);
          if (match) {
            return n.id;
          }
          const filhas = n.contasFilhas || n.filhas || [];
          if (filhas.length > 0) {
            const childMatch = findFirst(filhas);
            if (childMatch) return childMatch;
          }
        }
        return null;
      };
      firstMatchIdRef.current = findFirst(contas);
    }
  }, [busca, contas]);

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
    <div ref={containerRef} className={styles.treeContainer}>
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
          firstMatchId={firstMatchIdRef.current}
        />
      ))}
    </div>
  );
}
