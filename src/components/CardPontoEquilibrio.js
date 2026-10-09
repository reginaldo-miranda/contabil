'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useContabil } from '../context/ContabilContext';
import { calcularPontoEquilibrio, getPeriodo } from '../lib/pontoEquilibrio';
import styles from './CardPontoEquilibrio.module.css';

const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const STATUS = {
  superado: { label: '✨ Ponto superado — gerando lucro', cls: 'statusOk' },
  abaixo: { label: '⏳ Abaixo do ponto de equilíbrio', cls: 'statusWarn' },
  margemNegativa: { label: '⚠️ Margem de contribuição negativa', cls: 'statusBad' },
  semFaturamento: { label: '📭 Sem faturamento no período', cls: 'statusMuted' },
  semDados: { label: '📭 Sem movimentação de resultado', cls: 'statusMuted' },
};

export default function CardPontoEquilibrio() {
  const { contasFlat, lancamentos } = useContabil();
  const [periodo, setPeriodo] = useState('mes');

  const pe = useMemo(() => {
    const { dataInicio, dataFim } = getPeriodo(periodo);
    return calcularPontoEquilibrio(contasFlat(), lancamentos, dataInicio, dataFim);
  }, [periodo, contasFlat, lancamentos]);

  const status = STATUS[pe.status];
  const barra = Math.min(pe.percentual, 100);
  const temPE = pe.pontoEquilibrio != null;

  return (
    <section className={styles.card} id="card-ponto-equilibrio" aria-labelledby="pe-titulo">
      <div className={styles.glow} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <span className={styles.icon}>⚖️</span>
          <div>
            <h3 id="pe-titulo" className={styles.title}>Ponto de Equilíbrio Contábil</h3>
            <p className={styles.hint}>Faturamento necessário para cobrir custos fixos e variáveis</p>
          </div>
        </div>

        <div className={styles.toggle} role="tablist" aria-label="Período">
          <button
            id="pe-periodo-mes"
            role="tab"
            aria-selected={periodo === 'mes'}
            className={`${styles.toggleBtn} ${periodo === 'mes' ? styles.toggleActive : ''}`}
            onClick={() => setPeriodo('mes')}
          >
            Mês atual
          </button>
          <button
            id="pe-periodo-ano"
            role="tab"
            aria-selected={periodo === 'ano'}
            className={`${styles.toggleBtn} ${periodo === 'ano' ? styles.toggleActive : ''}`}
            onClick={() => setPeriodo('ano')}
          >
            Ano (YTD)
          </button>
        </div>
      </header>

      <div className={styles.values}>
        <div className={styles.valueBlock}>
          <span className={styles.valueLabel}>Meta de equilíbrio</span>
          <span className={styles.valueBig}>{temPE ? fmtBRL(pe.pontoEquilibrio) : '—'}</span>
        </div>
        <div className={`${styles.valueBlock} ${styles.alignRight}`}>
          <span className={styles.valueLabel}>Faturamento realizado</span>
          <span className={`${styles.valueBig} ${styles.valueAccent}`}>{fmtBRL(pe.faturamento)}</span>
        </div>
      </div>

      <div className={styles.progressRow}>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={Math.round(pe.percentual)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`${styles.progressFill} ${pe.status === 'superado' ? styles.fillOk : styles.fillWarn}`}
            style={{ width: `${barra}%` }}
          />
        </div>
        <span className={styles.progressPct}>{temPE ? fmtPct(pe.percentual) : '—'}</span>
      </div>

      <div className={`${styles.status} ${styles[status.cls]}`}>
        {status.label}
        {pe.diferenca != null && pe.status === 'abaixo' && (
          <strong> · faltam {fmtBRL(Math.abs(pe.diferenca))}</strong>
        )}
        {pe.diferenca != null && pe.status === 'superado' && (
          <strong> · {fmtBRL(pe.diferenca)} acima da meta</strong>
        )}
      </div>

      {pe.projecaoDias && (
        <div className={styles.ritmoBox} id="pe-projecao-dias">
          <div className={styles.ritmoHeader}>
            <span className={styles.ritmoIcon}>⏱️</span>
            <div className={styles.ritmoInfo}>
              <div className={styles.ritmoTituloRow}>
                <span className={styles.ritmoTitulo}>
                  Ritmo: <strong>{fmtBRL(pe.projecaoDias.mediaDiaria)}/dia</strong>
                </span>
                {pe.projecaoDias.usouMesAnterior && (
                  <span className={styles.ritmoTagRef} title="Custos fixos estimados a partir do mês anterior fechado">
                    base fixos mês anterior
                  </span>
                )}
              </div>
              <p className={styles.ritmoDesc}>
                {periodo === 'mes' ? (
                  pe.projecaoDias.statusDias === 'atingido' ? (
                    <>
                      Meta de equilíbrio coberta! Os próximos{' '}
                      <strong>{pe.projecaoDias.diasLucroPuroRestantes} dias</strong> do mês geram lucro operacional puro.
                    </>
                  ) : pe.projecaoDias.statusDias === 'noPrazo' ? (
                    <>
                      Faltam cerca de <strong>{pe.projecaoDias.diasRestantes} dias</strong> de faturamento neste ritmo{' '}
                      para cobrir todos os custos (previsão de empate: <strong>dia {pe.projecaoDias.dataEstimadaFormatada}</strong>).
                    </>
                  ) : (
                    <>
                      Ritmo insuficiente para o mês: seriam necessários{' '}
                      <strong>{pe.projecaoDias.diasTotaisNecessarios} dias</strong> para atingir o equilíbrio{' '}
                      (ultrapassa o calendário em <strong>{pe.projecaoDias.diasExcedentes} dias</strong>).
                    </>
                  )
                ) : (
                  pe.projecaoDias.statusDias === 'atingido' ? (
                    <>Ponto de equilíbrio anual já alcançado neste exercício!</>
                  ) : pe.projecaoDias.statusDias === 'noPrazo' ? (
                    <>
                      Equilíbrio anual projetado para <strong>{pe.projecaoDias.dataEstimadaFormatada}</strong> mantendo{' '}
                      o ritmo atual de vendas.
                    </>
                  ) : (
                    <>
                      Ritmo anual insuficiente: seriam necessários{' '}
                      <strong>{pe.projecaoDias.diasTotaisNecessarios} dias</strong> de faturamento no ano.
                    </>
                  )
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <footer className={styles.metrics}>
        <div className={styles.metric}>
          <span>Margem de contribuição</span>
          <strong className={pe.imc < 0 ? styles.neg : ''}>{fmtPct(pe.imc * 100)}</strong>
        </div>
        <div className={styles.metric}>
          <span>Custos variáveis</span>
          <strong>{fmtBRL(pe.custosVariaveis)}</strong>
        </div>
        <div className={styles.metric}>
          <span>Custos fixos</span>
          <strong>{fmtBRL(pe.custosFixos)}</strong>
        </div>
        <Link href="/dre" id="pe-ver-dre" className={styles.link}>
          Ver na DRE <span>→</span>
        </Link>
      </footer>
    </section>
  );
}
