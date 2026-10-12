import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { analisarItemFiscal } from './tabelaMonofasicos.js';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseTagValue: false
});

/**
 * Faz o parse e a auditoria fiscal de uma string XML de NF-e ou NFC-e
 * @param {string} xmlString 
 * @returns {Object|null} Objeto da nota fiscal estruturada
 */
export function parsearXmlNfe(xmlString) {
  try {
    const parsed = xmlParser.parse(xmlString);

    // Localiza o nó infNFe
    const nfe = parsed.nfeProc?.NFe || parsed.NFe;
    if (!nfe || !nfe.infNFe) {
      return null;
    }

    const infNFe = nfe.infNFe;
    const protNFe = parsed.nfeProc?.protNFe?.infProt;

    // Chave de acesso
    let chave = protNFe?.chNFe;
    if (!chave && infNFe['@_Id']) {
      chave = String(infNFe['@_Id']).replace(/^NFe/, '');
    }
    if (!chave) {
      chave = 'SEM_CHAVE_' + Math.random().toString(36).substring(2, 12);
    }

    const ide = infNFe.ide || {};
    const emit = infNFe.emit || {};
    const dest = infNFe.dest || {};
    const total = infNFe.total?.ICMSTot || {};

    // Data de emissão
    const rawData = ide.dhEmi || ide.dEmi || new Date().toISOString();
    const dataEmissao = new Date(rawData);

    // Tipo de Operação: 0 = Entrada, 1 = Saída
    const tipoOperacao = String(ide.tpNF) === '0' ? 'ENTRADA' : 'SAIDA';

    // Itens da nota
    const rawDet = infNFe.det;
    const listaDet = Array.isArray(rawDet) ? rawDet : (rawDet ? [rawDet] : []);

    let totalMonofasicoItens = 0;
    let totalStItens = 0;

    const itens = listaDet.map((d, index) => {
      const prod = d.prod || {};
      const imp = d.imposto || {};

      // Localiza CSOSN ou CST de ICMS
      let cstCsosn = '';
      if (imp.ICMS) {
        const icmsTag = Object.values(imp.ICMS)[0];
        if (icmsTag) {
          cstCsosn = icmsTag.CSOSN || icmsTag.CST || '';
        }
      }

      const ncm = String(prod.NCM || '').trim();
      const cfop = String(prod.CFOP || '').trim();
      const analise = analisarItemFiscal(ncm, cfop, cstCsosn);

      const valorTotal = Number(prod.vProd || 0);

      if (analise.monofasico) {
        totalMonofasicoItens += valorTotal;
      }
      if (analise.substituicaoTributaria) {
        totalStItens += valorTotal;
      }

      return {
        numeroItem: Number(d['@_nItem'] || index + 1),
        codigoProduto: String(prod.cProd || '').slice(0, 60),
        descricao: String(prod.xProd || '').slice(0, 255),
        ncm: ncm.slice(0, 10),
        cfop: cfop.slice(0, 10),
        unidade: String(prod.uCom || 'UN').slice(0, 10),
        quantidade: Number(prod.qCom || 1),
        valorUnitario: Number(prod.vUnCom || 0),
        valorTotal: valorTotal,
        cstCsosn: String(cstCsosn).slice(0, 10),
        monofasico: analise.monofasico,
        motivoMonofasico: analise.motivo,
        substituicaoTributaria: analise.substituicaoTributaria
      };
    });

    return {
      chaveAcesso: chave,
      numero: String(ide.nNF || ''),
      serie: String(ide.serie || '1'),
      modelo: String(ide.mod || '55'),
      tipoOperacao: tipoOperacao,
      dataEmissao: isNaN(dataEmissao.getTime()) ? new Date() : dataEmissao,
      naturezaOp: String(ide.natOp || '').slice(0, 150),
      
      // Emitente
      emitenteCnpj: String(emit.CNPJ || emit.CPF || '').slice(0, 20),
      emitenteNome: String(emit.xNome || '').slice(0, 200),
      emitenteUf: String(emit.enderEmit?.UF || '').slice(0, 2),

      // Destinatário
      destinatarioCpfCnpj: String(dest.CNPJ || dest.CPF || '').slice(0, 20),
      destinatarioNome: String(dest.xNome || '').slice(0, 200),
      destinatarioUf: String(dest.enderDest?.UF || '').slice(0, 2),

      // Totais
      valorProdutos: Number(total.vProd || 0),
      valorFrete: Number(total.vFrete || 0),
      valorDesconto: Number(total.vDesc || 0),
      valorTotal: Number(total.vNF || 0),

      // Tributos destacados
      valorIcms: Number(total.vICMS || 0),
      valorPis: Number(total.vPIS || 0),
      valorCofins: Number(total.vCOFINS || 0),

      // Totais auditados dos itens
      totalMonofasico: totalMonofasicoItens,
      totalSt: totalStItens,

      itens: itens
    };
  } catch (err) {
    console.error('Erro ao analisar XML individual:', err.message);
    return null;
  }
}

/**
 * Processa um buffer que pode ser um arquivo .XML direto ou um arquivo .ZIP com dezenas de XMLs
 * @param {Buffer} buffer 
 * @param {string} fileName 
 * @returns {Promise<Array<Object>>} Lista de notas fiscais extraídas com sucesso
 */
export async function extrairNotasDeBuffer(buffer, fileName = '') {
  const notas = [];

  if (fileName.toLowerCase().endsWith('.zip')) {
    const zip = await JSZip.loadAsync(buffer);
    const arquivos = Object.keys(zip.files).filter(nome => nome.toLowerCase().endsWith('.xml'));

    for (const nomeArq of arquivos) {
      const conteudoXml = await zip.files[nomeArq].async('text');
      const nota = parsearXmlNfe(conteudoXml);
      if (nota) {
        notas.push(nota);
      }
    }
  } else if (fileName.toLowerCase().endsWith('.xml') || fileName === '') {
    const conteudoXml = buffer.toString('utf-8');
    const nota = parsearXmlNfe(conteudoXml);
    if (nota) {
      notas.push(nota);
    }
  }

  return notas;
}
