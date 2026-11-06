import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CONFIG_VOZ_PADRAO } from '@/lib/voz/configVoz';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const empresa = await prisma.empresa.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, nome: true, configuracoesVoz: true },
    });

    if (!empresa) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
    }

    const hasCustom = !!(empresa.configuracoesVoz && typeof empresa.configuracoesVoz === 'object');
    const configs = {
      ...CONFIG_VOZ_PADRAO,
      ...(hasCustom ? empresa.configuracoesVoz : {}),
    };

    return NextResponse.json({
      empresaId: empresa.id,
      empresaNome: empresa.nome,
      configuracoes: configs,
      temConfiguracaoPropria: hasCustom,
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de voz da empresa:', error);
    return NextResponse.json({ erro: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const empAtual = await prisma.empresa.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, configuracoesVoz: true },
    });

    if (!empAtual) {
      return NextResponse.json({ erro: 'Empresa não encontrada' }, { status: 404 });
    }

    const atual = empAtual.configuracoesVoz && typeof empAtual.configuracoesVoz === 'object'
      ? empAtual.configuracoesVoz
      : {};

    const novaConfig = {
      ...CONFIG_VOZ_PADRAO,
      ...atual,
      ...body,
    };

    const atualizada = await prisma.empresa.update({
      where: { id: parseInt(id) },
      data: { configuracoesVoz: novaConfig },
      select: { id: true, nome: true, configuracoesVoz: true },
    });

    return NextResponse.json({
      sucesso: true,
      configuracoes: atualizada.configuracoesVoz,
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de voz da empresa:', error);
    return NextResponse.json({ erro: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
