import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createToken, TOKEN_COOKIE_NAME } from '@/lib/auth';
import { criarPlanoContasParaEmpresa } from '@/lib/planoContasPadrao';

export async function POST(request) {
  try {
    const body = await request.json();
    const { nome, email, senha, nomeEmpresa, cnpjEmpresa } = body;

    if (!nome || !email || !senha || !nomeEmpresa) {
      return NextResponse.json(
        { erro: 'Nome, e-mail, senha e nome da empresa são obrigatórios' },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { erro: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    const emailNormalizado = email.toLowerCase().trim();
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email: emailNormalizado },
    });

    if (usuarioExistente) {
      return NextResponse.json(
        { erro: 'Este e-mail já está em uso por outro usuário' },
        { status: 409 }
      );
    }

    const senhaHash = await hashPassword(senha);

    // Executar criação em transação atômica
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Criar Usuário
      const novoUsuario = await tx.usuario.create({
        data: {
          nome: nome.trim(),
          email: emailNormalizado,
          senha: senhaHash,
        },
      });

      // 2. Criar Empresa
      const novaEmpresa = await tx.empresa.create({
        data: {
          nome: nomeEmpresa.trim(),
          cnpj: cnpjEmpresa?.trim() || null,
        },
      });

      // 3. Vincular Usuário à Empresa
      await tx.usuarioEmpresa.create({
        data: {
          usuarioId: novoUsuario.id,
          empresaId: novaEmpresa.id,
          papel: 'ADMIN',
        },
      });

      // 4. Gerar Plano de Contas padrão CFC
      await criarPlanoContasParaEmpresa(tx, novaEmpresa.id);

      return { usuario: novoUsuario, empresa: novaEmpresa };
    });

    const token = await createToken({
      id: resultado.usuario.id,
      email: resultado.usuario.email,
      nome: resultado.usuario.nome,
    });

    const response = NextResponse.json(
      {
        sucesso: true,
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email,
        },
        empresas: [
          {
            id: resultado.empresa.id,
            nome: resultado.empresa.nome,
            cnpj: resultado.empresa.cnpj,
            papel: 'ADMIN',
          },
        ],
      },
      { status: 201 }
    );

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
    console.error('Erro no registro de usuário:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { erro: 'E-mail ou CNPJ já cadastrado' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { erro: 'Erro interno ao registrar usuário' },
      { status: 500 }
    );
  }
}
