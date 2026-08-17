import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const busca = searchParams.get('busca');
    const grupo = searchParams.get('grupo');

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const where = { empresaId: parseInt(empresaId), ativa: true };

    if (busca) {
      where.OR = [
        { codigo: { contains: busca } },
        { nome: { contains: busca } },
      ];
    }
    if (grupo) {
      where.grupo = grupo;
    }

    const contas = await prisma.conta.findMany({
      where,
      orderBy: { codigo: 'asc' },
      include: { contaPai: { select: { id: true, codigo: true, nome: true } } },
    });
    return NextResponse.json(contas);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao buscar contas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.codigo || !body.nome || !body.empresaId) {
      return NextResponse.json({ erro: 'Código, nome e empresaId são obrigatórios' }, { status: 400 });
    }
    const conta = await prisma.conta.create({
      data: {
        codigo: body.codigo.trim(),
        nome: body.nome.trim(),
        tipo: body.tipo || 'A',
        natureza: body.natureza || 'D',
        nivel: body.nivel || 1,
        grupo: body.grupo || 'ATIVO',
        contaPaiId: body.contaPaiId || null,
        empresaId: parseInt(body.empresaId),
      },
    });
    return NextResponse.json(conta, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ erro: 'Já existe uma conta com este código nesta empresa' }, { status: 409 });
    }
    return NextResponse.json({ erro: 'Erro ao criar conta' }, { status: 500 });
  }
}
