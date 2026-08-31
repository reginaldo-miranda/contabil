'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './SeletorContaComBusca.module.css';

const normalizeStr = (str) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// Remove pontos, traços e espaços para comparação flexível de códigos (ex: "4.2.2.12.0001" bate com "422120001" ou "4.2.2.12.001")
const cleanCode = (str) => {
  if (!str) return '';
  return normalizeStr(str).replace(/[^a-z0-9]/g, '');
};

export default function SeletorContaComBusca({ contas, value, onChange, placeholder = "Selecione a conta..." }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedConta = (contas || []).find(c => String(c.id) === String(value) || String(c.codigo) === String(value));

  const filteredContas = (contas || []).filter(c => {
    if (!search || search.trim() === '') return true;
    const normSearch = normalizeStr(search).trim();
    const cleanSearch = cleanCode(search);

    const normNome = normalizeStr(c.nome);
    const normCodigo = normalizeStr(c.codigo);
    const cleanCodigoVal = cleanCode(c.codigo);

    // 1. Busca por frase/termo completo
    if (normNome.includes(normSearch) || normCodigo.includes(normSearch)) {
      return true;
    }
    if (cleanSearch !== '' && cleanCodigoVal.includes(cleanSearch)) {
      return true;
    }

    // 2. Busca por múltiplos termos/palavras (ex: "caixa ec" busca "caixa" E "ec")
    const tokens = normSearch.split(/\s+/).filter(Boolean);
    if (tokens.length > 1) {
      return tokens.every(token => {
        const cleanToken = cleanCode(token);
        return (
          normNome.includes(token) ||
          normCodigo.includes(token) ||
          (cleanToken !== '' && cleanCodigoVal.includes(cleanToken))
        );
      });
    }

    return false;
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setSearch('');
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 50);
  };

  const handleSelect = (contaId) => {
    onChange(contaId);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <div 
        className={`${styles.selectDisplay} ${open ? styles.active : ''}`}
        onClick={handleOpen}
      >
        <span className={styles.text}>
          {selectedConta ? `${selectedConta.codigo} - ${selectedConta.nome}` : placeholder}
        </span>
        <span className={styles.arrow}>▼</span>
      </div>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input 
              ref={searchInputRef}
              type="text" 
              className={styles.searchInput}
              placeholder="Digite o código ou nome da conta... (ESC fecha)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  setSearch('');
                }
              }}
            />
            {search && (
              <button 
                type="button" 
                className={styles.clearBtn}
                onClick={() => {
                  setSearch('');
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.optionsList}>
            {filteredContas.length === 0 ? (
              <div className={styles.empty}>Nenhuma conta encontrada</div>
            ) : (
              filteredContas.map(c => {
                const isSelected = String(c.id) === String(value);
                return (
                  <div 
                    key={c.id} 
                    className={`${styles.optionItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleSelect(c.id)}
                  >
                    <span className={styles.codigo}>{c.codigo}</span>
                    <span className={styles.nome}>{c.nome}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
