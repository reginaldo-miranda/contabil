import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const contaId = searchParams.get('contaId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 15;

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const skip = (page - 1) * limit;

    const where = {
      empresaId: parseInt(empresaId),
    };

    // Filter by date range
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) {
        where.data.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.data.lte = new Date(dataFim);
      }
    }

    // Filter by account (either debit OR credit matches contaId)
    if (contaId) {
      const parsedContaId = parseInt(contaId);
      where.OR = [
        { contaDebitoId: parsedContaId },
        { contaCreditoId: parsedContaId }
      ];
    }

    const [lancamentos, total] = await prisma.$transaction([
      prisma.lancamento.findMany({
        where,
        orderBy: { data: 'desc' },
        skip,
        take: limit,
        include: {
          contaDebito: { select: { id: true, codigo: true, nome: true, grupo: true } },
          contaCredito: { select: { id: true, codigo: true, nome: true, grupo: true } }
        }
      }),
      prisma.lancamento.count({ where })
    ]);

    const paginas = Math.ceil(total / limit);

    return NextResponse.json({
      lancamentos,
      total,
      paginas,
      paginaAtual: page
    });
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    return NextResponse.json({ erro: 'Erro ao buscar lançamentos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { data, valor, historico, contaDebitoId, contaCreditoId, empresaId } = body;

    // Validation
    if (!data || !valor || !historico || !contaDebitoId || !contaCreditoId || !empresaId) {
      return NextResponse.json({ erro: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    const parsedVal = parseFloat(valor);
    if (isNaN(parsedVal) || parsedVal <= 0) {
      return NextResponse.json({ erro: 'Valor do lançamento deve ser maior que zero' }, { status: 400 });
    }

    const parsedDebitoId = parseInt(contaDebitoId);
    const parsedCreditoId = parseInt(contaCreditoId);
    const parsedEmpresaId = parseInt(empresaId);

    if (parsedDebitoId === parsedCreditoId) {
      return NextResponse.json({ erro: 'A conta de débito e a conta de crédito não podem ser iguais' }, { status: 400 });
    }

    // Fetch accounts to validate
    const [contaDebito, contaCredito] = await Promise.all([
      prisma.conta.findUnique({ where: { id: parsedDebitoId } }),
      prisma.conta.findUnique({ where: { id: parsedCreditoId } })
    ]);

    if (!contaDebito || !contaDebito.ativa || contaDebito.empresaId !== parsedEmpresaId) {
      return NextResponse.json({ erro: 'Conta de débito inválida ou inativa' }, { status: 400 });
    }

    if (!contaCredito || !contaCredito.ativa || contaCredito.empresaId !== parsedEmpresaId) {
      return NextResponse.json({ erro: 'Conta de crédito inválida ou inativa' }, { status: 400 });
    }

    // Enforce Analytical validation
    if (contaDebito.tipo !== 'A') {
      return NextResponse.json({ erro: `A conta de débito (${contaDebito.codigo} - ${contaDebito.nome}) é Sintética. Lançamentos só são permitidos em contas Analíticas.` }, { status: 400 });
    }

    if (contaCredito.tipo !== 'A') {
      return NextResponse.json({ erro: `A conta de crédito (${contaCredito.codigo} - ${contaCredito.nome}) é Sintética. Lançamentos só são permitidos em contas Analíticas.` }, { status: 400 });
    }

    const lancamento = await prisma.lancamento.create({
      data: {
        data: new Date(data),
        valor: parsedVal,
        historico: historico.trim(),
        contaDebitoId: parsedDebitoId,
        contaCreditoId: parsedCreditoId,
        empresaId: parsedEmpresaId
      },
      include: {
        contaDebito: { select: { id: true, codigo: true, nome: true } },
        contaCredito: { select: { id: true, codigo: true, nome: true } }
      }
    });

    return NextResponse.json(lancamento, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar lançamento:', error);
    return NextResponse.json({ erro: 'Erro ao criar lançamento contábil' }, { status: 500 });
  }
}
