/**
 * Motor de Cálculo do Simples Nacional (Lei Complementar nº 123/2006 atualizada pela LC 155/2016)
 */

export const TABELAS_SIMPLES = {
  ANEXO_I: {
    nome: 'Anexo I - Comércio',
    faixas: [
      {
        faixa: 1,
        limiteSuperior: 180000,
        aliquotaNominal: 0.0400,
        parcelaDeduzir: 0,
        reparticao: { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.4150, icms: 0.3400, iss: 0 }
      },
      {
        faixa: 2,
        limiteSuperior: 360000,
        aliquotaNominal: 0.0730,
        parcelaDeduzir: 5940,
        reparticao: { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.4150, icms: 0.3400, iss: 0 }
      },
      {
        faixa: 3,
        limiteSuperior: 720000,
        aliquotaNominal: 0.0950,
        parcelaDeduzir: 13860,
        reparticao: { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.4200, icms: 0.3350, iss: 0 }
      },
      {
        faixa: 4,
        limiteSuperior: 1800000,
        aliquotaNominal: 0.1070,
        parcelaDeduzir: 22500,
        reparticao: { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.4200, icms: 0.3350, iss: 0 }
      },
      {
        faixa: 5,
        limiteSuperior: 3600000,
        aliquotaNominal: 0.1430,
        parcelaDeduzir: 87300,
        reparticao: { irpj: 0.055, csll: 0.035, cofins: 0.1274, pis: 0.0276, cpp: 0.4200, icms: 0.3350, iss: 0 }
      },
      {
        faixa: 6,
        limiteSuperior: 4800000,
        aliquotaNominal: 0.1900,
        parcelaDeduzir: 378000,
        reparticao: { irpj: 0.135, csll: 0.100, cofins: 0.2827, pis: 0.0613, cpp: 0.4210, icms: 0.0000, iss: 0 }
      }
    ]
  },
  ANEXO_III: {
    nome: 'Anexo III - Serviços',
    faixas: [
      {
        faixa: 1,
        limiteSuperior: 180000,
        aliquotaNominal: 0.0600,
        parcelaDeduzir: 0,
        reparticao: { irpj: 0.040, csll: 0.035, cofins: 0.1282, pis: 0.0278, cpp: 0.4340, icms: 0, iss: 0.3350 }
      },
      {
        faixa: 2,
        limiteSuperior: 360000,
        aliquotaNominal: 0.1120,
        parcelaDeduzir: 9360,
        reparticao: { irpj: 0.040, csll: 0.035, cofins: 0.1405, pis: 0.0305, cpp: 0.4340, icms: 0, iss: 0.3200 }
      },
      {
        faixa: 3,
        limiteSuperior: 720000,
        aliquotaNominal: 0.1350,
        parcelaDeduzir: 17640,
        reparticao: { irpj: 0.040, csll: 0.035, cofins: 0.1364, pis: 0.0296, cpp: 0.4340, icms: 0, iss: 0.3250 }
      },
      {
        faixa: 4,
        limiteSuperior: 1800000,
        aliquotaNominal: 0.1600,
        parcelaDeduzir: 35640,
        reparticao: { irpj: 0.040, csll: 0.035, cofins: 0.1364, pis: 0.0296, cpp: 0.4340, icms: 0, iss: 0.3250 }
      },
      {
        faixa: 5,
        limiteSuperior: 3600000,
        aliquotaNominal: 0.2100,
        parcelaDeduzir: 125640,
        reparticao: { irpj: 0.040, csll: 0.035, cofins: 0.1282, pis: 0.0278, cpp: 0.4340, icms: 0, iss: 0.3350 }
      },
      {
        faixa: 6,
        limiteSuperior: 4800000,
        aliquotaNominal: 0.3300,
        parcelaDeduzir: 648000,
        reparticao: { irpj: 0.350, csll: 0.150, cofins: 0.1603, pis: 0.0347, cpp: 0.3050, icms: 0, iss: 0.0000 }
      }
    ]
  }
};

