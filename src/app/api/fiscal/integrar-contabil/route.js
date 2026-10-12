import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      empresaId,
      competencia, // "YYYY-MM"
      preview = false, // Se true, apenas retorna os lançamentos sugeridos para conferência
      contaDebitoVendaId,
      contaCreditoVendaId,
      contaDebitoImpostoId,
      contaCreditoImpostoId,
      integrarVendas = true,
      integrarApuracao = true
    } = body;

    const empId = parseInt(empresaId, 10);
    if (!empId || !competencia || !competencia.match(/^\d{4}-\d{2}$/)) {
      return NextResponse.json({ erro: 'empresaId e competência (YYYY-MM) são obrigatórios' }, { status: 400 });
    }

    const [ano, mes] = competencia.split('-').map(Number);
    const dataInicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const dataFimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

    // 1. Localiza contas padrão da empresa para vendas e impostos se não foram enviadas explicitamente
    const contasEmpresa = await prisma.conta.findMany({
      where: { empresaId: empId, tipo: 'Analítica', ativa: true }
    });

    // Helper para achar conta por nome ou código
    const acharConta = (termos = [], fallbackPrefixo = null) => {
      for (const termo of termos) {
        const encontrada = contasEmpresa.find(c =>
          c.nome.toLowerCase().includes(termo.toLowerCase())
        );
        if (encontrada) return encontrada.id;
      }
      if (fallbackPrefixo) {
        const porPrefixo = contasEmpresa.find(c => c.codigo.startsWith(fallbackPrefixo));
        if (porPrefixo) return porPrefixo.id;
      }
      return null;
    };

    // Débito Venda: Clientes / Duplicatas a Receber / Caixa
    const debitoVendaId = contaDebitoVendaId || acharConta(['duplicatas a receber', 'clientes'], '1.1.2') || acharConta(['caixa geral', 'banco'], '1.1.1');
    // Crédito Venda: Receita de Vendas de Mercadorias / Receita de Serviços
    const creditoVendaId = contaCreditoVendaId || acharConta(['receita de vendas', 'vendas de mercadorias', 'receita operacional'], '4.1');

    // Débito Imposto: Simples Nacional / Deduções da Receita / Impostos sobre Vendas
    let debitoImpostoId = contaDebitoImpostoId || acharConta(['simples nacional', 'impostos s/ vendas', 'icms s/ vendas', 'pis s/ faturamento'], '4.2');
    // Crédito Imposto: Simples Nacional a Recolher / Obrigações Tributárias
    let creditoImpostoId = contaCreditoImpostoId || acharConta(['simples nacional a recolher', 'tributos a recolher', 'impostos a recolher', 'icms a recolher'], '2.1.3');

    // Se ainda não tiver contas específicas para o Simples Nacional, podemos usar a primeira conta analítica de deduções e impostos
    if (!debitoImpostoId) debitoImpostoId = acharConta([], '4.2') || creditoVendaId;
    if (!creditoImpostoId) creditoImpostoId = acharConta([], '2.1.3') || debitoVendaId;

    // 2. Busca notas de saída do mês que ainda não foram integradas
    const notasParaIntegrar = await prisma.notaFiscal.findMany({
      where: {
        empresaId: empId,
        tipoOperacao: 'SAIDA',
        integradaContabil: false,
        dataEmissao: {
          gte: dataInicioMes,
          lte: dataFimMes
        }
      },
      orderBy: { dataEmissao: 'asc' }
    });

    // 3. Busca a apuração fiscal salva do mês
    const apuracaoFiscal = await prisma.apuracaoFiscal.findUnique({
      where: {
        empresaId_competencia: {
          empresaId: empId,
          competencia
        }
      }
    });

    // 4. Monta a lista de lançamentos sugeridos
    const lancamentosSugeridos = [];

    if (integrarVendas) {
      for (const nota of notasParaIntegrar) {
        lancamentosSugeridos.push({
          tipo: 'VENDA_NFE',
          origemId: nota.id,
          data: nota.dataEmissao.toISOString().split('T')[0],
          documento: `NF-${nota.numero}`,
          valor: Number(nota.valorTotal),
          contaDebitoId: debitoVendaId,
          contaCreditoId: creditoVendaId,
          historico: `Venda de mercadorias s/ NF-e nº ${nota.numero} - Importado via XML`
        });
      }
    }

    if (integrarApuracao && apuracaoFiscal && !apuracaoFiscal.integradoContabil && Number(apuracaoFiscal.valorDasFinal) > 0) {
      lancamentosSugeridos.push({
        tipo: 'APURACAO_DAS',
        origemId: apuracaoFiscal.id,
        data: dataFimMes.toISOString().split('T')[0],
        documento: `DAS-${competencia}`,
        valor: Number(apuracaoFiscal.valorDasFinal),
        contaDebitoId: debitoImpostoId,
        contaCreditoId: creditoImpostoId,
        historico: `Provisão do Simples Nacional comp. ${competencia} - Apuração Fiscal ContábilPro`
      });
    }

    // Se for apenas modo PREVIEW, devolve a simulação para a tela de conferência
    if (preview) {
      // Mapeia detalhes das contas para exibição amigável
      const mapaContas = new Map(contasEmpresa.map(c => [c.id, `${c.codigo} - ${c.nome}`]));
      const previewFormatado = lancamentosSugeridos.map(l => ({
        ...l,
        contaDebitoNome: mapaContas.get(l.contaDebitoId) || 'Conta não selecionada',
        contaCreditoNome: mapaContas.get(l.contaCreditoId) || 'Conta não selecionada'
      }));

      let competenciasPendentes = [];
      if (previewFormatado.length === 0) {
        const outras = await prisma.notaFiscal.findMany({
          where: {
            empresaId: empId,
            tipoOperacao: 'SAIDA',
            integradaContabil: false
          },
          select: { dataEmissao: true },
          take: 20
        });
        competenciasPendentes = [...new Set(outras.map(n => n.dataEmissao.toISOString().slice(0, 7)))];
      }

      return NextResponse.json({
        preview: true,
        competencia,
        totalLancamentos: previewFormatado.length,
        valorTotalVendas: previewFormatado.filter(l => l.tipo === 'VENDA_NFE').reduce((s, l) => s + l.valor, 0),
        valorDas: apuracaoFiscal ? Number(apuracaoFiscal.valorDasFinal) : 0,
        contasSugeridas: {
          debitoVendaId,
          creditoVendaId,
          debitoImpostoId,
          creditoImpostoId
        },
        competenciasPendentes,
        lancamentos: previewFormatado
      });
    }

    // 5. MODO EXECUÇÃO REAL (Grava no banco em transação)
    if (lancamentosSugeridos.length === 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Não há novos registros pendentes de integração nesta competência.',
        lancamentosCriados: 0
      });
    }

    let criadosCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of lancamentosSugeridos) {
        if (!item.contaDebitoId || !item.contaCreditoId) continue;

        const lancamento = await tx.lancamento.create({
          data: {
            data: new Date(item.data),
            documento: item.documento,
            valor: item.valor,
            historico: item.historico,
            contaDebitoId: item.contaDebitoId,
            contaCreditoId: item.contaCreditoId,
            empresaId: empId
          }
        });

        criadosCount++;

        if (item.tipo === 'VENDA_NFE') {
          await tx.notaFiscal.update({
            where: { id: item.origemId },
            data: {
              integradaContabil: true,
              lancamentoId: lancamento.id
            }
          });
        } else if (item.tipo === 'APURACAO_DAS') {
          await tx.apuracaoFiscal.update({
            where: { id: item.origemId },
            data: {
              integradoContabil: true,
              lancamentoId: lancamento.id
            }
          });
        }
      }
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: `${criadosCount} lançamentos contábeis criados com sucesso no Livro Diário!`,
      lancamentosCriados: criadosCount
    });
  } catch (error) {
    console.error('Erro na integração contábil do fiscal:', error);
    return NextResponse.json({ erro: 'Falha ao integrar com a contabilidade: ' + error.message }, { status: 500 });
  }
}
