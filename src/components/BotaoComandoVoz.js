'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useContabil } from '@/context/ContabilContext';
import { audioVoz } from '@/utils/audioVoz';
import { detectarComandoNavegacao } from '@/lib/voz/navegacaoVoz';
import { criarEscutaWakeWord } from '@/lib/voz/wakeWord';
import styles from './BotaoComandoVoz.module.css';
import estilosModo from './PassoAPassoVoz.module.css';
import PassoAPassoVoz from './PassoAPassoVoz';
import ModalConfigVoz from './ModalConfigVoz';
import {
  CONFIG_VOZ_PADRAO,
  obterConfigLocal,
  carregarConfigGlobal,
} from '@/lib/voz/configVoz';

// Helper para calcular o próximo código analítico sob uma conta pai
function calcularProximoCodigoFilho(codigoPai, todasContas) {
  const filhas = todasContas.filter(c => c.codigo.startsWith(codigoPai + '.'));
  if (filhas.length === 0) {
    return `${codigoPai}.001`;
  }
  let maxNum = 0;
  let padLen = 3;
  filhas.forEach(f => {
    const parts = f.codigo.split('.');
    const last = parts[parts.length - 1];
    const n = parseInt(last, 10);
    if (!isNaN(n)) {
      if (n > maxNum) maxNum = n;
      padLen = Math.max(padLen, last.length);
    }
  });
  const proximo = String(maxNum + 1).padStart(padLen, '0');
  return `${codigoPai}.${proximo}`;
}

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const PALAVRAS_CONFIRMAR = [
  'sim', 'pode', 'grava', 'gravar', 'gravado',
  'salva', 'salvar', 'positivo', 'ok', 'beleza', 'com certeza', 'manda ver',
  'manda', 'isso', 'correto', 'exato', 'perfeito', 'registra', 'registrar', 'executa'
];

