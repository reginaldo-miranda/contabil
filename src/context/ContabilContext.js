'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ContabilContext = createContext();

// ==========================================
// PLANO DE CONTAS MOCK (completo para partida dobrada)
// ==========================================
const PLANO_CONTAS_MOCK = [
  {
    id: '1', codigo: '1', nome: 'ATIVO', tipo: 'Sintética', natureza: 'Devedora', grupo: 'ATIVO', nivel: 1,
    filhas: [
      {
        id: '1.1', codigo: '1.1', nome: 'CIRCULANTE', tipo: 'Sintética', natureza: 'Devedora', grupo: 'ATIVO', nivel: 2,
        filhas: [
          { id: '1.1.1', codigo: '1.1.1', nome: 'CAIXA', tipo: 'Analítica', natureza: 'Devedora', grupo: 'ATIVO', nivel: 3, filhas: [] },
          { id: '1.1.2', codigo: '1.1.2', nome: 'BANCOS CONTA MOVIMENTO', tipo: 'Analítica', natureza: 'Devedora', grupo: 'ATIVO', nivel: 3, filhas: [] },
          { id: '1.1.3', codigo: '1.1.3', nome: 'CLIENTES', tipo: 'Analítica', natureza: 'Devedora', grupo: 'ATIVO', nivel: 3, filhas: [] },
          { id: '1.1.4', codigo: '1.1.4', nome: 'ESTOQUE DE MERCADORIAS', tipo: 'Analítica', natureza: 'Devedora', grupo: 'ATIVO', nivel: 3, filhas: [] },
        ]
      },
      {
        id: '1.2', codigo: '1.2', nome: 'NÃO CIRCULANTE', tipo: 'Sintética', natureza: 'Devedora', grupo: 'ATIVO', nivel: 2,
        filhas: [
          { id: '1.2.1', codigo: '1.2.1', nome: 'IMOBILIZADO', tipo: 'Analítica', natureza: 'Devedora', grupo: 'ATIVO', nivel: 3, filhas: [] },
        ]
      }
    ]
  },
  {
    id: '2', codigo: '2', nome: 'PASSIVO', tipo: 'Sintética', natureza: 'Credora', grupo: 'PASSIVO', nivel: 1,
    filhas: [
      {
        id: '2.1', codigo: '2.1', nome: 'CIRCULANTE', tipo: 'Sintética', natureza: 'Credora', grupo: 'PASSIVO', nivel: 2,
        filhas: [
          { id: '2.1.1', codigo: '2.1.1', nome: 'FORNECEDORES', tipo: 'Analítica', natureza: 'Credora', grupo: 'PASSIVO', nivel: 3, filhas: [] },
          { id: '2.1.2', codigo: '2.1.2', nome: 'SALÁRIOS A PAGAR', tipo: 'Analítica', natureza: 'Credora', grupo: 'PASSIVO', nivel: 3, filhas: [] },
          { id: '2.1.3', codigo: '2.1.3', nome: 'IMPOSTOS A RECOLHER', tipo: 'Analítica', natureza: 'Credora', grupo: 'PASSIVO', nivel: 3, filhas: [] },
        ]
      },
      {
        id: '2.2', codigo: '2.2', nome: 'NÃO CIRCULANTE', tipo: 'Sintética', natureza: 'Credora', grupo: 'PASSIVO', nivel: 2,
        filhas: [
          { id: '2.2.1', codigo: '2.2.1', nome: 'EMPRÉSTIMOS A PAGAR', tipo: 'Analítica', natureza: 'Credora', grupo: 'PASSIVO', nivel: 3, filhas: [] },
        ]
      }
    ]
  },
  {
    id: '3', codigo: '3', nome: 'PATRIMÔNIO LÍQUIDO', tipo: 'Sintética', natureza: 'Credora', grupo: 'PL', nivel: 1,
    filhas: [
      { id: '3.1', codigo: '3.1', nome: 'CAPITAL SOCIAL', tipo: 'Analítica', natureza: 'Credora', grupo: 'PL', nivel: 2, filhas: [] },
      { id: '3.2', codigo: '3.2', nome: 'LUCROS ACUMULADOS', tipo: 'Analítica', natureza: 'Credora', grupo: 'PL', nivel: 2, filhas: [] },
    ]
  },
  {
    id: '4', codigo: '4', nome: 'RECEITAS', tipo: 'Sintética', natureza: 'Credora', grupo: 'RECEITA', nivel: 1,
    filhas: [
      { id: '4.1', codigo: '4.1', nome: 'RECEITA DE VENDAS', tipo: 'Analítica', natureza: 'Credora', grupo: 'RECEITA', nivel: 2, filhas: [] },
      { id: '4.2', codigo: '4.2', nome: 'RECEITA DE SERVIÇOS', tipo: 'Analítica', natureza: 'Credora', grupo: 'RECEITA', nivel: 2, filhas: [] },
      { id: '4.3', codigo: '4.3', nome: 'OUTRAS RECEITAS', tipo: 'Analítica', natureza: 'Credora', grupo: 'RECEITA', nivel: 2, filhas: [] },
    ]
  },
  {
    id: '5', codigo: '5', nome: 'DESPESAS', tipo: 'Sintética', natureza: 'Devedora', grupo: 'DESPESA', nivel: 1,
    filhas: [
      {
        id: '5.1', codigo: '5.1', nome: 'DESPESAS OPERACIONAIS', tipo: 'Sintética', natureza: 'Devedora', grupo: 'DESPESA', nivel: 2,
        filhas: [
          { id: '5.1.1', codigo: '5.1.1', nome: 'ALUGUEL', tipo: 'Analítica', natureza: 'Devedora', grupo: 'DESPESA', nivel: 3, filhas: [] },
          { id: '5.1.2', codigo: '5.1.2', nome: 'ENERGIA ELÉTRICA', tipo: 'Analítica', natureza: 'Devedora', grupo: 'DESPESA', nivel: 3, filhas: [] },
          { id: '5.1.3', codigo: '5.1.3', nome: 'SALÁRIOS E ENCARGOS', tipo: 'Analítica', natureza: 'Devedora', grupo: 'DESPESA', nivel: 3, filhas: [] },
          { id: '5.1.4', codigo: '5.1.4', nome: 'MATERIAIS DE CONSUMO', tipo: 'Analítica', natureza: 'Devedora', grupo: 'DESPESA', nivel: 3, filhas: [] },
          { id: '5.1.5', codigo: '5.1.5', nome: 'DEPRECIAÇÃO', tipo: 'Analítica', natureza: 'Devedora', grupo: 'DESPESA', nivel: 3, filhas: [] },
        ]
      }
    ]
  }
];

