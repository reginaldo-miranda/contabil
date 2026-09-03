import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { criarPlanoContasParaEmpresa } from '@/lib/planoContasPadrao';

export async function GET() {
  try {
    const session = await getSessionUser();

    if (session?.id) {
      // Super Admin tem acesso a TODAS as empresas ativas
      if (session.email === 'admin@contabil.com') {
        const todas = await prisma.empresa.findMany({
          where: { ativa: true },
          orderBy: { nome: 'asc' },
          include: { _count: { select: { contas: true } } },
        });
        return NextResponse.json(todas.map(e => ({ ...e, papel: 'ADMIN' })));
      }

      const vinculos = await prisma.usuarioEmpresa.findMany({
        where: { usuarioId: session.id, empresa: { ativa: true } },
        include: {
          empresa: {
            include: { _count: { select: { contas: true } } },
          },
        },
        orderBy: { empresa: { nome: 'asc' } },
      });

      const empresas = vinculos.map((v) => ({
        ...v.empresa,
        papel: v.papel,
        permissoes: v.permissoes,
      }));

      return NextResponse.json(empresas);
    }

    // Fallback se não houver sessão ativa
    const empresas = await prisma.empresa.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { contas: true } } },
    });
    return NextResponse.json(empresas);
  } catch (error) {
    console.error('Erro ao buscar empresas:', error);
    return NextResponse.json({ erro: 'Erro ao buscar empresas' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.nome || !body.nome.trim()) {
      return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 });
    }

    const session = await getSessionUser();

    const resultado = await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.create({
        data: { nome: body.nome.trim(), cnpj: body.cnpj?.trim() || null },
      });

      if (session?.id) {
        await tx.usuarioEmpresa.create({
          data: {
            usuarioId: session.id,
            empresaId: empresa.id,
            papel: 'ADMIN',
          },
        });
      }

      await criarPlanoContasParaEmpresa(tx, empresa.id);

      return empresa;
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ erro: 'CNPJ já cadastrado' }, { status: 409 });
    }
    return NextResponse.json({ erro: 'Erro ao criar empresa' }, { status: 500 });
  }
}

