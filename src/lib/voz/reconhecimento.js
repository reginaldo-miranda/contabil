// Escuta de voz por "turno": abre o microfone, acumula a fala, detecta o silêncio
// e entrega a frase final. Cada turno começa limpo (sem acumular falas anteriores).

export function suporteReconhecimento() {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function criarEscuta({ onFala, onInterim, onErro, onSilencioContando, silencioMs = 1300 }) {
  let rec = null;
  let ativo = false;
  let timer = null;
  let errosRede = 0;
  let religarTimer = null;
  let ultimoTexto = '';
  let silencioAtual = silencioMs;

  function limparTimers() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (onSilencioContando) onSilencioContando(false);
    }
    if (religarTimer) {
      clearTimeout(religarTimer);
      religarTimer = null;
    }
  }

  function desligarInstancia() {
    if (!rec) return;
    const r = rec;
    rec = null;
    r.onstart = null;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try { r.stop(); } catch (e) { try { r.abort(); } catch (e2) { /* ignora */ } }
  }

  function abrir() {
    if (!ativo || rec) return;
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      ativo = false;
      if (onErro) onErro('sem-suporte');
      return;
    }

    const instancia = new SR();
    instancia.lang = 'pt-BR';
    instancia.continuous = true;
    instancia.interimResults = true;

    instancia.onresult = (event) => {
      if (!ativo) return;
      errosRede = 0;
      let texto = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i] && event.results[i][0]) texto += event.results[i][0].transcript + ' ';
      }
      texto = texto.trim();
      if (!texto) return;

      ultimoTexto = texto;
      if (onInterim) onInterim(texto);

      // Se for apenas 1 caractere (ruído acústico do mic), não dispara o timer ainda
      if (texto.length < 2) return;

      if (timer) clearTimeout(timer);
      if (onSilencioContando) onSilencioContando(true);

      const tempoEspera = typeof silencioAtual === 'function' ? silencioAtual() : silencioAtual;
      timer = setTimeout(() => {
        timer = null;
        if (onSilencioContando) onSilencioContando(false);
        if (!ativo) return;
        const textoFinal = ultimoTexto;
        parar();
        if (onFala && textoFinal) onFala(textoFinal);
      }, tempoEspera);
    };

    instancia.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        ativo = false;
        if (onErro) onErro('permissao');
        return;
      }
      if (event.error === 'network') {
        errosRede++;
        if (onErro) onErro('rede');
      }
      // 'no-speech' e 'aborted' são normais: o onend reabre o microfone
    };

    instancia.onend = () => {
      if (rec === instancia) rec = null;
      if (ativo) {
        const espera = Math.min(2500, 250 + errosRede * 700);
        religarTimer = setTimeout(abrir, espera);
      }
    };

    try {
      instancia.start();
      rec = instancia;
    } catch (e) {
      rec = null;
      if (ativo) religarTimer = setTimeout(abrir, 400);
    }
  }

  function iniciar() {
    if (ativo) return;
    ativo = true;
    ultimoTexto = '';
    errosRede = 0;
    abrir();
  }

  function parar() {
    ativo = false;
    limparTimers();
    desligarInstancia();
  }

  function enviarAgora() {
    if (!ativo || !ultimoTexto) return false;
    const textoParaEnviar = ultimoTexto;
    limparTimers();
    parar();
    if (onFala) onFala(textoParaEnviar);
    return true;
  }

  return {
    iniciar,
    parar,
    enviarAgora,
    estaAtiva: () => ativo,
    setSilencioMs: (novo) => { silencioAtual = novo; }
  };
}
