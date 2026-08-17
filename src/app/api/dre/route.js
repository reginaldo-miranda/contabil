import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    if (!empresaId || !dataInicio || !dataFim) {
      return NextResponse.json(
        { erro: 'empresaId, dataInicio e dataFim são obrigatórios' },
        { status: 400 }
      );
    }

    const parsedEmpresaId = parseInt(empresaId);
    const startPeriod = new Date(dataInicio);
    const endPeriod = new Date(dataFim);

    // 1. Fetch only accounts of type RECEITA and DESPESA
    const contas = await prisma.conta.findMany({
      where: {
        empresaId: parsedEmpresaId,
        ativa: true,
        grupo: { in: ['RECEITA', 'DESPESA'] }
      },
      orderBy: { codigo: 'asc' }
    });

    // 2. Fetch journal entries in the period
    const lancamentos = await prisma.lancamento.findMany({
      where: {
        empresaId: parsedEmpresaId,
        data: {
          gte: startPeriod,
          lte: endPeriod
        }
      }
    });

    // 3. Create map of account balances
    const balanceMap = new Map();
    for (const conta of contas) {
      balanceMap.set(conta.id, {
        id: conta.id,
        codigo: conta.codigo,
        nome: conta.nome,
        tipo: conta.tipo, // 'S' or 'A'
        natureza: conta.natureza, // 'D' or 'C'
        nivel: conta.nivel,
        grupo: conta.grupo,
        contaPaiId: conta.contaPaiId,
        valor: 0.0,
        debitos: 0.0,
        creditos: 0.0
      });
    }

    // 4. Calculate debit/credit sums for analytical accounts in the period
    for (const lanc of lancamentos) {
      const val = parseFloat(lanc.valor);
      
      if (balanceMap.has(lanc.contaDebitoId)) {
        const bal = balanceMap.get(lanc.contaDebitoId);
        if (bal.tipo === 'A') {
          bal.debitos += val;
        }
      }
      
      if (balanceMap.has(lanc.contaCreditoId)) {
        const bal = balanceMap.get(lanc.contaCreditoId);
        if (bal.tipo === 'A') {
          bal.creditos += val;
        }
      }
    }

    // Calculate final value for each analytical account based on group/nature rules
    for (const bal of balanceMap.values()) {
      if (bal.tipo === 'A') {
        if (bal.grupo === 'RECEITA') {
          if (bal.natureza === 'C') {
            bal.valor = bal.creditos - bal.debitos;
          } else {
            bal.valor = bal.debitos - bal.creditos; // E.g. deductions
          }
        } else { // DESPESA / CUSTO (all are 'D')
          bal.valor = bal.debitos - bal.creditos;
        }
      }
    }

    // 5. Aggregate to Synthetic parents recursively
    const sortedContasDesc = [...contas].sort((a, b) => b.nivel - a.nivel);
    for (const conta of sortedContasDesc) {
      const bal = balanceMap.get(conta.id);
      if (bal.contaPaiId && balanceMap.has(bal.contaPaiId)) {
        const parentBal = balanceMap.get(bal.contaPaiId);
        parentBal.valor += bal.valor;
      }
    }

    // Helper to get balance value by account code
    const getVal = (codigo) => {
      const found = contas.find(c => c.codigo === codigo);
      if (!found) return 0.0;
      const bal = balanceMap.get(found.id);
      return bal ? bal.valor : 0.0;
    };

    // Helper to collect detailed child accounts under a specific group
    const getDetails = (parentCodigo) => {
      return Array.from(balanceMap.values())
        .filter(b => b.tipo === 'A' && b.codigo.startsWith(parentCodigo + '.') && b.valor !== 0)
        .map(b => ({
          codigo: b.codigo,
          nome: b.nome,
          valor: b.valor
        }));
    };

    // 6. Map into standard DRE structure
    const receitaBruta = getVal('3.1');
    const deducoes = getVal('3.2');
    const receitaLiquida = receitaBruta - deducoes;
    
    const cmv = getVal('4.1');
    const lucroBruto = receitaLiquida - cmv;

    const pessoal = getVal('4.2.1');
    const adm = getVal('4.2.2');
    const finDespesas = getVal('4.2.3');
    const finReceitas = getVal('3.3');
    const resultadoFinanceiro = finDespesas - finReceitas;

    const totalDespesasOperacionais = pessoal + adm + resultadoFinanceiro;
    const resultadoLiquido = lucroBruto - totalDespesasOperacionais;

    const dreEstrutura = {
      periodo: { dataInicio, dataFim },
      linhas: [
        { key: 'receitaBruta', label: '1. Receita Operacional Bruta', valor: receitaBruta, isSubtotal: false, details: getDetails('3.1') },
        { key: 'deducoes', label: '2. (-) Deduções e Abatimentos da Receita', valor: -deducoes, isSubtotal: false, details: getDetails('3.2').map(d => ({ ...d, valor: -d.valor })) },
        { key: 'receitaLiquida', label: '3. (=) Receita Operacional Líquida', valor: receitaLiquida, isSubtotal: true },
        { key: 'cmv', label: '4. (-) Custos das Vendas (CMV)', valor: -cmv, isSubtotal: false, details: getDetails('4.1').map(d => ({ ...d, valor: -d.valor })) },
        { key: 'lucroBruto', label: '5. (=) Resultado Operacional Bruto (Lucro Bruto)', valor: lucroBruto, isSubtotal: true },
        { 
          key: 'despesasOperacionais', 
          label: '6. Despesas Operacionais', 
          valor: -totalDespesasOperacionais, 
          isSubtotal: false,
          subItems: [
            { label: 'Despesas com Pessoal', valor: -pessoal, details: getDetails('4.2.1').map(d => ({ ...d, valor: -d.valor })) },
            { label: 'Despesas Administrativas', valor: -adm, details: getDetails('4.2.2').map(d => ({ ...d, valor: -d.valor })) },
            { 
              label: 'Resultado Financeiro Líquido', 
              valor: -resultadoFinanceiro, 
              details: [
                ...getDetails('4.2.3').map(d => ({ codigo: d.codigo, nome: `Despesa: ${d.nome}`, valor: -d.valor })),
                ...getDetails('3.3').map(d => ({ codigo: d.codigo, nome: `Receita: ${d.nome}`, valor: d.valor }))
              ] 
            }
          ]
        },
        { key: 'resultadoLiquido', label: '7. (=) Resultado Líquido do Exercício (Lucro/Prejuízo Líquido)', valor: resultadoLiquido, isSubtotal: true }
      ]
    };

    return NextResponse.json(dreEstrutura);
  } catch (error) {
    console.error('Erro ao gerar DRE:', error);
    return NextResponse.json({ erro: 'Erro ao gerar DRE contábil' }, { status: 500 });
  }
}
