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

    // 1. Fetch all active accounts for the company
    const contas = await prisma.conta.findMany({
      where: { empresaId: parsedEmpresaId, ativa: true },
      orderBy: { codigo: 'asc' },
    });

    // 2. Fetch all journal entries for the company up to endPeriod
    const lancamentos = await prisma.lancamento.findMany({
      where: {
        empresaId: parsedEmpresaId,
        data: { lte: endPeriod }
      }
    });

    // 3. Create a map of account balances
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
        saldoAnterior: 0.0,
        debitos: 0.0,
        creditos: 0.0,
        saldoAtual: 0.0
      });
    }

    // 4. Calculate balances for Analytical accounts
    for (const lanc of lancamentos) {
      const valor = parseFloat(lanc.valor);
      const isBeforePeriod = new Date(lanc.data) < startPeriod;

      // Process debit side
      if (balanceMap.has(lanc.contaDebitoId)) {
        const bal = balanceMap.get(lanc.contaDebitoId);
        if (bal.tipo === 'A') { // Only process analytical accounts directly
          if (isBeforePeriod) {
            // Debit adds to opening balance of Debit nature, subtracts from Credit nature
            if (bal.natureza === 'D') {
              bal.saldoAnterior += valor;
            } else {
              bal.saldoAnterior -= valor;
            }
          } else {
            bal.debitos += valor;
          }
        }
      }

      // Process credit side
      if (balanceMap.has(lanc.contaCreditoId)) {
        const bal = balanceMap.get(lanc.contaCreditoId);
        if (bal.tipo === 'A') { // Only process analytical accounts directly
          if (isBeforePeriod) {
            // Credit adds to opening balance of Credit nature, subtracts from Debit nature
            if (bal.natureza === 'C') {
              bal.saldoAnterior += valor;
            } else {
              bal.saldoAnterior -= valor;
            }
          } else {
            bal.creditos += valor;
          }
        }
      }
    }

    // Calculate closing balance for all analytical accounts
    for (const bal of balanceMap.values()) {
      if (bal.tipo === 'A') {
        if (bal.natureza === 'D') {
          bal.saldoAtual = bal.saldoAnterior + bal.debitos - bal.creditos;
        } else {
          bal.saldoAtual = bal.saldoAnterior - bal.debitos + bal.creditos;
        }
      }
    }

    // 5. Aggregate values from Analytical accounts up to Synthetic parents
    // Sort accounts by level in descending order so children are aggregated before parents
    const sortedContasDesc = [...contas].sort((a, b) => b.nivel - a.nivel);

    for (const conta of sortedContasDesc) {
      const bal = balanceMap.get(conta.id);
      if (bal.contaPaiId && balanceMap.has(bal.contaPaiId)) {
        const parentBal = balanceMap.get(bal.contaPaiId);
        
        // Sum child balances to parent
        parentBal.saldoAnterior += bal.saldoAnterior;
        parentBal.debitos += bal.debitos;
        parentBal.creditos += bal.creditos;
        // Current balance for parent also respects parent nature
        // Actually, we can sum closing balances directly since parent and child share group nature
        // But to be accounting-safe, we just sum the current balance.
        parentBal.saldoAtual += bal.saldoAtual;
      }
    }

    // Convert balance map back to sorted array by account code
    const balancete = Array.from(balanceMap.values()).sort((a, b) => 
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' })
    );

    return NextResponse.json(balancete);
  } catch (error) {
    console.error('Erro ao gerar balancete:', error);
    return NextResponse.json({ erro: 'Erro ao gerar balancete contábil' }, { status: 500 });
  }
}
