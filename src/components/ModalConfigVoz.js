'use client';

import { useState, useEffect, useRef } from 'react';
import { audioVoz } from '@/utils/audioVoz';
import {
  CONFIG_VOZ_PADRAO,
  PRESETS_VELOCIDADE,
  obterConfigLocal,
  salvarConfigLocal,
  carregarConfigGlobal,
  salvarConfigGlobal,
} from '@/lib/voz/configVoz';
import styles from './ModalConfigVoz.module.css';

export default function ModalConfigVoz({ aberta, onFechar, onSalvo }) {
  const [config, setConfig] = useState(() => obterConfigLocal());
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [presetAtivo, setPresetAtivo] = useState(null);
  const debounceTimerRef = useRef(null);

  // Carrega configurações globais do banco de dados (MySQL) quando abre
  useEffect(() => {
    if (!aberta) return;
    let cancelado = false;
    carregarConfigGlobal().then((c) => {
      if (!cancelado && c) {
        setConfig(c);
        identificarPreset(c);
      }
    });
    return () => { cancelado = true; };
  }, [aberta]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  function identificarPreset(cfg) {
    if (cfg.intervaloContasMs <= 900 && cfg.velocidadeFala >= 1.20) {
      setPresetAtivo('NINJA');
    } else if (cfg.intervaloContasMs === 1200 && cfg.velocidadeFala === 1.10) {
      setPresetAtivo('AGIL');
    } else if (cfg.intervaloContasMs >= 2000 && cfg.velocidadeFala <= 1.0) {
      setPresetAtivo('TRANQUILO');
    } else {
      setPresetAtivo(null);
    }
  }

  if (!aberta) return null;

  // Auto-salva imediatamente ao clicar em um preset
  const aplicarPreset = (chave) => {
    const preset = PRESETS_VELOCIDADE[chave];
    if (!preset) return;
    const nova = { ...config, ...preset.config };
    setConfig(nova);
    setPresetAtivo(chave);
    
    // 1. Aplica na sessão ativa imediatamente
    salvarConfigLocal(nova);
    if (onSalvo) onSalvo(nova);

    // 2. Salva no banco de dados para todas as empresas
    salvarConfigGlobal(nova).catch(err => console.warn('Erro ao auto-salvar preset:', err));

    setFeedback(`⚡ ${preset.nome} ativado e salvo!`);

    // Fala prévia imediata no ritmo escolhido
    audioVoz.falar(preset.frasePrevia, { rate: preset.config.velocidadeFala });

    setTimeout(() => setFeedback(''), 3000);
  };

  // Ao mover sliders ou mudar estilo: aplica na hora localmente e faz auto-save no banco com debounce
  const atualizarCampo = (campo, valor) => {
    const nova = { ...config, [campo]: valor };
    setConfig(nova);
    identificarPreset(nova);

    // 1. Imediato na sessão atual
    salvarConfigLocal(nova);
    if (onSalvo) onSalvo(nova);

    setFeedback('⚡ Velocidade aplicada em tempo real.');

    // 2. Debounce para persistir no banco (MySQL) sem sobrecarga
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      salvarConfigGlobal(nova)
        .then(() => setFeedback('✅ Salvo no banco de dados com sucesso!'))
        .catch(() => setFeedback('⚠️ Aplicado na sessão atual'))
        .finally(() => setTimeout(() => setFeedback(''), 2500));
    }, 450);
  };

  const testarVoz = () => {
    const texto = config.estiloResposta === 'curto'
      ? 'Qual o crédito? Lançamento pronto para o próximo passo.'
      : 'Por favor, informe a conta a crédito para o lançamento.';
    audioVoz.falar(texto, { rate: config.velocidadeFala });
  };

  const salvarManual = async () => {
    setSalvando(true);
    setFeedback('Gravando no banco de dados para todas as empresas...');
    try {
      const salva = await salvarConfigGlobal(config);
      setConfig(salva);
      setFeedback('✅ Configurações salvas para todas as empresas!');
      if (onSalvo) onSalvo(salva);
      setTimeout(() => {
        setFeedback('');
        onFechar();
      }, 1000);
    } catch (e) {
      setFeedback('❌ Erro ao salvar configurações.');
    } finally {
      setSalvando(false);
    }
  };

  const restaurarPadroes = () => {
    aplicarPreset('AGIL');
  };

  const segundosContas = (config.intervaloContasMs / 1000).toFixed(1);
  const segundosGerais = (config.intervaloGeralMs / 1000).toFixed(1);

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitulo}>
            <span>⚙️</span>
            <h3>Ajustes de Velocidade e Voz</h3>
            <span className={styles.badgeEmpresa}>Todas as Empresas</span>
          </div>
          <button className={styles.btnFechar} onClick={onFechar} title="Fechar (Esc)">✕</button>
        </div>

        <div className={styles.corpo}>
          <div className={styles.bannerNuvem}>
            <span>🌐</span>
            <div>
              <strong>Salvo no Banco de Dados (MySQL) para Todas as Empresas</strong>
              <div>Ao salvar aqui, todas as empresas ativas ou novas usarão este mesmo ritmo em qualquer computador.</div>
            </div>
          </div>

          <div>
            <div className={styles.secaoTitulo}>Modos de Velocidade Rápidos</div>
            <div className={styles.presetsGrid}>
              {Object.entries(PRESETS_VELOCIDADE).map(([chave, p]) => (
                <button
                  key={chave}
                  type="button"
                  className={`${styles.btnPreset} ${presetAtivo === chave ? styles.btnPresetAtivo : ''}`}
                  onClick={() => aplicarPreset(chave)}
                  title={p.descricao}
                >
                  <span className={styles.presetNome}>{p.nome}</span>
                  <span className={styles.presetTempo}>{(p.config.intervaloContasMs / 1000).toFixed(1)}s de intervalo</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.campoGrupo}>
            <div className={styles.campoCabecalho}>
              <span className={styles.campoRotulo}>⚡ Intervalo entre Contas (Débito ➔ Crédito)</span>
              <span className={styles.campoValor}>{segundosContas}s</span>
            </div>
            <input
              type="range"
              min="600"
              max="2500"
              step="100"
              value={config.intervaloContasMs}
              onChange={(e) => atualizarCampo('intervaloContasMs', parseInt(e.target.value, 10))}
              className={styles.slider}
            />
            <span className={styles.campoDescricao}>
              Tempo de silêncio aguardado para avançar para a próxima conta. Menor = mais rápido (0.8s Ninja / 1.2s Ágil).
            </span>
          </div>

          <div className={styles.campoGrupo}>
            <div className={styles.campoCabecalho}>
              <span className={styles.campoRotulo}>🗣️ Velocidade da Fala da Assistente</span>
              <span className={styles.campoValor}>{config.velocidadeFala.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.85"
              max="1.40"
              step="0.05"
              value={config.velocidadeFala}
              onChange={(e) => atualizarCampo('velocidadeFala', parseFloat(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.linhaAcao}>
              <span className={styles.campoDescricao}>Velocidade em que a assistente fala instruções e confirmações.</span>
              <button type="button" className={styles.btnTestarVoz} onClick={testarVoz}>
                ▶ Testar Voz
              </button>
            </div>
          </div>

          <div className={styles.campoGrupo}>
            <div className={styles.campoCabecalho}>
              <span className={styles.campoRotulo}>💬 Estilo de Instrução</span>
            </div>
            <div className={styles.opcoesEstilo}>
              <button
                type="button"
                className={`${styles.btnEstilo} ${config.estiloResposta === 'curto' ? styles.btnEstiloAtivo : ''}`}
                onClick={() => atualizarCampo('estiloResposta', 'curto')}
              >
                <span className={styles.btnEstiloTitulo}>⚡ Ultra-Curto</span>
                <span className={styles.btnEstiloExemplo}>"Qual o crédito?", "Qual o valor?"</span>
              </button>
              <button
                type="button"
                className={`${styles.btnEstilo} ${config.estiloResposta === 'completo' ? styles.btnEstiloAtivo : ''}`}
                onClick={() => atualizarCampo('estiloResposta', 'completo')}
              >
                <span className={styles.btnEstiloTitulo}>💬 Completo</span>
                <span className={styles.btnEstiloExemplo}>"Por favor, informe a conta de crédito"</span>
              </button>
            </div>
          </div>

          <div className={styles.campoGrupo}>
            <div className={styles.campoCabecalho}>
              <span className={styles.campoRotulo}>⏱️ Tempo de Silêncio para Frase Livre</span>
              <span className={styles.campoValor}>{segundosGerais}s</span>
            </div>
            <input
              type="range"
              min="1000"
              max="3000"
              step="100"
              value={config.intervaloGeralMs}
              onChange={(e) => atualizarCampo('intervaloGeralMs', parseInt(e.target.value, 10))}
              className={styles.slider}
            />
            <span className={styles.campoDescricao}>
              Tempo de silêncio para frases longas e completas antes de enviar para processamento.
            </span>
          </div>

          {feedback && (
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: feedback.startsWith('✅') ? '#16a34a' : '#4f46e5', textAlign: 'center' }}>
              {feedback}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.btnRestaurar} onClick={restaurarPadroes} disabled={salvando}>
            Restaurar Padrão
          </button>
          <button type="button" className={styles.btnSalvar} onClick={salvarManual} disabled={salvando}>
            {salvando ? 'Gravando...' : '✓ Pronto (Salvo Automaticamente)'}
          </button>
        </div>
      </div>
    </div>
  );
}
