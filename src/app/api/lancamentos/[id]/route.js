import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const lancamento = await prisma.lancamento.findUnique({
      where: { id: parseInt(id) },
      include: {
        contaDebito: { select: { id: true, codigo: true, nome: true, grupo: true } },
        contaCredito: { select: { id: true, codigo: true, nome: true, grupo: true } }
      }
    });

    if (!lancamento) {
      return NextResponse.json({ erro: 'Lançamento contábil não encontrado' }, { status: 404 });
    }

    return NextResponse.json(lancamento);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar lançamento' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { data, valor, historico, contaDebitoId, contaCreditoId, empresaId } = body;

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

    // Validate accounts
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

    const lancamento = await prisma.lancamento.update({
      where: { id: parseInt(id) },
      data: {
        data: new Date(data),
        valor: parsedVal,
        historico: historico.trim(),
        contaDebitoId: parsedDebitoId,
        contaCreditoId: parsedCreditoId,
      },
      include: {
        contaDebito: { select: { id: true, codigo: true, nome: true } },
        contaCredito: { select: { id: true, codigo: true, nome: true } }
      }
    });

    return NextResponse.json(lancamento);
  } catch (error) {
    console.error('Erro ao atualizar lançamento:', error);
    return NextResponse.json({ erro: 'Erro ao atualizar lançamento contábil' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.lancamento.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ mensagem: 'Lançamento contábil excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar lançamento:', error);
    return NextResponse.json({ erro: 'Erro ao excluir lançamento contábil' }, { status: 500 });
  }
}
