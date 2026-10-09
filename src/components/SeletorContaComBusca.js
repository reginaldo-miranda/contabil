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

  const trimmedSearch = search.trim();
  const numSearch = /^\d+$/.test(trimmedSearch) ? parseInt(trimmedSearch, 10) : null;
  const normSearch = normalizeStr(trimmedSearch);
  const cleanSearch = cleanCode(trimmedSearch);

  const filteredContas = (contas || []).filter(c => {
    if (!trimmedSearch) return true;

    // 1. Busca por código reduzido (exato ou prefixo)
    if (numSearch !== null && c.reduzido != null) {
      if (c.reduzido === numSearch || String(c.reduzido).startsWith(trimmedSearch)) {
        return true;
      }
    }

    const normNome = normalizeStr(c.nome);
    const normCodigo = normalizeStr(c.codigo);
    const cleanCodigoVal = cleanCode(c.codigo);

    // 2. Busca por frase/termo completo
    if (normNome.includes(normSearch) || normCodigo.includes(normSearch)) {
      return true;
    }
    if (cleanSearch !== '' && cleanCodigoVal.includes(cleanSearch)) {
      return true;
    }

    // 3. Busca por múltiplos termos/palavras (ex: "caixa ec" busca "caixa" E "ec")
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
  }).sort((a, b) => {
    // Se digitou número, prioridade máxima para match exato no reduzido
    if (numSearch !== null) {
      const aExact = a.reduzido === numSearch;
      const bExact = b.reduzido === numSearch;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aPrefix = a.reduzido != null && String(a.reduzido).startsWith(trimmedSearch);
      const bPrefix = b.reduzido != null && String(b.reduzido).startsWith(trimmedSearch);
      if (aPrefix && !bPrefix) return -1;
      if (!aPrefix && bPrefix) return 1;
    }
    return 0;
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
    <div className={`${styles.wrapper} ${open ? styles.isOpen : ''}`} ref={containerRef}>
      <div 
        className={`${styles.selectDisplay} ${open ? styles.active : ''}`}
        onClick={handleOpen}
      >
        <span className={styles.text}>
          {selectedConta ? (
            <>
              {selectedConta.reduzido != null && <strong>[{selectedConta.reduzido}] </strong>}
              {selectedConta.codigo} - {selectedConta.nome}
            </>
          ) : placeholder}
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
              placeholder="Digite o reduzido (ex: 23), código ou nome... (Enter seleciona)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  setSearch('');
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                  if (filteredContas.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredContas[0].id);
                  }
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
                const isExactReduzido = numSearch !== null && c.reduzido === numSearch;
                return (
                  <div 
                    key={c.id} 
                    className={`${styles.optionItem} ${isSelected ? styles.selected : ''} ${isExactReduzido ? styles.exactMatch : ''}`}
                    onClick={() => handleSelect(c.id)}
                  >
                    <span className={styles.codigo}>
                      {c.reduzido != null && (
                        <span className={styles.tagReduzido}>[{c.reduzido}]</span>
                      )}
                      {c.codigo}
                    </span>
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
