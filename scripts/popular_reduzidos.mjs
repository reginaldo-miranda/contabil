import prisma from '../src/lib/prisma.js';

async function main() {
  console.log('Populando códigos reduzidos para contas analíticas existentes...');
  const empresas = await prisma.empresa.findMany();

  for (const emp of empresas) {
    console.log(`\nEmpresa: [${emp.id}] ${emp.nome}`);

    // Buscar todas as contas da empresa ordenadas por código contábil
    const contas = await prisma.conta.findMany({
      where: { empresaId: emp.id },
      orderBy: { codigo: 'asc' }
    });

    let seq = 1;
    let atualizadas = 0;

    for (const c of contas) {
      const isAnalitica = c.tipo === 'A' || c.tipo === 'Analítica';
      if (isAnalitica) {
        // Se já tem reduzido válido, mantemos ou respeitamos seq se ainda não preenchido
        const novoReduzido = c.reduzido ?? seq;
        await prisma.conta.update({
          where: { id: c.id },
          data: { reduzido: novoReduzido }
        });
        seq = Math.max(seq, novoReduzido) + 1;
        atualizadas++;
      } else {
        // Se for sintética, garante que reduzido seja null
        if (c.reduzido !== null) {
          await prisma.conta.update({
            where: { id: c.id },
            data: { reduzido: null }
          });
        }
      }
    }

    console.log(`- ${atualizadas} contas analíticas receberam/atualizaram código reduzido sequencial.`);
  }

  console.log('\nMigração concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
