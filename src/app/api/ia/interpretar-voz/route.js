import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { detectarComandoNavegacao } from '@/lib/voz/navegacaoVoz';

// Helper para normalizar texto removendo acentos, pontuação e espaços múltiplos
function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrator de radicais morfológicos em português (trata plurais e variações)
function obterRadical(palavra) {
  if (!palavra || palavra.length < 4) return palavra;
  let p = palavra.toLowerCase();
  if (p.endsWith('eis')) return p.slice(0, -3) + 'iv';
  if (p.endsWith('el')) return p.slice(0, -2) + 'iv';
  if (p.endsWith('ais') || p.endsWith('ois') || p.endsWith('uis')) return p.slice(0, -3) + 'l';
  if (p.endsWith('oes') || p.endsWith('aes')) return p.slice(0, -3) + 'ao';
  if (p.endsWith('ns')) return p.slice(0, -2) + 'm';
  if (p.endsWith('res') || p.endsWith('zes')) return p.slice(0, -2);
  if (p.endsWith('es') && p.length > 5) return p.slice(0, -2);
  if (p.endsWith('s') && !p.endsWith('ss')) return p.slice(0, -1);
  return p;
}

// Apelidos de voz cadastrados na conta (lista separada por virgula), ja normalizados
function listarApelidosNorm(conta) {
  if (!conta || !conta.apelidos) return [];
  return String(conta.apelidos)
    .split(/[,;\n]/)
    .map(a => normalizar(a))
    .filter(a => a.length >= 2);
}

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Procura, no texto, o apelido mais longo que pertence a uma das contas informadas
function acharPorApelido(textoNorm, contas) {
  let melhor = null;
  for (const c of contas) {
    for (const ap of listarApelidosNorm(c)) {
      const re = new RegExp(`(?:^|\\s)${escaparRegex(ap)}(?:\\s|$)`);
      if (re.test(textoNorm) && (!melhor || ap.length > melhor.apelido.length)) {
        melhor = { conta: c, apelido: ap };
      }
    }
  }
  return melhor;
}

// Dicionário de números falados em português
const NUMEROS_EXTENSO = {
  'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'quatro': 4,
  'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
  'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14, 'quinze': 15,
  'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19, 'vinte': 20,
  'trinta': 30, 'quarenta': 40, 'cinquenta': 50, 'sessenta': 60, 'setenta': 70,
  'oitenta': 80, 'noventa': 90, 'cem': 100, 'cento': 100, 'duzentos': 200,
  'trezentos': 300, 'quatrocentos': 400, 'quinhentos': 500, 'seiscentos': 600,
  'setecentos': 700, 'oitocentos': 800, 'novecentos': 900, 'mil': 1000
};

// Conversor de valores falados ou numéricos (ex: "cinquenta reais", "150 conto", "R$ 45,90", "35 BRL")
function extrairValorFalado(textoNorm) {
  const matchDigito = textoNorm.match(/(?:valor\s*(?:de)?\s*)?(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|pau|conto|brl)?/i);
  if (matchDigito) {
    const val = parseFloat(matchDigito[1].replace(',', '.'));
    if (!isNaN(val) && val > 0) return val;
  }

  const regexExtenso = /(?:valor\s*(?:de)?\s*)?([a-z\s]+?)\s*(?:reais|real|pau|conto|brl)\b/i;
  const matchExtenso = textoNorm.match(regexExtenso);
  if (matchExtenso) {
    const palavras = matchExtenso[1].trim().split(/\s+/);
    let total = 0;
    let parcial = 0;

    for (const p of palavras) {
      if (p === 'e') continue;
      if (NUMEROS_EXTENSO[p] !== undefined) {
        const n = NUMEROS_EXTENSO[p];
        if (n === 1000) {
          total += (parcial === 0 ? 1 : parcial) * 1000;
          parcial = 0;
        } else {
          parcial += n;
        }
      }
    }
    total += parcial;
    if (total > 0) return total;
  }

  return 0;
}

