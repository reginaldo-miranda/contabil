'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './AutocompleteConta.module.css';

export default function AutocompleteConta({ empresaId, onSelect, initialConta, placeholder }) {
  const [contas, setContas] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (empresaId) {
      fetchAnalyticalContas();
    } else {
      setContas([]);
    }
  }, [empresaId]);

  useEffect(() => {
    if (initialConta) {
      setSelectedConta(initialConta);
      setInputValue(`${initialConta.codigo} - ${initialConta.nome}`);
    } else {
      setSelectedConta(null);
      setInputValue('');
    }
  }, [initialConta]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // If not selected anything, reset input to selected or empty
        if (selectedConta) {
          setInputValue(`${selectedConta.codigo} - ${selectedConta.nome}`);
        } else {
          setInputValue('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedConta]);

  const fetchAnalyticalContas = async () => {
    try {
      const res = await fetch(`/api/contas?empresaId=${empresaId}`);
      if (res.ok) {
        const data = await res.json();
        // Only allow analytical accounts ('A')
        const analytical = data.filter(c => c.tipo === 'A');
        setContas(analytical);
      }
    } catch (err) {
      console.error('Erro ao carregar contas para autocomplete:', err);
    }
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

    const filtered = contas.filter(c => 
      c.codigo.toLowerCase().includes(val.toLowerCase()) ||
      c.nome.toLowerCase().includes(val.toLowerCase())
    );

    setSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
    setIsOpen(true);
  };

  const handleSelectSuggestion = (conta) => {
    setSelectedConta(conta);
    setInputValue(`${conta.codigo} - ${conta.nome}`);
    onSelect(conta);
    setIsOpen(false);
  };

  const handleFocus = () => {
    // If input is empty or has value, show matching suggestions
    const val = selectedConta ? '' : inputValue;
    const filtered = contas.filter(c => 
      c.codigo.toLowerCase().includes(val.toLowerCase()) ||
      c.nome.toLowerCase().includes(val.toLowerCase())
    );
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
        placeholder={placeholder || 'Digite o código ou nome...'}
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
              <span className={`${styles.codigo} ${grupoClass(conta.grupo)}`}>{conta.codigo}</span>
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
