import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const empresa = await prisma.empresa.findUnique({
      where: { id: parseInt(id) },
      include: { _count: { select: { contas: { where: { ativa: true } } } } },
    });
    if (!empresa) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
    }
    return NextResponse.json(empresa);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar empresa' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const empresa = await prisma.empresa.update({
      where: { id: parseInt(id) },
      data: { nome: body.nome?.trim(), cnpj: body.cnpj?.trim() || null },
    });
    return NextResponse.json(empresa);
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ erro: 'CNPJ já cadastrado' }, { status: 409 });
    }
    return NextResponse.json({ erro: 'Erro ao atualizar empresa' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.empresa.update({
      where: { id: parseInt(id) },
      data: { ativa: false },
    });
    return NextResponse.json({ mensagem: 'Empresa desativada com sucesso' });
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao desativar empresa' }, { status: 500 });
  }
}