// Dicionário semântico com regex estrito (word boundaries \b) para evitar correspondências espúrias (ex: 'br' em 'brl')
const DICIONARIO_SINONIMOS = [
  {
    padroes: [/\bcombustiv(?:el|eis)\b/i, /\bgasolina\b/i, /\betanol\b/i, /\balcool\b/i, /\bdiesel\b/i, /\bgnv\b/i, /\b(auto\s*)?posto\b/i, /\babastec(?:er|imento|i)\b/i, /\bipiranga\b/i, /\bshell\b/i, /\bpetrobras\b/i],
    termosConta: ['combustiveis', 'combustivel']
  },
  {
    padroes: [/\bdespesas?\s+pessoais?\b/i, /\bgastos?\s+pessoais?\b/i, /\bpessoal\b/i],
    termosConta: ['despesas pessoais']
  },
  {
    padroes: [/\balimentac(?:ao|oes)\b/i, /\balmoco\b/i, /\bjantar\b/i, /\brefeic(?:ao|oes)\b/i, /\bcomida\b/i, /\brestaurante[s]?\b/i, /\bpizzaria\b/i, /\bchurrascaria\b/i, /\bmarmita\b/i, /\bpadaria\b/i, /\blanche[s]?\b/i, /\bcafe\b/i, /\bifood\b/i],
    termosConta: ['restaurantes', 'refeicoes', 'clube Ifood']
  },
  {
    padroes: [/\b(super\s*)?mercado\b/i, /\brancho\b/i, /\bacougue\b/i, /\bquitanda\b/i, /\bhortifruti\b/i, /\batacadao\b/i, /\bassai\b/i, /\bcarrefour\b/i, /\bmercado\b/i],
    termosConta: ['super mercado diversos', 'super mercado serve bem', 'quitanda tropical', 'super mercado dore']
  },
  {
    padroes: [/\b(conta\s*de\s*)?(luz|energia|eletrica|eletricidade)\b/i, /\b(enel|cemig|cpfl|light)\b/i],
    termosConta: ['energia eletrica', 'energia']
  },
  {
    padroes: [/\b(conta\s*de\s*)?(agua|esgoto)\b/i, /\b(sabesp|copasa|sanepar|corsan)\b/i],
    termosConta: ['agua e esgoto', 'agua']
  },
  {
    padroes: [/\b(uber|99|taxi|taxis|corrida)\b/i],
    termosConta: ['aluguel de carro uber taxis', 'uber', 'taxi']
  },
  {
    padroes: [/\b(farmacia|drogaria|remedio|medicamento|medico|hospital|consulta)\b/i],
    termosConta: ['plano de saude doctor', 'dr anderson', 'despesas pessoais']
  },
  {
    padroes: [/\b(bar|bares|boteco|cerveja|chope)\b/i],
    termosConta: ['bares diversos', 'restaurantes']
  },
  {
    padroes: [/\b(cabelo|barba|salao|barbeiro|cabeleireiro)\b/i],
    termosConta: ['corte de cabelo', 'despesas pessoais']
  },
  {
    padroes: [/\b(internet|wifi|fibra|celular|telefone|telefonia)\b/i, /\b(vivo|claro|tim|desktop|oi)\b/i],
    termosConta: ['internet desktop', 'vivo', 'claro regi', 'claro bete']
  },
  {
    padroes: [/\b(streaming|netflix|spotify|youtube|apple|hbo|prime|disney)\b/i],
    termosConta: ['apple', 'tv por assinatura casa', 'tv por assinatura bete']
  },
  {
    padroes: [/\b(inteligencia\s*artificial|ia|chatgpt|openai|grok|gemini|anthropic|capcut|software|site)\b/i],
    termosConta: ['compra credito grok', 'compra credito google', 'compra credito sites diversos', 'capcut']
  },
  {
    padroes: [/\b(loteria|mega\s*sena|quina|loto|aposta|jogo)\b/i],
    termosConta: ['jogos caixa federal loterias']
  },
  {
    padroes: [/\b(tarifa|taxa|manutencao\s*de\s*conta|taxa\s*bancaria)\b/i],
    termosConta: ['tarifas bancarias', 'taxa de credito']
  },
  {
    padroes: [/\b(juros|multa|encargos)\b/i],
    termosConta: ['juros limite de conta', 'juros de parcelamento de  cartao de credito', 'juros pagamento parcelamento inss']
  },
  {
    padroes: [/\b(salario|ordenado|folha|pro\s*labore)\b/i],
    termosConta: ['reginaldo', 'salarios a pagar']
  }
];

