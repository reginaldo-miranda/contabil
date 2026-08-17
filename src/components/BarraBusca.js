'use client';

import { useState, useEffect } from 'react';
import styles from './BarraBusca.module.css';

export default function BarraBusca({ onBusca }) {
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onBusca(term);
    }, 300);

    return () => clearTimeout(timer);
  }, [term, onBusca]);

  return (
    <div className={styles.container}>
      <span className={styles.icon}>🔍</span>
      <input
        type="text"
        className={styles.input}
        placeholder="Buscar por código ou nome da conta..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {term && (
        <button className={styles.clearBtn} onClick={() => setTerm('')}>
          ✕
        </button>
      )}
    </div>
  );
}
