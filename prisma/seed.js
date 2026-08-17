const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const contasCFC = [
  // GRUPO 1 - ATIVO
  { codigo: '1', nome: 'ATIVO', tipo: 'S', natureza: 'D', nivel: 1, grupo: 'ATIVO', codigoPai: null },
  { codigo: '1.1', nome: 'ATIVO CIRCULANTE', tipo: 'S', natureza: 'D', nivel: 2, grupo: 'ATIVO', codigoPai: '1' },
  { codigo: '1.1.1', nome: 'Caixa e Equivalentes de Caixa', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.1' },
  { codigo: '1.1.1.01', nome: 'Caixa', tipo: 'S', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.1' },
  { codigo: '1.1.1.01.001', nome: 'Caixa Geral', tipo: 'A', natureza: 'D', nivel: 5, grupo: 'ATIVO', codigoPai: '1.1.1.01' },
  { codigo: '1.1.1.02', nome: 'Bancos Conta Movimento', tipo: 'S', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.1' },
  { codigo: '1.1.1.02.001', nome: 'Banco do Brasil', tipo: 'A', natureza: 'D', nivel: 5, grupo: 'ATIVO', codigoPai: '1.1.1.02' },
  { codigo: '1.1.1.02.002', nome: 'Itaú', tipo: 'A', natureza: 'D', nivel: 5, grupo: 'ATIVO', codigoPai: '1.1.1.02' },
  { codigo: '1.1.1.03', nome: 'Aplicações Financeiras', tipo: 'S', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.1' },
  { codigo: '1.1.1.03.001', nome: 'Aplicações de Liquidez Imediata', tipo: 'A', natureza: 'D', nivel: 5, grupo: 'ATIVO', codigoPai: '1.1.1.03' },
  { codigo: '1.1.2', nome: 'Clientes e Contas a Receber', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.1' },
  { codigo: '1.1.2.01', nome: 'Duplicatas a Receber', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.2' },
  { codigo: '1.1.2.02', nome: '(-) Provisão p/ Devedores Duvidosos', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.2' },
  { codigo: '1.1.3', nome: 'Estoques', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.1' },
  { codigo: '1.1.3.01', nome: 'Mercadorias para Revenda', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.3' },
  { codigo: '1.1.3.02', nome: 'Matérias-Primas', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.3' },
  { codigo: '1.1.4', nome: 'Impostos a Recuperar', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.1' },
  { codigo: '1.1.4.01', nome: 'ICMS a Recuperar', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.4' },
  { codigo: '1.1.4.02', nome: 'PIS a Recuperar', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.4' },
  { codigo: '1.1.4.03', nome: 'COFINS a Recuperar', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.4' },
  { codigo: '1.1.5', nome: 'Despesas Antecipadas', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.1' },
  { codigo: '1.1.5.01', nome: 'Seguros a Apropriar', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.1.5' },
  { codigo: '1.2', nome: 'ATIVO NÃO CIRCULANTE', tipo: 'S', natureza: 'D', nivel: 2, grupo: 'ATIVO', codigoPai: '1' },
  { codigo: '1.2.1', nome: 'Realizável a Longo Prazo', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.2' },
  { codigo: '1.2.1.01', nome: 'Depósitos Judiciais', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.1' },
  { codigo: '1.2.2', nome: 'Investimentos', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.2' },
  { codigo: '1.2.2.01', nome: 'Participações Societárias', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.2' },
  { codigo: '1.2.3', nome: 'Imobilizado', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.2' },
  { codigo: '1.2.3.01', nome: 'Imóveis', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.3' },
  { codigo: '1.2.3.02', nome: 'Veículos', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.3' },
  { codigo: '1.2.3.03', nome: 'Máquinas e Equipamentos', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.3' },
  { codigo: '1.2.3.04', nome: 'Móveis e Utensílios', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.3' },
  { codigo: '1.2.3.05', nome: 'Computadores e Periféricos', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.3' },
  { codigo: '1.2.3.90', nome: '(-) Depreciação Acumulada', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.3' },
  { codigo: '1.2.4', nome: 'Intangível', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'ATIVO', codigoPai: '1.2' },
  { codigo: '1.2.4.01', nome: 'Softwares', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.4' },
  { codigo: '1.2.4.02', nome: 'Marcas e Patentes', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.4' },
  { codigo: '1.2.4.90', nome: '(-) Amortização Acumulada', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'ATIVO', codigoPai: '1.2.4' },

  // GRUPO 2 - PASSIVO
  { codigo: '2', nome: 'PASSIVO', tipo: 'S', natureza: 'C', nivel: 1, grupo: 'PASSIVO', codigoPai: null },
  { codigo: '2.1', nome: 'PASSIVO CIRCULANTE', tipo: 'S', natureza: 'C', nivel: 2, grupo: 'PASSIVO', codigoPai: '2' },
  { codigo: '2.1.1', nome: 'Fornecedores', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PASSIVO', codigoPai: '2.1' },
  { codigo: '2.1.1.01', nome: 'Fornecedores Nacionais', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.1' },
  { codigo: '2.1.1.02', nome: 'Fornecedores Estrangeiros', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.1' },
  { codigo: '2.1.2', nome: 'Obrigações Trabalhistas', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PASSIVO', codigoPai: '2.1' },
  { codigo: '2.1.2.01', nome: 'Salários a Pagar', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.2' },
  { codigo: '2.1.2.02', nome: 'FGTS a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.2' },
  { codigo: '2.1.2.03', nome: 'INSS a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.2' },
  { codigo: '2.1.2.04', nome: 'IRRF a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.2' },
  { codigo: '2.1.3', nome: 'Obrigações Tributárias', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PASSIVO', codigoPai: '2.1' },
  { codigo: '2.1.3.01', nome: 'ICMS a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.3' },
  { codigo: '2.1.3.02', nome: 'PIS a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.3' },
  { codigo: '2.1.3.03', nome: 'COFINS a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.3' },
  { codigo: '2.1.3.04', nome: 'ISS a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.3' },
  { codigo: '2.1.3.05', nome: 'IRPJ a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.3' },
  { codigo: '2.1.3.06', nome: 'CSLL a Recolher', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.3' },
  { codigo: '2.1.4', nome: 'Empréstimos e Financiamentos CP', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PASSIVO', codigoPai: '2.1' },
  { codigo: '2.1.4.01', nome: 'Empréstimos Bancários', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.1.4' },
  { codigo: '2.2', nome: 'PASSIVO NÃO CIRCULANTE', tipo: 'S', natureza: 'C', nivel: 2, grupo: 'PASSIVO', codigoPai: '2' },
  { codigo: '2.2.1', nome: 'Empréstimos e Financiamentos LP', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PASSIVO', codigoPai: '2.2' },
  { codigo: '2.2.1.01', nome: 'Financiamentos Bancários LP', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.2.1' },
  { codigo: '2.2.2', nome: 'Provisões', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PASSIVO', codigoPai: '2.2' },
  { codigo: '2.2.2.01', nome: 'Provisão p/ Contingências', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PASSIVO', codigoPai: '2.2.2' },

  // GRUPO 2.3 - PATRIMÔNIO LÍQUIDO
  { codigo: '2.3', nome: 'PATRIMÔNIO LÍQUIDO', tipo: 'S', natureza: 'C', nivel: 2, grupo: 'PL', codigoPai: '2' },
  { codigo: '2.3.1', nome: 'Capital Social', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PL', codigoPai: '2.3' },
  { codigo: '2.3.1.01', nome: 'Capital Social Subscrito', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PL', codigoPai: '2.3.1' },
  { codigo: '2.3.1.02', nome: '(-) Capital a Integralizar', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PL', codigoPai: '2.3.1' },
  { codigo: '2.3.2', nome: 'Reservas de Capital', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PL', codigoPai: '2.3' },
  { codigo: '2.3.2.01', nome: 'Ágio na Emissão de Ações', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PL', codigoPai: '2.3.2' },
  { codigo: '2.3.3', nome: 'Reservas de Lucros', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PL', codigoPai: '2.3' },
  { codigo: '2.3.3.01', nome: 'Reserva Legal', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PL', codigoPai: '2.3.3' },
  { codigo: '2.3.3.02', nome: 'Reserva Estatutária', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PL', codigoPai: '2.3.3' },
  { codigo: '2.3.4', nome: 'Lucros/Prejuízos Acumulados', tipo: 'S', natureza: 'C', nivel: 3, grupo: 'PL', codigoPai: '2.3' },
  { codigo: '2.3.4.01', nome: 'Lucros Acumulados', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PL', codigoPai: '2.3.4' },
  { codigo: '2.3.4.02', nome: '(-) Prejuízos Acumulados', tipo: 'A', natureza: 'C', nivel: 4, grupo: 'PL', codigoPai: '2.3.4' },

  // GRUPO 3 - RECEITAS
  { codigo: '3', nome: 'RECEITAS', tipo: 'S', natureza: 'C', nivel: 1, grupo: 'RECEITA', codigoPai: null },
  { codigo: '3.1', nome: 'Receita Operacional Bruta', tipo: 'S', natureza: 'C', nivel: 2, grupo: 'RECEITA', codigoPai: '3' },
  { codigo: '3.1.1', nome: 'Receita de Vendas de Mercadorias', tipo: 'A', natureza: 'C', nivel: 3, grupo: 'RECEITA', codigoPai: '3.1' },
  { codigo: '3.1.2', nome: 'Receita de Prestação de Serviços', tipo: 'A', natureza: 'C', nivel: 3, grupo: 'RECEITA', codigoPai: '3.1' },
  { codigo: '3.2', nome: '(-) Deduções da Receita', tipo: 'S', natureza: 'D', nivel: 2, grupo: 'RECEITA', codigoPai: '3' },
  { codigo: '3.2.1', nome: '(-) Devoluções de Vendas', tipo: 'A', natureza: 'D', nivel: 3, grupo: 'RECEITA', codigoPai: '3.2' },
  { codigo: '3.2.2', nome: '(-) Descontos Incondicionais', tipo: 'A', natureza: 'D', nivel: 3, grupo: 'RECEITA', codigoPai: '3.2' },
  { codigo: '3.2.3', nome: '(-) ICMS s/ Vendas', tipo: 'A', natureza: 'D', nivel: 3, grupo: 'RECEITA', codigoPai: '3.2' },
  { codigo: '3.2.4', nome: '(-) PIS s/ Faturamento', tipo: 'A', natureza: 'D', nivel: 3, grupo: 'RECEITA', codigoPai: '3.2' },
  { codigo: '3.2.5', nome: '(-) COFINS s/ Faturamento', tipo: 'A', natureza: 'D', nivel: 3, grupo: 'RECEITA', codigoPai: '3.2' },
  { codigo: '3.2.6', nome: '(-) ISS s/ Serviços', tipo: 'A', natureza: 'D', nivel: 3, grupo: 'RECEITA', codigoPai: '3.2' },
  { codigo: '3.3', nome: 'Receitas Financeiras', tipo: 'S', natureza: 'C', nivel: 2, grupo: 'RECEITA', codigoPai: '3' },
  { codigo: '3.3.1', nome: 'Juros Ativos', tipo: 'A', natureza: 'C', nivel: 3, grupo: 'RECEITA', codigoPai: '3.3' },
  { codigo: '3.3.2', nome: 'Rendimentos de Aplicações', tipo: 'A', natureza: 'C', nivel: 3, grupo: 'RECEITA', codigoPai: '3.3' },

  // GRUPO 4 - CUSTOS E DESPESAS
  { codigo: '4', nome: 'CUSTOS E DESPESAS', tipo: 'S', natureza: 'D', nivel: 1, grupo: 'DESPESA', codigoPai: null },
  { codigo: '4.1', nome: 'Custo das Mercadorias Vendidas (CMV)', tipo: 'S', natureza: 'D', nivel: 2, grupo: 'DESPESA', codigoPai: '4' },
  { codigo: '4.1.1', nome: 'CMV — Mercadorias', tipo: 'A', natureza: 'D', nivel: 3, grupo: 'DESPESA', codigoPai: '4.1' },
  { codigo: '4.2', nome: 'Despesas Operacionais', tipo: 'S', natureza: 'D', nivel: 2, grupo: 'DESPESA', codigoPai: '4' },
  { codigo: '4.2.1', nome: 'Despesas com Pessoal', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'DESPESA', codigoPai: '4.2' },
  { codigo: '4.2.1.01', nome: 'Salários e Ordenados', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.1' },
  { codigo: '4.2.1.02', nome: 'Férias', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.1' },
  { codigo: '4.2.1.03', nome: '13º Salário', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.1' },
  { codigo: '4.2.1.04', nome: 'FGTS', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.1' },
  { codigo: '4.2.1.05', nome: 'INSS Patronal', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.1' },
  { codigo: '4.2.2', nome: 'Despesas Administrativas', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'DESPESA', codigoPai: '4.2' },
  { codigo: '4.2.2.01', nome: 'Aluguel', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.2' },
  { codigo: '4.2.2.02', nome: 'Energia Elétrica', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.2' },
  { codigo: '4.2.2.03', nome: 'Água e Esgoto', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.2' },
  { codigo: '4.2.2.04', nome: 'Telefone e Internet', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.2' },
  { codigo: '4.2.2.05', nome: 'Material de Escritório', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.2' },
  { codigo: '4.2.2.06', nome: 'Depreciação', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.2' },
  { codigo: '4.2.3', nome: 'Despesas Financeiras', tipo: 'S', natureza: 'D', nivel: 3, grupo: 'DESPESA', codigoPai: '4.2' },
  { codigo: '4.2.3.01', nome: 'Juros Passivos', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.3' },
  { codigo: '4.2.3.02', nome: 'Tarifas Bancárias', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.3' },
  { codigo: '4.2.3.03', nome: 'IOF', tipo: 'A', natureza: 'D', nivel: 4, grupo: 'DESPESA', codigoPai: '4.2.3' },
];

async function seedContas(empresaId) {
  const codigoParaId = new Map();
  let count = 0;

  for (const c of contasCFC) {
    const contaPaiId = c.codigoPai ? codigoParaId.get(c.codigoPai) : null;
    const conta = await prisma.conta.create({
      data: {
        codigo: c.codigo,
        nome: c.nome,
        tipo: c.tipo,
        natureza: c.natureza,
        nivel: c.nivel,
        grupo: c.grupo,
        contaPaiId,
        empresaId,
      },
    });
    codigoParaId.set(c.codigo, conta.id);
    count++;
  }
  return count;
}

async function main() {
  console.log('Iniciando seed do plano de contas CFC...');

  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '00.000.000/0001-00' },
    update: {},
    create: {
      nome: 'Empresa Demonstração',
      cnpj: '00.000.000/0001-00',
    },
  });
  console.log(`Empresa: ${empresa.nome} (ID: ${empresa.id})`);

  const existingContas = await prisma.conta.count({ where: { empresaId: empresa.id } });
  if (existingContas > 0) {
    console.log(`Empresa já possui ${existingContas} contas. Pulando seed.`);
    return;
  }

  const total = await seedContas(empresa.id);
  console.log(`Seed concluído! ${total} contas inseridas.`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
