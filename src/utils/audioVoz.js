// Utilitário de Áudio e Síntese de Voz (TTS + Chimes via Web Audio API)
// Estilo Copilot: respostas rápidas (<1.5s), ágeis e interruptíveis

class AudioVozService {
  constructor() {
    this.audioCtx = null;
    this.activeUtterance = null;
    this.safetyTimer = null;
    this.keepAliveInterval = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.onvoiceschanged = () => {
          try { window.speechSynthesis.getVoices(); } catch (e) {}
        };
      } catch (e) {}
    }
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Chimes sintéticos de alta fidelidade usando Web Audio API
  tocarChime(tipo) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (tipo === 'ouvir') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.1);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (tipo === 'sucesso') {
        const notas = [523.25, 659.25, 783.99, 1046.50];
        notas.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.05);
          g.gain.setValueAtTime(0.001, now + idx * 0.05);
          g.gain.linearRampToValueAtTime(0.1, now + idx * 0.05 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.28);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + idx * 0.05);
          o.stop(now + idx * 0.05 + 0.3);
        });
      } else if (tipo === 'cancelar') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(392.00, now + 0.14);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (tipo === 'erro') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(220, now + 0.12);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.warn('Erro ao tocar chime:', e);
    }
  }

  // Normalizar texto para pronúncia contábil correta, ágil e sem repetições
  prepararTextoParaFala(texto) {
    if (!texto) return '';
    return texto
      .replace(/R\$\s*(\d+)[,.]00\b/g, '$1 reais')
      .replace(/R\$\s*(\d+)[,.](\d{2})\b/g, '$1 reais e $2 centavos')
      .replace(/R\$\s*(\d+)\b/g, '$1 reais')
      .replace(/(\d+)[,.]00\s*reais\b/gi, '$1 reais')
      .replace(/(\d+)[,.](\d{2})\s*reais\b/gi, '$1 reais e $2 centavos')
      .replace(/(\d+)[,.]00\b/g, '$1 reais')
      .replace(/(\d+)[,.](\d{1,2})\b/g, '$1 reais e $2')
      .replace(/\bNF\b/gi, 'nota fiscal')
      .replace(/\bDOC\b/gi, 'documento')
      .replace(/\//g, ' ou ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Síntese de Voz (TTS) em Português do Brasil com proteção anti-corte
  falar(texto, { rate = 1.05, onStart, onEnd, onError } = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    const textoFormatado = this.prepararTextoParaFala(texto);
    if (!textoFormatado) {
      if (onEnd) onEnd();
      return;
    }

    const dispararFala = () => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {}

      const utterance = new SpeechSynthesisUtterance(textoFormatado);
      utterance.lang = 'pt-BR';
      utterance.rate = typeof rate === 'number' && rate >= 0.5 && rate <= 2.0 ? rate : 1.05;
      utterance.pitch = 1.0;

      const vozes = window.speechSynthesis.getVoices();
      // Prioriza vozes locais que respeitam a propriedade rate de velocidade.
      // Vozes 'Online' (Natural) do Edge/Chromium ignoram a modulação de rate na API nativa.
      const vozesLocais = vozes.filter(v => (v.lang === 'pt-BR' || v.lang.startsWith('pt')) && !v.name.includes('Online'));
      const melhorVoz = 
        vozesLocais.find(v => v.name.includes('Maria') || v.name.includes('Luciana') || v.name.includes('Daniel') || v.name.includes('Heloisa')) ||
        vozesLocais.find(v => v.localService === true) ||
        vozesLocais[0] ||
        vozes.find(v => v.lang === 'pt-BR' && !v.name.includes('Online')) ||
        vozes.find(v => v.lang === 'pt-BR') ||
        vozes.find(v => v.lang.startsWith('pt'));

      if (melhorVoz) {
        utterance.voice = melhorVoz;
      }

      this.activeUtterance = utterance;
      if (!window._speechUtterances) window._speechUtterances = [];
      window._speechUtterances.push(utterance);

      let finalizado = false;
      const concluir = () => {
        if (finalizado) return;
        finalizado = true;
        if (this.safetyTimer) {
          clearTimeout(this.safetyTimer);
          this.safetyTimer = null;
        }
        if (this.keepAliveInterval) {
          clearInterval(this.keepAliveInterval);
          this.keepAliveInterval = null;
        }
        if (window._speechUtterances) {
          window._speechUtterances = window._speechUtterances.filter(u => u !== utterance);
        }
        this.activeUtterance = null;
        if (onEnd) onEnd();
      };

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = concluir;

      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('Erro na síntese de voz:', e.error);
          if (onError) onError(e);
        }
        concluir();
      };

      // Timeout de segurança proporcional ao tamanho do texto (mínimo 4s, máximo 12s)
      const timeoutEstimado = Math.min(12000, Math.max(4000, textoFormatado.length * 200));
      this.safetyTimer = setTimeout(concluir, timeoutEstimado);

      this.keepAliveInterval = setInterval(() => {
        if (!finalizado && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } else {
          if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
          }
        }
      }, 800);

      try {
        window.speechSynthesis.speak(utterance);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {
        console.warn('Falha ao disparar speak:', e);
        concluir();
      }
    };

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      setTimeout(dispararFala, 100);
    } else {
      dispararFala();
    }
  }

  pararFala() {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch (e) {}
      this.activeUtterance = null;
      window._activeSpeechUtterance = null;
    }
  }
}

export const audioVoz = new AudioVozService();
