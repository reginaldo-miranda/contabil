/**
 * Cálculo do Ponto de Equilíbrio Contábil (PEC).
 *
 * PE (R$ de faturamento bruto) = Custos/Despesas Fixos ÷ Índice de Margem de Contribuição
 *
 * Classificação automática (independente do esquema de codificação do plano,
 * funciona tanto para Receitas=4/Despesas=5 quanto Receitas=3/Despesas=4):
 *   - RECEITA, 2º segmento "1"            → Receita Bruta
 *   - RECEITA, 2º segmento "2" ou devedora → Deduções (variável)
 *   - RECEITA, 2º segmento "3"            → Receitas Financeiras (abatem os fixos)
 *   - DESPESA, 2º segmento "1"            → Custos Variáveis (CMV)
 *   - DESPESA, demais                     → Despesas Fixas (pessoal, adm, financeiras)
 */

const toNum = (v) => parseFloat(v) || 0;

const isDevedora = (natureza) => String(natureza || '').toUpperCase().startsWith('D');

const dataLancamento = (l) =>
  typeof l.data === 'string'
    ? l.data.substring(0, 10)
    : new Date(l.data).toISOString().substring(0, 10);

function classificar(conta) {
  const seg = String(conta.codigo || '').split('.')[1];
  if (conta.grupo === 'RECEITA') {
    if (seg === '3') return 'receitaFinanceira';
    if (seg === '2' || isDevedora(conta.natureza)) return 'deducao';
    return 'receitaBruta';
  }
  if (conta.grupo === 'DESPESA') {
    return seg === '1' ? 'variavel' : 'fixo';
  }
  return null;
}

export function formatDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getPeriodo(tipo) {
  const hoje = new Date();
  const inicio = tipo === 'ano'
    ? new Date(hoje.getFullYear(), 0, 1)
    : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { dataInicio: formatDateLocal(inicio), dataFim: formatDateLocal(hoje) };
}

