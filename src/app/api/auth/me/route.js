import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || !session.id) {
      return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.id },
      include: {
        empresas: {
          include: {
            empresa: true,
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ erro: 'Usuário não encontrado ou inativo' }, { status: 401 });
    }

    let empresasDisponiveis = [];
    if (usuario.email === 'admin@contabil.com') {
      const todas = await prisma.empresa.findMany({
        where: { ativa: true },
        orderBy: { nome: 'asc' },
      });
      empresasDisponiveis = todas.map((e) => ({
        id: e.id,
        nome: e.nome,
        cnpj: e.cnpj,
        papel: 'ADMIN',
      }));
    } else {
      empresasDisponiveis = usuario.empresas
        .filter((ue) => ue.empresa.ativa)
        .map((ue) => ({
          id: ue.empresa.id,
          nome: ue.empresa.nome,
          cnpj: ue.empresa.cnpj,
          papel: ue.papel,
          permissoes: ue.permissoes,
        }));
    }

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
      empresas: empresasDisponiveis,
    });
  } catch (error) {
    console.error('Erro em /api/auth/me:', error);
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 });
  }
}
