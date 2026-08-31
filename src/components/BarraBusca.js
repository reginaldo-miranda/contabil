'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './BarraBusca.module.css';

export default function BarraBusca({ onBusca }) {
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);

  const resetSearch = () => {
    setTerm('');
    onBusca('');
    
    // Rola a janela/tela inteira de volta para o topo (onde o input esta localizado)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      resetSearch();
    }
  };

  return (
    <div className={styles.container}>
      <span className={styles.icon}>🔍</span>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder="Buscar por código ou nome da conta..."
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          onBusca(e.target.value);
        }}
        onKeyDown={handleKeyDown}
      />
      {term && (
        <button type="button" className={styles.clearBtn} onClick={resetSearch}>
          ✕
        </button>
      )}
    </div>
  );
}
