import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { SpeakerGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import { createSpeechController, resolvePresentationMode } from '../../audio/speech'
import { scheduleCadence } from '../../../shared/presentation-resume'
import type { AudioRecallTrial } from './engine'
import styles from './audio-recall.module.css'
import { e2e } from '../../../../utils/e2e'

/**
 * یادآوری شنیداری — UI
 *
 * فاز ارائه: واژه‌ها یکی‌یکی — در حالت صوتی با صدای دستگاه خوانده می‌شوند
 * (SpeechSynthesis محلی) و در جبرانِ نمایشی، واژه فلاش می‌شود؛ ریتم پیشروی
 * در هر دو حالت تایمری و یکسان است تا رفتار قابل پیش‌بینی بماند.
 * فاز بازیابی: لمس گزینه‌ها به همان ترتیب شنیدن/دیدن. یک submit در پایان —
 * قرارداد یک-submit-per-trial؛ هر سه گارد الزامی در useTrialGuards است.
 */

type Phase = 'study' | 'recall'

export function AudioRecallGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as AudioRecallTrial
  const [phase, setPhase] = useState<Phase>('study')
  const [itemIndex, setItemIndex] = useState(0)
  const [selected, setSelected] = useState<readonly string[]>([])
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن جدول بازیابی سنجیده
  // شود نه از شروع ارائهٔ شنیداری (§۲-۲ ممیزی). idempotent؛ مسیر بازنصب مکث هم پوشش دارد.
  useEffect(() => {
    if (phase === 'recall') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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

  // فاز ارائه: اسلاتِ هر واژه wordSlotMs است. بازنصبِ پس از مکث
  // (PAUSED=unmount): اسلات‌های گذشته بازپخش نمی‌شوند؛ فقط اسلاتِ
  // در-جریان (واژهٔ بریده‌شده) از ماندهٔ زمانش ادامه می‌یابد و انتخاب‌های
  // نجات‌یافته برمی‌گردند (GAMES-AUDIT §۲-۱)
  useEffect(() => {
    const interrupted = ctx.trialPresentation.wasInterrupted()
    const elapsedMs = interrupted ? ctx.trialElapsedMs() : 0
    const saved = interrupted ? ctx.trialPresentation.get<readonly string[]>('selected') : undefined
    setSelected(saved ?? [])
    setItemIndex(0)

    const totalMs = trial.studyWords.length * trial.wordSlotMs
    const finishStudy = () => {
      speech.cancel()
      // گذر کوتاه به بازیابی — همان مکث ۴۰۰msی نسخهٔ پیشین
      guards.setTrackedTimeout(() => setPhase('recall'), 400)
    }
    const timers = scheduleCadence(
      trial.studyWords.map((word, i) => ({
        startAt: i * trial.wordSlotMs,
        displayMs: trial.wordSlotMs,
        onShow: () => {
          setItemIndex(i)
          if (mode === 'speech') speech.speak(word, { rate: 0.9 })
        },
        onHide: () => undefined,
      })),
      totalMs,
      finishStudy,
      elapsedMs,
    )
    if (elapsedMs >= totalMs) {
      // ارائه تمام شده بود — مستقیم به بازیابی
      speech.cancel()
      setPhase('recall')
    } else {
      setPhase('study')
    }
    for (const t of timers) guards.trackTimeoutId(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const toggleWord = (word: string) => {
    if (guards.isSubmitted() || ctx.paused) return
    if (phase !== 'recall') return
    const next = selected.includes(word) ? selected.filter((w) => w !== word) : [...selected, word]
    // نجات انتخاب‌ها برای بازنصبِ مکث
    ctx.trialPresentation.set('selected', next)
    setSelected(next)
  }

  const clearSelection = () => {
    if (guards.isSubmitted() || ctx.paused) return
    ctx.trialPresentation.set('selected', [])
    setSelected([])
  }

  const complete = selected.length === trial.studyWords.length

  const submit = () => {
    if (guards.isSubmitted() || ctx.paused) return
    if (!complete) return
    speech.cancel()
    void guards.submitOnce(selected)
  }

  const currentWord = trial.studyWords[itemIndex]

  return (
    <div className={styles.stage}>
      {phase === 'study' ? (
        <div
          className={styles.studyArea}
          data-testid="ar-study"
          data-word={e2e(currentWord ?? '')}
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
          data-expected-order={e2e(trial.studyWords.join(','))}
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
                  data-word={e2e(word)}
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
