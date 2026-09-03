import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createToken, TOKEN_COOKIE_NAME } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json(
        { erro: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        empresas: {
          include: {
            empresa: true,
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { erro: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const senhaCorreta = await verifyPassword(senha, usuario.senha);
    if (!senhaCorreta) {
      return NextResponse.json(
        { erro: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const token = await createToken({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
    });

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

    const response = NextResponse.json({
      sucesso: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      },
      empresas: empresasDisponiveis,
    });

    response.cookies.set({
      name: TOKEN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { erro: 'Erro interno ao realizar login' },
      { status: 500 }
    );
  }
}
