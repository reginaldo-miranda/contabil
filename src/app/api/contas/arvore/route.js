import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ erro: 'empresaId é obrigatório' }, { status: 400 });
    }

    const contas = await prisma.conta.findMany({
      where: { empresaId: parseInt(empresaId), ativa: true },
      orderBy: { codigo: 'asc' },
    });

    // Build tree in memory
    const contaMap = new Map();
    const contaCodeMap = new Map();
    const roots = [];

    // First pass: create map entries with empty children arrays
    for (const conta of contas) {
      const node = { ...conta, contasFilhas: [] };
      contaMap.set(conta.id, node);
      contaCodeMap.set(conta.codigo, node);
    }

    // Second pass: assign children to parents (prioriza o pai mais específico pelo código)
    for (const conta of contas) {
      const node = contaMap.get(conta.id);
      let parentNode = null;

      // Busca o pai mais específico pelo prefixo do código (ex: 4.2.2.07.001 procura 4.2.2.07)
      if (conta.codigo) {
        const parts = conta.codigo.split('.').filter(p => p !== '');
        for (let i = parts.length - 1; i >= 1; i--) {
          const parentCode = parts.slice(0, i).join('.');
          if (contaCodeMap.has(parentCode)) {
            parentNode = contaCodeMap.get(parentCode);
            // Se o banco estava com um contaPaiId diferente/desatualizado, corrige no banco
            if (conta.contaPaiId !== parentNode.id) {
              prisma.conta.update({
                where: { id: conta.id },
                data: { contaPaiId: parentNode.id }
              }).catch(() => {});
            }
            break;
          }
        }
      }

      // Fallback para o contaPaiId salvo caso a busca por prefixo não encontre
      if (!parentNode && conta.contaPaiId && contaMap.has(conta.contaPaiId)) {
        parentNode = contaMap.get(conta.contaPaiId);
      }

      if (parentNode) {
        parentNode.contasFilhas.push(node);
        // Se a conta pai era Analítica (A), converte para Sintética (S)
        if (parentNode.tipo === 'A') {
          parentNode.tipo = 'S';
          prisma.conta.update({
            where: { id: parentNode.id },
            data: { tipo: 'S' }
          }).catch(() => {});
        }
      } else {
        roots.push(node);
      }
    }

    return NextResponse.json(roots);
  } catch (error) {
    console.error('Erro na árvore de contas:', error);
    return NextResponse.json({ erro: 'Erro ao montar árvore de contas' }, { status: 500 });
  }
}