// Mapa de meios de pagamento (Contas de Crédito - Origem do Recurso)
const MAPA_PAGAMENTOS = [
  {
    padroes: [/\bcartao\s+(?:de\s+credito\s+)?itau\b/i, /\bcredito\s+itau\b/i, /\bitau\s+credito\b/i, /\bitau\s+cartao\b/i, /\bcaretao\s+(?:de\s+credito\s+)?itau\b/i],
    alvo: 'cartao de credito itau'
  },
  {
    padroes: [/\bcartao\s+(?:de\s+credito\s+)?nu\s*bank\b/i, /\bcartao\s+(?:de\s+credito\s+)?nu\s*banck\b/i, /\bcredito\s+nu\s*bank\b/i, /\broxinho\b/i],
    alvo: 'cartao de credito nubanck'
  },
  {
    padroes: [/\bcartao\s+(?:de\s+credito\s+)?c6(?:\s*bank)?\b/i, /\bc6\s+credito\b/i],
    alvo: 'cartao de credito C6 bank'
  },
  {
    padroes: [/\bcartao\s+(?:de\s+credito\s+)?mercado\s*pago\b/i],
    alvo: 'cartao de credito merc pago pdv'
  },
  {
    padroes: [/\bcartao\s+(?:de\s+credito\s+)?shopee\b/i, /\bcartao\s+(?:de\s+credito\s+)?shoppe\b/i],
    alvo: 'cartao de credito shoppe'
  },
  {
    padroes: [/\bpoupanca\s+itau\b/i],
    alvo: 'poupanca itau'
  },
  {
    padroes: [/\bpoupanca\s+nu\s*bank\b/i, /\bcaixinha\s+nu\s*bank\b/i],
    alvo: 'poupanca nubank (caixinha)'
  },
  {
    padroes: [/\b(?:no|pelo|banco|conta|debito|pix|ted|doc)?\s*\bitau\b/i],
    alvo: 'Itaú'
  },
  {
    padroes: [/\b(?:no|pelo|banco|conta|debito|pix)?\s*\bnu\s*bank\b/i],
    alvo: 'nubank'
  },
  {
    padroes: [/\b(?:no|pelo|banco|conta|debito|pix)?\s*\bc6(?:\s*banc)?\b/i],
    alvo: 'C6 banc'
  },
  {
    padroes: [/\b(?:no|pelo|banco|conta|debito|pix)?\s*\bcaixa\s*(?:economica|federal)?\b/i],
    alvo: 'caixa economica federal'
  },
  {
    padroes: [/\b(?:no|pelo|banco|conta|debito|pix)?\s*\bmercado\s*pago\b/i],
    alvo: 'mercado pago pdv6'
  },
  {
    padroes: [/\b(?:em\s+)?dinheiro\b/i, /\b(?:em\s+)?especie\b/i, /\b(?:no\s+)?caixa\s*geral\b/i, /\b(?:no\s+)?caixa\b/i],
    alvo: 'Caixa Geral'
  }
];

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
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

const STOPWORDS_CONTABEIS = new Set([
  'a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'e', 'para', 'pra', 'pro', 'com', 'um', 'uma', 'conta', 'contas', 'pelo', 'pela',
  'debito', 'debitar', 'credito', 'creditar', 'valor', 'reais', 'real', 'despesa', 'despesas'
]);

function tokensUteis(txt) {
  return normalizar(txt).split(/\s+/).filter(t => t && !STOPWORDS_CONTABEIS.has(t));
}