// ==========================================
// LANÇAMENTOS MOCK (exemplos de partida dobrada)
// ==========================================
const LANCAMENTOS_MOCK = [
  {
    id: 'lc1',
    data: '2026-01-05',
    documento: '001',
    historico: 'Integralização do capital social em dinheiro',
    partidas: [
      { contaId: '1.1.1', contaCodigo: '1.1.1', contaNome: 'CAIXA', tipo: 'D', valor: 50000 },
      { contaId: '3.1', contaCodigo: '3.1', contaNome: 'CAPITAL SOCIAL', tipo: 'C', valor: 50000 },
    ]
  },
  {
    id: 'lc2',
    data: '2026-01-10',
    documento: '002',
    historico: 'Depósito bancário',
    partidas: [
      { contaId: '1.1.2', contaCodigo: '1.1.2', contaNome: 'BANCOS CONTA MOVIMENTO', tipo: 'D', valor: 30000 },
      { contaId: '1.1.1', contaCodigo: '1.1.1', contaNome: 'CAIXA', tipo: 'C', valor: 30000 },
    ]
  },
  {
    id: 'lc3',
    data: '2026-01-15',
    documento: '003',
    historico: 'Pagamento de aluguel ref. janeiro/2026',
    partidas: [
      { contaId: '5.1.1', contaCodigo: '5.1.1', contaNome: 'ALUGUEL', tipo: 'D', valor: 3000 },
      { contaId: '1.1.2', contaCodigo: '1.1.2', contaNome: 'BANCOS CONTA MOVIMENTO', tipo: 'C', valor: 3000 },
    ]
  },
  {
    id: 'lc4',
    data: '2026-01-20',
    documento: '004',
    historico: 'Venda de mercadorias à vista',
    partidas: [
      { contaId: '1.1.1', contaCodigo: '1.1.1', contaNome: 'CAIXA', tipo: 'D', valor: 8000 },
      { contaId: '4.1', contaCodigo: '4.1', contaNome: 'RECEITA DE VENDAS', tipo: 'C', valor: 8000 },
    ]
  },
  {
    id: 'lc5',
    data: '2026-01-25',
    documento: '005',
    historico: 'Compra de materiais a prazo',
    partidas: [
      { contaId: '5.1.4', contaCodigo: '5.1.4', contaNome: 'MATERIAIS DE CONSUMO', tipo: 'D', valor: 2500 },
      { contaId: '2.1.1', contaCodigo: '2.1.1', contaNome: 'FORNECEDORES', tipo: 'C', valor: 2500 },
    ]
  },
  {
    id: 'lc6',
    data: '2026-02-01',
    documento: '006',
    historico: 'Pagamento de energia elétrica ref. janeiro',
    partidas: [
      { contaId: '5.1.2', contaCodigo: '5.1.2', contaNome: 'ENERGIA ELÉTRICA', tipo: 'D', valor: 800 },
      { contaId: '1.1.1', contaCodigo: '1.1.1', contaNome: 'CAIXA', tipo: 'C', valor: 800 },
    ]
  },
  {
    id: 'lc7',
    data: '2026-02-05',
    documento: '007',
    historico: 'Prestação de serviços recebida via banco',
    partidas: [
      { contaId: '1.1.2', contaCodigo: '1.1.2', contaNome: 'BANCOS CONTA MOVIMENTO', tipo: 'D', valor: 12000 },
      { contaId: '4.2', contaCodigo: '4.2', contaNome: 'RECEITA DE SERVIÇOS', tipo: 'C', valor: 12000 },
    ]
  },
  {
    id: 'lc8',
    data: '2026-02-10',
    documento: '008',
    historico: 'Provisão de salários ref. janeiro/2026',
    partidas: [
      { contaId: '5.1.3', contaCodigo: '5.1.3', contaNome: 'SALÁRIOS E ENCARGOS', tipo: 'D', valor: 6000 },
      { contaId: '2.1.2', contaCodigo: '2.1.2', contaNome: 'SALÁRIOS A PAGAR', tipo: 'C', valor: 6000 },
    ]
  },
];

