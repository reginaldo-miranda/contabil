// Detector e ouvinte de prontidão em segundo plano para palavra de ativação (Wake Word)
// Permite abrir o Copilot dizendo "Contábil" ou "Ei Contábil" sem clicar no mouse.

export function normalizarWakeWord(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detecta se o texto falado contém a palavra-chave de ativação.
 * Suporta: "contábil", "ei contábil", "oi contábil", "olá contábil", "ok contábil", "copilot", "copiloto".
 * Retorna { detectado: boolean, comandoRestante: string }
 */
export function detectarWakeWord(texto) {
  if (!texto) return { detectado: false, comandoRestante: '' };
  const norm = normalizarWakeWord(texto);

  const regex = /(?:^|\s)(?:ei|oi|ola|ok)?\s*(?:contabil|copilot|copiloto)\b(?:\s*(.*))?$/i;
  const match = norm.match(regex);

  if (!match) {
    return { detectado: false, comandoRestante: '' };
  }

  return {
    detectado: true,
    comandoRestante: (match[1] || '').trim(),
  };
}

/**
 * Cria um listener leve de microfone em segundo plano monitorando a wake word.
 */
export function criarEscutaWakeWord({ onWake, onStatusChange, onError }) {
  let recognition = null;
  let ativo = false;
  let reiniciando = false;
  let restartTimer = null;
  let errosConsecutivos = 0;

  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  };

  const notifyStatus = (status) => {
    if (typeof onStatusChange === 'function') {
      try { onStatusChange(status); } catch (e) {}
    }
  };

  const parar = () => {
    ativo = false;
    reiniciando = false;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (recognition) {
      const r = recognition;
      recognition = null;
      r.onstart = null;
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      try { r.stop(); } catch (e) {
        try { r.abort(); } catch (e2) {}
      }
    }
    notifyStatus('PARADO');
  };

  const iniciar = () => {
    const SpeechClass = getSpeechRecognition();
    if (!SpeechClass) {
      notifyStatus('SEM_SUPORTE');
      return false;
    }

    ativo = true;
    reiniciando = false;
    if (restartTimer) clearTimeout(restartTimer);

    if (recognition) {
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }

    try {
      const rec = new SpeechClass();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => {
        errosConsecutivos = 0;
        notifyStatus('OUVINDO_STANDBY');
      };

      rec.onresult = (event) => {
        if (!ativo) return;

        let falaTotal = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i] && event.results[i][0]) {
            falaTotal += event.results[i][0].transcript + ' ';
          }
        }

        const texto = falaTotal.trim();
        if (!texto) return;

        const resultado = detectarWakeWord(texto);
        if (resultado.detectado) {
          // Palavra de ativação reconhecida!
          parar();
          if (typeof onWake === 'function') {
            try {
              onWake(resultado);
            } catch (err) {
              console.error('Erro ao acionar callback de wake word:', err);
            }
          }
        }
      };

      rec.onerror = (event) => {
        if (event.error === 'not-allowed') {
          ativo = false;
          notifyStatus('NEGADO');
          if (typeof onError === 'function') onError(event.error);
          return;
        }
        if (event.error === 'network' || event.error === 'aborted' || event.error === 'no-speech') {
          errosConsecutivos++;
        }
      };

      rec.onend = () => {
        recognition = null;
        if (ativo) {
          // Reinicia silenciosamente para manter a prontidão sempre ativa
          const espera = Math.min(2000, 300 + errosConsecutivos * 300);
          restartTimer = setTimeout(() => {
            if (ativo) iniciar();
          }, espera);
        } else {
          notifyStatus('PARADO');
        }
      };

      recognition = rec;
      rec.start();
      return true;

    } catch (e) {
      console.warn('Erro ao inicializar escuta de Wake Word:', e);
      notifyStatus('ERRO');
      return false;
    }
  };

  return {
    iniciar,
    parar,
    estaAtivo: () => ativo,
  };
}
