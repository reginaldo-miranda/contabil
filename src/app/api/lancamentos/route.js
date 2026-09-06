import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');
    const contaId = searchParams.get('contaId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit'));
    const useLimit = isNaN(limit) ? 15 : limit;

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const skip = useLimit > 0 ? (page - 1) * useLimit : undefined;

    const where = {
      empresaId: parseInt(empresaId),
    };

    // Filter by date range
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) {
        where.data.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.data.lte = new Date(dataFim);
      }
    }

    // Filter by account (either debit OR credit matches contaId)
    if (contaId) {
      const parsedContaId = parseInt(contaId);
      where.OR = [
        { contaDebitoId: parsedContaId },
        { contaCreditoId: parsedContaId }
      ];
    }

    const findArgs = {
      where,
      orderBy: { data: 'desc' },
      include: {
        contaDebito: { select: { id: true, codigo: true, nome: true, grupo: true } },
        contaCredito: { select: { id: true, codigo: true, nome: true, grupo: true } }
      }
    };

    if (useLimit > 0) {
      findArgs.skip = skip;
      findArgs.take = useLimit;
    }

    const [lancamentos, total] = await prisma.$transaction([
      prisma.lancamento.findMany(findArgs),
      prisma.lancamento.count({ where })
    ]);

    const paginas = useLimit > 0 ? Math.ceil(total / useLimit) : 1;

    return NextResponse.json({
      lancamentos,
      total,
      paginas,
      paginaAtual: page
    });
  } catch (error) {
    console.error('Erro ao buscar lançamentos:', error);
    return NextResponse.json({ erro: 'Erro ao buscar lançamentos' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { data, historico, empresaId, debitos, creditos, contaDebitoId, contaCreditoId, valor } = body;

    if (!data || !historico || !empresaId) {
      return NextResponse.json({ erro: 'Data, histórico e empresa são obrigatórios' }, { status: 400 });
    }

    const parsedEmpresaId = parseInt(empresaId);

    // Normalize pairs of debit/credit
    let pairs = [];

    if (Array.isArray(debitos) && Array.isArray(creditos) && debitos.length > 0 && creditos.length > 0) {
      // Validate positive values
      const validDebitos = debitos
        .map(d => ({ contaId: parseInt(d.contaId), valor: parseFloat(d.valor) }))
        .filter(d => d.contaId && !isNaN(d.valor) && d.valor > 0);

      const validCreditos = creditos
        .map(c => ({ contaId: parseInt(c.contaId), valor: parseFloat(c.valor) }))
        .filter(c => c.contaId && !isNaN(c.valor) && c.valor > 0);

      if (validDebitos.length === 0 || validCreditos.length === 0) {
        return NextResponse.json({ erro: 'Informe ao menos uma conta de débito e uma de crédito com valores válidos' }, { status: 400 });
      }

      const totalD = validDebitos.reduce((sum, d) => sum + d.valor, 0);
      const totalC = validCreditos.reduce((sum, c) => sum + c.valor, 0);

      if (Math.abs(totalD - totalC) > 0.01) {
        return NextResponse.json({ erro: `A soma dos débitos (R$ ${totalD.toFixed(2)}) deve ser igual à soma dos créditos (R$ ${totalC.toFixed(2)})` }, { status: 400 });
      }

      // Pair debits and credits
      let dList = validDebitos.map(d => ({ ...d, restante: d.valor }));
      let cList = validCreditos.map(c => ({ ...c, restante: c.valor }));
      let di = 0, ci = 0;

      while (di < dList.length && ci < cList.length) {
        const d = dList[di];
        const c = cList[ci];
        const matched = Math.min(d.restante, c.restante);
        if (matched > 0.0001) {
          pairs.push({
            contaDebitoId: d.contaId,
            contaCreditoId: c.contaId,
            valor: parseFloat(matched.toFixed(2))
          });
          d.restante -= matched;
          c.restante -= matched;
        }
        if (d.restante <= 0.0001) di++;
        if (c.restante <= 0.0001) ci++;
      }
    } else {
      // Fallback to single debit/credit
      if (!contaDebitoId || !contaCreditoId || !valor) {
        return NextResponse.json({ erro: 'Todos os campos são obrigatórios' }, { status: 400 });
      }

      const parsedVal = parseFloat(valor);
      if (isNaN(parsedVal) || parsedVal <= 0) {
        return NextResponse.json({ erro: 'Valor do lançamento deve ser maior que zero' }, { status: 400 });
      }

      pairs.push({
        contaDebitoId: parseInt(contaDebitoId),
        contaCreditoId: parseInt(contaCreditoId),
        valor: parsedVal
      });
    }

    if (pairs.length === 0) {
      return NextResponse.json({ erro: 'Nenhum lançamento válido para gravar' }, { status: 400 });
    }

    // Collect all unique account IDs involved
    const accountIds = Array.from(new Set([
      ...pairs.map(p => p.contaDebitoId),
      ...pairs.map(p => p.contaCreditoId)
    ]));

    const contas = await prisma.conta.findMany({
      where: { id: { in: accountIds } }
    });

    const contaMap = new Map(contas.map(c => [c.id, c]));

    for (const pair of pairs) {
      if (pair.contaDebitoId === pair.contaCreditoId) {
        return NextResponse.json({ erro: 'A conta de débito e crédito não podem ser iguais' }, { status: 400 });
      }

      const cDeb = contaMap.get(pair.contaDebitoId);
      const cCred = contaMap.get(pair.contaCreditoId);

      if (!cDeb || !cDeb.ativa || cDeb.empresaId !== parsedEmpresaId) {
        return NextResponse.json({ erro: `Conta de débito (ID ${pair.contaDebitoId}) inválida ou inativa` }, { status: 400 });
      }
      if (!cCred || !cCred.ativa || cCred.empresaId !== parsedEmpresaId) {
        return NextResponse.json({ erro: `Conta de crédito (ID ${pair.contaCreditoId}) inválida ou inativa` }, { status: 400 });
      }

      if (cDeb.tipo !== 'A') {
        return NextResponse.json({ erro: `A conta de débito (${cDeb.codigo} - ${cDeb.nome}) é Sintética. Lançamentos só são permitidos em contas Analíticas.` }, { status: 400 });
      }
      if (cCred.tipo !== 'A') {
        return NextResponse.json({ erro: `A conta de crédito (${cCred.codigo} - ${cCred.nome}) é Sintética. Lançamentos só são permitidos em contas Analíticas.` }, { status: 400 });
      }
    }

    // Create all entries in a transaction
    const criados = await prisma.$transaction(
      pairs.map(pair =>
        prisma.lancamento.create({
          data: {
            data: new Date(data),
            valor: pair.valor,
            historico: historico.trim(),
            contaDebitoId: pair.contaDebitoId,
            contaCreditoId: pair.contaCreditoId,
            empresaId: parsedEmpresaId
          },
          include: {
            contaDebito: { select: { id: true, codigo: true, nome: true } },
            contaCredito: { select: { id: true, codigo: true, nome: true } }
          }
        })
      )
    );

    return NextResponse.json(criados.length === 1 ? criados[0] : criados, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar lançamento:', error);
    return NextResponse.json({ erro: 'Erro ao criar lançamento contábil' }, { status: 500 });
  }
}
