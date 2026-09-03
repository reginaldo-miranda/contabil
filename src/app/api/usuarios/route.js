import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, hashPassword } from '@/lib/auth';

// Helper para verificar se a sessão é de Super Admin
async function verificarAdmin() {
  const session = await getSessionUser();
  if (!session || session.email !== 'admin@contabil.com') {
    return false;
  }
  return session;
}

export async function GET() {
  try {
    const admin = await verificarAdmin();
    if (!admin) {
      return NextResponse.json({ erro: 'Acesso restrito ao administrador geral' }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        email: true,
        ativo: true,
        criadoEm: true,
        empresas: {
          include: {
            empresa: {
              select: {
                id: true,
                nome: true,
                cnpj: true,
                ativa: true,
              },
            },
          },
        },
      },
    });

    const todasEmpresas = await prisma.empresa.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cnpj: true },
    });

    return NextResponse.json({
      usuarios,
      todasEmpresas,
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return NextResponse.json({ erro: 'Erro ao buscar usuários' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await verificarAdmin();
    if (!admin) {
      return NextResponse.json({ erro: 'Acesso restrito ao administrador geral' }, { status: 403 });
    }

    const body = await request.json();
    const { nome, email, senha, empresas } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { erro: 'Nome, e-mail e senha são obrigatórios' },
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

    const novoUsuario = await prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          nome: nome.trim(),
          email: emailNormalizado,
          senha: senhaHash,
        },
      });

      if (Array.isArray(empresas) && empresas.length > 0) {
        for (const emp of empresas) {
          await tx.usuarioEmpresa.create({
            data: {
              usuarioId: u.id,
              empresaId: emp.empresaId,
              papel: emp.papel || 'OPERADOR',
              permissoes: emp.permissoes ? emp.permissoes : null,
            },
          });
        }
      }

      return u;
    });

    return NextResponse.json({ sucesso: true, usuarioId: novoUsuario.id }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ erro: 'Erro interno ao criar usuário' }, { status: 500 });
  }
}
