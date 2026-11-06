'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useContabil } from '@/context/ContabilContext';
import { audioVoz } from '@/utils/audioVoz';
import { criarEscuta, suporteReconhecimento } from '@/lib/voz/reconhecimento';
import { buscarContas, decidirBusca, interpretarEscolha, ehAnalitica, normalizarVoz } from '@/lib/voz/buscaContas';
import { interpretarValorFalado, formatarValorFalado } from '@/lib/voz/parserValor';
import { detectarComandoNavegacao } from '@/lib/voz/navegacaoVoz';
import ModalConfigVoz from './ModalConfigVoz';
import {
  CONFIG_VOZ_PADRAO,
  obterConfigLocal,
  carregarConfigGlobal,
} from '@/lib/voz/configVoz';
import base from './BotaoComandoVoz.module.css';
import styles from './PassoAPassoVoz.module.css';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ORDINAIS = ['primeira', 'segunda', 'terceira'];
const PALAVRAS_CONFIRMAR = [
  'sim', 'confirma', 'confirmo', 'confirmado', 'pode', 'grava', 'gravar', 'salva', 'salvar',
  'ok', 'isso', 'correto', 'certo', 'positivo', 'beleza', 'manda', 'registra', 'registrar', 'exato',
];
const PASSOS_OUVINDO = ['DEBITO', 'CREDITO', 'VALOR', 'CONFIRMACAO', 'ESCOLHA_DEBITO', 'ESCOLHA_CREDITO'];

const pad = (n) => String(n).padStart(2, '0');