// ==========================================
// HELPER: flatten contas tree
// ==========================================
function flattenContas(contas) {
  let result = [];
  for (const conta of contas) {
    result.push(conta);
    if (conta.filhas && conta.filhas.length > 0) {
      result = result.concat(flattenContas(conta.filhas));
    }
  }
  return result;
}

// ==========================================
// PROVIDER
// ==========================================
export function ContabilProvider({ children }) {
  const [contas, setContas] = useState(PLANO_CONTAS_MOCK);
  const [lancamentos, setLancamentos] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load from API on mount/empresa change
  useEffect(() => {
    async function loadData() {
      try {
        const [resContas, resLanc] = await Promise.all([
          fetch('/api/contas?empresaId=1').then(r => r.ok ? r.json() : []),
          fetch('/api/lancamentos?empresaId=1').then(r => r.ok ? r.json() : { lancamentos: [] })
        ]);
        if (resContas && resContas.length > 0) {
          setContas(resContas);
        } else {
          setContas(PLANO_CONTAS_MOCK);
        }
        if (resLanc && resLanc.lancamentos) {
          setLancamentos(resLanc.lancamentos);
        }
      } catch (e) {
        console.error("Erro ao carregar dados do banco:", e);
      } finally {
        setLoaded(true);
      }
    }
    loadData();
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [resContas, resLanc] = await Promise.all([
        fetch('/api/contas?empresaId=1').then(r => r.ok ? r.json() : []),
        fetch('/api/lancamentos?empresaId=1').then(r => r.ok ? r.json() : { lancamentos: [] })
      ]);
      if (resContas && resContas.length > 0) setContas(resContas);
      if (resLanc && resLanc.lancamentos) setLancamentos(resLanc.lancamentos);
    } catch (e) {
      console.error("Erro ao atualizar dados:", e);
    }
  }, []);

  // Get flattened list of all contas
  const contasFlat = useCallback(() => {
    if (contas && contas.length > 0 && !contas[0].filhas) {
      return contas;
    }
    return flattenContas(contas);
  }, [contas]);

  // Get all contas for selection
  const getContasAnaliticas = useCallback(() => {
    const list = contasFlat();
    if (list && list.length > 0) return list;
    return contas || [];
  }, [contasFlat, contas]);

  // Add a new lançamento
  const addLancamento = useCallback(async (lancamento) => {
    try {
      const res = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lancamento,
          empresaId: 1
        })
      });
      if (res.ok) {
        await refreshData();
        return true;
      } else {
        const err = await res.json();
        alert(err.erro || "Erro ao salvar lançamento");
        return false;
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar à API");
      return false;
    }
  }, [refreshData]);

  // Delete a lançamento
  const deleteLancamento = useCallback((id) => {
    setLancamentos(prev => prev.filter(l => l.id !== id));
  }, []);

  // Get lançamentos for a specific conta (aceita ID ou código prefixo)
  const getLancamentosPorConta = useCallback((contaId, dataInicio, dataFim, codigoPrefix) => {
    return (lancamentos || []).filter(l => {
      let temConta = false;
      const match = (id, code) => {
        if (id && String(id) === String(contaId)) return true;
        if (code && codigoPrefix && String(code).startsWith(String(codigoPrefix))) return true;
        return false;
      };

      if (match(l.contaDebitoId, l.contaDebito?.codigo) || match(l.contaCreditoId, l.contaCredito?.codigo)) {
        temConta = true;
      }
      if (l.partidas) {
        temConta = temConta || l.partidas.some(p => match(p.contaId, p.contaCodigo));
      }
      if (!temConta) return false;
      if (dataInicio && l.data < dataInicio) return false;
      if (dataFim && l.data > dataFim) return false;
      return true;
    });
  }, [lancamentos]);

  // Get saldo of a specific conta
  const getSaldoConta = useCallback((contaId, dataFim) => {
    let debitos = 0;
    let creditos = 0;

    (lancamentos || []).forEach(l => {
      if (dataFim && l.data > dataFim) return;
      if (l.contaDebitoId === contaId || l.contaDebito?.id === contaId) {
        debitos += parseFloat(l.valor) || 0;
      }
      if (l.contaCreditoId === contaId || l.contaCredito?.id === contaId) {
        creditos += parseFloat(l.valor) || 0;
      }
      if (l.partidas) {
        l.partidas.forEach(p => {
          if (p.contaId === contaId) {
            if (p.tipo === 'D') debitos += parseFloat(p.valor) || 0;
            else creditos += parseFloat(p.valor) || 0;
          }
        });
      }
    });

    return { debitos, creditos, saldo: debitos - creditos };
  }, [lancamentos]);

  // Get saldos of all contas (for balancete)
  const getSaldosTodas = useCallback((dataFim) => {
    const analiticas = getContasAnaliticas();
    return analiticas.map(conta => {
      const { debitos, creditos, saldo } = getSaldoConta(conta.id, dataFim);
      return {
        ...conta,
        debitos,
        creditos,
        saldo,
        saldoDevedor: saldo > 0 ? saldo : 0,
        saldoCredor: saldo < 0 ? Math.abs(saldo) : 0,
      };
    }).filter(c => c.debitos > 0 || c.creditos > 0);
  }, [getContasAnaliticas, getSaldoConta]);

  // Get DRE data
  const getDRE = useCallback((dataInicio, dataFim) => {
    const analiticas = getContasAnaliticas();
    
    let totalReceitas = 0;
    let totalDespesas = 0;
    const receitas = [];
    const despesas = [];

    analiticas.forEach(conta => {
      const { debitos, creditos } = getSaldoConta(conta.id, dataFim);
      let dPeriodo = 0, cPeriodo = 0;
      (lancamentos || []).forEach(l => {
        if (dataInicio && l.data < dataInicio) return;
        if (dataFim && l.data > dataFim) return;
        if (l.contaDebitoId === conta.id || l.contaDebito?.id === conta.id) {
          dPeriodo += parseFloat(l.valor) || 0;
        }
        if (l.contaCreditoId === conta.id || l.contaCredito?.id === conta.id) {
          cPeriodo += parseFloat(l.valor) || 0;
        }
        if (l.partidas) {
          l.partidas.forEach(p => {
            if (p.contaId === conta.id) {
              if (p.tipo === 'D') dPeriodo += parseFloat(p.valor) || 0;
              else cPeriodo += parseFloat(p.valor) || 0;
            }
          });
        }
      });

      if (conta.grupo === 'RECEITA') {
        const valor = cPeriodo - dPeriodo;
        if (valor !== 0) {
          receitas.push({ ...conta, valor });
          totalReceitas += valor;
        }
      } else if (conta.grupo === 'DESPESA') {
        const valor = dPeriodo - cPeriodo;
        if (valor !== 0) {
          despesas.push({ ...conta, valor });
          totalDespesas += valor;
        }
      }
    });

    return {
      receitas,
      despesas,
      totalReceitas,
      totalDespesas,
      resultado: totalReceitas - totalDespesas,
    };
  }, [getContasAnaliticas, getSaldoConta, lancamentos]);

  // Get Balanço Patrimonial data
  const getBalanco = useCallback((dataFim) => {
    const analiticas = getContasAnaliticas();

    const ativo = [];
    const passivo = [];
    const pl = [];
    let totalAtivo = 0;
    let totalPassivo = 0;
    let totalPL = 0;

    analiticas.forEach(conta => {
      const { debitos, creditos, saldo } = getSaldoConta(conta.id, dataFim);
      if (debitos === 0 && creditos === 0) return;

      if (conta.grupo === 'ATIVO') {
        const valor = saldo; // Devedora: D - C
        ativo.push({ ...conta, valor });
        totalAtivo += valor;
      } else if (conta.grupo === 'PASSIVO') {
        const valor = creditos - debitos; // Credora: C - D
        passivo.push({ ...conta, valor });
        totalPassivo += valor;
      } else if (conta.grupo === 'PL') {
        const valor = creditos - debitos;
        pl.push({ ...conta, valor });
        totalPL += valor;
      }
    });

    // Incluir resultado do exercício no PL
    const dre = getDRE(null, dataFim);
    if (dre.resultado !== 0) {
      totalPL += dre.resultado;
    }

    return { ativo, passivo, pl, totalAtivo, totalPassivo, totalPL, dreResultado: dre.resultado };
  }, [getContasAnaliticas, getSaldoConta, getDRE]);

  // Stats for dashboard
  const getStats = useCallback(() => {
    const flat = contasFlat();
    return {
      total: flat.length,
      analiticas: flat.filter(c => c.tipo === 'Analítica').length,
      sinteticas: flat.filter(c => c.tipo === 'Sintética').length,
      grupos: new Set(flat.map(c => c.grupo)).size,
      lancamentosTotal: lancamentos.length,
    };
  }, [contasFlat, lancamentos]);

  const value = {
    contas,
    setContas,
    lancamentos,
    contasFlat,
    getContasAnaliticas,
    addLancamento,
    deleteLancamento,
    getLancamentosPorConta,
    getSaldoConta,
    getSaldosTodas,
    getDRE,
    getBalanco,
    getStats,
    loaded,
  };

  return (
    <ContabilContext.Provider value={value}>
      {children}
    </ContabilContext.Provider>
  );
}

export function useContabil() {
  const context = useContext(ContabilContext);
  if (!context) {
    throw new Error('useContabil deve ser usado dentro de ContabilProvider');
  }
  return context;
}

export default ContabilContext;
