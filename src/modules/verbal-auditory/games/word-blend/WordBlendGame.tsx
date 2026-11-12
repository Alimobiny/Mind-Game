import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import { createSpeechController, resolvePresentationMode } from '../../audio/speech'
import type { WordBlendTrial } from './engine'
import styles from './word-blend.module.css'

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
  const submittedRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const speechRef = useRef<ReturnType<typeof createSpeechController> | null>(null)
  if (speechRef.current === null) {
    speechRef.current = createSpeechController()
  }
  const speech = speechRef.current
  const mode = useMemo(() => resolvePresentationMode(speech), [speech])

  useEffect(() => {
    return () => speech.cancel()
  }, [speech])

  useEffect(() => {
    submittedRef.current = false
    setPhase('present')
    setPartIndex(0)
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // فاز ارائه: قطعهٔ جاری + تایمرِ رفتن به قطعهٔ بعد (یا فاز انتخاب)
  useEffect(() => {
    if (phase !== 'present') return
    const part = trial.entry.parts[partIndex]
    if (part === undefined) {
      const t = window.setTimeout(() => setPhase('choose'), 300)
      timersRef.current.push(t)
      return
    }
    if (mode === 'speech') {
      speech.speak(part, { rate: 0.85 })
    }
    const timer = window.setTimeout(() => setPartIndex((i) => i + 1), trial.partGapMs)
    timersRef.current.push(timer)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, partIndex, trial.trialIndex])

  const currentPart = trial.entry.parts[partIndex]

  const choose = (index: number) => {
    if (submittedRef.current || ctx.paused) return
    if (phase !== 'choose') return
    submittedRef.current = true
    speech.cancel()
    void ctx.submit(index).then((result) => {
      if (result.accepted && !result.sessionCompleted) {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان تمام/قطع شده — بی‌اثر
        }
      } else if (!result.accepted) {
        submittedRef.current = false
      }
    })
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
            <div className={styles.speakerIcon} aria-hidden="true">🔊</div>
          )}
          <p className={styles.progress}>
            قطعهٔ {toFaDigits(Math.min(partIndex + 1, trial.entry.parts.length))} از{' '}
            {toFaDigits(trial.entry.parts.length)}
          </p>
        </div>
      ) : (
        <div className={styles.chooseArea} data-testid="wb-choices" data-correct-index={trial.correctIndex}>
          <p className={gameStyles.hint}>واژهٔ ساخته‌شده از این قطعات کدام است؟</p>
          <div className={styles.choiceGrid} role="group" aria-label="گزینه‌ها">
            {trial.choices.map((word, index) => (
              <button
                key={word}
                type="button"
                className={styles.choiceButton}
                data-testid="wb-option"
                data-index={index}
                data-correct={index === trial.correctIndex ? 'true' : 'false'}
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
