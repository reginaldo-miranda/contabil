import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calcularApuracaoSimples } from '@/lib/fiscal/calculoSimples';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const competencia = searchParams.get('competencia'); // "YYYY-MM"
    const anexo = searchParams.get('anexo') || 'ANEXO_I';

    if (!empresaId || !competencia || !competencia.match(/^\d{4}-\d{2}$/)) {
      return NextResponse.json({ erro: 'empresaId e competência (YYYY-MM) são obrigatórios' }, { status: 400 });
    }

    const empId = parseInt(empresaId, 10);
    const [ano, mes] = competencia.split('-').map(Number);

    // Mês atual
    const dataInicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const dataFimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

    // Período dos 12 meses anteriores (para RBT12)
    // RBT12 = receita dos 12 meses anteriores ao período de apuração
    const dataFim12 = new Date(Date.UTC(ano, mes - 1, 0, 23, 59, 59, 999));
    const dataInicio12 = new Date(Date.UTC(ano - 1, mes - 1, 1));

    // Busca notas de SAÍDA do mês atual
    const notasMes = await prisma.notaFiscal.findMany({
      where: {
        empresaId: empId,
        tipoOperacao: 'SAIDA',
        dataEmissao: {
          gte: dataInicioMes,
          lte: dataFimMes
        }
      },
      include: {
        itens: true
      }
    });

    let faturamentoTotalMes = 0;
    let faturamentoMonofasicoMes = 0;
    let faturamentoStMes = 0;

    for (const nota of notasMes) {
      const vNota = Number(nota.valorTotal || 0);
      faturamentoTotalMes += vNota;

      for (const item of nota.itens) {
        const vItem = Number(item.valorTotal || 0);
        if (item.monofasico) {
          faturamentoMonofasicoMes += vItem;
        }
        if (item.substituicaoTributaria) {
          faturamentoStMes += vItem;
        }
      }
    }

    // Busca faturamento dos 12 meses anteriores
    const notas12Meses = await prisma.notaFiscal.findMany({
      where: {
        empresaId: empId,
        tipoOperacao: 'SAIDA',
        dataEmissao: {
          gte: dataInicio12,
          lte: dataFim12
        }
      },
      select: { valorTotal: true }
    });

    let rbt12Calculado = notas12Meses.reduce((acc, n) => acc + Number(n.valorTotal || 0), 0);

    // Se a empresa começou agora ou não tem 12 meses no sistema, projeta pelo mês
    if (rbt12Calculado === 0 && faturamentoTotalMes > 0) {
      rbt12Calculado = faturamentoTotalMes * 12;
    }

    // Calcula apuração oficial com segregação
    const apuracao = calcularApuracaoSimples({
      rbt12: rbt12Calculado,
      faturamentoTotal: faturamentoTotalMes,
      faturamentoMonofasico: faturamentoMonofasicoMes,
      faturamentoSt: faturamentoStMes,
      anexo
    });

    // Verifica se já existe registro salvo no banco
    const registroSalvo = await prisma.apuracaoFiscal.findUnique({
      where: {
        empresaId_competencia: {
          empresaId: empId,
          competencia
        }
      }
    });

    return NextResponse.json({
      competencia,
      anexo,
      totalNotas: notasMes.length,
      apuracao,
      salvo: !!registroSalvo,
      integradoContabil: registroSalvo?.integradoContabil || false,
      lancamentoId: registroSalvo?.lancamentoId || null
    });
  } catch (error) {
    console.error('Erro ao calcular apuração:', error);
    return NextResponse.json({ erro: 'Erro ao calcular apuração do Simples: ' + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      empresaId,
      competencia,
      anexo,
      rbt12,
      faturamentoTotal,
      faturamentoMonofasico,
      faturamentoSt,
      aliquotaNominal,
      parcelaDeduzir,
      aliquotaEfetiva,
      valorDasSemOtimizacao,
      valorDasFinal,
      economiaGerada
    } = body;

    const empId = parseInt(empresaId, 10);

    const apuracaoSalva = await prisma.apuracaoFiscal.upsert({
      where: {
        empresaId_competencia: {
          empresaId: empId,
          competencia
        }
      },
      update: {
        anexo: anexo || 'ANEXO_I',
        rbt12: rbt12,
        faturamentoTotal: faturamentoTotal,
        faturamentoMonofasico: faturamentoMonofasico,
        faturamentoSt: faturamentoSt,
        faturamentoTributado: Math.max(0, (faturamentoTotal || 0) - (faturamentoMonofasico || 0) - (faturamentoSt || 0)),
        aliquotaNominal: aliquotaNominal,
        parcelaDeduzir: parcelaDeduzir,
        aliquotaEfetiva: aliquotaEfetiva,
        valorDasSemOtimizacao: valorDasSemOtimizacao,
        valorDasFinal: valorDasFinal,
        economiaGerada: economiaGerada
      },
      create: {
        empresaId: empId,
        competencia,
        regime: 'SIMPLES_NACIONAL',
        anexo: anexo || 'ANEXO_I',
        rbt12: rbt12,
        faturamentoTotal: faturamentoTotal,
        faturamentoMonofasico: faturamentoMonofasico,
        faturamentoSt: faturamentoSt,
        faturamentoTributado: Math.max(0, (faturamentoTotal || 0) - (faturamentoMonofasico || 0) - (faturamentoSt || 0)),
        aliquotaNominal: aliquotaNominal,
        parcelaDeduzir: parcelaDeduzir,
        aliquotaEfetiva: aliquotaEfetiva,
        valorDasSemOtimizacao: valorDasSemOtimizacao,
        valorDasFinal: valorDasFinal,
        economiaGerada: economiaGerada
      }
    });

    return NextResponse.json({ sucesso: true, apuracao: apuracaoSalva });
  } catch (error) {
    console.error('Erro ao salvar apuração:', error);
    return NextResponse.json({ erro: 'Erro ao salvar apuração: ' + error.message }, { status: 500 });
  }
}
