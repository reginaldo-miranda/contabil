'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './BarraBusca.module.css';

export default function BarraBusca({ onBusca }) {
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onBusca(term);
    }, 300);

    return () => clearTimeout(timer);
  }, [term, onBusca]);

  const clearSearch = () => {
    setTerm('');
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.container}>
      <span className={styles.icon}>🔍</span>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder="Buscar por código ou nome da conta... (ESC para limpar)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            clearSearch();
          }
        }}
      />
      {term && (
        <button className={styles.clearBtn} onClick={clearSearch}>
          ✕
        </button>
      )}
    </div>
  );
}