export default function BotaoComandoVoz() {
  const router = useRouter();
  const { empresaId, empresas, refreshData } = useContabil();
  const empresaAtual = empresas?.find(e => e.id.toString() === empresaId?.toString());

  // Configurações de voz unificadas (MySQL para todas as empresas)
  const [configModalAberta, setConfigModalAberta] = useState(false);
  const [configVoz, setConfigVoz] = useState(() => obterConfigLocal());
  const configVozRef = useRef(configVoz);

  useEffect(() => {
    configVozRef.current = configVoz;
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

  // Estados principais da máquina de voz
  // 'INATIVO' | 'OUVINDO_COMANDO' | 'PROCESSANDO' | 'FALANDO_PROPOSTA' | 'OUVINDO_CONFIRMACAO' | 'OUVINDO_COMPLEMENTO' | 'GRAVANDO' | 'SUCESSO' | 'CANCELADO' | 'ERRO'
  const [estado, setEstado] = useState('INATIVO');
  const [transcricao, setTranscricao] = useState('');
  const [resultadoIA, setResultadoIA] = useState(null);
  const [mensagemAssistente, setMensagemAssistente] = useState('');
  const [aviso, setAviso] = useState('');
  const [silencioContando, setSilencioContando] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [textoManual, setTextoManual] = useState('');
  const [contasEmpresa, setContasEmpresa] = useState([]);
  const [totalGravados, setTotalGravados] = useState(0);

  // Modo de lançamento por voz: 'LIVRE' (frase livre, IA) ou 'PASSO' (débito → crédito → valor)
  const [modoVoz, setModoVoz] = useState('LIVRE');
  const [passoAberto, setPassoAberto] = useState(false);

  // Palavra-chave de ativação por voz ("Contábil") em segundo plano
  const [wakeWordHabilitada, setWakeWordHabilitada] = useState(true);

  useEffect(() => {
    try {
      const salvo = window.localStorage.getItem('contabil:modoVoz');
      if (salvo === 'PASSO' || salvo === 'LIVRE') setModoVoz(salvo);
      const salvoWake = window.localStorage.getItem('contabil:wakeWordHabilitada');
      if (salvoWake !== null) setWakeWordHabilitada(salvoWake === 'true');
    } catch (e) { /* localStorage indisponível */ }
  }, []);

  const trocarModo = (novo) => {
    setModoVoz(novo);
    try { window.localStorage.setItem('contabil:modoVoz', novo); } catch (e) { /* ignora */ }
  };

  const alternarWakeWord = () => {
    setWakeWordHabilitada(prev => {
      const novo = !prev;
      try { window.localStorage.setItem('contabil:wakeWordHabilitada', String(novo)); } catch (e) {}
      return novo;
    });
  };

  // Refs de controle de ciclo de vida e estabilização de áudio
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const disparoImediatoRef = useRef(null);
  const estadoRef = useRef(estado);
  const transcricaoRef = useRef('');
  const resultadoIARef = useRef(null);
  const ativoRef = useRef(false);
  const falandoAssistenteRef = useRef(false);
  const recStateRef = useRef({
    isListening: false,
    isStarting: false,
    consecutiveErrors: 0,
    restartTimer: null,
  });
  const turnStartIndexRef = useRef(0);

  // Refs de callbacks para evitar dependências circulares e closures obsoletas
  const iniciarEscutaRef = useRef(null);
  const pararEscutaRef = useRef(null);
  const falarEContinuarRef = useRef(null);
  const processarTextoComIARef = useRef(null);
  const executarGravacaoFinalRef = useRef(null);
  const cancelarPorVozRef = useRef(null);
  const prepararProximoTurnoRef = useRef(null);
  const executarNavegacaoRef = useRef(null);
  const wakeWordListenerRef = useRef(null);
  const abrirCopilotRef = useRef(null);

  // Carregar lista de contas da empresa para cálculos analíticos
  useEffect(() => {
    if (!empresaId) return;
    fetch(`/api/contas?empresaId=${empresaId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setContasEmpresa(data);
      })
      .catch(err => console.warn('Erro ao pré-carregar contas:', err));
  }, [empresaId]);

  // Parar qualquer escuta de microfone de forma limpa e silenciosa
  const pararEscuta = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    disparoImediatoRef.current = null;
    setSilencioContando(false);
    clearTimeout(recStateRef.current.restartTimer);
    recStateRef.current.isListening = false;
    recStateRef.current.isStarting = false;
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch (e) {
        try { rec.abort(); } catch (e2) {}
      }
    }
  }, []);

  // Fechar e resetar tudo com desconexão limpa do microfone e áudio
  const fecharCopilot = useCallback(() => {
    ativoRef.current = false;
    falandoAssistenteRef.current = false;
    pararEscuta();
    audioVoz.pararFala();
    setEstado('INATIVO');
    setTranscricao('');
    transcricaoRef.current = '';
    setResultadoIA(null);
    resultadoIARef.current = null;
    setMensagemAssistente('');
    setAviso('');
    setModoManual(false);
    setTextoManual('');
    setSilencioContando(false);
    setTotalGravados(0);
  }, [pararEscuta]);

  // Cancelar ou Concluir lançamento por voz
  const cancelarPorVoz = useCallback(() => {
    pararEscuta();
    setEstado('CANCELADO');
    setMensagemAssistente(totalGravados > 0 ? 'Concluído!' : 'Cancelado.');
    audioVoz.tocarChime('cancelar');
    falandoAssistenteRef.current = true;
    audioVoz.falar(totalGravados > 0 ? 'Concluído com sucesso.' : 'Cancelado.', {
      onEnd: () => {
        falandoAssistenteRef.current = false;
        setTimeout(fecharCopilot, 200);
      },
      onError: () => {
        falandoAssistenteRef.current = false;
        setTimeout(fecharCopilot, 200);
      }
    });
    setTimeout(fecharCopilot, 1200);
  }, [totalGravados, fecharCopilot, pararEscuta]);

  // Navegação rápida de telas por comando de voz (DRE, Balancete, Balanço, etc.)
  const executarNavegacao = useCallback((nav) => {
    pararEscuta();
    falandoAssistenteRef.current = true;
    setEstado('FALANDO_PROPOSTA');
    setMensagemAssistente(`🧭 ${nav.fala}`);
    audioVoz.tocarChime('sucesso');
    let navegou = false;
    const ir = () => {
      if (navegou) return;
      navegou = true;
      falandoAssistenteRef.current = false;
      fecharCopilot();
      router.push(nav.rota);
    };

    audioVoz.falar(nav.fala, {
      onEnd: ir,
      onError: ir
    });
    setTimeout(ir, 1500);
  }, [fecharCopilot, pararEscuta, router]);

  // Inicializar sessão de escuta limpa para o turno atual
  const iniciarEscuta = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!ativoRef.current) return;
    if (falandoAssistenteRef.current) return;
    if (recStateRef.current.isListening || recStateRef.current.isStarting) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setModoManual(true);
      setAviso('Navegador sem suporte a microfone nativo. Digite abaixo:');
      return;
    }

    recStateRef.current.isStarting = true;

    // Encerrar instância anterior suavemente
    if (recognitionRef.current) {
      const oldRec = recognitionRef.current;
      recognitionRef.current = null;
      oldRec.onstart = null;
      oldRec.onresult = null;
      oldRec.onerror = null;
      oldRec.onend = null;
      try { oldRec.stop(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      recStateRef.current.isListening = true;
      recStateRef.current.isStarting = false;
      recStateRef.current.consecutiveErrors = 0;
      turnStartIndexRef.current = 0;
      setAviso('');
    };

    recognition.onresult = (event) => {
      // Se o assistente estiver falando, descarta captura
      if (falandoAssistenteRef.current) return;

      if (recognitionRef.current) {
        recognitionRef.current._lastResultCount = event.results.length;
      }

      // Lê ESTRITAMENTE a fala do turno atual (evita acumular frases anteriores)
      let textoCompleto = '';
      const startIdx = Math.min(turnStartIndexRef.current, event.results.length);
      for (let i = startIdx; i < event.results.length; i++) {
        if (event.results[i] && event.results[i][0]) {
          textoCompleto += event.results[i][0].transcript + ' ';
        }
      }

      const falaAtual = textoCompleto.trim();
      const falaNorm = normalizarTexto(falaAtual);
      if (!falaAtual) return;

      setTranscricao(falaAtual);

      const agendar = (ms, fn) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        disparoImediatoRef.current = fn;
        setSilencioContando(true);
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          disparoImediatoRef.current = null;
          setSilencioContando(false);
          fn();
        }, ms);
      };

      // Comandos de saída
      if (['fechar', 'fechar copilot', 'sair', 'concluir', 'encerrar', 'finalizar', 'parar', 'tchau'].includes(falaNorm.replace(/[.!?]/g, ''))) {
        if (cancelarPorVozRef.current) cancelarPorVozRef.current();
        return;
      }

      // CASO 1: Etapa de confirmação
      if (estadoRef.current === 'OUVINDO_CONFIRMACAO') {
        const falaLimpa = falaNorm.replace(/[.,!?]/g, '').trim();
        const palavras = falaLimpa.split(/\s+/).filter(Boolean);
        const temNegacaoOuMudanca = /\b(?:nao|errad\w*|incorret\w*|mud\w*|troc\w*|alter\w*|corrig\w*|cancel\w*|coloc\w*|poe|põe|bot\w*|foi|era|outr\w*|debito|credito|cartao|caixa|dinheiro|valor|reais)\b/i.test(falaLimpa);

        // 1.1 Confirmação direta ("Sim", "Pode", "Gravar", "Ok", etc.)
        const ehConfirmacao = !temNegacaoOuMudanca && palavras.length <= 3 &&
          PALAVRAS_CONFIRMAR.some(p => falaLimpa === p || palavras.includes(p));

        if (ehConfirmacao) {
          agendar(600, () => {
            if (estadoRef.current !== 'OUVINDO_CONFIRMACAO') return;
            pararEscuta();
            if (executarGravacaoFinalRef.current) executarGravacaoFinalRef.current();
          });
          return;
        }

        // 1.2 "Não" sozinho
        if (falaLimpa === 'nao') {
          agendar(900, () => {
            if (estadoRef.current !== 'OUVINDO_CONFIRMACAO') return;
            pararEscuta();
            if (falarEContinuarRef.current) {
              falarEContinuarRef.current('O que deseja mudar?', 'OUVINDO_CONFIRMACAO');
            }
          });
          return;
        }

        // 1.3 Comandos diretos de correção contextual: "corrigir", "voltar", "errei", "corrigir crédito", etc.
        const ehVoltarSimples = /^(?:corrigir|corrige|corrija|voltar|volta|volte|errei|errado|desfazer|desfaz)$/i.test(falaLimpa);
        const ehCorrigirValor = /^(?:corrigir|corrige|mudar|muda|trocar|troca|alterar|altera|voltar)?\s*(?:o\s+|a\s+)?valor\b/i.test(falaLimpa);
        if (ehVoltarSimples || ehCorrigirValor) {
          agendar(400, () => {
            if (estadoRef.current !== 'OUVINDO_CONFIRMACAO') return;
            pararEscuta();
            if (resultadoIARef.current?.interpretacao) {
              resultadoIARef.current.interpretacao.valor = 0;
              resultadoIARef.current.interpretacao.dadosFaltantes = 'VALOR';
              setResultadoIA({ ...resultadoIARef.current });
            }
            if (falarEContinuarRef.current) {
              falarEContinuarRef.current('Voltando. Qual o valor?', 'OUVINDO_COMPLEMENTO');
            }
          });
          return;
        }

        const ehCorrigirCredito = /^(?:corrigir|corrige|mudar|muda|trocar|troca|alterar|altera|voltar)?\s*(?:o\s+|a\s+)?credito\b/i.test(falaLimpa);
        if (ehCorrigirCredito) {
          agendar(400, () => {
            if (estadoRef.current !== 'OUVINDO_CONFIRMACAO') return;
            pararEscuta();
            if (resultadoIARef.current?.interpretacao) {
              resultadoIARef.current.interpretacao.contaCredito = null;
              resultadoIARef.current.interpretacao.valor = 0;
              resultadoIARef.current.interpretacao.dadosFaltantes = 'CREDITO_E_VALOR';
              setResultadoIA({ ...resultadoIARef.current });
            }
            if (falarEContinuarRef.current) {
              falarEContinuarRef.current('Voltando. Qual a conta de crédito ou meio de pagamento?', 'OUVINDO_COMPLEMENTO_CREDITO');
            }
          });
          return;
        }

        const ehCorrigirDebito = /^(?:corrigir|corrige|mudar|muda|trocar|troca|alterar|altera|voltar)?\s*(?:o\s+|a\s+)?debito\b/i.test(falaLimpa);
        const ehRecomecar = /^(?:recomecar|recomeca|limpar|limpa|cancelar|cancela|do zero|comecar de novo)$/i.test(falaLimpa);
        if (ehCorrigirDebito || ehRecomecar) {
          agendar(400, () => {
            if (estadoRef.current !== 'OUVINDO_CONFIRMACAO') return;
            pararEscuta();
            setResultadoIA(null);
            resultadoIARef.current = null;
            if (falarEContinuarRef.current) {
              falarEContinuarRef.current('Voltando ao início. Qual a conta de débito?', 'OUVINDO_COMANDO');
            }
          });
          return;
        }

        // 1.4 Frase de correção com IA (ex: "muda para alimentação", "não, no cartão Nubank", "foi 60 reais", etc.)
        const silencioCorrecao = configVozRef.current?.intervaloGeralMs || 1800;
        agendar(silencioCorrecao, () => {
          if (estadoRef.current !== 'OUVINDO_CONFIRMACAO') return;
          pararEscuta();
          if (processarTextoComIARef.current) {
            processarTextoComIARef.current(falaAtual, resultadoIARef.current?.interpretacao || null);
          }
        });
        return;
      }

      // CASO 2: Complemento de valor faltante
      if (estadoRef.current === 'OUVINDO_COMPLEMENTO') {
        const falaLimpa = falaNorm.replace(/[.,!?]/g, '').trim();

        // Se disser "corrigir", "voltar" ou "corrigir crédito" -> volta para pedir a conta de crédito
        const ehVoltarSimples = /^(?:corrigir|corrige|corrija|voltar|volta|volte|errei|errado|desfazer|desfaz)$/i.test(falaLimpa);
        const ehCorrigirCredito = /^(?:corrigir|corrige|mudar|muda|trocar|troca|alterar|altera|voltar)?\s*(?:o\s+|a\s+)?credito\b/i.test(falaLimpa);
        if (ehVoltarSimples || ehCorrigirCredito) {
          agendar(400, () => {
            if (estadoRef.current !== 'OUVINDO_COMPLEMENTO') return;
            pararEscuta();
            if (resultadoIARef.current?.interpretacao) {
              resultadoIARef.current.interpretacao.contaCredito = null;
              resultadoIARef.current.interpretacao.dadosFaltantes = 'CREDITO_E_VALOR';
              setResultadoIA({ ...resultadoIARef.current });
            }
            if (falarEContinuarRef.current) {
              falarEContinuarRef.current('Voltando. Qual a conta de crédito ou meio de pagamento?', 'OUVINDO_COMPLEMENTO_CREDITO');
            }
          });
          return;
        }

        // Se disser "corrigir débito" ou "recomeçar" -> volta para o início
        const ehCorrigirDebito = /^(?:corrigir|corrige|mudar|muda|trocar|troca|alterar|altera|voltar)?\s*(?:o\s+|a\s+)?debito\b/i.test(falaLimpa);
        const ehRecomecar = /^(?:recomecar|recomeca|limpar|limpa|cancelar|cancela|do zero|comecar de novo)$/i.test(falaLimpa);
        if (ehCorrigirDebito || ehRecomecar) {
          agendar(400, () => {
            if (estadoRef.current !== 'OUVINDO_COMPLEMENTO') return;
            pararEscuta();
            setResultadoIA(null);
            resultadoIARef.current = null;
            if (falarEContinuarRef.current) {
              falarEContinuarRef.current('Voltando ao início. Qual a conta de débito?', 'OUVINDO_COMANDO');
            }
          });
          return;
        }

        const silencioValor = configVozRef.current?.intervaloContasMs || 1200;
        agendar(silencioValor, () => {
          if (estadoRef.current !== 'OUVINDO_COMPLEMENTO') return;
          pararEscuta();
          const comandoCompleto = `valor ${falaAtual}`;
          if (processarTextoComIARef.current) {
            processarTextoComIARef.current(comandoCompleto, resultadoIARef.current?.interpretacao || null);
          }
        });
        return;
      }

      // CASO 2.1: Complemento de conta de crédito faltante (meio de pagamento)
      if (estadoRef.current === 'OUVINDO_COMPLEMENTO_CREDITO') {
        const falaLimpa = falaNorm.replace(/[.,!?]/g, '').trim();

        // Se disser "corrigir", "voltar", "errei", "corrigir débito" ou "recomeçar" -> volta para o Débito
        const ehVoltarSimples = /^(?:corrigir|corrige|corrija|voltar|volta|volte|errei|errado|desfazer|desfaz)$/i.test(falaLimpa);
        const ehCorrigirDebito = /^(?:corrigir|corrige|mudar|muda|trocar|troca|alterar|altera|voltar)?\s*(?:o\s+|a\s+)?debito\b/i.test(falaLimpa);
        const ehRecomecar = /^(?:recomecar|recomeca|limpar|limpa|cancelar|cancela|do zero|comecar de novo)$/i.test(falaLimpa);

        if (ehVoltarSimples || ehCorrigirDebito || ehRecomecar) {
          agendar(350, () => {
            if (estadoRef.current !== 'OUVINDO_COMPLEMENTO_CREDITO') return;
            pararEscuta();
            setResultadoIA(null);
            resultadoIARef.current = null;
            if (falarEContinuarRef.current) {
              falarEContinuarRef.current('Voltando. Qual a conta de débito ou despesa?', 'OUVINDO_COMANDO');
            }
          });
          return;
        }

        const silencioContas = configVozRef.current?.intervaloContasMs || 1200;
        const silencioGeral = configVozRef.current?.intervaloGeralMs || 1800;

        agendar(silencioContas, () => {
          if (estadoRef.current !== 'OUVINDO_COMPLEMENTO_CREDITO') return;
          pararEscuta();
          if (processarTextoComIARef.current) {
            processarTextoComIARef.current(falaAtual, resultadoIARef.current?.interpretacao || null);
          }
        });
        return;
      }

      // CASO 3: Comando inicial do lançamento ou navegação rápida
      if (estadoRef.current === 'OUVINDO_COMANDO') {
        // 3.0 Detectar comando de navegação rápida de telas (ex: "abrir dre", "balancete", "plano de contas")
        const comandoNav = detectarComandoNavegacao(falaAtual);
        if (comandoNav) {
          agendar(450, () => {
            if (estadoRef.current !== 'OUVINDO_COMANDO') return;
            pararEscuta();
            if (executarNavegacaoRef.current) {
              executarNavegacaoRef.current(comandoNav);
            }
          });
          return;
        }

        const palavras = falaAtual.split(/\s+/).filter(Boolean);
        if (falaAtual.trim().length < 2) {
          // Apenas um ruído acústico de 1 caractere, não agenda nada ainda
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
          setSilencioContando(false);
          return;
        }

        // Se for comando estruturado (débito + crédito + valor): resposta ultra-rápida!
        const temDebitoECredito = /\b(?:debito|d)\b/i.test(falaAtual) && /\b(?:credito|c)\b/i.test(falaAtual);
        const temValorDetectado = /\b\d+(?:[.,]\d+)?\b/i.test(falaAtual) ||
          /\b(?:reais|real|conto|cem|mil|cento|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|dez|quinze|duzentos|quinhentos)\b/i.test(falaAtual);

        const silencioContas = configVozRef.current?.intervaloContasMs || 1200;
        const silencioGeral = configVozRef.current?.intervaloGeralMs || 1800;

        let tempoSilencio = silencioGeral;
        if (temDebitoECredito && temValorDetectado) {
          tempoSilencio = Math.min(silencioContas, 900);
        } else if (!temValorDetectado && palavras.length <= 4) {
          tempoSilencio = silencioContas;
        }

        agendar(tempoSilencio, () => {
          if (estadoRef.current !== 'OUVINDO_COMANDO') return;
          pararEscuta();
          if (processarTextoComIARef.current) {
            processarTextoComIARef.current(falaAtual);
          }
        });
      }
    };

    recognition.onerror = (event) => {
      console.warn('SpeechRecognition erro:', event.error);
      if (event.error === 'not-allowed') {
        setAviso('Permissão de microfone negada no navegador.');
        setModoManual(true);
        setEstado('ERRO');
        return;
      }
      if (event.error === 'network') {
        recStateRef.current.consecutiveErrors++;
        const esperaMs = Math.min(2500, 800 * recStateRef.current.consecutiveErrors);
        setAviso('Reconectando microfone...');
        clearTimeout(recStateRef.current.restartTimer);
        recStateRef.current.restartTimer = setTimeout(() => {
          if (ativoRef.current && !falandoAssistenteRef.current) {
            if (iniciarEscutaRef.current) iniciarEscutaRef.current();
          }
        }, esperaMs);
        return;
      }
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }
    };

    recognition.onend = () => {
      recStateRef.current.isListening = false;
      recStateRef.current.isStarting = false;
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      // Se a sessão encerrou naturalmente e o usuário ainda está ouvindo, reabre suavemente
      if (ativoRef.current && !falandoAssistenteRef.current) {
        if (['OUVINDO_COMANDO', 'OUVINDO_CONFIRMACAO', 'OUVINDO_COMPLEMENTO', 'OUVINDO_COMPLEMENTO_CREDITO'].includes(estadoRef.current)) {
          clearTimeout(recStateRef.current.restartTimer);
          recStateRef.current.restartTimer = setTimeout(() => {
            if (ativoRef.current && !falandoAssistenteRef.current && !recStateRef.current.isListening) {
              if (iniciarEscutaRef.current) iniciarEscutaRef.current();
            }
          }, 250);
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      recStateRef.current.isStarting = false;
      console.warn('Erro ao disparar microfone:', e);
    }
  }, [pararEscuta]);

  // Falar resposta mantendo microfone desligado e reabrindo para escuta apenas ao terminar
  const falarEContinuar = useCallback((textoParaFalar, proximoEstado) => {
    pararEscuta();
    falandoAssistenteRef.current = true;
    setMensagemAssistente(textoParaFalar);
    setEstado('FALANDO_PROPOSTA');

    const rateAtual = configVozRef.current?.velocidadeFala || 1.10;
    const resfriamento = configVozRef.current?.resfriamentoEcoMs || 200;

    audioVoz.falar(textoParaFalar, {
      rate: rateAtual,
      onEnd: () => {
        falandoAssistenteRef.current = false;
        if (ativoRef.current) {
          setEstado(proximoEstado);
          setTranscricao('');
          transcricaoRef.current = '';
          // Resfriamento acústico dinâmico da empresa para evitar eco dos alto-falantes no microfone
          setTimeout(() => {
            if (ativoRef.current && !falandoAssistenteRef.current) {
              audioVoz.tocarChime('ouvir');
              if (iniciarEscutaRef.current) iniciarEscutaRef.current();
            }
          }, resfriamento);
        }
      },
      onError: () => {
        falandoAssistenteRef.current = false;
        if (ativoRef.current) {
          setEstado(proximoEstado);
          setTranscricao('');
          transcricaoRef.current = '';
          setTimeout(() => {
            if (ativoRef.current && !falandoAssistenteRef.current && iniciarEscutaRef.current) {
              iniciarEscutaRef.current();
            }
          }, 250);
        }
      }
    });
  }, [pararEscuta]);

  // Enviar texto para interpretação inteligente com a IA
  const processarTextoComIA = useCallback(async (textoParaEnviar, contextoAnterior = null) => {
    const textoLimpo = textoParaEnviar || transcricaoRef.current;
    if (!textoLimpo || !textoLimpo.trim()) {
      setAviso('Nenhum comando detectado. Fale com clareza.');
      setEstado('OUVINDO_COMANDO');
      if (iniciarEscutaRef.current) iniciarEscutaRef.current();
      return;
    }

    setEstado('PROCESSANDO');
    setMensagemAssistente(contextoAnterior ? 'Atualizando lançamento...' : 'Identificando contas...');
    audioVoz.tocarChime('ouvir');

    try {
      const res = await fetch('/api/ia/interpretar-voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: textoLimpo.trim(),
          empresaId: parseInt(empresaId, 10),
          contextoAnterior: contextoAnterior || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.erro || 'Falha ao interpretar comando de voz.');
      }

      setResultadoIA(data);
      resultadoIARef.current = data;

      // Caso a resposta da API seja um comando de navegação rápida
      if (data.tipoIntencao === 'NAVEGACAO' && data.navegacao) {
        executarNavegacao(data.navegacao);
        return;
      }

      const interpretacao = data.interpretacao || {};

      // Caso falte conta de crédito
      if (interpretacao.dadosFaltantes === 'CREDITO' || interpretacao.dadosFaltantes === 'CREDITO_E_VALOR') {
        const perguntaCredito = configVozRef.current?.estiloResposta === 'completo'
          ? 'Por favor, informe a conta de crédito ou meio de pagamento.'
          : (interpretacao.resumoFalado || 'Qual o crédito?');
        falarEContinuar(perguntaCredito, 'OUVINDO_COMPLEMENTO_CREDITO');
        return;
      }

      // Caso falte valor
      if (interpretacao.dadosFaltantes === 'VALOR') {
        const perguntaValor = configVozRef.current?.estiloResposta === 'completo'
          ? 'Por favor, informe o valor do lançamento.'
          : (interpretacao.resumoFalado || 'Qual o valor?');
        falarEContinuar(perguntaValor, 'OUVINDO_COMPLEMENTO');
        return;
      }

      // Proposta pronta (<1.5s de áudio)
      const textoFala = interpretacao.resumoFalado ||
        `${interpretacao.contaDebito?.nome || 'Despesa'}, ${interpretacao.contaCredito?.nome || 'Caixa'}, ${Number(interpretacao.valor || 0).toFixed(2)} reais. Confirma?`;

      falarEContinuar(textoFala, 'OUVINDO_CONFIRMACAO');

    } catch (err) {
      console.error(err);
      setEstado('ERRO');
      setAviso(err.message || 'Erro ao processar comando.');
      audioVoz.tocarChime('erro');
      audioVoz.falar(`Erro: ${err.message || 'tente novamente'}.`);
    }
  }, [empresaId, falarEContinuar]);

  // Gravar o lançamento no banco de dados automaticamente
  const executarGravacaoFinal = useCallback(async () => {
    pararEscuta();
    const dataAtual = resultadoIARef.current;
    if (!dataAtual || !dataAtual.interpretacao) return;

    const { interpretacao } = dataAtual;
    setEstado('GRAVANDO');
    setMensagemAssistente('Gravando lançamento...');

    try {
      let finalDebitoId = interpretacao.contaDebito?.id;
      let finalCreditoId = interpretacao.contaCredito?.id;

      // 1. Criar subconta automática caso tenha sido sugerida
      if (interpretacao.sugerirNovaConta && interpretacao.sugestao) {
        const codigoPai = interpretacao.sugestao.contaPaiCodigo || '4.2.2';
        const novoCodigo = calcularProximoCodigoFilho(codigoPai, contasEmpresa);

        const resNovaConta = await fetch('/api/contas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: novoCodigo,
            nome: interpretacao.sugestao.nome.trim(),
            empresaId: parseInt(empresaId, 10),
            contaPaiId: interpretacao.sugestao.contaPaiId,
            tipo: 'A',
            grupo: interpretacao.sugestao.grupo || 'DESPESA',
            natureza: interpretacao.sugestao.tipoDestino === 'DEBITO' ? 'D' : 'C',
          })
        });

        if (resNovaConta.ok) {
          const novaConta = await resNovaConta.json();
          if (interpretacao.sugestao.tipoDestino === 'DEBITO') {
            finalDebitoId = novaConta.id;
          } else {
            finalCreditoId = novaConta.id;
          }
        }
      }

      if (!finalDebitoId || !finalCreditoId) {
        throw new Error('Contas contábeis não puderam ser resolvidas.');
      }

      // 2. Gravar o lançamento contábil
      const payloadLancamento = {
        data: interpretacao.data ? (interpretacao.data.includes('T') ? interpretacao.data : `${interpretacao.data}T00:00:00.000Z`) : new Date().toISOString(),
        valor: parseFloat(interpretacao.valor),
        historico: interpretacao.historico || 'Lançamento via assistente de voz Copilot',
        documento: interpretacao.documento || null,
        contaDebitoId: parseInt(finalDebitoId, 10),
        contaCreditoId: parseInt(finalCreditoId, 10),
        empresaId: parseInt(empresaId, 10),
      };

      const resLanc = await fetch('/api/lancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadLancamento),
      });

      if (!resLanc.ok) {
        const errData = await resLanc.json();
        throw new Error(errData.erro || 'Falha ao registrar lançamento.');
      }

      // 3. Sucesso!
      setTotalGravados(prev => prev + 1);
      audioVoz.tocarChime('sucesso');
      setEstado('OUVINDO_COMANDO');
      setMensagemAssistente('✓ Gravado com sucesso! Pode falar o próximo...');
      setTranscricao('');
      transcricaoRef.current = '';
      setResultadoIA(null);
      resultadoIARef.current = null;
      setTextoManual('');
      setAviso('');
      setSilencioContando(false);
      falandoAssistenteRef.current = false;

      if (refreshData) {
        refreshData().catch(e => console.warn('Erro ao atualizar dados em segundo plano:', e));
      }

      // Intervalo de 450ms para o chime de sucesso soar e o microfone reabrir limpo
      setTimeout(() => {
        if (ativoRef.current && !falandoAssistenteRef.current) {
          audioVoz.tocarChime('ouvir');
          if (iniciarEscutaRef.current) iniciarEscutaRef.current();
        }
      }, 450);

    } catch (err) {
      console.error(err);
      setEstado('ERRO');
      setAviso(err.message || 'Erro ao registrar no banco.');
      audioVoz.tocarChime('erro');
      audioVoz.falar(`Erro ao gravar: ${err.message}`);
    }
  }, [contasEmpresa, empresaId, refreshData, pararEscuta]);

  // Preparar próximo lançamento de forma instantânea sem lag nem congelamentos
  const prepararProximoTurno = useCallback(() => {
    if (!ativoRef.current) return;
    falandoAssistenteRef.current = false;
    pararEscuta();
    setTranscricao('');
    transcricaoRef.current = '';
    setResultadoIA(null);
    resultadoIARef.current = null;
    setTextoManual('');
    setAviso('');
    setSilencioContando(false);
    setMensagemAssistente('Ouvindo próximo lançamento... Pode falar.');
    setEstado('OUVINDO_COMANDO');
    audioVoz.tocarChime('ouvir');
    setTimeout(() => {
      if (ativoRef.current && !falandoAssistenteRef.current && iniciarEscutaRef.current) {
        iniciarEscutaRef.current();
      }
    }, 250);
  }, [pararEscuta]);

  // Interrupção manual ao tocar no card/orbe (Barge-In)
  const interromperFalaEInteragir = (e) => {
    if (e && e.target && (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'INPUT')) {
      return;
    }
    if (estado === 'FALANDO_PROPOSTA') {
      audioVoz.pararFala();
      falandoAssistenteRef.current = false;
      setEstado('OUVINDO_CONFIRMACAO');
      setTranscricao('');
      transcricaoRef.current = '';
      audioVoz.tocarChime('ouvir');
      setTimeout(() => {
        if (ativoRef.current && !falandoAssistenteRef.current && iniciarEscutaRef.current) {
          iniciarEscutaRef.current();
        }
      }, 80);
    }
  };

  // Abrir o assistente Copilot
  const abrirCopilot = useCallback(() => {
    if (!empresaId) {
      alert('Selecione uma empresa ativa antes de falar comandos contábeis.');
      return;
    }

    ativoRef.current = true;
    falandoAssistenteRef.current = false;
    setAviso('');
    setTranscricao('');
    transcricaoRef.current = '';
    setResultadoIA(null);
    resultadoIARef.current = null;
    setModoManual(false);
    setTextoManual('');
    setSilencioContando(false);
    setTotalGravados(0);
    setMensagemAssistente('Ouvindo... Fale o lançamento naturalmente.');
    setEstado('OUVINDO_COMANDO');

    audioVoz.tocarChime('ouvir');
    iniciarEscuta();
  }, [empresaId, iniciarEscuta]);

  // Envio manual caso o usuário prefira digitar
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (textoManual.trim()) {
      const comandoNav = detectarComandoNavegacao(textoManual);
      if (comandoNav) {
        executarNavegacao(comandoNav);
        return;
      }
      processarTextoComIA(textoManual, resultadoIARef.current?.interpretacao);
    }
  };

  // Sincronizar refs fora do ciclo de render para evitar alertas do React 19
  useEffect(() => {
    estadoRef.current = estado;
    transcricaoRef.current = transcricao;
    resultadoIARef.current = resultadoIA;
    pararEscutaRef.current = pararEscuta;
    cancelarPorVozRef.current = cancelarPorVoz;
    iniciarEscutaRef.current = iniciarEscuta;
    falarEContinuarRef.current = falarEContinuar;
    processarTextoComIARef.current = processarTextoComIA;
    executarGravacaoFinalRef.current = executarGravacaoFinal;
    prepararProximoTurnoRef.current = prepararProximoTurno;
    executarNavegacaoRef.current = executarNavegacao;
    abrirCopilotRef.current = abrirCopilot;
  });

  // Gerenciador da escuta de fundo para a palavra de ativação ("Contábil")
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlerWake = (resultado) => {
      if (!empresaId) return;

      audioVoz.tocarChime('ouvir');

      if (modoVoz === 'PASSO') {
        setPassoAberto(true);
        return;
      }

      if (abrirCopilotRef.current) {
        abrirCopilotRef.current();
      }

      // Se o usuário falou a palavra de ativação com o comando junto (ex: "Contábil, abrir DRE" ou "Contábil, combustível 50 reais")
      if (resultado && resultado.comandoRestante && resultado.comandoRestante.length >= 3) {
        const resto = resultado.comandoRestante;
        setTimeout(() => {
          const nav = detectarComandoNavegacao(resto);
          if (nav && executarNavegacaoRef.current) {
            executarNavegacaoRef.current(nav);
            return;
          }
          if (processarTextoComIARef.current) {
            processarTextoComIARef.current(resto);
          }
        }, 300);
      }
    };

    const listener = criarEscutaWakeWord({
      onWake: handlerWake,
      onError: (err) => console.warn('WakeWord erro:', err)
    });

    wakeWordListenerRef.current = listener;

    return () => {
      if (wakeWordListenerRef.current) {
        wakeWordListenerRef.current.parar();
        wakeWordListenerRef.current = null;
      }
    };
  }, [empresaId, modoVoz]);

  // Ativação / Desativação da prontidão dependendo do estado do Copilot
  useEffect(() => {
    if (!wakeWordListenerRef.current) return;

    if (estado !== 'INATIVO' || passoAberto || !wakeWordHabilitada) {
      wakeWordListenerRef.current.parar();
    } else {
      const timer = setTimeout(() => {
        if (wakeWordListenerRef.current && estado === 'INATIVO' && !passoAberto && wakeWordHabilitada) {
          wakeWordListenerRef.current.iniciar();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [estado, passoAberto, wakeWordHabilitada]);

  const executarEnvioImediato = () => {
    if (silenceTimerRef.current && disparoImediatoRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      setSilencioContando(false);
      const fn = disparoImediatoRef.current;
      disparoImediatoRef.current = null;
      fn();
    }
  };

  // Atalho de teclado ESC para fechar e Enter para envio imediato
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && estado !== 'INATIVO') {
        fecharCopilot();
      } else if (e.key === 'Enter' && estado !== 'INATIVO') {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA') return;
        if (estado === 'OUVINDO_CONFIRMACAO') {
          e.preventDefault();
          pararEscuta();
          if (executarGravacaoFinalRef.current) executarGravacaoFinalRef.current();
          return;
        }
        if (silenceTimerRef.current && disparoImediatoRef.current) {
          e.preventDefault();
          executarEnvioImediato();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [estado, fecharCopilot]);

  // Desligar ao desmontar
  useEffect(() => {
    return () => {
      ativoRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      audioVoz.pararFala();
    };
  }, []);

  const interpretacao = resultadoIA?.interpretacao || {};

  return (
    <div className={styles.container}>
      {/* Botão de Ativação na Barra Lateral */}
      <button
        type="button"
        className={`${styles.btnVoz} ${(estado !== 'INATIVO' || passoAberto) ? styles.btnVozActive : ''}`}
        onClick={() => {
          if (modoVoz === 'PASSO') {
            if (!empresaId) {
              alert('Selecione uma empresa ativa antes de falar comandos contábeis.');
              return;
            }
            setPassoAberto(prev => !prev);
            return;
          }
          if (estado === 'INATIVO') abrirCopilot(); else fecharCopilot();
        }}
        title="Assistente de Voz Copilot - Lançamentos Contábeis 100% por Voz"
        id="btn-lancar-por-voz"
      >
        <div className={styles.btnContent}>
          <div className={styles.micOrbSmall}>🎙️</div>
          <span>Lançar por Voz</span>
        </div>
        <span className={styles.badgeCopilot}>Copilot</span>
      </button>

      {/* Alternador de modo: frase livre (IA) ou passo a passo (débito → crédito → valor) */}
      <div className={estilosModo.modoSwitch} role="group" aria-label="Modo de lançamento por voz">
        <button
          type="button"
          id="modo-voz-livre"
          className={`${estilosModo.modoOpcao} ${modoVoz === 'LIVRE' ? estilosModo.modoOpcaoAtiva : ''}`}
          onClick={() => trocarModo('LIVRE')}
          title="Fale a frase completa e a IA interpreta"
        >
          Frase livre
        </button>
        <button
          type="button"
          id="modo-voz-passo"
          className={`${estilosModo.modoOpcao} ${modoVoz === 'PASSO' ? estilosModo.modoOpcaoAtiva : ''}`}
          onClick={() => trocarModo('PASSO')}
          title="Fale débito, depois crédito, depois o valor"
        >
          Passo a passo
        </button>
      </div>

      {/* Linha com Wake Word e Ajustes de Velocidade */}
      <div className={styles.linhaControlesVoz}>
        <button
          type="button"
          id="btn-wake-word-toggle"
          className={`${styles.btnWakeToggle} ${wakeWordHabilitada ? styles.btnWakeToggleAtivo : ''}`}
          onClick={alternarWakeWord}
          title={wakeWordHabilitada ? "Prontidão ativa: fale 'Contábil' em voz alta para acionar (clique para pausar)" : "Prontidão pausada (clique para ouvir 'Contábil')"}
          style={{ flex: 1, marginTop: 0 }}
        >
          <span className={styles.dotWake} />
          <span>{wakeWordHabilitada ? 'Ouvindo "Contábil"' : 'Voz: só clique'}</span>
        </button>

        <button
          type="button"
          id="btn-config-voz"
          className={styles.btnConfigVoz}
          onClick={() => setConfigModalAberta(true)}
          title="Ajustar velocidade e intervalos de voz salvos na empresa"
        >
          <span>⚙️</span>
          <span>Velocidade</span>
        </button>
      </div>

      {passoAberto && <PassoAPassoVoz onFechar={() => setPassoAberto(false)} />}

      {/* MODAL FLUTUANTE ESTILO COPILOT MÃOS LIVRES */}
      {estado !== 'INATIVO' && (
        <div 
          className={styles.floatingOverlay} 
          onClick={(e) => { if (e.target === e.currentTarget && estado !== 'GRAVANDO') fecharCopilot(); }}
        >
          <div className={styles.copilotCard} onClick={interromperFalaEInteragir}>
            {/* Topo do Card */}
            <div className={styles.cardHeader}>
              <div className={styles.headerBrand}>
                <div className={styles.statusIndicator}>
                  <div className={`
                    ${styles.statusDot} 
                    ${estado === 'OUVINDO_COMANDO' || estado === 'OUVINDO_CONFIRMACAO' || estado === 'OUVINDO_COMPLEMENTO' || estado === 'OUVINDO_COMPLEMENTO_CREDITO' ? styles.statusDotListening : ''}
                    ${estado === 'FALANDO_PROPOSTA' ? styles.statusDotSpeaking : ''}
                    ${estado === 'SUCESSO' ? styles.statusDotSuccess : ''}
                  `} />
                  <span className={styles.statusTitle}>
                    {estado === 'OUVINDO_COMANDO' && (silencioContando ? 'Processando fala...' : 'Ouvindo lançamento...')}
                    {estado === 'OUVINDO_COMPLEMENTO' && 'Ouvindo o valor gasto...'}
                    {estado === 'OUVINDO_COMPLEMENTO_CREDITO' && 'Ouvindo a conta de crédito (ou meio de pagamento)...'}
                    {estado === 'PROCESSANDO' && 'Identificando contas...'}
                    {estado === 'FALANDO_PROPOSTA' && 'Falando proposta (toque p/ interromper)...'}
                    {estado === 'OUVINDO_CONFIRMACAO' && (silencioContando ? 'Atualizando contas...' : 'Diga "Sim" ou fale uma correção')}
                    {estado === 'GRAVANDO' && 'Gravando lançamento...'}
                    {estado === 'SUCESSO' && 'Lançamento Concluído!'}
                    {estado === 'CANCELADO' && 'Lançamento Cancelado'}
                    {estado === 'ERRO' && 'Atenção'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {totalGravados > 0 && (
                  <span className={styles.badgeGravados}>
                    ✓ {totalGravados} gravado{totalGravados > 1 ? 's' : ''}
                  </span>
                )}
                <span className={styles.badgeModo}>Contínuo Mãos Livres</span>
                <button
                  type="button"
                  className={styles.btnAjustesCard}
                  onClick={() => setConfigModalAberta(true)}
                  title="Ajustes de velocidade da empresa (MySQL)"
                >
                  ⚙️
                </button>
                <button 
                  type="button" 
                  className={styles.btnCloseCard} 
                  onClick={fecharCopilot} 
                  title="Concluir / Fechar (Esc)"
                  disabled={estado === 'GRAVANDO'}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Visualizer Central com Orbe Copilot e Barras de Onda */}
            <div className={styles.visualizerArea}>
              <div className={styles.orbContainer}>
                <div className={styles.pulseRing} />
                <div className={`${styles.pulseRing} ${styles.pulseRingDelay}`} />
                
                <div className={`
                  ${styles.copilotOrb}
                  ${estado === 'OUVINDO_COMANDO' || estado === 'OUVINDO_CONFIRMACAO' || estado === 'OUVINDO_COMPLEMENTO' || estado === 'OUVINDO_COMPLEMENTO_CREDITO' ? styles.orbListening : ''}
                  ${estado === 'PROCESSANDO' || estado === 'GRAVANDO' ? styles.orbProcessing : ''}
                  ${estado === 'FALANDO_PROPOSTA' ? styles.orbSpeaking : ''}
                  ${estado === 'SUCESSO' ? styles.orbSuccess : ''}
                `}>
                  {(estado === 'OUVINDO_COMANDO' || estado === 'OUVINDO_CONFIRMACAO' || estado === 'OUVINDO_COMPLEMENTO' || estado === 'OUVINDO_COMPLEMENTO_CREDITO') && '🎙️'}
                  {estado === 'PROCESSANDO' && '✨'}
                  {estado === 'FALANDO_PROPOSTA' && '🔊'}
                  {estado === 'OUVINDO_CONFIRMACAO' && '👂'}
                  {estado === 'GRAVANDO' && '💾'}
                  {estado === 'SUCESSO' && '✓'}
                  {estado === 'CANCELADO' && '✕'}
                  {estado === 'ERRO' && '⚠️'}
                </div>
              </div>

              {/* Equalizador de Ondas Sonoras */}
              <div className={`
                ${styles.soundWaves} 
                ${estado === 'OUVINDO_COMANDO' || estado === 'OUVINDO_CONFIRMACAO' || estado === 'OUVINDO_COMPLEMENTO' || estado === 'OUVINDO_COMPLEMENTO_CREDITO' ? styles.soundWavesListening : ''}
                ${estado === 'FALANDO_PROPOSTA' ? styles.soundWavesSpeaking : ''}
              `}>
                <div className={styles.soundBar} />
                <div className={styles.soundBar} />
                <div className={styles.soundBar} />
                <div className={styles.soundBar} />
                <div className={styles.soundBar} />
                <div className={styles.soundBar} />
                <div className={styles.soundBar} />
              </div>
            </div>

            {/* Caixa de Diálogo em Tempo Real */}
            <div className={styles.dialogueBox}>
              {/* O que o usuário falou neste turno */}
              {transcricao && (
                <div className={styles.userSpeechBubble}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div className={styles.speechLabel}>
                      <span>🗣️ Você falou:</span>
                    </div>
                    {silencioContando && (
                      <button
                        type="button"
                        onClick={executarEnvioImediato}
                        className={estilosModo.btnEnviarAgora}
                        title="Enviar agora imediatamente sem esperar o silêncio (Enter)"
                      >
                        ⚡ Enviar agora <kbd className={estilosModo.kbd}>Enter</kbd>
                      </button>
                    )}
                  </div>
                  <div className={styles.userSpeechText}>
                    &ldquo;{transcricao}&rdquo;
                  </div>
                </div>
              )}

              {/* Mensagem falada do assistente */}
              {mensagemAssistente && (
                <div className={styles.assistantSpeechBubble}>
                  <div className={styles.speechLabel} style={{ color: '#c084fc' }}>
                    <span>🤖 Copilot:</span>
                  </div>
                  <div className={styles.assistantSpeechText}>
                    {mensagemAssistente}
                  </div>
                </div>
              )}

              {/* Detalhes Contábeis Identificados em Tempo Real */}
              {(interpretacao.contaDebito || interpretacao.contaCredito || (interpretacao.valor && interpretacao.valor > 0) || interpretacao.sugestao) && (
                <div className={styles.cardResumoContabil}>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoItemLabel}>Débito (Destino)</span>
                    <span className={styles.resumoItemValor} title={interpretacao.contaDebito?.nome || interpretacao.sugestao?.nome}>
                      {interpretacao.contaDebito?.nome ? `✓ ${interpretacao.contaDebito.nome}` : (interpretacao.sugestao ? `✨ ${interpretacao.sugestao.nome} (Criar)` : '⏳ A definir')}
                    </span>
                  </div>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoItemLabel}>Crédito (Origem)</span>
                    <span className={styles.resumoItemValor} title={interpretacao.contaCredito?.nome}>
                      {interpretacao.contaCredito?.nome ? `✓ ${interpretacao.contaCredito.nome}` : '⏳ Aguardando crédito...'}
                    </span>
                  </div>
                  <div className={styles.resumoItem}>
                    <span className={styles.resumoItemLabel}>Valor</span>
                    <span className={styles.resumoItemValor} style={{ color: interpretacao.valor > 0 ? '#38bdf8' : '#94a3b8' }}>
                      {interpretacao.valor > 0 ? `R$ ${Number(interpretacao.valor).toFixed(2)}` : '⏳ Aguardando valor...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Aviso ou Erro */}
              {aviso && (
                <div style={{ color: '#fb7185', fontSize: '0.82rem', padding: '6px 10px', background: 'rgba(251, 113, 133, 0.1)', borderRadius: '6px' }}>
                  {aviso}
                </div>
              )}

              {/* Modo de Entrada Manual */}
              {modoManual && (
                <form onSubmit={handleManualSubmit} className={styles.manualForm}>
                  <input
                    type="text"
                    className={styles.manualInput}
                    placeholder="Ex: Compra 50 reais posto shell cartao itau..."
                    value={textoManual}
                    onChange={(e) => setTextoManual(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className={styles.btnPrimaryAction}>
                    Enviar
                  </button>
                </form>
              )}
            </div>

            {/* Dica de interação por voz */}
            <div className={styles.voiceHints}>
              {estado === 'OUVINDO_COMANDO' && (
                <span>💡 Fale o lançamento naturalmente ou navegue: &ldquo;Abrir DRE&rdquo;, &ldquo;Balancete&rdquo;, &ldquo;Plano de Contas&rdquo;... Diga &ldquo;Fechar&rdquo; ao terminar.</span>
              )}
              {estado === 'OUVINDO_COMPLEMENTO_CREDITO' && (
                <span>🗣️ Diga a conta de crédito (ou diga <span className={styles.hintTag}>&ldquo;Corrigir&rdquo;</span> para mudar o débito).</span>
              )}
              {estado === 'OUVINDO_COMPLEMENTO' && (
                <span>🗣️ Diga o valor gasto (ou diga <span className={styles.hintTag}>&ldquo;Corrigir&rdquo;</span> para mudar o crédito).</span>
              )}
              {estado === 'OUVINDO_CONFIRMACAO' && (
                <>
                  <span>🗣️ Diga:</span>
                  <span className={styles.hintTag}>&ldquo;Sim&rdquo;</span>
                  <span>ou:</span>
                  <span className={styles.hintTag}>&ldquo;Corrigir&rdquo;</span>
                  <span>/</span>
                  <span className={styles.hintTag}>&ldquo;Mude para...&rdquo;</span>
                </>
              )}
              {estado === 'FALANDO_PROPOSTA' && (
                <span>🔊 Toque no card para interromper e falar imediatamente.</span>
              )}
            </div>

            {/* Barra de Ações Rápidas */}
            <div className={styles.actionFooter}>
              <button 
                type="button" 
                className={styles.btnSecondary} 
                onClick={fecharCopilot}
                disabled={estado === 'GRAVANDO'}
              >
                {totalGravados > 0 ? `✓ Concluir (${totalGravados} gravado${totalGravados > 1 ? 's' : ''})` : 'Cancelar'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {estado === 'OUVINDO_CONFIRMACAO' && (
                  <>
                    <button 
                      type="button" 
                      className={styles.btnSecondary}
                      onClick={cancelarPorVoz}
                    >
                      ✕ Cancelar
                    </button>
                    <button 
                      type="button" 
                      className={styles.btnPrimaryAction}
                      onClick={() => executarGravacaoFinal()}
                    >
                      ✓ Confirmar e Gravar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações de Voz para Todas as Empresas (MySQL) */}
      <ModalConfigVoz
        aberta={configModalAberta}
        onFechar={() => setConfigModalAberta(false)}
        onSalvo={(nova) => setConfigVoz(nova)}
      />
    </div>
  );
}
