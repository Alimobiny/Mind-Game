import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { SpeakerGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import { createSpeechController, resolvePresentationMode } from '../../audio/speech'
import type { WordBlendTrial } from './engine'
import styles from './word-blend.module.css'
import { e2e } from '../../../../utils/e2e'

/**
 * ترکیب واژه — UI (نخستین بازی روی زیرساخت صدای محلی)
 *
 * فاز ارائه: قطعات واژه یکی‌یکی — با صدای دستگاه (SpeechSynthesis محلی)
 * یا در جبرانِ نمایشی، فلاشِ دیداری. ریتم پیشروی در هر دو حالت تایمری و
 * یکسان است. فاز پاسخ: چهار گزینه؛ انتخاب = ثبت (یک submit، مثل انجمنی).
 * هر سه گارد الزامی رعایت شده است.
 */

type Phase = 'present' | 'choose'

export function WordBlendGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as WordBlendTrial
  const [phase, setPhase] = useState<Phase>('present')
  const [partIndex, setPartIndex] = useState(0)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  const speechRef = useRef<ReturnType<typeof createSpeechController> | null>(null)
  if (speechRef.current === null) {
    speechRef.current = createSpeechController()
  }
  const speech = speechRef.current
  const mode = useMemo(() => resolvePresentationMode(speech), [speech])

  useEffect(() => {
    return () => speech.cancel()
  }, [speech])

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن چهار گزینه سنجیده
  // شود نه از شروع ارائهٔ قطعات (§۲-۲ ممیزی). idempotent.
  useEffect(() => {
    if (phase === 'choose') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => {
    setPhase('present')
    setPartIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // فاز ارائه: قطعهٔ جاری + تایمرِ رفتن به قطعهٔ بعد (یا فاز انتخاب) —
  // تایمرها ردیابی‌شده: با تغییر مرحله/unmount پاک می‌شوند (useTrialGuards)
  useEffect(() => {
    if (phase !== 'present') return
    const part = trial.entry.parts[partIndex]
    if (part === undefined) {
      guards.setTrackedTimeout(() => setPhase('choose'), 300)
      return
    }
    if (mode === 'speech') {
      speech.speak(part, { rate: trial.speechRate ?? 0.85 })
    }
    guards.setTrackedTimeout(() => setPartIndex((i) => i + 1), trial.partGapMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, partIndex, trial.trialIndex])

  const currentPart = trial.entry.parts[partIndex]

  const choose = (index: number) => {
    if (ctx.paused) return
    if (phase !== 'choose') return
    speech.cancel()
    void guards.submitOnce(index)
  }

  return (
    <div className={styles.stage}>
      {phase === 'present' ? (
        <div
          className={styles.presentArea}
          data-testid="wb-part"
          data-part={currentPart ?? ''}
          data-part-index={partIndex}
          data-parts-count={trial.entry.parts.length}
        >
          <p className={gameStyles.hint}>
            {mode === 'speech' ? 'گوش کن — قطعات یک واژه را می‌شنوی' : 'قطعات یک واژه را به ترتیب ببین'}
          </p>
          {mode === 'visual' && currentPart !== undefined ? (
            <div className={styles.partFlash}>{currentPart}</div>
          ) : (
            <div className={styles.speakerIcon} aria-hidden="true">
              <SpeakerGlyph size={30} />
            </div>
          )}
          <p className={styles.progress}>
            قطعهٔ {toFaDigits(Math.min(partIndex + 1, trial.entry.parts.length))} از{' '}
            {toFaDigits(trial.entry.parts.length)}
          </p>
        </div>
      ) : (
        <div className={styles.chooseArea} data-testid="wb-choices" data-correct-index={e2e(trial.correctIndex)}>
          <p className={gameStyles.hint}>واژهٔ ساخته‌شده از این قطعات کدام است؟</p>
          <div className={styles.choiceGrid} role="group" aria-label="گزینه‌ها">
            {trial.choices.map((word, index) => (
              <button
                key={word}
                type="button"
                className={styles.choiceButton}
                data-testid="wb-option"
                data-index={index}
                data-correct={e2e(index === trial.correctIndex ? 'true' : 'false')}
                onClick={() => choose(index)}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