function pontuarContaEspecifica(query, conta) {
  const qNorm = normalizar(query);
  if (!qNorm) return 0;

  // 1. Código contábil exato (ex: "4.2.2.02" ou "1.1.1.01.001")
  if (conta.codigo && normalizar(conta.codigo) === qNorm) {
    return 3000;
  }

  // 2. Código reduzido: "reduzido 10", "conta 10" ou só número
  const mRed = qNorm.match(/^(?:conta\s+)?(?:reduzido\s+)?(\d+)$/);
  if (mRed && conta.reduzido && conta.reduzido === parseInt(mRed[1], 10)) {
    return 2500;
  }

  const qTokens = tokensUteis(qNorm);
  if (qTokens.length === 0) return 0;

  const nomesParaAvaliar = [
    { texto: normalizar(conta.nome), pesoBase: 100 },
    ...(conta.apelidos ? String(conta.apelidos).split(/[,;\n]/).map(a => ({ texto: normalizar(a), pesoBase: 120 })) : [])
  ];

  let melhorScore = 0;

  for (const item of nomesParaAvaliar) {
    const nNorm = item.texto;
    if (!nNorm) continue;
    if (qNorm === nNorm) {
      melhorScore = Math.max(melhorScore, 1500 + item.pesoBase);
      continue;
    }

    const nTokens = tokensUteis(nNorm);
    if (nTokens.length === 0) continue;

    // Se toda a query está contida no nome da conta
    if (nNorm.includes(qNorm)) {
      melhorScore = Math.max(melhorScore, 1000 + (qNorm.length / nNorm.length) * 150 + item.pesoBase);
      continue;
    }

    // Se todo o nome da conta está contido na query falada
    if (qNorm.includes(nNorm)) {
      melhorScore = Math.max(melhorScore, 950 + (nNorm.length / qNorm.length) * 150 + item.pesoBase);
      continue;
    }

    // Token matching com radicais e Levenshtein
    let casados = 0;
    for (const qt of qTokens) {
      for (const nt of nTokens) {
        if (qt === nt || (qt.length >= 4 && nt.length >= 4 && obterRadical(qt) === obterRadical(nt))) {
          casados++;
          break;
        } else if (qt.length >= 5 && nt.length >= 5 && levenshtein(qt, nt) <= 1) {
          casados += 0.85;
          break;
        }
      }
    }

    const cobQ = casados / qTokens.length;
    const cobN = casados / nTokens.length;
    if (cobQ >= 0.5) {
      const score = Math.round(400 + cobQ * 450 + cobN * 200 + item.pesoBase);
      melhorScore = Math.max(melhorScore, score);
    }
  }

  return melhorScore;
}

function buscarMelhorContaAnalitica(trecho, contas, excluirId = null) {
  if (!trecho || !trecho.trim()) return null;
  const analiticas = contas.filter(c => (c.tipo === 'A' || c.tipo === 'Analítica') && c.id !== excluirId);
  let melhor = null;
  let maiorScore = 0;

  for (const c of analiticas) {
    const s = pontuarContaEspecifica(trecho, c);
    if (s > maiorScore) {
      maiorScore = s;
      melhor = c;
    }
  }

  if (maiorScore >= 350) {
    return { conta: melhor, score: maiorScore };
  }
  return null;
}

// Disseca comandos estruturados (Débito -> Crédito -> Valor) com precisão cirúrgica
function dissecarEstruturado(textoOriginal, contas, contextoAnterior = null) {
  const norm = normalizar(textoOriginal);

  // Caso 1: Resposta a contexto anterior (pergunta curta)
  if (contextoAnterior) {
    // Se estava aguardando conta de crédito
    if (contextoAnterior.dadosFaltantes === 'CREDITO' || contextoAnterior.dadosFaltantes === 'CREDITO_E_VALOR') {
      const v = extrairValorFalado(norm);
      let trechoCred = norm.replace(/\b(?:credito|cartao|banco|pagamento|no|pelo|na)\b/g, '').trim();
      if (v > 0) {
        trechoCred = trechoCred.replace(/(?:valor\s*)?(?:r\$\s*)?\d+(?:[.,]\d+)?\s*(?:reais|real|conto)?/gi, '').trim();
      }
      const cred = buscarMelhorContaAnalitica(trechoCred, contas, contextoAnterior.contaDebito?.id);
      const valorFinal = v > 0 ? v : (contextoAnterior.valor || 0);
      if (cred?.conta) {
        return {
          contaDebito: contextoAnterior.contaDebito,
          contaCredito: cred.conta,
          valor: valorFinal,
          dadosFaltantes: valorFinal <= 0 ? 'VALOR' : null
        };
      }
    }

    // Se estava aguardando valor
    if (contextoAnterior.dadosFaltantes === 'VALOR') {
      const v = extrairValorFalado(norm);
      if (v > 0) {
        return {
          contaDebito: contextoAnterior.contaDebito,
          contaCredito: contextoAnterior.contaCredito,
          valor: v,
          dadosFaltantes: null
        };
      }
    }
  }

  // Caso 2: Padrão explícito estruturado: "debito ... credito ... [valor ...]" ou "d: ... c: ..."
  const mCompleto = norm.match(/^(?:lancar\s+)?(?:debito|d)\s+(.+?)\s+(?:credito|c)\s+(.+)$/i);
  if (mCompleto) {
    const trechoDeb = mCompleto[1].trim();
    let restoCred = mCompleto[2].trim();

    let trechoVal = '';
    let trechoCred = restoCred;
    const mVal = restoCred.match(/\s+(?:valor|v)\s+(.+)$/i);
    if (mVal) {
      trechoVal = mVal[1].trim();
      trechoCred = restoCred.slice(0, mVal.index).trim();
    }

    let val = trechoVal ? extrairValorFalado(trechoVal) : 0;
    if (val <= 0) {
      val = extrairValorFalado(trechoCred);
      if (val > 0) {
        trechoCred = trechoCred.replace(/(?:valor\s*)?(?:r\$\s*)?\d+(?:[.,]\d+)?\s*(?:reais|real|conto)?/gi, '').trim();
      }
    }

    const resDeb = buscarMelhorContaAnalitica(trechoDeb, contas);
    const resCred = buscarMelhorContaAnalitica(trechoCred, contas, resDeb?.conta?.id);

    return {
      contaDebito: resDeb?.conta || null,
      contaCredito: resCred?.conta || null,
      valor: val,
      dadosFaltantes: !resDeb?.conta ? 'DEBITO' : (!resCred?.conta ? 'CREDITO' : (val <= 0 ? 'VALOR' : null))
    };
  }

  // Caso 3: Padrão explícito apenas de débito: "debito combustiveis [valor 50]"
  const mSoDebito = norm.match(/^(?:lancar\s+)?(?:debito|d)\s+(.+)$/i);
  if (mSoDebito) {
    let resto = mSoDebito[1].trim();
    let val = extrairValorFalado(resto);
    if (val > 0) {
      resto = resto.replace(/(?:valor\s*)?(?:r\$\s*)?\d+(?:[.,]\d+)?\s*(?:reais|real|conto)?/gi, '').trim();
    }
    const resDeb = buscarMelhorContaAnalitica(resto, contas);
    if (resDeb?.conta) {
      return {
        contaDebito: resDeb.conta,
        contaCredito: null,
        valor: val,
        dadosFaltantes: 'CREDITO'
      };
    }
  }

  return null;
}

