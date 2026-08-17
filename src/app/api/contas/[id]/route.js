import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const conta = await prisma.conta.findUnique({
      where: { id: parseInt(id) },
      include: {
        contaPai: { select: { id: true, codigo: true, nome: true } },
        contasFilhas: { where: { ativa: true }, orderBy: { codigo: 'asc' } },
      },
    });
    if (!conta) {
      return NextResponse.json({ erro: 'Conta não encontrada' }, { status: 404 });
    }
    return NextResponse.json(conta);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar conta' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = {};
    if (body.codigo !== undefined) data.codigo = body.codigo.trim();
    if (body.nome !== undefined) data.nome = body.nome.trim();
    if (body.tipo !== undefined) data.tipo = body.tipo;
    if (body.natureza !== undefined) data.natureza = body.natureza;
    if (body.nivel !== undefined) data.nivel = body.nivel;
    if (body.grupo !== undefined) data.grupo = body.grupo;
    if (body.contaPaiId !== undefined) data.contaPaiId = body.contaPaiId;

    const conta = await prisma.conta.update({
      where: { id: parseInt(id) },
      data,
    });
    return NextResponse.json(conta);
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ erro: 'Já existe uma conta com este código nesta empresa' }, { status: 409 });
    }
    return NextResponse.json({ erro: 'Erro ao atualizar conta' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const contaId = parseInt(id);

    const filhasAtivas = await prisma.conta.count({
      where: { contaPaiId: contaId, ativa: true },
    });
    if (filhasAtivas > 0) {
      return NextResponse.json(
        { erro: `Não é possível excluir: esta conta possui ${filhasAtivas} subconta(s) ativa(s)` },
        { status: 400 }
      );
    }

    await prisma.conta.update({
      where: { id: contaId },
      data: { ativa: false },
    });
    return NextResponse.json({ mensagem: 'Conta desativada com sucesso' });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao desativar conta' }, { status: 500 });
  }
}
