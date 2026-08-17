import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const contas = await prisma.conta.findMany({
      where: { empresaId: parseInt(empresaId), ativa: true },
      orderBy: { codigo: 'asc' },
    });

    // Build tree in memory
    const contaMap = new Map();
    const roots = [];

    // First pass: create map entries with empty children arrays
    for (const conta of contas) {
      contaMap.set(conta.id, { ...conta, contasFilhas: [] });
    }

    // Second pass: assign children to parents
    for (const conta of contas) {
      const node = contaMap.get(conta.id);
      if (conta.contaPaiId && contaMap.has(conta.contaPaiId)) {
        contaMap.get(conta.contaPaiId).contasFilhas.push(node);
      } else {
        roots.push(node);
      }
    }

    return NextResponse.json(roots);
  } catch (error) {
    return NextResponse.json({ erro: 'Erro ao montar árvore de contas' }, { status: 500 });
  }
}