// Localiza todas as contas analíticas mencionadas no texto ordenadas pela posição em que foram faladas
function encontrarContasNoTexto(textoNorm, analiticas) {
  const ocorrencias = [];

  for (const c of analiticas) {
    const termos = [];
    const nomeNorm = normalizar(c.nome);
    termos.push({ termo: nomeNorm, peso: 100 + nomeNorm.length });

    // Apelidos de voz cadastrados
    for (const ap of listarApelidosNorm(c)) {
      termos.push({ termo: ap, peso: 110 + ap.length });
    }

    // Código reduzido da conta (ex: "reduzido 10", "conta 10")
    if (c.reduzido) {
      termos.push({ termo: `reduzido ${c.reduzido}`, peso: 130 });
      termos.push({ termo: `conta ${c.reduzido}`, peso: 120 });
    }

    // Palavras individuais com >= 4 letras do nome (excluindo palavras reservadas de comandos contábeis)
    const palavras = nomeNorm.split(/\s+/).filter(p => p.length >= 4 && !STOPWORDS_CONTABEIS.has(p));
    for (const p of palavras) {
      termos.push({ termo: p, peso: 75 + p.length });
    }

    // Termos e variações comuns
    for (const item of MAPA_PAGAMENTOS) {
      if (normalizar(item.alvo) === nomeNorm || nomeNorm.includes(normalizar(item.alvo))) {
        for (const rg of item.padroes) {
          const match = rg.exec(textoNorm);
          if (match) {
            termos.push({ termo: match[0].trim(), peso: 95 + match[0].length });
          }
        }
      }
    }

    for (const { termo, peso } of termos) {
      if (!termo || termo.length < 2) continue;
      const regex = new RegExp(`(?:^|\\s)${escaparRegex(termo)}(?:\\s|$)`, 'i');
      const match = regex.exec(textoNorm);
      if (match) {
        const index = match.index + (match[0].startsWith(' ') ? 1 : 0);
        ocorrencias.push({
          conta: c,
          termo,
          index,
          peso,
          tamanho: termo.length
        });
      }
    }
  }

  // Ordena rigorosamente pela posição no texto (quem foi falado primeiro)
  ocorrencias.sort((a, b) => a.index - b.index || b.peso - a.peso);

  // Filtra sobreposições de texto e evita duplicatas da mesma conta
  const resultado = [];
  const contasIds = new Set();
  let ultimoFim = -1;

  for (const item of ocorrencias) {
    if (contasIds.has(item.conta.id)) continue;
    const inicio = item.index;
    const fim = inicio + item.tamanho;
    if (inicio < ultimoFim) continue;
    resultado.push(item);
    contasIds.add(item.conta.id);
    ultimoFim = fim;
  }

  return resultado;
}

