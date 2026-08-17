import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const dataLimite = searchParams.get('dataLimite');

    if (!empresaId || !dataLimite) {
      return NextResponse.json(
        { erro: 'empresaId e dataLimite são obrigatórios' },
        { status: 400 }
      );
    }

    const parsedEmpresaId = parseInt(empresaId);
    const limitDate = new Date(dataLimite);

    // 1. Fetch all active accounts
    const contas = await prisma.conta.findMany({
      where: { empresaId: parsedEmpresaId, ativa: true },
      orderBy: { codigo: 'asc' }
    });

    // 2. Fetch all journal entries up to the limit date
    const lancamentos = await prisma.lancamento.findMany({
      where: {
        empresaId: parsedEmpresaId,
        data: { lte: limitDate }
      }
    });

    // 3. Create balance map
    const balanceMap = new Map();
    for (const conta of contas) {
      balanceMap.set(conta.id, {
        id: conta.id,
        codigo: conta.codigo,
        nome: conta.nome,
        tipo: conta.tipo,
        natureza: conta.natureza,
        nivel: conta.nivel,
        grupo: conta.grupo,
        contaPaiId: conta.contaPaiId,
        valor: 0.0,
        debitos: 0.0,
        creditos: 0.0
      });
    }

    // 4. Calculate debits & credits for analytical accounts
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

    // 5. Apurate the net income of the period (temporary result accounts: Groups 3 and 4)
    let totalReceitas = 0.0;
    let totalDespesas = 0.0;

    for (const bal of balanceMap.values()) {
      if (bal.tipo === 'A') {
        const val = bal.debitos - bal.creditos;
        if (bal.grupo === 'RECEITA') {
          // Revenue: Credit balance increases it
          const saldo = bal.creditos - bal.debitos;
          totalReceitas += saldo;
        } else if (bal.grupo === 'DESPESA') {
          // Expense: Debit balance increases it
          const saldo = bal.debitos - bal.creditos;
          totalDespesas += saldo;
        }
      }
    }

    const resultadoPeriodo = totalReceitas - totalDespesas;

    // Calculate closing balance for Ativo, Passivo and PL analytical accounts
    for (const bal of balanceMap.values()) {
      if (bal.tipo === 'A') {
        if (bal.grupo === 'ATIVO') {
          bal.valor = bal.debitos - bal.creditos;
        } else if (bal.grupo === 'PASSIVO' || bal.grupo === 'PL') {
          bal.valor = bal.creditos - bal.debitos;
        }
      }
    }

    // 6. Inject the Net Income virtual account under Patrimônio Líquido (PL)
    // Find parent account '2.3' (Patrimônio Líquido)
    const plParent = contas.find(c => c.codigo === '2.3');
    let virtualId = 999999;
    
    if (plParent) {
      balanceMap.set(virtualId, {
        id: virtualId,
        codigo: '2.3.99',
        nome: 'Lucro / Prejuízo Líquido do Período',
        tipo: 'A',
        natureza: 'C',
        nivel: 3,
        grupo: 'PL',
        contaPaiId: plParent.id,
        valor: resultadoPeriodo,
        debitos: 0.0,
        creditos: 0.0
      });
      
      // Also add this virtual account metadata to our array representation for consolidation
      contas.push({
        id: virtualId,
        codigo: '2.3.99',
        nome: 'Lucro / Prejuízo Líquido do Período',
        tipo: 'A',
        natureza: 'C',
        nivel: 3,
        grupo: 'PL',
        contaPaiId: plParent.id
      });
    }

    // 7. Consolidate balances hierarchically (level descending)
    const sortedContasDesc = [...contas].sort((a, b) => b.nivel - a.nivel);
    for (const conta of sortedContasDesc) {
      const bal = balanceMap.get(conta.id);
      if (bal.contaPaiId && balanceMap.has(bal.contaPaiId)) {
        const parentBal = balanceMap.get(bal.contaPaiId);
        parentBal.valor += bal.valor;
      }
    }

    // Get final root totals
    const rootAtivo = contas.find(c => c.codigo === '1');
    const rootPassivo = contas.find(c => c.codigo === '2');

    const totalAtivo = rootAtivo ? (balanceMap.get(rootAtivo.id)?.valor || 0.0) : 0.0;
    const totalPassivoPL = rootPassivo ? (balanceMap.get(rootPassivo.id)?.valor || 0.0) : 0.0;

    // Filter accounts list for response
    const allBalances = Array.from(balanceMap.values()).sort((a, b) => 
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })
    );

    const ativo = allBalances.filter(b => b.grupo === 'ATIVO');
    const passivoPL = allBalances.filter(b => b.grupo === 'PASSIVO' || b.grupo === 'PL');

    return NextResponse.json({
      ativo,
      passivoPL,
      totalAtivo,
      totalPassivoPL,
      resultadoPeriodo
    });
  } catch (error) {
    console.error('Erro ao gerar balanço:', error);
    return NextResponse.json({ erro: 'Erro ao gerar balanço patrimonial' }, { status: 500 });
  }
}
