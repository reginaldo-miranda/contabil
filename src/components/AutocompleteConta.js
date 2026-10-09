'use client';

import { useState, useEffect, useRef } from 'react';
import { useContabil } from '../context/ContabilContext';
import styles from './AutocompleteConta.module.css';

export default function AutocompleteConta({ empresaId: empresaIdProp, onSelect, initialConta, placeholder }) {
  const { empresaId: empresaIdContext } = useContabil();
  const empresaId = empresaIdProp || empresaIdContext;
  const [contas, setContas] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const wrapperRef = useRef(null);

  const fetchAnalyticalContas = async () => {
    try {
      const res = await fetch(`/api/contas?empresaId=${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        // Allow both 'A' and 'Analítica'
        const analytical = data.filter(c => c.tipo === 'A' || c.tipo === 'Analítica');
        setContas(analytical);
      }
    } catch (err) {
      console.error('Erro ao carregar contas para autocomplete:', err);
    }
  };

  useEffect(() => {
    if (empresaId) {
      fetchAnalyticalContas();
    } else {
      setContas([]);
    }
  }, [empresaId]);

  const filterAndSortContas = (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const isNum = /^\d+$/.test(q);
    const num = isNum ? parseInt(q, 10) : null;

    return contas.filter(c => {
      if (num !== null && c.reduzido != null) {
        if (c.reduzido === num || String(c.reduzido).startsWith(q)) return true;
      }
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.nome.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      if (num !== null) {
        const aExact = a.reduzido === num;
        const bExact = b.reduzido === num;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }
      return 0;
    });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setSelectedConta(null);
    onSelect(null);

    if (!val.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const filtered = filterAndSortContas(val);
    setSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
    setIsOpen(true);
  };

  const handleSelectSuggestion = (conta) => {
    setSelectedConta(conta);
    const prefix = conta.reduzido != null ? `[${conta.reduzido}] ` : '';
    setInputValue(`${prefix}${conta.codigo} - ${conta.nome}`);
    onSelect(conta);
    setIsOpen(false);
  };

  const handleFocus = () => {
    const val = selectedConta ? '' : inputValue;
    const filtered = filterAndSortContas(val);
    setSuggestions(filtered.slice(0, 10));
    setIsOpen(true);
  };

  const grupoClass = (grupo) => {
    return grupo ? styles[grupo.toLowerCase()] : '';
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <input
        type="text"
        className={styles.input}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setIsOpen(false);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (isOpen && suggestions.length > 0) {
              e.preventDefault();
              handleSelectSuggestion(suggestions[0]);
            }
          }
        }}
        placeholder={placeholder || 'Digite o reduzido (ex: 23), código ou nome...'}
        required
      />
      {isOpen && suggestions.length > 0 && (
        <ul className={styles.suggestionsList}>
          {suggestions.map(conta => (
            <li 
              key={conta.id} 
              className={styles.suggestionItem}
              onClick={() => handleSelectSuggestion(conta)}
            >
              <span className={`${styles.codigo} ${grupoClass(conta.grupo)}`}>
                {conta.reduzido != null && <strong>[{conta.reduzido}] </strong>}
                {conta.codigo}
              </span>
              <span className={styles.nome}>{conta.nome}</span>
            </li>
          ))}
        </ul>
      )}
      {isOpen && suggestions.length === 0 && (
        <div className={styles.noSuggestions}>Nenhuma conta analítica encontrada</div>
      )}
    </div>
  );
}
