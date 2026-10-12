const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notas = await prisma.notaFiscal.findMany({
    select: {
      id: true,
      numero: true,
      dataEmissao: true,
      tipoOperacao: true,
      integradaContabil: true,
      empresaId: true,
      emitenteNome: true,
      destinatarioNome: true,
      valorTotal: true
    }
  });
  console.log('NOTAS_COUNT:', notas.length);
  console.log('NOTAS:', JSON.stringify(notas, null, 2));

  const apuracoes = await prisma.apuracaoFiscal.findMany();
  console.log('APURACOES:', JSON.stringify(apuracoes, null, 2));

  const empresas = await prisma.empresa.findMany({
    select: { id: true, nome: true, cnpj: true }
  });
  console.log('EMPRESAS:', JSON.stringify(empresas, null, 2));
}

main().finally(() => prisma.$disconnect());