// Motor linguístico determinístico contábil:
// REGRA FUNDAMENTAL: A PRIMEIRA CONTA FALADA É SEMPRE O DÉBITO. A SEGUNDA É O CRÉDITO.
// Sem adivinhar despesas falsas nem criar contas fictícias automaticamente.
function interpretarPorRegras(textoOriginal, contas, contextoAnterior = null) {
  let texto = normalizar(textoOriginal);
  const hoje = new Date().toISOString().split('T')[0];

  const ehCorrecao = !!contextoAnterior;
  const ehCorrecaoDebito = /\b(?:debito|despesa|destino)\b/i.test(texto);
  const ehCorrecaoCredito = /\b(?:credito|cartao|pagamento|banco|origem)\b/i.test(texto);

  // 1. Extrair valor falado
  let valor = extrairValorFalado(texto);
  if (valor <= 0 && ehCorrecao && contextoAnterior?.valor) {
    valor = contextoAnterior.valor;
  }

  // 2. Extrair data
  let data = contextoAnterior?.data || hoje;
  if (texto.includes('anteontem')) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    data = d.toISOString().split('T')[0];
  } else if (texto.includes('ontem')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    data = d.toISOString().split('T')[0];
  } else {
    const matchDia = texto.match(/dia\s*(\d{1,2})/i);
    if (matchDia) {
      const dia = parseInt(matchDia[1], 10);
      const d = new Date();
      if (dia >= 1 && dia <= 31) {
        d.setDate(dia);
        data = d.toISOString().split('T')[0];
      }
    }
  }

  // 2.1 Tenta primeiro o parser estruturado determinístico de altíssima precisão (Débito -> Crédito -> Valor)
  const estruturado = dissecarEstruturado(textoOriginal, contas, contextoAnterior);
  if (estruturado && (estruturado.contaDebito || estruturado.contaCredito || (estruturado.valor && estruturado.valor > 0))) {
    const debitoNome = estruturado.contaDebito?.nome || 'Débito';
    const creditoNome = estruturado.contaCredito?.nome || 'Crédito';
    const valorFinal = estruturado.valor || 0;
    const faltantes = estruturado.dadosFaltantes;

    let resumoFalado = '';
    if (!estruturado.contaDebito) {
      resumoFalado = 'Não identifiquei a conta. Qual a conta de débito?';
    } else if (!estruturado.contaCredito) {
      resumoFalado = 'Qual o crédito?';
    } else if (valorFinal <= 0) {
      resumoFalado = 'Qual o valor?';
    } else {
      resumoFalado = `${debitoNome} no ${creditoNome}, ${valorFinal.toFixed(2)} reais. Confirma?`;
    }

    const historico = estruturado.contaDebito
      ? `${estruturado.contaDebito.nome}${estruturado.contaCredito ? ' c/ ' + estruturado.contaCredito.nome : ''}`
      : 'Lançamento contábil';

    return {
      sucesso: true,
      motor: 'motor-linguistico-estruturado',
      interpretacao: {
        data,
        valor: valorFinal,
        documento: null,
        historico,
        contaDebito: estruturado.contaDebito ? { id: estruturado.contaDebito.id, codigo: estruturado.contaDebito.codigo, nome: estruturado.contaDebito.nome } : null,
        contaCredito: estruturado.contaCredito ? { id: estruturado.contaCredito.id, codigo: estruturado.contaCredito.codigo, nome: estruturado.contaCredito.nome } : null,
        sugerirNovaConta: false,
        sugestao: null,
        dadosFaltantes: faltantes,
        resumoFalado,
        explicacao: `R$ ${valorFinal.toFixed(2)} | Débito: ${debitoNome} | Crédito: ${estruturado.contaCredito ? creditoNome : '—'}`
      }
    };
  }

  // 3. Filtrar contas analíticas e identificar quais foram faladas no texto
  const analiticas = contas.filter(c => c.tipo === 'A' || c.tipo === 'Analítica');
  const contasEncontradas = encontrarContasNoTexto(texto, analiticas);

  let contaDebito = null;
  let contaCredito = null;

  if (ehCorrecao) {
    if (ehCorrecaoDebito && contasEncontradas.length > 0) {
      contaDebito = contasEncontradas[0].conta;
      contaCredito = contextoAnterior.contaCredito || null;
    } else if (ehCorrecaoCredito && contasEncontradas.length > 0) {
      contaDebito = contextoAnterior.contaDebito || null;
      contaCredito = contasEncontradas[0].conta;
    } else if (contextoAnterior.contaDebito && (!contextoAnterior.contaCredito || contextoAnterior.dadosFaltantes === 'CREDITO' || contextoAnterior.dadosFaltantes === 'CREDITO_E_VALOR')) {
      // Estava aguardando a resposta da conta de crédito: a conta falada agora é o CRÉDITO!
      contaDebito = contextoAnterior.contaDebito;
      if (contasEncontradas.length > 0) {
        contaCredito = contasEncontradas[0].conta;
      }
    } else if (contasEncontradas.length >= 2) {
      contaDebito = contasEncontradas[0].conta;
      contaCredito = contasEncontradas[1].conta;
    } else if (contasEncontradas.length === 1) {
      contaDebito = contasEncontradas[0].conta;
      contaCredito = contextoAnterior.contaCredito || null;
    } else {
      contaDebito = contextoAnterior.contaDebito || null;
      contaCredito = contextoAnterior.contaCredito || null;
    }
  } else {
    // Comando inicial de lançamento
    if (contasEncontradas.length >= 2) {
      // Falou duas contas: 1ª é Débito, 2ª é Crédito
      contaDebito = contasEncontradas[0].conta;
      contaCredito = contasEncontradas[1].conta;
    } else if (contasEncontradas.length === 1) {
      // Falou apenas 1 conta: A primeira conta falada é SEMPRE DÉBITO!
      contaDebito = contasEncontradas[0].conta;
      contaCredito = null;
    }
  }

  // 4. Identificar dados faltantes e montar resumo falado
  let dadosFaltantes = null;
  let resumoFalado = '';

  const debitoNome = contaDebito?.nome || 'Débito';
  const creditoNome = contaCredito?.nome || 'Crédito';

  if (!contaDebito) {
    dadosFaltantes = 'DEBITO';
    resumoFalado = 'Não identifiquei a conta. Qual a conta de débito?';
  } else if (!contaCredito) {
    dadosFaltantes = valor > 0 ? 'CREDITO' : 'CREDITO_E_VALOR';
    resumoFalado = 'Qual o crédito?';
  } else if (valor <= 0) {
    dadosFaltantes = 'VALOR';
    resumoFalado = 'Qual o valor?';
  } else {
    dadosFaltantes = null;
    resumoFalado = `${debitoNome} no ${creditoNome}, ${valor.toFixed(2)} reais. Pode gravar?`;
  }

  const historico = contaDebito ? `${contaDebito.nome}${contaCredito ? ' c/ ' + contaCredito.nome : ''}` : 'Lançamento contábil';

  return {
    sucesso: true,
    motor: 'motor-linguistico-deterministico',
    interpretacao: {
      data,
      valor,
      documento: null,
      historico,
      contaDebito: contaDebito ? { id: contaDebito.id, codigo: contaDebito.codigo, nome: contaDebito.nome } : null,
      contaCredito: contaCredito ? { id: contaCredito.id, codigo: contaCredito.codigo, nome: contaCredito.nome } : null,
      sugerirNovaConta: false,
      sugestao: null,
      dadosFaltantes,
      resumoFalado,
      explicacao: `R$ ${valor.toFixed(2)} | Débito: ${debitoNome} | Crédito: ${contaCredito ? creditoNome : '—'}`
    }
  };
}