function dataIso(offsetDias = 0, diaDoMes = null) {
  const d = new Date();
  if (diaDoMes !== null) d.setDate(diaDoMes);
  else d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dataFalada(iso) {
  const [, m, d] = iso.split('-');
  return `dia ${parseInt(d, 10)} de ${MESES[parseInt(m, 10) - 1]}`;
}

function dataFormatada(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// "ontem", "anteontem", "hoje", "dia 15" -> ISO local; senão null
function interpretarData(norm) {
  if (/\banteontem\b/.test(norm)) return dataIso(-2);
  if (/\bontem\b/.test(norm)) return dataIso(-1);
  if (/\bhoje\b/.test(norm)) return dataIso(0);
  const m = norm.match(/\bdia\s+(\d{1,2})\b/);
  if (m) {
    const dia = parseInt(m[1], 10);
    if (dia >= 1 && dia <= 31) return dataIso(0, dia);
  }
  return null;
}

const dadosVazios = () => ({ debito: null, credito: null, valor: null, data: dataIso(0), historico: '' });

export default function PassoAPassoVoz({ onFechar }) {
  const router = useRouter();
  const { empresaId, empresas, refreshData } = useContabil();
  const empresaAtual = empresas?.find(e => e.id.toString() === empresaId?.toString());

  // Configurações de voz unificadas para todas as empresas (MySQL)
  const [configModalAberta, setConfigModalAberta] = useState(false);
  const [configVoz, setConfigVoz] = useState(() => obterConfigLocal());
  const configVozRef = useRef(configVoz);

  useEffect(() => {
    configVozRef.current = configVoz;
    if (escutaRef.current?.setSilencioMs && configVoz?.intervaloContasMs) {
      escutaRef.current.setSilencioMs(configVoz.intervaloContasMs);
    }
  }, [configVoz]);

  useEffect(() => {
    let cancelado = false;
    carregarConfigGlobal().then(cfg => {
      if (!cancelado && cfg) setConfigVoz(cfg);
    });
    const handler = (e) => {
      if (e.detail?.config) setConfigVoz(e.detail.config);
    };
    window.addEventListener('contabil:configVozMudou', handler);
    return () => {
      cancelado = true;
      window.removeEventListener('contabil:configVozMudou', handler);
    };
  }, []);

  const [passo, setPasso] = useState('CARREGANDO');
  const [dados, setDadosState] = useState(dadosVazios);
  const [opcoes, setOpcoes] = useState([]);
  const [transcricao, setTranscricao] = useState('');
  const [silencioContando, setSilencioContando] = useState(false);
  const [mensagem, setMensagem] = useState('Carregando contas...');
  const [aviso, setAviso] = useState('');
  const [falando, setFalando] = useState(false);
  const [totalGravados, setTotalGravados] = useState(0);
  const [textoManual, setTextoManual] = useState('');
  const [semSuporte] = useState(() => !suporteReconhecimento());

  const passoRef = useRef('CARREGANDO');
  const dadosRef = useRef(dadosVazios());
  const contasRef = useRef([]);
  const opcoesRef = useRef([]);
  const ativoRef = useRef(true);
  const falandoRef = useRef(false);
  const falaTokenRef = useRef(0);
  const voltarResumoRef = useRef(false);
  const escutaRef = useRef(null);
  const empresaIdRef = useRef(empresaId);
  const refreshRef = useRef(refreshData);
  const onFecharRef = useRef(onFechar);
  const apiRef = useRef({});

  // ---------------------------------------------------------------------
  // Utilitários de estado / fala / escuta
  // ---------------------------------------------------------------------
  const mudarPasso = (p) => {
    passoRef.current = p;
    setPasso(p);
  };

  const setDados = (parcial) => {
    dadosRef.current = { ...dadosRef.current, ...parcial };
    setDadosState(dadosRef.current);
  };

  const guardarOpcoes = (lista) => {
    opcoesRef.current = lista;
    setOpcoes(lista);
  };

  const ouvir = () => {
    if (!ativoRef.current || falandoRef.current) return;
    setTranscricao('');
    audioVoz.tocarChime('ouvir');
    if (escutaRef.current) escutaRef.current.iniciar();
  };

  const falar = (texto, depois) => {
    if (escutaRef.current) escutaRef.current.parar();
    const token = ++falaTokenRef.current;
    falandoRef.current = true;
    setFalando(true);
    setMensagem(texto);

    let terminou = false;
    const terminar = () => {
      if (terminou || token !== falaTokenRef.current) return;
      terminou = true;
      falandoRef.current = false;
      setFalando(false);
      if (!ativoRef.current) return;
      const resfriamento = configVozRef.current?.resfriamentoEcoMs || 200;
      setTimeout(() => {
        if (ativoRef.current && token === falaTokenRef.current && depois) depois();
      }, resfriamento);
    };
    audioVoz.falar(texto, {
      rate: configVozRef.current?.velocidadeFala || 1.10,
      onEnd: terminar,
      onError: terminar,
    });
  };

  const irPara = (p, fala) => {
    mudarPasso(p);
    falar(fala, ouvir);
  };

  // ---------------------------------------------------------------------
  // Fluxo: débito -> crédito -> valor -> confirmação
  // ---------------------------------------------------------------------
  const resumo = () => {
    const d = dadosRef.current;
    voltarResumoRef.current = false;
    setAviso('');
    let fala = `Débito ${d.debito.nome}. Crédito ${d.credito.nome}. ${formatarValorFalado(d.valor)}.`;
    if (d.data !== dataIso(0)) fala += ` Data ${dataFalada(d.data)}.`;
    fala += ' Confirma?';
    irPara('CONFIRMACAO', fala);
  };

  const aplicarConta = (lado, conta) => {
    guardarOpcoes([]);
    setAviso('');
    if (lado === 'DEBITO') setDados({ debito: conta });
    else setDados({ credito: conta });

    if (voltarResumoRef.current) {
      resumo();
    } else if (lado === 'DEBITO') {
      irPara('CREDITO', 'Qual o crédito?');
    } else {
      irPara('VALOR', 'Qual o valor?');
    }
  };

  const processarConta = (frase, lado) => {
    const outra = lado === 'DEBITO' ? dadosRef.current.credito : dadosRef.current.debito;
    const resultados = buscarContas(frase, contasRef.current, { excluirId: outra ? outra.id : null, limite: 3 });
    const decisao = decidirBusca(resultados);

    if (decisao.tipo === 'NENHUMA') {
      setAviso(`Não encontrei nenhuma conta para "${frase}".`);
      guardarOpcoes([]);
      irPara(lado, 'Não encontrei essa conta. Repita o nome.');
      return;
    }
    if (decisao.tipo === 'UNICA') {
      aplicarConta(lado, decisao.conta);
      return;
    }
    guardarOpcoes(decisao.opcoes);
    setAviso('');
    const lista = decisao.opcoes.map((c, i) => `${ORDINAIS[i]}, ${c.nome}`).join('. ');
    mudarPasso(lado === 'DEBITO' ? 'ESCOLHA_DEBITO' : 'ESCOLHA_CREDITO');
    falar(`Encontrei: ${lista}. Qual?`, ouvir);
  };

  const processarEscolha = (frase, lado) => {
    const lista = opcoesRef.current;
    const idx = interpretarEscolha(frase, lista.length);
    if (idx !== null) {
      aplicarConta(lado, lista[idx]);
      return;
    }
    if (/\b(nenhuma|outra|nao|repetir)\b/.test(normalizarVoz(frase))) {
      guardarOpcoes([]);
      irPara(lado, 'Ok. Repita o nome da conta.');
      return;
    }
    processarConta(frase, lado);
  };

  const processarValor = (frase) => {
    const valor = interpretarValorFalado(frase);
    if (valor === null) {
      setAviso(`Não entendi o valor "${frase}".`);
      irPara('VALOR', 'Não entendi o valor. Repita.');
      return;
    }
    setAviso('');
    setDados({ valor });
    resumo();
  };

  const processarConfirmacao = (frase) => {
    const n = normalizarVoz(frase);

    // Correção de campo: "débito mercado", "corrigir crédito", "valor 80 reais"
    const mCampo = n.match(/^(?:corrigir|corrige|mudar|muda|trocar|troca|alterar|altera)?\s*(?:o\s+|a\s+)?(debito|credito|valor)\b\s*(.*)$/);
    if (mCampo) {
      const campo = mCampo[1];
      const resto = mCampo[2].trim();
      voltarResumoRef.current = true;
      if (campo === 'valor') {
        if (resto) processarValor(resto);
        else irPara('VALOR', 'Qual o valor?');
      } else {
        const lado = campo === 'debito' ? 'DEBITO' : 'CREDITO';
        if (resto) processarConta(resto, lado);
        else irPara(lado, lado === 'DEBITO' ? 'Qual a conta de débito?' : 'Qual a conta de crédito?');
      }
      return;
    }

    // Data
    const novaData = interpretarData(n);
    if (novaData) {
      setDados({ data: novaData });
      resumo();
      return;
    }

    // Histórico: "histórico pagamento do aluguel"
    const mHist = frase.match(/hist[oó]rico\s+(.+)$/i);
    if (mHist && mHist[1].trim()) {
      setDados({ historico: mHist[1].trim() });
      setAviso('');
      falar('Histórico atualizado. Confirma?', ouvir);
      return;
    }

    const palavras = n.split(' ').filter(Boolean);

    if (/^(nao|negativo|errado|errei)$/.test(n)) {
      falar('O que corrigir? Débito, crédito ou valor?', ouvir);
      return;
    }

    if (palavras.length <= 3 && palavras.some(p => PALAVRAS_CONFIRMAR.includes(p))) {
      apiRef.current.gravar();
      return;
    }

    falar('Diga sim para gravar, ou corrija débito, crédito ou valor.', ouvir);
  };

  const gravar = async () => {
    if (escutaRef.current) escutaRef.current.parar();
    const d = dadosRef.current;
    if (!d.debito || !d.credito || !d.valor) return;

    mudarPasso('GRAVANDO');
    setMensagem('Gravando lançamento...');
    try {
      const res = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: `${d.data}T00:00:00.000Z`,
          valor: d.valor,
          historico: d.historico || `D: ${d.debito.nome} / C: ${d.credito.nome} — via voz`,
          documento: null,
          contaDebitoId: d.debito.id,
          contaCreditoId: d.credito.id,
          empresaId: parseInt(empresaIdRef.current, 10),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.erro || 'Falha ao registrar lançamento.');
      }
      if (!ativoRef.current) return;

      setTotalGravados(t => t + 1);
      audioVoz.tocarChime('sucesso');
      dadosRef.current = dadosVazios();
      setDadosState(dadosRef.current);
      setAviso('');
      const r = refreshRef.current ? refreshRef.current() : null;
      if (r && typeof r.catch === 'function') r.catch(e => console.warn('Erro ao atualizar dados:', e));
      irPara('DEBITO', 'Gravado. Conta de débito?');
    } catch (err) {
      console.error(err);
      if (!ativoRef.current) return;
      setAviso(err.message || 'Erro ao gravar.');
      audioVoz.tocarChime('erro');
      mudarPasso('CONFIRMACAO');
      falar(`Erro ao gravar. ${err.message || ''} Diga sim para tentar novamente.`, ouvir);
    }
  };

  const voltarPasso = () => {
    voltarResumoRef.current = false;
    guardarOpcoes([]);
    setAviso('');
    switch (passoRef.current) {
      case 'CREDITO':
      case 'ESCOLHA_CREDITO':
        setDados({ debito: null });
        irPara('DEBITO', 'Voltando. Conta de débito?');
        break;
      case 'VALOR':
        setDados({ credito: null });
        irPara('CREDITO', 'Voltando. Conta de crédito?');
        break;
      case 'CONFIRMACAO':
        setDados({ valor: null });
        irPara('VALOR', 'Voltando. Qual o valor?');
        break;
      default:
        falar('Já estou no primeiro passo. Conta de débito?', ouvir);
    }
  };

  const recomecar = (prefixo) => {
    voltarResumoRef.current = false;
    guardarOpcoes([]);
    setAviso('');
    dadosRef.current = dadosVazios();
    setDadosState(dadosRef.current);
    irPara('DEBITO', `${prefixo} Conta de débito?`);
  };

  const encerrar = () => {
    ativoRef.current = false;
    if (escutaRef.current) escutaRef.current.parar();
    audioVoz.pararFala();
    audioVoz.tocarChime('cancelar');
    if (onFecharRef.current) onFecharRef.current();
  };

  // Ponto de entrada de toda fala (voz ou digitada)
  const tratarFala = (frase) => {
    if (!ativoRef.current) return;
    const texto = (frase || '').trim();
    if (!texto) return;

    // Interrompe qualquer fala/escuta em andamento (ex.: texto digitado durante a fala)
    if (escutaRef.current) escutaRef.current.parar();
    falaTokenRef.current++;
    audioVoz.pararFala();
    falandoRef.current = false;
    setFalando(false);

    setTranscricao(texto);
    const n = normalizarVoz(texto);
    const atual = passoRef.current;

    if (atual === 'CARREGANDO' || atual === 'GRAVANDO') return;

    if (/^(fechar|sair|encerrar|concluir|finalizar|tchau|parar|terminar)$/.test(n)) {
      encerrar();
      return;
    }
    if (/^(cancelar|cancela|recomecar|limpar|comecar de novo|do zero)$/.test(n)) {
      recomecar('Cancelado.');
      return;
    }
    // Desfazer passo contextual: "corrigir", "voltar", "errei", "desfazer"
    if (/^(?:voltar|volta|corrigir|corrige|corrija|desfazer|desfaz|errei|errado)$/.test(n)) {
      voltarPasso();
      return;
    }

    // Ir cirurgicamente para um campo: "corrigir débito", "corrigir crédito", "corrigir valor"
    const mCampo = n.match(/^(?:corrigir|corrige|corrija|mudar|muda|trocar|troca|alterar|altera|voltar)?\s*(?:o\s+|a\s+)?(debito|credito|valor)\b/);
    if (mCampo) {
      const campo = mCampo[1];
      guardarOpcoes([]);
      setAviso('');
      if (campo === 'debito') {
        setDados({ debito: null });
        irPara('DEBITO', 'Voltando. Conta de débito?');
        return;
      }
      if (campo === 'credito') {
        setDados({ credito: null });
        irPara('CREDITO', 'Voltando. Conta de crédito?');
        return;
      }
      if (campo === 'valor') {
        setDados({ valor: null });
        irPara('VALOR', 'Voltando. Qual o valor?');
        return;
      }
    }

    // Comando de navegação rápida de telas (ex: "abrir dre", "balancete", "plano de contas")
    const comandoNav = detectarComandoNavegacao(texto);
    if (comandoNav) {
      ativoRef.current = false;
      if (escutaRef.current) escutaRef.current.parar();
      audioVoz.tocarChime('sucesso');
      setMensagem(`🧭 ${comandoNav.fala}`);
      falar(comandoNav.fala, () => {
        if (onFecharRef.current) onFecharRef.current();
        router.push(comandoNav.rota);
      });
      setTimeout(() => {
        if (onFecharRef.current) onFecharRef.current();
        router.push(comandoNav.rota);
      }, 1500);
      return;
    }

    // Atalho: se estiver no Débito e o usuário falar Débito e Crédito juntos ("débito combustíveis crédito Itaú [valor 100]")
    if (atual === 'DEBITO' && /\b(?:credito|c)\b/i.test(n)) {
      const m = n.match(/^(?:debito\s+)?(.+?)\s+(?:credito|c)\s+(.+)$/i);
      if (m) {
        const trechoDeb = m[1].trim();
        let restoCred = m[2].trim();
        const mVal = restoCred.match(/\s+(?:valor|v)\s+(.+)$/i);
        let trechoVal = '';
        if (mVal) {
          trechoVal = mVal[1].trim();
          restoCred = restoCred.slice(0, mVal.index).trim();
        }
        const resDeb = buscarContas(trechoDeb, contasRef.current, { limite: 1 });
        const debConta = resDeb[0]?.score >= 350 ? resDeb[0].conta : null;
        if (debConta) {
          const resCred = buscarContas(restoCred, contasRef.current, { excluirId: debConta.id, limite: 1 });
          const credConta = resCred[0]?.score >= 350 ? resCred[0].conta : null;
          let val = trechoVal ? interpretarValorFalado(trechoVal) : null;
          if (!val) {
            val = interpretarValorFalado(restoCred);
          }
          if (credConta) {
            setDados({ debito: debConta, credito: credConta, valor: val || null });
            if (val) {
              resumo();
              return;
            } else {
              irPara('VALOR', 'Qual o valor?');
              return;
            }
          }
        }
      }
    }

    switch (atual) {
      case 'DEBITO': processarConta(texto, 'DEBITO'); break;
      case 'CREDITO': processarConta(texto, 'CREDITO'); break;
      case 'ESCOLHA_DEBITO': processarEscolha(texto, 'DEBITO'); break;
      case 'ESCOLHA_CREDITO': processarEscolha(texto, 'CREDITO'); break;
      case 'VALOR': processarValor(texto); break;
      case 'CONFIRMACAO': processarConfirmacao(texto); break;
      default: break;
    }
  };

  const erroEscuta = (tipo) => {
    if (tipo === 'permissao') {
      setAviso('Permissão de microfone negada. Libere o microfone ou digite abaixo.');
    } else if (tipo === 'sem-suporte') {
      setAviso('Este navegador não suporta reconhecimento de voz. Use Chrome ou Edge, ou digite abaixo.');
    } else if (tipo === 'rede') {
      setAviso('Reconectando microfone...');
    }
  };

  // Mantém as funções mais recentes acessíveis aos callbacks assíncronos
  useEffect(() => {
    apiRef.current = { tratarFala, erroEscuta, gravar };
    empresaIdRef.current = empresaId;
    refreshRef.current = refreshData;
    onFecharRef.current = onFechar;
  });

  // Inicialização: cria a escuta e carrega as contas da empresa
  useEffect(() => {
    ativoRef.current = true;
    const silencioAtual = configVozRef.current?.intervaloContasMs || 1200;
    escutaRef.current = criarEscuta({
      onFala: (t) => apiRef.current.tratarFala(t),
      onInterim: (t) => setTranscricao(t),
      onErro: (e) => apiRef.current.erroEscuta(e),
      onSilencioContando: (s) => setSilencioContando(s),
      silencioMs: () => configVozRef.current?.intervaloContasMs || 1200,
    });

    if (!empresaId) {
      setAviso('Selecione uma empresa ativa antes de lançar por voz.');
      return undefined;
    }

    let cancelado = false;
    fetch(`/api/contas?empresaId=${empresaId}`)
      .then(res => res.json())
      .then(lista => {
        if (cancelado || !ativoRef.current) return;
        const analiticas = Array.isArray(lista) ? lista.filter(ehAnalitica) : [];
        contasRef.current = analiticas;
        if (analiticas.length === 0) {
          setAviso('Nenhuma conta analítica cadastrada para esta empresa.');
          setMensagem('Sem contas para lançar.');
          return;
        }
        irPara('DEBITO', 'Passo a passo. Conta de débito?');
      })
      .catch(() => {
        if (!cancelado) setAviso('Erro ao carregar as contas da empresa.');
      });

    return () => {
      cancelado = true;
      ativoRef.current = false;
      if (escutaRef.current) escutaRef.current.parar();
      audioVoz.pararFala();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  // Teclas de atalho (ESC para fechar, Enter para enviar fala imediatamente)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        encerrar();
      } else if (e.key === 'Enter') {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
        if (passoRef.current === 'CONFIRMACAO') {
          e.preventDefault();
          apiRef.current.gravar();
          return;
        }
        if (escutaRef.current?.estaAtiva()) {
          const enviado = escutaRef.current.enviarAgora();
          if (enviado) e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------------------------------------------------------------------
  // Interface
  // ---------------------------------------------------------------------
  const ouvindoAgora = !falando && PASSOS_OUVINDO.includes(passo);
  const passoBase = passo.replace('ESCOLHA_', '');
  const gravando = passo === 'GRAVANDO';

  const titulo = (() => {
    if (falando) return 'Falando...';
    if (silencioContando) return 'Ouvindo... (aguardando silêncio ou tecle Enter)';
    switch (passo) {
      case 'CARREGANDO': return 'Carregando contas...';
      case 'DEBITO': return 'Diga a conta de débito';
      case 'CREDITO': return 'Diga a conta de crédito';
      case 'ESCOLHA_DEBITO':
      case 'ESCOLHA_CREDITO': return 'Escolha: primeira, segunda ou terceira';
      case 'VALOR': return 'Diga o valor';
      case 'CONFIRMACAO': return 'Diga "Sim" para gravar';
      case 'GRAVANDO': return 'Gravando lançamento...';
      default: return '';
    }
  })();

  const classeStep = (id, preenchido) =>
    `${styles.step} ${passoBase === id ? styles.stepAtivo : ''} ${preenchido ? styles.stepOk : ''}`;

  const escolherPorClique = (conta) => {
    tratarFala(`${ORDINAIS[opcoes.indexOf(conta)]}`);
  };

  const enviarManual = (e) => {
    e.preventDefault();
    if (!textoManual.trim()) return;
    const t = textoManual;
    setTextoManual('');
    tratarFala(t);
  };

  return (
    <div
      className={base.floatingOverlay}
      onClick={(e) => { if (e.target === e.currentTarget && !gravando) encerrar(); }}
    >
      <div className={base.copilotCard} id="passo-a-passo-voz">
        <div className={base.cardHeader}>
          <div className={base.headerBrand}>
            <div className={base.statusIndicator}>
              <div className={`${base.statusDot} ${ouvindoAgora ? base.statusDotListening : ''} ${falando ? base.statusDotSpeaking : ''}`} />
              <span className={base.statusTitle}>{titulo}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {totalGravados > 0 && (
              <span className={base.badgeGravados}>✓ {totalGravados} gravado{totalGravados > 1 ? 's' : ''}</span>
            )}
            <span className={base.badgeModo}>Passo a passo</span>
            <button
              type="button"
              className={base.btnAjustesCard}
              onClick={() => setConfigModalAberta(true)}
              title="Ajustes de velocidade da empresa (MySQL)"
            >
              ⚙️
            </button>
            <button
              type="button"
              className={base.btnCloseCard}
              onClick={encerrar}
              disabled={gravando}
              title="Concluir / Fechar (Esc)"
            >
              &times;
            </button>
          </div>
        </div>

        <div className={styles.stepper}>
          <div className={classeStep('DEBITO', !!dados.debito)}>
            <span className={styles.stepLabel}>1 · Débito</span>
            <span className={styles.stepValor} title={dados.debito?.nome}>{dados.debito ? dados.debito.nome : '—'}</span>
          </div>
          <div className={classeStep('CREDITO', !!dados.credito)}>
            <span className={styles.stepLabel}>2 · Crédito</span>
            <span className={styles.stepValor} title={dados.credito?.nome}>{dados.credito ? dados.credito.nome : '—'}</span>
          </div>
          <div className={classeStep('VALOR', dados.valor !== null)}>
            <span className={styles.stepLabel}>3 · Valor</span>
            <span className={styles.stepValor}>
              {dados.valor !== null ? `R$ ${Number(dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </span>
          </div>
        </div>

        <div className={base.visualizerArea}>
          <div className={base.orbContainer}>
            <div className={base.pulseRing} />
            <div className={`${base.pulseRing} ${base.pulseRingDelay}`} />
            <div className={`${base.copilotOrb} ${ouvindoAgora ? base.orbListening : ''} ${gravando || passo === 'CARREGANDO' ? base.orbProcessing : ''} ${falando ? base.orbSpeaking : ''}`}>
              {ouvindoAgora && '🎙️'}
              {falando && '🔊'}
              {gravando && '💾'}
              {passo === 'CARREGANDO' && '✨'}
            </div>
          </div>
          <div className={`${base.soundWaves} ${ouvindoAgora ? base.soundWavesListening : ''} ${falando ? base.soundWavesSpeaking : ''}`}>
            {[0, 1, 2, 3, 4, 5, 6].map(i => <div key={i} className={base.soundBar} />)}
          </div>
        </div>

        <div className={base.dialogueBox}>
          {transcricao && (
            <div className={base.userSpeechBubble}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div className={base.speechLabel}><span>🗣️ Você falou:</span></div>
                {ouvindoAgora && (
                  <button
                    type="button"
                    onClick={() => escutaRef.current?.enviarAgora()}
                    className={styles.btnEnviarAgora}
                    title="Enviar agora imediatamente sem esperar o silêncio (Enter)"
                  >
                    ⚡ Enviar agora <kbd className={styles.kbd}>Enter</kbd>
                  </button>
                )}
              </div>
              <div className={base.userSpeechText}>&ldquo;{transcricao}&rdquo;</div>
            </div>
          )}

          {mensagem && (
            <div className={base.assistantSpeechBubble}>
              <div className={base.speechLabel} style={{ color: '#c084fc' }}><span>🤖 Copilot:</span></div>
              <div className={base.assistantSpeechText}>{mensagem}</div>
            </div>
          )}

          {opcoes.length > 0 && (passo === 'ESCOLHA_DEBITO' || passo === 'ESCOLHA_CREDITO') && (
            <div className={styles.opcoes}>
              {opcoes.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.opcaoBtn}
                  onClick={() => escolherPorClique(c)}
                  id={`opcao-conta-${i + 1}`}
                >
                  <span className={styles.opcaoNum}>{i + 1}</span>
                  <span className={styles.opcaoNome}>{c.nome}</span>
                  <span className={styles.opcaoCodigo}>{c.codigo}</span>
                </button>
              ))}
            </div>
          )}

          {passo === 'CONFIRMACAO' && (
            <div className={styles.metaLinha}>
              <span>📅 {dataFormatada(dados.data)}</span>
              {dados.historico && <span title={dados.historico}>📝 {dados.historico}</span>}
            </div>
          )}

          {aviso && <div className={styles.aviso}>{aviso}</div>}
        </div>

        <form onSubmit={enviarManual} className={base.manualForm}>
          <input
            type="text"
            id="passo-a-passo-texto"
            className={base.manualInput}
            placeholder={semSuporte ? 'Digite a resposta (sem microfone neste navegador)...' : 'Ou digite a resposta e tecle Enter...'}
            value={textoManual}
            onChange={(e) => setTextoManual(e.target.value)}
            disabled={gravando || passo === 'CARREGANDO'}
          />
          <button type="submit" className={base.btnPrimaryAction} disabled={gravando || !textoManual.trim()}>
            Enviar
          </button>
        </form>

        <div className={base.voiceHints}>
          {(passo === 'DEBITO' || passo === 'CREDITO') && (
            <>
              <span>💡 Fale o nome, o apelido ou</span>
              <span className={base.hintTag}>&ldquo;reduzido 45&rdquo;</span>
            </>
          )}
          {passo === 'VALOR' && (
            <>
              <span>🗣️ Ex:</span>
              <span className={base.hintTag}>&ldquo;mil e duzentos reais e cinquenta centavos&rdquo;</span>
            </>
          )}
          {passo === 'CONFIRMACAO' && (
            <>
              <span className={base.hintTag}>&ldquo;Sim&rdquo;</span>
              <span className={base.hintTag}>&ldquo;débito/crédito/valor&rdquo;</span>
              <span className={base.hintTag}>&ldquo;data ontem&rdquo;</span>
              <span className={base.hintTag}>&ldquo;histórico …&rdquo;</span>
            </>
          )}
          {(passo === 'ESCOLHA_DEBITO' || passo === 'ESCOLHA_CREDITO') && (
            <span>🗣️ Diga &ldquo;primeira&rdquo;, &ldquo;segunda&rdquo; ou repita o nome. &ldquo;Voltar&rdquo; e &ldquo;Cancelar&rdquo; também funcionam.</span>
          )}
        </div>

        <div className={base.actionFooter}>
          <button type="button" className={base.btnSecondary} onClick={encerrar} disabled={gravando}>
            {totalGravados > 0 ? `✓ Concluir (${totalGravados} gravado${totalGravados > 1 ? 's' : ''})` : 'Cancelar'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['CREDITO', 'ESCOLHA_CREDITO', 'VALOR', 'CONFIRMACAO'].includes(passo) && (
              <button type="button" className={base.btnSecondary} onClick={() => tratarFala('voltar')}>
                ← Voltar
              </button>
            )}
            {passo === 'CONFIRMACAO' && (
              <button type="button" className={base.btnPrimaryAction} onClick={() => apiRef.current.gravar()} id="passo-a-passo-gravar">
                ✓ Confirmar e Gravar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Configurações de Voz para Todas as Empresas (MySQL) */}
      <ModalConfigVoz
        aberta={configModalAberta}
        onFechar={() => setConfigModalAberta(false)}
        onSalvo={(nova) => setConfigVoz(nova)}
      />
    </div>
  );
}