/**
 * Calcula a apuração do Simples Nacional com segregação inteligente
 * @param {Object} params
 * @param {number} params.rbt12 - Receita bruta acumulada dos últimos 12 meses
 * @param {number} params.faturamentoTotal - Faturamento bruto do mês atual
 * @param {number} params.faturamentoMonofasico - Parcela do faturamento com produtos monofásicos (PIS/COFINS)
 * @param {number} params.faturamentoSt - Parcela do faturamento com ICMS Substituição Tributária
 * @param {string} [params.anexo='ANEXO_I'] - Anexo da LC 123 (ANEXO_I ou ANEXO_III)
 */
export function calcularApuracaoSimples({
  rbt12 = 0,
  faturamentoTotal = 0,
  faturamentoMonofasico = 0,
  faturamentoSt = 0,
  anexo = 'ANEXO_I'
}) {
  const tabela = TABELAS_SIMPLES[anexo] || TABELAS_SIMPLES.ANEXO_I;
  
  // Se RBT12 for menor que o faturamento do mês (empresa nova), a RBT12 inicial é o próprio faturamento projetado
  const rbt12Calculo = Math.max(Number(rbt12) || 0, Number(faturamentoTotal) || 0, 180000);

  // Encontra a faixa do anexo
  let faixaEncontrada = tabela.faixas[0];
  for (const f of tabela.faixas) {
    if (rbt12Calculo <= f.limiteSuperior) {
      faixaEncontrada = f;
      break;
    }
  }

  // Alíquota Efetiva: (RBT12 * Aliquota Nominal - Parcela Deduzir) / RBT12
  const aliquotaNominal = faixaEncontrada.aliquotaNominal;
  const parcelaDeduzir = faixaEncontrada.parcelaDeduzir;

  let aliquotaEfetiva = ((rbt12Calculo * aliquotaNominal) - parcelaDeduzir) / rbt12Calculo;
  if (aliquotaEfetiva < 0.04) aliquotaEfetiva = 0.04;

  const rep = faixaEncontrada.reparticao;

  // Percentuais de desconto no DAS para segregação:
  // Parcela PIS + COFINS do anexo
  const percPisCofins = (rep.pis || 0) + (rep.cofins || 0);
  // Parcela ICMS do anexo
  const percIcms = rep.icms || 0;

  // Faturamento normal tributado integralmente
  const total = Number(faturamentoTotal) || 0;
  const monofasico = Math.min(Number(faturamentoMonofasico) || 0, total);
  const st = Math.min(Number(faturamentoSt) || 0, total);

  // Cálculo SEM segregação (se o cliente pagasse a guia cheia como no sistema antigo)
  const valorDasSemOtimizacao = total * aliquotaEfetiva;

  // Descontos obtidos pela segregação:
  // Redução no DAS de PIS/COFINS sobre o faturamento monofásico
  const descontoPisCofins = monofasico * aliquotaEfetiva * percPisCofins;
  // Redução no DAS de ICMS sobre o faturamento com Substituição Tributária
  const descontoIcmsSt = st * aliquotaEfetiva * percIcms;

  // Valor final otimizado do DAS a recolher
  const valorDasFinal = Math.max(0, valorDasSemOtimizacao - descontoPisCofins - descontoIcmsSt);

  // Economia gerada para o cliente no mês
  const economiaGerada = Math.max(0, valorDasSemOtimizacao - valorDasFinal);

  return {
    anexoNome: tabela.nome,
    faixa: faixaEncontrada.faixa,
    rbt12: rbt12Calculo,
    faturamentoTotal: total,
    faturamentoMonofasico: monofasico,
    faturamentoSt: st,
    faturamentoTributado: Math.max(0, total - monofasico - st),
    aliquotaNominal,
    parcelaDeduzir,
    aliquotaEfetiva,
    percentualPisCofinsNaAliquota: percPisCofins,
    percentualIcmsNaAliquota: percIcms,
    valorDasSemOtimizacao,
    valorDasFinal,
    economiaGerada,
    economiaPercentual: valorDasSemOtimizacao > 0 ? (economiaGerada / valorDasSemOtimizacao) * 100 : 0
  };
}
