import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { extrairNotasDeBuffer } from '@/lib/fiscal/parserXml';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const empresaIdStr = formData.get('empresaId');
    const empresaId = parseInt(empresaIdStr, 10);

    if (!empresaId || isNaN(empresaId)) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    // Busca todos os arquivos enviados
    const files = formData.getAll('arquivos');
    if (!files || files.length === 0) {
      return NextResponse.json({ erro: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    let notasExtraidas = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const extraidas = await extrairNotasDeBuffer(buffer, file.name);
      notasExtraidas = notasExtraidas.concat(extraidas);
    }

    if (notasExtraidas.length === 0) {
      return NextResponse.json({
        erro: 'Nenhum XML de NF-e/NFC-e válido foi encontrado nos arquivos enviados.'
      }, { status: 400 });
    }

    let notasImportadasCount = 0;
    let notasAtualizadasCount = 0;
    let valorTotalGeral = 0;
    let totalMonofasicoGeral = 0;
    let totalStGeral = 0;
    let itensMonofasicosCount = 0;

    for (const nota of notasExtraidas) {
      valorTotalGeral += nota.valorTotal;
      totalMonofasicoGeral += nota.totalMonofasico;
      totalStGeral += nota.totalSt;

      const notaExistente = await prisma.notaFiscal.findUnique({
        where: { chaveAcesso: nota.chaveAcesso }
      });

      if (notaExistente) {
        // Atualiza a nota existente
        await prisma.notaFiscal.update({
          where: { id: notaExistente.id },
          data: {
            numero: nota.numero,
            serie: nota.serie,
            modelo: nota.modelo,
            tipoOperacao: nota.tipoOperacao,
            dataEmissao: nota.dataEmissao,
            naturezaOp: nota.naturezaOp,
            emitenteCnpj: nota.emitenteCnpj,
            emitenteNome: nota.emitenteNome,
            emitenteUf: nota.emitenteUf,
            destinatarioCpfCnpj: nota.destinatarioCpfCnpj,
            destinatarioNome: nota.destinatarioNome,
            destinatarioUf: nota.destinatarioUf,
            valorProdutos: nota.valorProdutos,
            valorFrete: nota.valorFrete,
            valorDesconto: nota.valorDesconto,
            valorTotal: nota.valorTotal,
            valorIcms: nota.valorIcms,
            valorPis: nota.valorPis,
            valorCofins: nota.valorCofins
          }
        });
        notasAtualizadasCount++;
      } else {
        // Cria a nova nota com seus itens
        await prisma.notaFiscal.create({
          data: {
            chaveAcesso: nota.chaveAcesso,
            numero: nota.numero,
            serie: nota.serie,
            modelo: nota.modelo,
            tipoOperacao: nota.tipoOperacao,
            dataEmissao: nota.dataEmissao,
            naturezaOp: nota.naturezaOp,
            emitenteCnpj: nota.emitenteCnpj,
            emitenteNome: nota.emitenteNome,
            emitenteUf: nota.emitenteUf,
            destinatarioCpfCnpj: nota.destinatarioCpfCnpj,
            destinatarioNome: nota.destinatarioNome,
            destinatarioUf: nota.destinatarioUf,
            valorProdutos: nota.valorProdutos,
            valorFrete: nota.valorFrete,
            valorDesconto: nota.valorDesconto,
            valorTotal: nota.valorTotal,
            valorIcms: nota.valorIcms,
            valorPis: nota.valorPis,
            valorCofins: nota.valorCofins,
            empresaId: empresaId,
            itens: {
              create: nota.itens.map(item => {
                if (item.monofasico) itensMonofasicosCount++;
                return {
                  numeroItem: item.numeroItem,
                  codigoProduto: item.codigoProduto,
                  descricao: item.descricao,
                  ncm: item.ncm,
                  cfop: item.cfop,
                  unidade: item.unidade,
                  quantidade: item.quantidade,
                  valorUnitario: item.valorUnitario,
                  valorTotal: item.valorTotal,
                  cstCsosn: item.cstCsosn,
                  monofasico: item.monofasico,
                  motivoMonofasico: item.motivoMonofasico,
                  substituicaoTributaria: item.substituicaoTributaria
                };
              })
            }
          }
        });
        notasImportadasCount++;
      }
    }

    const primeiraData = notasExtraidas[0]?.dataEmissao;
    let competenciaDetectada = null;
    if (primeiraData instanceof Date && !isNaN(primeiraData.getTime())) {
      competenciaDetectada = primeiraData.toISOString().slice(0, 7);
    }

    return NextResponse.json({
      sucesso: true,
      totalArquivosProcessados: files.length,
      totalNotasLidas: notasExtraidas.length,
      notasNovas: notasImportadasCount,
      notasAtualizadas: notasAtualizadasCount,
      valorTotalGeral,
      totalMonofasicoGeral,
      totalStGeral,
      itensMonofasicosAuditados: itensMonofasicosCount,
      competenciaDetectada
    });
  } catch (error) {
    console.error('Erro ao importar XMLs fiscais:', error);
    return NextResponse.json({
      erro: 'Falha ao processar arquivos XML: ' + error.message
    }, { status: 500 });
  }
}
