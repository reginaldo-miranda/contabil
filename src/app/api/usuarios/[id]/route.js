import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, hashPassword } from '@/lib/auth';

async function verificarAdmin() {
  const session = await getSessionUser();
  if (!session || session.email !== 'admin@contabil.com') {
    return false;
  }
  return session;
}

export async function PUT(request, { params }) {
  try {
    const admin = await verificarAdmin();
    if (!admin) {
      return NextResponse.json({ erro: 'Acesso restrito ao administrador geral' }, { status: 403 });
    }

    const { id } = await params;
    const usuarioId = parseInt(id, 10);
    if (isNaN(usuarioId)) {
      return NextResponse.json({ erro: 'ID de usuário inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { nome, email, ativo, senha, empresas } = body;

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuarioExistente) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
    }

    const dataUpdate = {};
    if (nome && nome.trim()) dataUpdate.nome = nome.trim();
    if (typeof ativo === 'boolean') dataUpdate.ativo = ativo;

    if (email && email.toLowerCase().trim() !== usuarioExistente.email) {
      const emailEmUso = await prisma.usuario.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (emailEmUso) {
        return NextResponse.json({ erro: 'E-mail já cadastrado para outro usuário' }, { status: 409 });
      }
      dataUpdate.email = email.toLowerCase().trim();
    }

    if (senha && senha.trim().length >= 6) {
      dataUpdate.senha = await hashPassword(senha.trim());
    }

    await prisma.$transaction(async (tx) => {
      // 1. Atualizar dados cadastrais
      if (Object.keys(dataUpdate).length > 0) {
        await tx.usuario.update({
          where: { id: usuarioId },
          data: dataUpdate,
        });
      }

      // 2. Atualizar vínculos com empresas
      if (Array.isArray(empresas)) {
        // Remover vínculos anteriores
        await tx.usuarioEmpresa.deleteMany({
          where: { usuarioId },
        });

        // Inserir novos vínculos com papel e permissões
        for (const emp of empresas) {
          await tx.usuarioEmpresa.create({
            data: {
              usuarioId,
              empresaId: emp.empresaId,
              papel: emp.papel || 'OPERADOR',
              permissoes: emp.permissoes ? emp.permissoes : null,
            },
          });
        }
      }
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ erro: 'Erro interno ao atualizar usuário' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const admin = await verificarAdmin();
    if (!admin) {
      return NextResponse.json({ erro: 'Acesso restrito ao administrador geral' }, { status: 403 });
    }

    const { id } = await params;
    const usuarioId = parseInt(id, 10);
    if (isNaN(usuarioId)) {
      return NextResponse.json({ erro: 'ID de usuário inválido' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 });
    }

    if (usuario.email === 'admin@contabil.com') {
      return NextResponse.json({ erro: 'O administrador principal não pode ser excluído' }, { status: 400 });
    }

    await prisma.usuario.delete({
      where: { id: usuarioId },
    });

    return NextResponse.json({ sucesso: true, mensagem: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ erro: 'Erro interno ao excluir usuário' }, { status: 500 });
  }
}