// Interpretação com Gemini com frases curtas e diretas
async function interpretarComGemini(texto, contas, apiKey, contextoAnterior = null) {
  const hoje = new Date().toISOString().split('T')[0];

  const analiticas = contas.filter(c => c.tipo === 'A' || c.tipo === 'Analítica');
  const resumoContas = analiticas.map(c => ({
    id: c.id,
    codigo: c.codigo,
    nome: c.nome,
    apelidos: c.apelidos || undefined,
    tipo: 'A',
    grupo: c.grupo,
  }));

  const ehCorrecao = !!contextoAnterior;

  const systemPrompt = `Você é o Copilot Contábil ultrarrápido do ContábilPro (Brasil).
Extraia o lançamento contábil em partidas dobradas.
${ehCorrecao ? 'O usuário está corrigindo o lançamento anterior. Atualize os campos solicitados mantendo o restante.' : ''}

Importante:
- Somente use contas analíticas (tipo A) da lista fornecida!
- NUNCA invente ou assuma uma conta de crédito se o usuário não mencionou o meio de pagamento (banco, cartão, caixa, etc.)! Se o usuário não falou o crédito, retorne "contaCredito": null e coloque "dadosFaltantes": "CREDITO" (ou "CREDITO_E_VALOR" se também faltar valor).
- Se o usuário não falou o valor, retorne "valor": 0 e se não tiver crédito coloque "dadosFaltantes": "CREDITO_E_VALOR" ou "VALOR".
- Se faltar crédito, coloque "resumoFalado": "Qual o crédito?"
- Se faltar apenas valor, coloque "resumoFalado": "Qual o valor?"
- Se tudo estiver completo: "[ContaDébito] no [ContaCrédito], [Valor] reais. Pode gravar?"
- Gere um 'resumoFalado' EXTREMAMENTE CURTO e direto (máximo 0.8 segundo de fala).

Retorne APENAS um objeto JSON válido no formato:
{
  "data": "YYYY-MM-DD",
  "valor": 50.0,
  "documento": null,
  "historico": "Pagamento / Despesa",
  "contaDebito": { "id": 123, "codigo": "4.2.2.07.001", "nome": "Nome" },
  "contaCredito": { "id": 456, "codigo": "2.1.5.01.001", "nome": "Nome" },
  "sugerirNovaConta": false,
  "sugestao": null,
  "dadosFaltantes": null,
  "resumoFalado": "Texto ultra curto para ler em menos de 1.5s",
  "explicacao": "R$ 50 | Débito | Crédito"
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            text: `Data atual do sistema: ${hoje}\nComando de voz do usuário: "${texto}"\n${ehCorrecao ? `Contexto Anterior:\n${JSON.stringify(contextoAnterior)}\n` : ''}\nLista de Contas da Empresa:\n${JSON.stringify(resumoContas)}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const modelos = ['gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError = null;

  for (const modelo of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${modelo} retornou status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error(`Resposta vazia da API do ${modelo}`);

      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        sucesso: true,
        motor: modelo,
        interpretacao: parsed
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao comunicar com os modelos do Gemini.');
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { texto, empresaId, contextoAnterior } = body;

    if (!texto || !empresaId) {
      return NextResponse.json(
        { erro: 'O texto do comando de voz e a empresaId são obrigatórios.' },
        { status: 400 }
      );
    }

    // 0. Detectar comando de navegação rápida de telas (ex: "abrir dre", "balancete", "plano de contas")
    const comandoNav = detectarComandoNavegacao(texto);
    if (comandoNav) {
      return NextResponse.json({
        sucesso: true,
        tipoIntencao: 'NAVEGACAO',
        navegacao: comandoNav,
        interpretacao: {
          resumoFalado: comandoNav.fala,
        }
      });
    }

    const parsedEmpresaId = parseInt(empresaId, 10);

    const contas = await prisma.conta.findMany({
      where: { empresaId: parsedEmpresaId, ativa: true },
      select: {
        id: true,
        codigo: true,
        reduzido: true,
        nome: true,
        apelidos: true,
        tipo: true,
        natureza: true,
        grupo: true,
        contaPaiId: true,
      },
      orderBy: { codigo: 'asc' },
    });

    if (contas.length === 0) {
      return NextResponse.json(
        { erro: 'Nenhuma conta cadastrada para esta empresa.' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const resultadoGemini = await interpretarComGemini(texto, contas, geminiKey.trim(), contextoAnterior);
        return NextResponse.json(resultadoGemini);
      } catch (geminiError) {
        console.warn('Aviso: Falha ao chamar Gemini, usando motor linguístico local:', geminiError.message);
        const resultadoRegras = interpretarPorRegras(texto, contas, contextoAnterior);
        return NextResponse.json({
          ...resultadoRegras,
          avisoFallback: 'Gemini indisponível; interpretação gerada pelo motor linguístico local.'
        });
      }
    }

    const resultadoLocal = interpretarPorRegras(texto, contas, contextoAnterior);
    return NextResponse.json(resultadoLocal);

  } catch (error) {
    console.error('Erro ao interpretar comando de voz:', error);
    return NextResponse.json(
      { erro: 'Erro interno ao processar comando de voz: ' + error.message },
      { status: 500 }
    );
  }
}
