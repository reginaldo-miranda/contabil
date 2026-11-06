import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CONFIG_VOZ_PADRAO } from '@/lib/voz/configVoz';

// GET: Retorna as configurações globais de voz (lidas do banco de dados)
export async function GET() {
  try {
    // Busca a primeira empresa que possua configurações salvas
    const empresaComConfig = await prisma.empresa.findFirst({
      where: {
        configuracoesVoz: {
          not: null,
        },
      },
      select: { configuracoesVoz: true },
    });

    const configs = {
      ...CONFIG_VOZ_PADRAO,
      ...(empresaComConfig?.configuracoesVoz && typeof empresaComConfig.configuracoesVoz === 'object'
        ? empresaComConfig.configuracoesVoz
        : {}),
    };

    return NextResponse.json({
      sucesso: true,
      configuracoes: configs,
    });
  } catch (error) {
    console.error('Erro ao buscar configurações globais de voz:', error);
    return NextResponse.json({ erro: 'Erro ao buscar configurações globais' }, { status: 500 });
  }
}

// PUT: Salva as configurações para TODAS as empresas no MySQL de uma só vez
export async function PUT(request) {
  try {
    const body = await request.json();

    const novaConfig = {
      ...CONFIG_VOZ_PADRAO,
      ...body,
    };

    // Atualiza absolutamente todas as empresas cadastradas no MySQL
    const resultado = await prisma.empresa.updateMany({
      data: {
        configuracoesVoz: novaConfig,
      },
    });

    return NextResponse.json({
      sucesso: true,
      empresasAtualizadas: resultado.count,
      configuracoes: novaConfig,
    });
  } catch (error) {
    console.error('Erro ao salvar configurações globais de voz:', error);
    return NextResponse.json({ erro: 'Erro ao salvar configurações globais' }, { status: 500 });
  }
}
