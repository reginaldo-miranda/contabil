'use client';

import { useState, useRef, useEffect } from 'react';
import { useContabil } from '@/context/ContabilContext';
import ModalLancamentoVoz from './ModalLancamentoVoz';
import styles from './BotaoComandoVoz.module.css';

export default function BotaoComandoVoz() {
  const { empresaId } = useContabil();
  
  const [ouvindo, setOuvindo] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [transcricao, setTranscricao] = useState('');
  const [resultadoIA, setResultadoIA] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [textoManual, setTextoManual] = useState('');
  const [aviso, setAviso] = useState('');

  const recognitionRef = useRef(null);

  useEffect(() => {
    // Inicializar Web Speech API se suportado pelo navegador
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setOuvindo(true);
          setAviso('');
        };

        recognition.onresult = (event) => {
          let textoParcial = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            textoParcial += event.results[i][0].transcript;
          }
          setTranscricao(textoParcial);
        };

        recognition.onerror = (event) => {
          console.warn('Erro no reconhecimento de voz:', event.error);
          setOuvindo(false);
          if (event.error === 'not-allowed') {
            setAviso('Permissão de microfone negada. Você também pode digitar o comando.');
          } else {
            setAviso('Voz não detectada ou erro no microfone.');
          }
        };

        recognition.onend = () => {
          setOuvindo(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const iniciarEscuta = () => {
    if (!empresaId) {
      alert('Selecione uma empresa antes de gravar lançamentos por voz.');
      return;
    }

    setAviso('');
    setTranscricao('');
    setModoManual(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Se já estava rodando, para e reinicia
        try {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current.start(), 200);
        } catch (err) {
          setModoManual(true);
        }
      }
    } else {
      // Navegador não suporta SpeechRecognition diretamente
      setModoManual(true);
      setAviso('Navegador sem suporte ao microfone nativo. Você pode digitar o comando normalmente abaixo:');
    }
  };

  const pararEscutaEEnviar = () => {
    if (recognitionRef.current && ouvindo) {
      recognitionRef.current.stop();
    }

    if (transcricao.trim()) {
      enviarParaIA(transcricao);
    } else {
      setAviso('Nenhum texto foi capturado.');
    }
  };

  const cancelarEscuta = () => {
    if (recognitionRef.current && ouvindo) {
      recognitionRef.current.stop();
    }
    setOuvindo(false);
    setProcessando(false);
    setTranscricao('');
    setModoManual(false);
    setAviso('');
  };

  const enviarParaIA = async (texto) => {
    if (!texto || !texto.trim()) return;

    setProcessando(true);
    setAviso('');

    try {
      const res = await fetch('/api/ia/interpretar-voz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texto: texto.trim(),
          empresaId: parseInt(empresaId, 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.erro || 'Falha ao interpretar comando.');
      }

      setResultadoIA(data);
      setModalAberto(true);
      setProcessando(false);
      setOuvindo(false);
      setModoManual(false);
    } catch (err) {
      console.error(err);
      setAviso(err.message || 'Erro ao processar comando.');
      setProcessando(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (textoManual.trim()) {
      enviarParaIA(textoManual);
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={`${styles.btnVoz} ${ouvindo ? styles.btnOuvindo : ''}`}
        onClick={ouvindo ? pararEscutaEEnviar : iniciarEscuta}
        title="Falar ou digitar um lançamento contábil com inteligência artificial"
        disabled={processando}
      >
        <span className={styles.micIcon}>{ouvindo ? '🛑' : '🎙️'}</span>
        <span>{ouvindo ? 'Ouvindo... (Clique p/ Concluir)' : processando ? 'Interpretando IA...' : 'Lançar por Voz'}</span>
        <span className={styles.badgeIA}>IA</span>
      </button>

      {/* Caixa de diálogo enquanto está ouvindo ou em modo manual */}
      {(ouvindo || processando || modoManual || aviso) && (
        <div className={styles.listeningBox}>
          <div className={styles.listeningHeader}>
            <div className={styles.listeningTitle}>
              {ouvindo && <span className={styles.pulseDot} />}
              <span>{ouvindo ? 'Ouvindo seu comando...' : processando ? 'A IA está analisando...' : 'Comando Inteligente'}</span>
            </div>
            <button type="button" className={styles.btnCancelar} onClick={cancelarEscuta} title="Fechar">
              &times;
            </button>
          </div>

          {ouvindo && (
            <>
              <div className={styles.transcricaoTexto}>
                {transcricao || 'Fale seu lançamento agora...'}
              </div>
              <div className={styles.dicaExemplo}>
                💡 <em>Ex: &ldquo;Contábil, compra no Mercado Pago com cartão Itaú valor 50 reais&rdquo;</em>
              </div>
              <div className={styles.actionsListening}>
                <button type="button" className={styles.btnConcluir} onClick={pararEscutaEEnviar}>
                  ✓ Concluir e Analisar
                </button>
                <button type="button" className={styles.btnCancelar} onClick={cancelarEscuta}>
                  Cancelar
                </button>
              </div>
            </>
          )}

          {processando && (
            <div style={{ textAlign: 'center', padding: '12px', color: 'var(--accent)', fontSize: '0.85rem' }}>
              ⏳ Identificando contas débito/crédito e valores...
            </div>
          )}

          {aviso && !ouvindo && !processando && (
            <div style={{ fontSize: '0.78rem', color: '#fb7185', background: 'rgba(251, 113, 133, 0.1)', padding: '6px 8px', borderRadius: '4px' }}>
              {aviso}
            </div>
          )}

          {modoManual && !ouvindo && !processando && (
            <form onSubmit={handleManualSubmit} className={styles.promptManual}>
              <input
                type="text"
                className={styles.inputManual}
                placeholder="Ex: Compra mercado pago 50 reais cartao itau..."
                value={textoManual}
                onChange={(e) => setTextoManual(e.target.value)}
                autoFocus
              />
              <button type="submit" className={styles.btnManualEnviar}>
                Analisar
              </button>
            </form>
          )}
        </div>
      )}

      {/* Modal de Confirmação e Validação Contábil */}
      {modalAberto && resultadoIA && (
        <ModalLancamentoVoz
          resultado={resultadoIA}
          textoOriginal={transcricao || textoManual}
          onClose={() => setModalAberto(false)}
          onSucesso={() => {
            setTranscricao('');
            setTextoManual('');
          }}
        />
      )}
    </div>
  );
}
