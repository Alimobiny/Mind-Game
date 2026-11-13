import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { SpeakerGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import { createSpeechController, resolvePresentationMode } from '../../audio/speech'
import type { AudioRecallTrial } from './engine'
import styles from './audio-recall.module.css'

/**
 * یادآوری شنیداری — UI
 *
 * فاز ارائه: واژه‌ها یکی‌یکی — در حالت صوتی با صدای دستگاه خوانده می‌شوند
 * (SpeechSynthesis محلی) و در جبرانِ نمایشی، واژه فلاش می‌شود؛ ریتم پیشروی
 * در هر دو حالت تایمری و یکسان است تا رفتار قابل پیش‌بینی بماند.
 * فاز بازیابی: لمس گزینه‌ها به همان ترتیب شنیدن/دیدن. یک submit در پایان —
 * قرارداد یک-submit-per-trial؛ هر سه گارد الزامی رعایت شده است.
 */

type Phase = 'study' | 'recall'

export function AudioRecallGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as AudioRecallTrial
  const [phase, setPhase] = useState<Phase>('study')
  const [itemIndex, setItemIndex] = useState(0)
  const [selected, setSelected] = useState<readonly string[]>([])
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  // کنترلر گفتار یک‌بار ساخته می‌شود؛ در unmount لغو می‌شود
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
    setPhase('study')
    setItemIndex(0)
    setSelected([])
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // فاز ارائه: واژهٔ جاری + تایمرِ رفتن به بعدی (یا بازیابی)
  useEffect(() => {
    if (phase !== 'study') return
    const word = trial.studyWords[itemIndex]
    if (word === undefined) {
      // همهٔ واژه‌ها ارائه شد → گذر کوتاه به بازیابی
      const t = window.setTimeout(() => setPhase('recall'), 400)
      timersRef.current.push(t)
      return
    }
    if (mode === 'speech') {
      speech.speak(word, { rate: 0.9 })
    }
    const timer = window.setTimeout(() => setItemIndex((i) => i + 1), trial.wordSlotMs)
    timersRef.current.push(timer)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, itemIndex, trial.trialIndex])

  const toggleWord = (word: string) => {
    if (submittedRef.current || ctx.paused) return
    if (phase !== 'recall') return
    setSelected((current) =>
      current.includes(word) ? current.filter((w) => w !== word) : [...current, word],
    )
  }

  const clearSelection = () => {
    if (submittedRef.current || ctx.paused) return
    setSelected([])
  }

  const complete = selected.length === trial.studyWords.length

  const submit = () => {
    if (submittedRef.current || ctx.paused) return
    if (!complete) return
    submittedRef.current = true
    speech.cancel()
    void ctx.submit(selected).then((result) => {
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

  const currentWord = trial.studyWords[itemIndex]

  return (
    <div className={styles.stage}>
      {phase === 'study' ? (
        <div
          className={styles.studyArea}
          data-testid="ar-study"
          data-word={currentWord ?? ''}
          data-item-index={itemIndex}
        >
          <p className={gameStyles.hint}>
            {mode === 'speech' ? 'گوش کن و به ترتیب به خاطر بسپار' : 'واژه‌ها را به ترتیب به خاطر بسپار'}
          </p>
          {mode === 'visual' && currentWord !== undefined ? (
            <div className={styles.wordFlash}>{currentWord}</div>
          ) : (
            <div className={styles.speakerIcon} aria-hidden="true">
              <SpeakerGlyph size={30} />
            </div>
          )}
          <p className={styles.progress}>
            {toFaDigits(Math.min(itemIndex + 1, trial.studyWords.length))} از{' '}
            {toFaDigits(trial.studyWords.length)}
          </p>
        </div>
      ) : (
        <div
          className={styles.recallArea}
          data-testid="ar-recall"
          data-expected-order={trial.studyWords.join(',')}
        >
          <p className={gameStyles.hint}>
            واژه‌ها را به همان ترتیب که {mode === 'speech' ? 'شنیدی' : 'دیدی'} انتخاب کن
          </p>

          {selected.length > 0 ? (
            <div className={styles.selectedRow} aria-label="ترتیب انتخاب‌شده">
              {selected.map((word, i) => (
                <span key={`${word}-${i}`} className={styles.chip}>
                  <span className={styles.chipNumber}>{toFaDigits(i + 1)}</span> {word}
                </span>
              ))}
            </div>
          ) : null}

          <div className={styles.optionGrid} role="group" aria-label="گزینه‌ها">
            {trial.recallOptions.map((word) => {
              const order = selected.indexOf(word)
              return (
                <button
                  key={word}
                  type="button"
                  className={`${styles.optionButton} ${order !== -1 ? styles.optionSelected : ''}`}
                  data-testid="ar-option"
                  data-word={word}
                  onClick={() => toggleWord(word)}
                >
                  {order !== -1 ? <span className={styles.optionOrder}>{toFaDigits(order + 1)}</span> : null}
                  {word}
                </button>
              )
            })}
          </div>

          <div className={styles.actionRow}>
            <button type="button" className={styles.secondaryButton} onClick={clearSelection} disabled={selected.length === 0}>
              پاک‌کردن
            </button>
            <button
              type="button"
              className={gameStyles.keyWide}
              onClick={submit}
              disabled={!complete}
              data-testid="ar-submit"
            >
              تأیید
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
