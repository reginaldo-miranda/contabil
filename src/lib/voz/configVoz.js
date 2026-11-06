// Configurações de velocidade, áudio e comportamento do Copilot de Voz
// Valendo de forma unificada e global para TODAS as empresas no MySQL.

export const CONFIG_VOZ_PADRAO = {
  intervaloContasMs: 1200,      // Tempo de silêncio para avançar entre Débito e Crédito (ms)
  intervaloGeralMs: 1800,       // Tempo de silêncio para frases completas / valores (ms)
  velocidadeFala: 1.10,         // Taxa da voz de síntese do assistente (0.8x a 1.4x)
  resfriamentoEcoMs: 200,       // Pausa acústica após o bot falar antes de abrir mic (ms)
  estiloResposta: 'curto',      // 'curto' ("Qual o crédito?") ou 'completo' ("Por favor, informe a conta...")
  wakeWordHabilitada: true,     // Escuta da palavra "Contábil" em segundo plano
};

export const PRESETS_VELOCIDADE = {
  NINJA: {
    id: 'NINJA',
    nome: '🚀 Turbo / Ninja',
    descricao: 'Intervalo de 0.8s, fala ágil (1.25x). Máxima velocidade e agilidade entre contas.',
    frasePrevia: 'Modo Ninja ativado. Próximo passo rápido.',
    config: {
      intervaloContasMs: 800,
      intervaloGeralMs: 1400,
      velocidadeFala: 1.25,
      resfriamentoEcoMs: 150,
      estiloResposta: 'curto',
    },
  },
  AGIL: {
    id: 'AGIL',
    nome: '⚡ Ágil (Padrão)',
    descricao: 'Intervalo de 1.2s, fala natural (1.10x). Equilíbrio ideal entre fluidez e precisão.',
    frasePrevia: 'Modo Ágil selecionado. Ritmo padrão equilibrado.',
    config: {
      intervaloContasMs: 1200,
      intervaloGeralMs: 1800,
      velocidadeFala: 1.10,
      resfriamentoEcoMs: 200,
      estiloResposta: 'curto',
    },
  },
  TRANQUILO: {
    id: 'TRANQUILO',
    nome: '🚶 Tranquilo',
    descricao: 'Intervalo de 2.0s, fala pausada (1.0x). Mais tempo para pensar antes de falar a próxima conta.',
    frasePrevia: 'Modo Tranquilo selecionado. Ritmo pausado e detalhado.',
    config: {
      intervaloContasMs: 2000,
      intervaloGeralMs: 2600,
      velocidadeFala: 1.0,
      resfriamentoEcoMs: 300,
      estiloResposta: 'completo',
    },
  },
};

const CHAVE_STORAGE_GLOBAL = 'contabil:configVoz:global';

// Obtém a configuração do cache local imediato
export function obterConfigLocal() {
  if (typeof window === 'undefined') return { ...CONFIG_VOZ_PADRAO };
  try {
    const raw = window.localStorage.getItem(CHAVE_STORAGE_GLOBAL);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...CONFIG_VOZ_PADRAO, ...parsed };
    }
  } catch (e) {
    console.warn('Erro ao ler configVoz do localStorage:', e);
  }
  return { ...CONFIG_VOZ_PADRAO };
}

// Salva a configuração no cache local imediato e notifica toda a janela
export function salvarConfigLocal(config) {
  if (typeof window === 'undefined') return;
  try {
    const mesclado = { ...CONFIG_VOZ_PADRAO, ...config };
    window.localStorage.setItem(CHAVE_STORAGE_GLOBAL, JSON.stringify(mesclado));
    window.dispatchEvent(new CustomEvent('contabil:configVozMudou', { detail: { config: mesclado } }));
  } catch (e) {
    console.warn('Erro ao salvar configVoz no localStorage:', e);
  }
}

// Busca da API do banco de dados (MySQL) para todo o sistema
export async function carregarConfigGlobal() {
  try {
    const res = await fetch('/api/sistema/configuracoes-voz');
    if (res.ok) {
      const data = await res.json();
      if (data?.configuracoes) {
        salvarConfigLocal(data.configuracoes);
        return { ...CONFIG_VOZ_PADRAO, ...data.configuracoes };
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar configurações de voz do sistema:', e);
  }
  return obterConfigLocal();
}

// Salva na API do banco de dados (MySQL) para TODAS as empresas de uma só vez
export async function salvarConfigGlobal(novaConfig) {
  const mesclado = { ...CONFIG_VOZ_PADRAO, ...novaConfig };
  salvarConfigLocal(mesclado);

  try {
    const res = await fetch('/api/sistema/configuracoes-voz', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mesclado),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.configuracoes) {
        salvarConfigLocal(data.configuracoes);
        return { ...CONFIG_VOZ_PADRAO, ...data.configuracoes };
      }
    }
  } catch (e) {
    console.error('Erro ao sincronizar configurações de voz com o MySQL:', e);
  }
  return mesclado;
}

// Aliases para retrocompatibilidade
export function obterChaveStorage() {
  return CHAVE_STORAGE_GLOBAL;
}
export async function carregarConfigEmpresa() {
  return carregarConfigGlobal();
}
export async function salvarConfigEmpresa(_empresaId, novaConfig) {
  return salvarConfigGlobal(novaConfig);
}
