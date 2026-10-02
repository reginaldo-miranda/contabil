import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const modelos = await prisma.lancamentoPadrao.findMany({
      where: {
        empresaId: parseInt(empresaId),
      },
      orderBy: {
        descricao: 'asc',
      },
      include: {
        contaDebito: {
          select: { id: true, codigo: true, nome: true, grupo: true },
        },
        contaCredito: {
          select: { id: true, codigo: true, nome: true, grupo: true },
        },
      },
    });

    return NextResponse.json(modelos);
  } catch (error) {
    console.error('Erro ao buscar modelos de lançamento:', error);
    return NextResponse.json({ erro: 'Erro interno ao buscar modelos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { empresaId, descricao, historico, contaDebitoId, contaCreditoId } = body;

    if (!empresaId || !descricao?.trim() || !historico?.trim() || !contaDebitoId || !contaCreditoId) {
      return NextResponse.json(
        { erro: 'Todos os campos são obrigatórios (empresaId, descricao, historico, contaDebitoId, contaCreditoId)' },
        { status: 400 }
      );
    }

    if (parseInt(contaDebitoId) === parseInt(contaCreditoId)) {
      return NextResponse.json(
        { erro: 'A conta de débito e crédito não podem ser iguais' },
        { status: 400 }
      );
    }

    const novoModelo = await prisma.lancamentoPadrao.create({
      data: {
        empresaId: parseInt(empresaId),
        descricao: descricao.trim(),
        historico: historico.trim(),
        contaDebitoId: parseInt(contaDebitoId),
        contaCreditoId: parseInt(contaCreditoId),
      },
      include: {
        contaDebito: {
          select: { id: true, codigo: true, nome: true, grupo: true },
        },
        contaCredito: {
          select: { id: true, codigo: true, nome: true, grupo: true },
        },
      },
    });

    return NextResponse.json(novoModelo, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar modelo de lançamento:', error);
    return NextResponse.json({ erro: 'Erro interno ao criar modelo' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, descricao, historico, contaDebitoId, contaCreditoId } = body;

    if (!id || !descricao?.trim() || !historico?.trim() || !contaDebitoId || !contaCreditoId) {
      return NextResponse.json(
        { erro: 'Todos os campos são obrigatórios (id, descricao, historico, contaDebitoId, contaCreditoId)' },
        { status: 400 }
      );
    }

    if (parseInt(contaDebitoId) === parseInt(contaCreditoId)) {
      return NextResponse.json(
        { erro: 'A conta de débito e crédito não podem ser iguais' },
        { status: 400 }
      );
    }

    const modeloAtualizado = await prisma.lancamentoPadrao.update({
      where: { id: parseInt(id) },
      data: {
        descricao: descricao.trim(),
        historico: historico.trim(),
        contaDebitoId: parseInt(contaDebitoId),
        contaCreditoId: parseInt(contaCreditoId),
      },
      include: {
        contaDebito: {
          select: { id: true, codigo: true, nome: true, grupo: true },
        },
        contaCredito: {
          select: { id: true, codigo: true, nome: true, grupo: true },
        },
      },
    });

    return NextResponse.json(modeloAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar modelo de lançamento:', error);
    return NextResponse.json({ erro: 'Erro interno ao atualizar modelo' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ erro: 'ID do modelo é obrigatório' }, { status: 400 });
    }

    await prisma.lancamentoPadrao.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Modelo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir modelo de lançamento:', error);
    return NextResponse.json({ erro: 'Erro interno ao excluir modelo' }, { status: 500 });
  }
}