export function calcularPontoEquilibrio(contas, lancamentos, dataInicio, dataFim) {
  // Mapa contaId -> classificação
  const classe = new Map();
  (contas || []).forEach((c) => {
    const k = classificar(c);
    if (k) classe.set(String(c.id), k);
  });

  const tot = { receitaBruta: 0, deducao: 0, receitaFinanceira: 0, variavel: 0, fixo: 0 };

  // Débito aumenta deduções/despesas e reduz receitas; crédito faz o inverso
  const aplicar = (contaId, tipo, valor) => {
    const k = classe.get(String(contaId));
    if (!k) return;
    const naturalDebito = k === 'deducao' || k === 'variavel' || k === 'fixo';
    const sinal = (tipo === 'D') === naturalDebito ? 1 : -1;
    tot[k] += sinal * valor;
  };

  (lancamentos || []).forEach((l) => {
    const dt = dataLancamento(l);
    if (dataInicio && dt < dataInicio) return;
    if (dataFim && dt > dataFim) return;

    const debId = l.contaDebitoId ?? l.contaDebito?.id;
    const credId = l.contaCreditoId ?? l.contaCredito?.id;
    if (debId != null) aplicar(debId, 'D', toNum(l.valor));
    if (credId != null) aplicar(credId, 'C', toNum(l.valor));
    if (Array.isArray(l.partidas)) {
      l.partidas.forEach((p) => aplicar(p.contaId, p.tipo === 'D' ? 'D' : 'C', toNum(p.valor)));
    }
  });

  const faturamento = tot.receitaBruta;
  const custosVariaveis = tot.deducao + tot.variavel;
  const custosFixos = Math.max(0, tot.fixo - tot.receitaFinanceira);
  const margemContribuicao = faturamento - custosVariaveis;
  const imc = faturamento > 0 ? margemContribuicao / faturamento : 0;

  let status;
  let pontoEquilibrio = null;
  let percentual = 0;

  if (faturamento <= 0 && custosFixos <= 0) {
    status = 'semDados';
  } else if (faturamento <= 0) {
    status = 'semFaturamento';
  } else if (imc <= 0) {
    status = 'margemNegativa';
  } else {
    pontoEquilibrio = custosFixos / imc;
    percentual = pontoEquilibrio > 0 ? (faturamento / pontoEquilibrio) * 100 : 100;
    status = percentual >= 100 ? 'superado' : 'abaixo';
  }

  // --- Projeção em Dias (Ritmo de Faturamento) ---
  const hoje = new Date();
  const isModoAno = dataInicio && dataInicio.endsWith('-01-01');

  // Fixos de referência (se for mês e houver mês anterior completo com fixos, usa como base real)
  let custosFixosRef = custosFixos;
  let usouMesAnterior = false;

  if (!isModoAno) {
    const inicioMesAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesAnt = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    const dtIniAnt = formatDateLocal(inicioMesAnt);
    const dtFimAnt = formatDateLocal(fimMesAnt);

    let fixoAnt = 0;
    let recFinAnt = 0;
    (lancamentos || []).forEach((l) => {
      const dt = dataLancamento(l);
      if (dt < dtIniAnt || dt > dtFimAnt) return;
      const debId = l.contaDebitoId ?? l.contaDebito?.id;
      const credId = l.contaCreditoId ?? l.contaCredito?.id;
      const somar = (contaId, tipo, val) => {
        const k = classe.get(String(contaId));
        if (k === 'fixo') fixoAnt += (tipo === 'D' ? 1 : -1) * val;
        if (k === 'receitaFinanceira') recFinAnt += (tipo === 'C' ? 1 : -1) * val;
      };
      if (debId != null) somar(debId, 'D', toNum(l.valor));
      if (credId != null) somar(credId, 'C', toNum(l.valor));
      if (Array.isArray(l.partidas)) {
        l.partidas.forEach((p) => somar(p.contaId, p.tipo === 'D' ? 'D' : 'C', toNum(p.valor)));
      }
    });

    const fixosTotaisAnt = Math.max(0, fixoAnt - recFinAnt);
    if (fixosTotaisAnt > 0) {
      custosFixosRef = fixosTotaisAnt;
      usouMesAnterior = true;
    }
  }

  // Contagem de dias decorridos e totais do período
  let diasPassados = 1;
  let diasTotaisPeriodo = 30;

  if (isModoAno) {
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    diasPassados = Math.max(1, Math.floor((hoje - inicioAno) / (1000 * 60 * 60 * 24)) + 1);
    const fimAno = new Date(hoje.getFullYear(), 11, 31);
    diasTotaisPeriodo = Math.floor((fimAno - inicioAno) / (1000 * 60 * 60 * 24)) + 1;
  } else {
    diasPassados = Math.max(1, hoje.getDate());
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    diasTotaisPeriodo = ultimoDiaMes.getDate();
  }

  const mediaDiaria = faturamento > 0 ? faturamento / diasPassados : 0;
  const metaPEParaDias = imc > 0 && custosFixosRef > 0 ? custosFixosRef / imc : pontoEquilibrio;

  let projecaoDias = null;

  if (mediaDiaria > 0 && metaPEParaDias != null && metaPEParaDias > 0) {
    const diasTotaisNecessarios = metaPEParaDias / mediaDiaria;
    const diasRestantes = Math.max(0, Math.ceil(diasTotaisNecessarios - diasPassados));
    const jaAtingiu = faturamento >= metaPEParaDias || diasTotaisNecessarios <= diasPassados;

    let dataEstimada = null;
    let dataEstimadaFormatada = '';

    if (isModoAno) {
      const dt = new Date(hoje.getFullYear(), 0, Math.max(1, Math.round(diasTotaisNecessarios)));
      const dia = String(dt.getDate()).padStart(2, '0');
      const mes = String(dt.getMonth() + 1).padStart(2, '0');
      dataEstimadaFormatada = `${dia}/${mes}`;
      dataEstimada = dt;
    } else {
      const diaCalculado = Math.min(Math.max(1, Math.round(diasTotaisNecessarios)), diasTotaisPeriodo);
      const diaStr = String(diaCalculado).padStart(2, '0');
      const mesStr = String(hoje.getMonth() + 1).padStart(2, '0');
      dataEstimadaFormatada = `${diaStr}/${mesStr}`;
    }

    let statusDias;
    let diasExcedentes = 0;

    if (jaAtingiu) {
      statusDias = 'atingido';
    } else if (diasTotaisNecessarios <= diasTotaisPeriodo) {
      statusDias = 'noPrazo';
    } else {
      statusDias = 'insuficiente';
      diasExcedentes = Math.round(diasTotaisNecessarios - diasTotaisPeriodo);
    }

    projecaoDias = {
      mediaDiaria,
      diasPassados,
      diasTotaisPeriodo,
      diasTotaisNecessarios: Math.round(diasTotaisNecessarios),
      diasRestantes,
      diasExcedentes,
      dataEstimadaFormatada,
      dataEstimada,
      statusDias,
      custosFixosRef,
      usouMesAnterior,
      diasLucroPuroRestantes: Math.max(0, diasTotaisPeriodo - diasPassados),
    };
  }

  return {
    faturamento,
    deducoes: tot.deducao,
    cmv: tot.variavel,
    custosVariaveis,
    despesasFixas: tot.fixo,
    receitasFinanceiras: tot.receitaFinanceira,
    custosFixos,
    margemContribuicao,
    imc,
    pontoEquilibrio,
    percentual,
    diferenca: pontoEquilibrio != null ? faturamento - pontoEquilibrio : null,
    status,
    projecaoDias,
  };
}
