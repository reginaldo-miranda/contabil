// Dicionário e detector de intenções de navegação rápida por voz

function normalizar(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const ROTAS_SISTEMA = [
  {
    rota: '/dre',
    nomeTela: 'DRE',
    fala: 'Abrindo DRE...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa|navegar\s+para)?\s*(?:o\s+|a\s+)?(?:dre|d\s*r\s*e|demonstracao\s+do\s+resultado|resultado\s+do\s+exercicio)\b/i,
      /^dre$/i,
      /^ver\s+dre$/i,
      /^abrir\s+dre$/i
    ]
  },
  {
    rota: '/balancete',
    nomeTela: 'Balancete de Verificação',
    fala: 'Abrindo Balancete de Verificação...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:o\s+)?balancete(?:\s+de\s+verificacao)?\b/i,
      /^balancete$/i
    ]
  },
  {
    rota: '/balanco',
    nomeTela: 'Balanço Patrimonial',
    fala: 'Abrindo Balanço Patrimonial...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:o\s+)?balanco(?:\s+patrimonial)?\b/i,
      /^balanco$/i
    ]
  },
  {
    rota: '/plano-de-contas',
    nomeTela: 'Plano de Contas',
    fala: 'Abrindo Plano de Contas...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:o\s+)?plano\s+de\s+contas\b/i,
      /\b(?:listar|ver|consultar)\s+(?:todas\s+as\s+)?contas\b/i,
      /^plano\s+de\s+contas$/i
    ]
  },
  {
    rota: '/diario',
    nomeTela: 'Livro Diário',
    fala: 'Abrindo Livro Diário...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:o\s+)?(?:livro\s+)?diario\b/i,
      /^diario$/i,
      /^livro\s+diario$/i
    ]
  },
  {
    rota: '/razao',
    nomeTela: 'Livro Razão',
    fala: 'Abrindo Livro Razão...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:o\s+)?(?:livro\s+)?razao\b/i,
      /^razao$/i,
      /^livro\s+razao$/i
    ]
  },
  {
    rota: '/lancamentos',
    nomeTela: 'Lançamentos Contábeis',
    fala: 'Abrindo tela de lançamentos...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)\s+(?:a\s+tela\s+de\s+|os\s+)?lancamentos\b/i,
      /\btela\s+de\s+lancamentos\b/i
    ]
  },
  {
    rota: '/fiscal',
    nomeTela: 'Módulo Fiscal',
    fala: 'Abrindo Módulo Fiscal...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:o\s+)?(?:modulo\s+)?fiscal\b/i,
      /\b(?:importar\s+xml|notas\s+fiscais|apuracao\s+fiscal)\b/i,
      /^fiscal$/i
    ]
  },
  {
    rota: '/backup',
    nomeTela: 'Backups do Sistema',
    fala: 'Abrindo tela de backups...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:a\s+tela\s+de\s+|os\s+)?backup[s]?\b/i,
      /^backup[s]?$/i
    ]
  },
  {
    rota: '/modelos-lancamento',
    nomeTela: 'Modelos de Lançamento',
    fala: 'Abrindo Modelos de Lançamento...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:os\s+)?modelos(?:\s+de\s+lancamento)?\b/i,
      /\b(?:lancamentos?\s+padrao|lancamento\s+modelo)\b/i,
      /^modelos$/i
    ]
  },
  {
    rota: '/',
    nomeTela: 'Dashboard Principal',
    fala: 'Voltando para a tela inicial...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|ir\s+para|voltar\s+para|acessar)?\s*(?:a\s+)?(?:tela\s+inicial|pagina\s+inicial|inicio|home|dashboard|painel(?:\s+principal)?)\b/i,
      /^inicio$/i,
      /^home$/i,
      /^dashboard$/i
    ]
  },
  {
    rota: '/usuarios',
    nomeTela: 'Gestão de Usuários',
    fala: 'Abrindo Gestão de Usuários...',
    padroes: [
      /\b(?:abrir|abre|ver|veja|mostrar|mostra|exibir|exibe|ir\s+para|acessar|acessa)?\s*(?:a\s+tela\s+de\s+|os\s+)?usuarios\b/i,
      /^usuarios$/i
    ]
  }
];

/**
 * Detecta se a fala do usuário é uma intenção de navegação para alguma tela.
 * Retorna o objeto de navegação ou null se for comando contábil ou não reconhecido.
 */
export function detectarComandoNavegacao(texto) {
  if (!texto) return null;
  const textoNorm = normalizar(texto);

  // Se contiver indício claro de valor numérico, NÃO é navegação (é lançamento contábil)
  if (/\b\d+(?:[.,]\d+)?\s*(?:reais|real|pau|conto|brl)?\b/i.test(textoNorm) && !/\bdre\b/i.test(textoNorm)) {
    return null;
  }
  // Se contiver meio de pagamento (cartão, caixa, etc.), NÃO é navegação
  if (/\b(?:cartao|credito|debito|dinheiro|especie|pix|poupanca)\b/i.test(textoNorm) && !/\b(?:balanco|balancete)\b/i.test(textoNorm)) {
    return null;
  }

  for (const item of ROTAS_SISTEMA) {
    for (const padrao of item.padroes) {
      if (padrao.test(textoNorm)) {
        return {
          rota: item.rota,
          nomeTela: item.nomeTela,
          fala: item.fala,
        };
      }
    }
  }

  return null;
}
