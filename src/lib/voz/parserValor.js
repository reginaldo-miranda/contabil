// Parser local de valores monetários falados em português do Brasil.
// Aceita dígitos ("1.250,50", "R$ 150", "150 reais e 50 centavos") e extenso
// ("mil duzentos e cinquenta reais e quarenta centavos"). Sem IA, 100% determinístico.

export function normalizarVoz(texto) {
  if (!texto) return '';
  return String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;!?]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNIDADES = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
  sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14,
  catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100, cento: 100,
  duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};

// Converte um token numérico em dígitos ("1.250,50", "150,5", "2500", "12.5") para número
function parseDigitos(token) {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(token)) {
    return parseFloat(token.replace(/\./g, '').replace(',', '.'));
  }
  if (/^\d+,\d+$/.test(token)) return parseFloat(token.replace(',', '.'));
  if (/^\d+\.\d{1,2}$/.test(token)) return parseFloat(token);
  return null;
}

// Converte um trecho (dígitos e/ou extenso) em número. Retorna null se houver token desconhecido.
export function parseNumeroTexto(trecho) {
  const tokens = normalizarVoz(trecho).split(' ').filter(Boolean);
  if (tokens.length === 0) return null;

  let total = 0;
  let atual = 0;
  let achou = false;

  for (const tk of tokens) {
    if (tk === 'e' || tk === 'de') continue;

    if (/^[\d.,]+$/.test(tk)) {
      const n = parseDigitos(tk);
      if (n === null) return null;
      atual += n;
      achou = true;
      continue;
    }
    if (tk === 'mil') {
      total += (atual || 1) * 1000;
      atual = 0;
      achou = true;
      continue;
    }
    if (tk === 'milhao' || tk === 'milhoes') {
      total += (atual || 1) * 1000000;
      atual = 0;
      achou = true;
      continue;
    }
    if (UNIDADES[tk] !== undefined) {
      atual += UNIDADES[tk];
      achou = true;
      continue;
    }
    return null;
  }

  if (!achou) return null;
  return total + atual;
}

function arredondar(n) {
  return Math.round(n * 100) / 100;
}

// Interpreta o valor completo falado. Retorna número (> 0) ou null.
export function interpretarValorFalado(texto) {
  let t = normalizarVoz(texto).replace(/r\$/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;

  // Remove prefixos comuns: "valor", "foi", "de", "é"
  t = t.replace(/^(?:o\s+)?(?:valor\s+)?(?:foi\s+|e\s+|de\s+)?/, '').trim();

  // "X reais e Y centavos" / "X reais" / "Y centavos"
  const mReaisCent = t.match(/^(.+?)\s+(?:reais|real|pau|conto|contos)(?:\s+e)?\s+(.+?)\s+centavos?$/);
  if (mReaisCent) {
    const r = parseNumeroTexto(mReaisCent[1]);
    const c = parseNumeroTexto(mReaisCent[2]);
    if (r !== null && c !== null && c < 100) {
      const v = arredondar(r + c / 100);
      return v > 0 ? v : null;
    }
    return null;
  }

  const mReais = t.match(/^(.+?)\s+(?:reais|real|pau|conto|contos)$/);
  if (mReais) {
    const r = parseNumeroTexto(mReais[1]);
    return r !== null && r > 0 ? arredondar(r) : null;
  }

  const mCent = t.match(/^(.+?)\s+centavos?$/);
  if (mCent) {
    const c = parseNumeroTexto(mCent[1]);
    return c !== null && c > 0 && c < 100 ? arredondar(c / 100) : null;
  }

  // "X virgula Y" ou "X ponto Y" (decimal falado)
  const mVirgula = t.match(/^(.+?)\s+(?:virgula|ponto)\s+(.+)$/);
  if (mVirgula) {
    const inteiro = parseNumeroTexto(mVirgula[1]);
    const decimalTxt = mVirgula[2].trim();
    let decimal = null;
    if (/^\d{1,2}$/.test(decimalTxt)) decimal = parseInt(decimalTxt, 10) / (decimalTxt.length === 1 ? 10 : 100);
    else {
      const d = parseNumeroTexto(decimalTxt);
      if (d !== null && d < 100) decimal = d / 100;
    }
    if (inteiro !== null && decimal !== null) {
      const v = arredondar(inteiro + decimal);
      return v > 0 ? v : null;
    }
    return null;
  }

  // Apenas número ("150", "1.250,50", "cento e cinquenta")
  const n = parseNumeroTexto(t);
  return n !== null && n > 0 ? arredondar(n) : null;
}

// Texto falado para um valor ("150 reais e 50 centavos")
export function formatarValorFalado(valor) {
  const v = Math.round(Number(valor) * 100);
  const reais = Math.floor(v / 100);
  const cent = v % 100;
  const rTxt = `${reais} ${reais === 1 ? 'real' : 'reais'}`;
  if (cent === 0) return rTxt;
  const cTxt = `${cent} ${cent === 1 ? 'centavo' : 'centavos'}`;
  return reais === 0 ? cTxt : `${rTxt} e ${cTxt}`;
}
