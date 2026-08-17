import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const empresas = await prisma.empresa.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { contas: true } } },
    });
    return NextResponse.json(empresas);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar empresas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.nome || !body.nome.trim()) {
      return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 });
    }
    const empresa = await prisma.empresa.create({
      data: { nome: body.nome.trim(), cnpj: body.cnpj?.trim() || null },
    });
    return NextResponse.json(empresa, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ erro: 'CNPJ já cadastrado' }, { status: 409 });
    }
    return NextResponse.json({ erro: 'Erro ao criar empresa' }, { status: 500 });
  }
}
