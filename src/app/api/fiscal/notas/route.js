import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const competencia = searchParams.get('competencia'); // "YYYY-MM"
    const tipoOperacao = searchParams.get('tipoOperacao'); // "SAIDA" ou "ENTRADA"
    const busca = searchParams.get('busca');

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const where = {
      empresaId: parseInt(empresaId, 10)
    };

    if (tipoOperacao) {
      where.tipoOperacao = tipoOperacao;
    }

    if (competencia && competencia.match(/^\d{4}-\d{2}$/)) {
      const [ano, mes] = competencia.split('-').map(Number);
      const dataInicio = new Date(Date.UTC(ano, mes - 1, 1));
      const dataFim = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
      where.dataEmissao = {
        gte: dataInicio,
        lte: dataFim
      };
    }

    if (busca) {
      where.OR = [
        { numero: { contains: busca } },
        { chaveAcesso: { contains: busca } },
        { emitenteNome: { contains: busca } },
        { destinatarioNome: { contains: busca } }
      ];
    }

    const notas = await prisma.notaFiscal.findMany({
      where,
      orderBy: { dataEmissao: 'desc' },
      include: {
        itens: true
      }
    });

    return NextResponse.json(notas);
  } catch (error) {
    console.error('Erro ao buscar notas fiscais:', error);
    return NextResponse.json({ erro: 'Erro ao buscar notas fiscais' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const empresaId = searchParams.get('empresaId');
    const competencia = searchParams.get('competencia');

    if (id) {
      await prisma.notaFiscal.delete({
        where: { id: parseInt(id, 10) }
      });
      return NextResponse.json({ sucesso: true, mensagem: 'Nota fiscal excluída' });
    }

    if (empresaId && competencia) {
      const [ano, mes] = competencia.split('-').map(Number);
      const dataInicio = new Date(Date.UTC(ano, mes - 1, 1));
      const dataFim = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

      const deletadas = await prisma.notaFiscal.deleteMany({
        where: {
          empresaId: parseInt(empresaId, 10),
          dataEmissao: {
            gte: dataInicio,
            lte: dataFim
          }
        }
      });
      return NextResponse.json({ sucesso: true, deletadas: deletadas.count });
    }

    return NextResponse.json({ erro: 'ID ou empresaId + competência obrigatórios' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao excluir notas:', error);
    return NextResponse.json({ erro: 'Erro ao excluir notas fiscais' }, { status: 500 });
  }
}
