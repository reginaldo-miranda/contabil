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

    const codigo = body.codigo.trim();
    const empresaId = parseInt(body.empresaId);
    let contaPaiId = body.contaPaiId || null;

    // Se contaPaiId não foi informado, busca o pai pelo prefixo do código
    if (!contaPaiId) {
      const parts = codigo.split('.').filter(p => p !== '');
      for (let i = parts.length - 1; i >= 1; i--) {
        const parentCode = parts.slice(0, i).join('.');
        const parentConta = await prisma.conta.findFirst({
          where: { codigo: parentCode, empresaId, ativa: true }
        });
        if (parentConta) {
          contaPaiId = parentConta.id;
          break;
        }
      }
    }

    // Se tem conta pai e ela era Analítica, transforma em Sintética e limpa reduzido
    if (contaPaiId) {
      const parent = await prisma.conta.findUnique({ where: { id: contaPaiId } });
      if (parent && (parent.tipo === 'A' || parent.tipo === 'Analítica')) {
        await prisma.conta.update({
          where: { id: contaPaiId },
          data: { tipo: 'S', reduzido: null }
        });
      }
    }

    const tipo = body.tipo || 'A';
    const isAnalitica = tipo === 'A' || tipo === 'Analítica';
    let reduzido = null;

    if (isAnalitica) {
      if (body.reduzido !== undefined && body.reduzido !== null && body.reduzido !== '') {
        reduzido = parseInt(body.reduzido, 10);
      } else {
        const maxReduzido = await prisma.conta.aggregate({
          where: { empresaId },
          _max: { reduzido: true }
        });
        reduzido = (maxReduzido._max.reduzido || 0) + 1;
      }
    }

    const conta = await prisma.conta.create({
      data: {
        codigo,
        reduzido,
        nome: body.nome.trim(),
        tipo,
        natureza: body.natureza || 'D',
        nivel: body.nivel || 1,
        grupo: body.grupo || 'ATIVO',
        contaPaiId,
        empresaId,
      },
    });
    return NextResponse.json(conta, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      const isReduzidoConflict = String(error.meta?.target || '').includes('reduzido');
      return NextResponse.json({
        erro: isReduzidoConflict
          ? 'Já existe uma conta com este código reduzido nesta empresa'
          : 'Já existe uma conta com este código nesta empresa'
      }, { status: 409 });
    }
    return NextResponse.json({ erro: 'Erro ao criar conta' }, { status: 500 });
  }
}
