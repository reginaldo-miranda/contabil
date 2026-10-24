import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Helper para normalizar texto removendo acentos e pontuação
function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Heurística de fallback caso a chave Gemini não esteja configurada ou falhe
function interpretarPorRegras(textoOriginal, contas) {
  const texto = normalizar(textoOriginal);
  const hoje = new Date().toISOString().split('T')[0];

  // 1. Extrair valor
  let valor = 0;
  const matchValor = texto.match(/(?:valor\s*(?:de)?\s*)?(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real)?/i);
  if (matchValor) {
    valor = parseFloat(matchValor[1].replace(',', '.'));
  }

  // 2. Extrair data
  let data = hoje;
  if (texto.includes('ontem')) {
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

  // 3. Montar histórico amigável
  let historico = textoOriginal
    .replace(/^cont[aá]bil\s*,?\s*/i, '')
    .replace(/^(?:faz|fazer|lan[cç]a|lan[cç]ar|registra|registrar)\s+(?:um\s+)?(?:lan[cç]amento\s+)?(?:de\s+)?/i, '')
    .replace(/\s*valor\s*(?:de)?\s*(?:r\$\s*)?\d+(?:[.,]\d{1,2})?\s*(?:reais|real)?/i, '')
    .trim();
  
  if (historico.length > 0) {
    historico = historico.charAt(0).toUpperCase() + historico.slice(1);
  } else {
    historico = 'Lançamento via comando de voz';
  }

  // 4. Identificar Contas (Débito e Crédito)
  // Contas analíticas disponíveis
  const analiticas = contas.filter(c => c.tipo === 'A' || c.tipo === 'Analítica');
  const sinteticas = contas.filter(c => c.tipo === 'S' || c.tipo === 'Sintética');

  // Separar em possíveis meios de pagamento (Crédito para saídas, Débito para entradas)
  // Pagamentos comuns: Caixa (1.1.1), Bancos (1.1.1.02), Cartão de Crédito a Pagar (2.1.5), Empréstimo (2.1.4)
  let contaCredito = null;
  let contaDebito = null;

  // Busca conta de crédito (origem do recurso / pagamento)
  const termosPagamento = [
    { termo: 'cartao credito itau', grupo: 'PASSIVO', pref: 'cartao de credito itau' },
    { termo: 'cartao itau', grupo: 'PASSIVO', pref: 'cartao de credito itau' },
    { termo: 'cartao nubank', grupo: 'PASSIVO', pref: 'cartao de credito nubanck' },
    { termo: 'nubank', grupo: 'PASSIVO', pref: 'cartao de credito nubanck' },
    { termo: 'c6', grupo: 'PASSIVO', pref: 'cartao de credito c6' },
    { termo: 'itau', grupo: 'ATIVO', pref: 'itau' },
    { termo: 'banco do brasil', grupo: 'ATIVO', pref: 'banco do brasil' },
    { termo: 'caixa federal', grupo: 'ATIVO', pref: 'caixa' },
    { termo: 'caixa', grupo: 'ATIVO', pref: 'caixa geral' },
    { termo: 'dinheiro', grupo: 'ATIVO', pref: 'caixa geral' },
    { termo: 'pix', grupo: 'ATIVO', pref: 'banco' },
  ];

  for (const item of termosPagamento) {
    if (texto.includes(item.termo)) {
      const match = analiticas.find(c => {
        const nomeNorm = normalizar(c.nome);
        return nomeNorm.includes(normalizar(item.pref));
      });
      if (match) {
        contaCredito = match;
        break;
      }
    }
  }

  // Se não achou conta de crédito específica, tenta banco ou caixa padrão
  if (!contaCredito) {
    contaCredito = analiticas.find(c => normalizar(c.nome).includes('itau') || normalizar(c.nome).includes('caixa'));
  }

  // Busca conta de débito (destino do recurso / despesa / fornecedor / ativo)
  // Palavras-chave no texto
  const palavras = texto.split(/\s+/).filter(p => p.length > 3 && !['contabil', 'para', 'fazer', 'valor', 'reais', 'com', 'cartao', 'credito', 'itau'].includes(p));
  
  let melhorScore = 0;
  for (const c of analiticas) {
    const nomeNorm = normalizar(c.nome);
    let score = 0;
    for (const p of palavras) {
      if (nomeNorm.includes(p)) score += 2;
    }
    if (score > melhorScore && c.id !== contaCredito?.id) {
      melhorScore = score;
      contaDebito = c;
    }
  }

  // Sugestão de nova conta caso débito não tenha sido encontrado com precisão
  let sugerirNovaConta = false;
  let sugestao = null;

  if (!contaDebito || melhorScore === 0) {
    sugerirNovaConta = true;
    // Identificar nome do fornecedor ou item falado (ex: "Mercado Pago")
    let nomeSugerido = 'Fornecedor / Despesa';
    if (texto.includes('mercado pago')) nomeSugerido = 'Mercado Pago';
    else if (palavras.length > 0) nomeSugerido = palavras.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Procurar melhor grupo pai sintético (ex: 4.2.2 Despesas Administrativas ou 4.2.3 Despesas Financeiras)
    const paiDespesas = sinteticas.find(s => s.codigo === '4.2.2' || s.codigo === '4.2.3' || s.codigo === '5.1' || s.grupo === 'DESPESA');

    sugestao = {
      tipoDestino: 'DEBITO',
      nome: nomeSugerido,
      grupo: 'DESPESA',
      contaPaiId: paiDespesas ? paiDespesas.id : null,
      contaPaiCodigo: paiDespesas ? paiDespesas.codigo : '',
      contaPaiNome: paiDespesas ? paiDespesas.nome : 'Despesas',
    };
  }

  return {
    sucesso: true,
    motor: 'heuristica-local',
    interpretacao: {
      data,
      valor,
      documento: null,
      historico,
      contaDebito: contaDebito ? { id: contaDebito.id, codigo: contaDebito.codigo, nome: contaDebito.nome } : null,
      contaCredito: contaCredito ? { id: contaCredito.id, codigo: contaCredito.codigo, nome: contaCredito.nome } : null,
      sugerirNovaConta,
      sugestao,
      explicacao: `Interpretação local: Valor R$ ${valor.toFixed(2)}, Débito em ${contaDebito ? contaDebito.nome : 'Conta a definir'}, Crédito em ${contaCredito ? contaCredito.nome : 'Conta a definir'}.`
    }
  };
}

// Interpretação com a Google Gemini API
async function interpretarComGemini(texto, contas, apiKey) {
  const hoje = new Date().toISOString().split('T')[0];

  const resumoContas = contas.map(c => ({
    id: c.id,
    codigo: c.codigo,
    nome: c.nome,
    tipo: c.tipo, // 'A' ou 'S'
    grupo: c.grupo, // 'ATIVO', 'PASSIVO', 'DESPESA', 'RECEITA'
    paiId: c.contaPaiId,
  }));

  const systemPrompt = `Você é o Assistente Contábil de Inteligência Artificial do ContábilPro (Brasil).
Sua função é interpretar comandos falados pelo usuário em português e extrair um lançamento contábil em partidas dobradas (Débito e Crédito) conforme as normas do CFC.

Regras contábeis fundamentais:
- COMPRAS / DESPESAS: DÉBITO na conta de Despesa/Fornecedor (ou Ativo) e CRÉDITO na conta de Origem dos Recursos (Caixa, Banco ou Cartão de Crédito a pagar).
- RECEITAS / VENDAS: DÉBITO na conta de Destino (Caixa ou Banco) e CRÉDITO na conta de Receita.
- PAGAMENTO DE DÍVIDAS: DÉBITO no Passivo (ex: Fornecedores, Salários, Impostos) e CRÉDITO no Ativo (Caixa/Banco).

Você deve analisar as contas disponíveis da empresa fornecidas no JSON e selecionar a conta analítica mais adequada para o Débito e para o Crédito.
ATENÇÃO: Apenas contas com tipo 'A' (Analítica) podem receber lançamentos! Nunca use uma conta tipo 'S' (Sintética) diretamente.

Se a conta necessária NÃO existir entre as contas tipo 'A':
- Defina sugerirNovaConta = true.
- Indique o nome sugerido para a nova conta e indique o 'contaPaiId' de uma conta Sintética ('S') apropriada para agrupá-la (ex: Grupo de Despesas, Fornecedores ou Despesas Financeiras).

Retorne APENAS um objeto JSON válido (sem blocos de markdown e sem texto antes ou depois) no seguinte formato:
{
  "data": "YYYY-MM-DD",
  "valor": 50.0,
  "documento": null,
  "historico": "Descrição contábil clara e profissional",
  "contaDebito": { "id": 123, "codigo": "4.2.2.01", "nome": "Nome da Conta" },
  "contaCredito": { "id": 456, "codigo": "1.1.1.02.001", "nome": "Nome da Conta" },
  "sugerirNovaConta": false,
  "sugestao": null,
  "explicacao": "Breve explicação do lançamento"
}
Caso sugerirNovaConta seja true para Débito ou Crédito, preencha 'sugestao' com:
{
  "tipoDestino": "DEBITO" ou "CREDITO",
  "nome": "Nome da Conta sugerida",
  "grupo": "DESPESA" ou "PASSIVO" ou "ATIVO",
  "contaPaiId": 99,
  "contaPaiCodigo": "4.2.2",
  "contaPaiNome": "Despesas Administrativas"
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            text: `Data atual: ${hoje}\nComando de voz do usuário: "${texto}"\n\nLista de Contas da Empresa:\n${JSON.stringify(resumoContas)}`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  // Tentar primeiro gemini-1.5-flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na chamada do Gemini API: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Resposta vazia da API do Gemini');
  }

  // Parse do JSON retornado pelo Gemini
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  return {
    sucesso: true,
    motor: 'gemini-1.5-flash',
    interpretacao: parsed
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { texto, empresaId } = body;

    if (!texto || !empresaId) {
      return NextResponse.json(
        { erro: 'O texto do comando de voz e a empresaId são obrigatórios.' },
        { status: 400 }
      );
    }

    const parsedEmpresaId = parseInt(empresaId, 10);

    // Carregar todas as contas da empresa
    const contas = await prisma.conta.findMany({
      where: { empresaId: parsedEmpresaId, ativa: true },
      select: {
        id: true,
        codigo: true,
        reduzido: true,
        nome: true,
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

    // Se houver chave Gemini, utiliza Gemini
    if (geminiKey && geminiKey.trim().length > 10) {
      try {
        const resultadoGemini = await interpretarComGemini(texto, contas, geminiKey.trim());
        return NextResponse.json(resultadoGemini);
      } catch (geminiError) {
        console.warn('Aviso: Falha ao chamar Gemini, usando motor local como fallback:', geminiError.message);
        // Fallback para interpretação por regras
        const resultadoRegras = interpretarPorRegras(texto, contas);
        return NextResponse.json({
          ...resultadoRegras,
          avisoFallback: 'Gemini indisponível ou erro na API; interpretação gerada pelo motor local.'
        });
      }
    }

    // Caso não tenha chave Gemini configurada, usa o motor local inteligente
    const resultadoLocal = interpretarPorRegras(texto, contas);
    return NextResponse.json(resultadoLocal);

  } catch (error) {
    console.error('Erro ao interpretar comando de voz:', error);
    return NextResponse.json(
      { erro: 'Erro interno ao processar comando de voz: ' + error.message },
      { status: 500 }
    );
  }
}
