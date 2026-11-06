// Busca aproximada de contas por voz: nome, apelidos e "reduzido N".
// Determinística (sem IA). Considera apenas contas analíticas.

import { normalizarVoz, parseNumeroTexto } from './parserValor.js';

export { normalizarVoz };

const PALAVRAS_VAZIAS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'e', 'para', 'pra', 'pro', 'com', 'um', 'uma', 'conta', 'contas', 'despesa', 'despesas',
  'debito', 'debitar', 'credito', 'creditar', 'valor', 'reais', 'real'
]);

// Radical simples em português (trata plural e algumas terminações)
function radical(p) {
  if (!p || p.length < 4) return p;
  if (p.endsWith('oes') || p.endsWith('aes')) return p.slice(0, -3) + 'ao';
  if (p.endsWith('ais') || p.endsWith('eis') || p.endsWith('ois')) return p.slice(0, -2) + 'l';
  if (p.endsWith('ns')) return p.slice(0, -2) + 'm';
  if (p.endsWith('res') || p.endsWith('zes')) return p.slice(0, -2);
  if (p.endsWith('s') && !p.endsWith('ss')) return p.slice(0, -1);
  return p;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function tokensSignificativos(texto) {
  const todos = normalizarVoz(texto).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const uteis = todos.filter(t => !PALAVRAS_VAZIAS.has(t));
  return uteis.length > 0 ? uteis : todos;
}

function tokensCasam(q, n) {
  if (q === n) return true;
  const rq = radical(q);
  const rn = radical(n);
  if (rq === rn) return true;
  if (rq.length >= 4 && rn.length >= 4 && (rq.startsWith(rn) || rn.startsWith(rq))) return true;
  if (rq.length >= 5 && rn.length >= 5) {
    const lim = Math.max(rq.length, rn.length) >= 8 ? 2 : 1;
    if (levenshtein(rq, rn) <= lim) return true;
  }
  return false;
}

// Pontua uma frase falada contra um nome (ou apelido) de conta. 0 = sem relação.
function pontuarNome(queryNorm, queryTokens, nomeBruto, ehApelido) {
  const nomeNorm = normalizarVoz(nomeBruto).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!nomeNorm) return 0;
  const bonus = ehApelido ? 10 : 0;

  if (queryNorm === nomeNorm) return 1000 + bonus;

  const nomeTokens = tokensSignificativos(nomeNorm);
  if (nomeTokens.length === 0 || queryTokens.length === 0) return 0;

  // Mesma sequência de palavras significativas
  if (queryTokens.join(' ') === nomeTokens.join(' ')) return 960 + bonus;

  const casadosQ = queryTokens.filter(q => nomeTokens.some(n => tokensCasam(q, n))).length;
  const casadosN = nomeTokens.filter(n => queryTokens.some(q => tokensCasam(q, n))).length;
  if (casadosQ === 0) return 0;

  const cobQuery = casadosQ / queryTokens.length; // quanto do que falei foi encontrado
  const cobNome = casadosN / nomeTokens.length; // quanto do nome foi coberto

  // Tudo que foi falado está dentro do nome (ex.: "aluguel" -> "Despesa com Aluguel")
  if (cobQuery === 1) return 600 + Math.round(cobNome * 150) + bonus;

  // Cobertura parcial: só vale se pelo menos metade do que foi falado casou
  if (cobQuery >= 0.5) return Math.round(200 + cobQuery * 150 + cobNome * 100) + bonus;
  return 0;
}

function extrairReduzido(queryNorm) {
  const m = queryNorm.match(/^(?:conta\s+)?reduzido\s+(.+)$/);
  if (!m) return null;
  const n = parseNumeroTexto(m[1]);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

export function listarApelidos(conta) {
  if (!conta?.apelidos) return [];
  return String(conta.apelidos).split(/[,;\n]/).map(a => a.trim()).filter(Boolean);
}

export function ehAnalitica(conta) {
  return conta && (conta.tipo === 'A' || conta.tipo === 'Analítica') && conta.ativa !== false;
}

/**
 * Busca contas analíticas pela frase falada.
 * @returns {{conta, score}[]} ordenado do melhor para o pior (até `limite`)
 */
export function buscarContas(frase, contas, { excluirId = null, limite = 3 } = {}) {
  const queryNorm = normalizarVoz(frase).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!queryNorm) return [];

  const candidatas = (contas || []).filter(c => ehAnalitica(c) && c.id !== excluirId);

  // Atalho: "reduzido 45"
  const reduzido = extrairReduzido(queryNorm);
  if (reduzido !== null) {
    const achada = candidatas.find(c => c.reduzido === reduzido);
    return achada ? [{ conta: achada, score: 1100 }] : [];
  }

  const queryTokens = tokensSignificativos(queryNorm);
  const pontuadas = [];

  for (const conta of candidatas) {
    let melhor = pontuarNome(queryNorm, queryTokens, conta.nome, false);
    for (const ap of listarApelidos(conta)) {
      const s = pontuarNome(queryNorm, queryTokens, ap, true);
      if (s > melhor) melhor = s;
    }
    if (melhor >= 250) pontuadas.push({ conta, score: melhor });
  }

  pontuadas.sort((a, b) => b.score - a.score || a.conta.nome.length - b.conta.nome.length);
  return pontuadas.slice(0, limite);
}

/**
 * Decide o que fazer com o resultado da busca.
 * @returns {{tipo: 'NENHUMA'} | {tipo: 'UNICA', conta} | {tipo: 'OPCOES', opcoes}}
 */
export function decidirBusca(resultados) {
  if (!resultados || resultados.length === 0) return { tipo: 'NENHUMA' };
  const [primeiro, segundo] = resultados;
  const folga = segundo ? primeiro.score - segundo.score : Infinity;
  if (primeiro.score >= 600 && folga >= 150) {
    return { tipo: 'UNICA', conta: primeiro.conta };
  }
  return { tipo: 'OPCOES', opcoes: resultados.map(r => r.conta) };
}

// Interpreta "primeira", "segunda", "um", "2"... Retorna índice (0-based) ou null.
export function interpretarEscolha(frase, quantidade) {
  const n = normalizarVoz(frase).replace(/[^a-z0-9\s]/g, ' ').trim();
  const mapa = [
    /\b(primeir[ao]|um|uma|1)\b/,
    /\b(segund[ao]|dois|duas|2)\b/,
    /\b(terceir[ao]|tres|3)\b/,
  ];
  for (let i = 0; i < Math.min(mapa.length, quantidade); i++) {
    if (mapa[i].test(n)) return i;
  }
  return null;
}
