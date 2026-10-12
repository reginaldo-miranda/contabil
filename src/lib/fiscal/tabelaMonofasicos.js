/**
 * Tabela de Referência e Regras de Produtos Monofásicos de PIS/COFINS e ICMS-ST
 * Legislação: Lei 10.147/2000, Lei 10.485/2002, Lei 10.833/2003 e Lei Complementar 123/2006.
 */

export const REGRAS_MONOFASICOS = [
  {
    categoria: 'Bebidas Frias (Cervejas, Refrigerantes, Águas)',
    prefixosNcm: ['2201', '2202', '2203'],
    descricao: 'Águas minerais, refrigerantes, cervejas e energéticos'
  },
  {
    categoria: 'Produtos Farmacêuticos e Medicamentos',
    prefixosNcm: ['3001', '3002', '3003', '3004', '3005', '3006'],
    descricao: 'Medicamentos e produtos farmacêuticos em geral'
  },
  {
    categoria: 'Cosméticos e Perfumaria',
    prefixosNcm: ['3303', '3304', '3305', '3307'],
    descricao: 'Perfumes, maquiagens, xampus e produtos de beleza'
  },
  {
    categoria: 'Higiene Bucal',
    prefixosNcm: ['3306'],
    descricao: 'Cremes dentais e fios dentais'
  },
  {
    categoria: 'Pneumáticos e Câmaras de Ar',
    prefixosNcm: ['4011', '4013'],
    descricao: 'Pneus e câmaras de ar novos'
  },
  {
    categoria: 'Autopeças',
    prefixosNcm: ['8407', '8408', '8409', '8483', '8507', '8511', '8512', '8708'],
    descricao: 'Peças e acessórios para veículos automotores'
  },
  {
    categoria: 'Combustíveis e Lubrificantes',
    prefixosNcm: ['2710', '2711'],
    descricao: 'Gasolina, óleo diesel, GLP e lubrificantes'
  }
];

/**
 * CFOPs comuns de revenda com Substituição Tributária (ICMS-ST)
 */
export const CFOPS_ST = ['5403', '5405', '6403', '6405'];

/**
 * CSOSNs do Simples Nacional que indicam ICMS já recolhido ou monofásico
 */
export const CSOSN_ST_OU_COBRADO_ANTERIORMENTE = ['500'];

/**
 * Analisa um item da nota fiscal para detectar se é sujeito a regime monofásico ou ICMS-ST
 * @param {string} ncm - Código NCM com até 8 dígitos
 * @param {string} cfop - Código CFOP com 4 dígitos
 * @param {string} csosn - Código CSOSN do Simples Nacional
 * @returns {{ monofasico: boolean, motivo: string|null, substituicaoTributaria: boolean }}
 */
export function analisarItemFiscal(ncm = '', cfop = '', csosn = '') {
  const ncmLimpo = String(ncm || '').replace(/\D/g, '');
  const cfopLimpo = String(cfop || '').replace(/\D/g, '');
  const csosnLimpo = String(csosn || '').trim();

  let monofasico = false;
  let motivo = null;

  for (const regra of REGRAS_MONOFASICOS) {
    if (regra.prefixosNcm.some(prefixo => ncmLimpo.startsWith(prefixo))) {
      monofasico = true;
      motivo = regra.categoria;
      break;
    }
  }

  // Verifica se é ICMS-ST por CFOP ou por CSOSN
  const substituicaoTributaria = (
    CFOPS_ST.includes(cfopLimpo) ||
    CSOSN_ST_OU_COBRADO_ANTERIORMENTE.includes(csosnLimpo)
  );

  return {
    monofasico,
    motivo,
    substituicaoTributaria
  };
}
