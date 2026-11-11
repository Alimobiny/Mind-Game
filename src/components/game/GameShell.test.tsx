import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { RecordedTrial } from '../../core/types'
import { summarizeOutcomes } from '../../core/scoring/scoring'
import {
  InMemoryExerciseSettingsRepository,
  InMemorySessionRepository,
  InMemoryTrialEventRepository,
} from '../../data/repositories/in-memory-repositories'
import type { RegisteredExercise } from '../../core/registry/game-registry'
import type { ActiveGameContext, GameShellProps } from './GameShell'
import { GameShell } from './GameShell'

/**
 * بازی آزمایشی دو مرحله‌ای: هر پاسخ درست = رشته 'yes'.
 * GameShell باید چرخه READY→COUNTDOWN→ACTIVE→COMPLETED را کامل کند.
 */
function makeRegistered(): RegisteredExercise {
  return {
    definition: {
      id: 'ui-fake',
      version: '1.0.0',
      contentVersion: '1',
      domain: 'working-memory',
      createSession(sessionId: string, config: { difficulty: number }, seed: number) {
        return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
      },
      nextTrial(state: never) {
        const s = state as unknown as { nextTrialIndex: number }
        const trial = { trialIndex: s.nextTrialIndex, responseWindowMs: null }
        return {
          state: { ...(state as object), nextTrialIndex: s.nextTrialIndex + 1, currentTrial: trial },
          trial,
        } as never
      },
      submitAnswer(state: never, answer: unknown, reactionTimeMs: number) {
        const s = state as unknown as {
          currentTrial: { trialIndex: number } | null
          results: RecordedTrial[]
        }
        const trial = s.currentTrial
        if (!trial) throw new Error('no trial')
        const correct = answer === 'yes'
        const record: RecordedTrial = {
          trialIndex: trial.trialIndex,
          stimulus: null,
          expected: 'yes',
          given: answer,
          outcome: correct ? 'correct' : 'incorrect',
          correct,
          reactionTimeMs,
        }
        return { ...(state as object), currentTrial: null, results: [...s.results, record] } as never
      },
      isComplete(state: never) {
        return (state as unknown as { results: RecordedTrial[] }).results.length >= 2
      },
      getSummary(state: never) {
        const s = state as unknown as {
          sessionId: string
          config: { difficulty: number }
          results: RecordedTrial[]
        }
        return {
          exerciseId: 'ui-fake',
          sessionId: s.sessionId,
          exerciseVersion: '1.0.0',
          contentVersion: '1',
          domain: 'working-memory',
          difficulty: s.config.difficulty,
          ...summarizeOutcomes(s.results),
          metrics: { custom: 7 },
        }
      },
    },
    meta: {
      id: 'ui-fake',
      nameFa: 'بازی آزمایشی',
      descriptionFa: 'تست پوسته مشترک',
      domain: 'working-memory',
      exerciseType: 'numeric',
      effects: ['working-memory'],
      version: '1.0.0',
      contentVersion: '1',
      instructionsFa: ['مرحله را پاسخ بده'],
      difficultyLevels: [1, 2, 3, 4, 5],
      metricLabelsFa: { custom: 'متریک آزمایشی' },
    },
  }
}

function FakeTrial({ ctx }: { ctx: ActiveGameContext }) {
  return (
    <div>
      <p>مرحله {ctx.trial.trialIndex + 1}</p>
      <button
        type="button"
        onClick={() => void ctx.submit('yes').then((r) => { if (r.accepted && !r.sessionCompleted) ctx.advance() })}
      >
        پاسخ
      </button>
    </div>
  )
}

function makeProps(overrides: Partial<GameShellProps> = {}): GameShellProps {
  return {
    registered: makeRegistered(),
    config: { difficulty: 2 },
    deps: {
      sessions: new InMemorySessionRepository(),
      trialEvents: new InMemoryTrialEventRepository(),
      settings: new InMemoryExerciseSettingsRepository(),
    },
    renderTrial: (ctx) => <FakeTrial ctx={ctx} />,
    onExit: () => {},
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

/** عبور از دستورالعمل و شمارش معکوس تا رسیدن به فاز ACTIVE */
async function reachActivePhase(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'شروع تمرین' }))
  // شمارش معکوس زنجیره‌ای: هر تیک باید render شود تا بعدی زمان‌بندی شود
  await screen.findByText('۳')
  vi.advanceTimersByTime(1050)
  await screen.findByText('۲')
  vi.advanceTimersByTime(1050)
  await screen.findByText('۱')
  vi.advanceTimersByTime(1050)
  return screen.findByText('مرحله 1')
}

describe('GameShell — چرخه کامل UI', () => {
  it('دستورالعمل → شمارش معکوس → دو مرحله بازی → صفحه نتایج', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const props = makeProps()

    render(
      <MemoryRouter>
        <GameShell {...props} />
      </MemoryRouter>,
    )

    // فاز READY: دستورالعمل + دکمه شروع
    expect(await screen.findByTestId('instructions')).toBeInTheDocument()
    expect(screen.getAllByText('بازی آزمایشی').length).toBeGreaterThan(0)

    await reachActivePhase(user)

    await user.click(screen.getByRole('button', { name: 'پاسخ' }))

    // مرحله ۲ و پایان
    expect(await screen.findByText('مرحله 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'پاسخ' }))

    // نتایج
    expect(await screen.findByTestId('results')).toBeInTheDocument()
    expect(screen.getByText('جلسه کامل شد')).toBeInTheDocument()
    expect(screen.getByText('متریک آزمایشی')).toBeInTheDocument()
  }, 20_000)

  it('جلسه و رویدادهای مرحله در repository ذخیره می‌شود', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const sessions = new InMemorySessionRepository()
    const trials = new InMemoryTrialEventRepository()
    const props = makeProps({ deps: { sessions, trialEvents: trials, settings: new InMemoryExerciseSettingsRepository() } })

    render(
      <MemoryRouter>
        <GameShell {...props} />
      </MemoryRouter>,
    )

    await reachActivePhase(user)
    await user.click(screen.getByRole('button', { name: 'پاسخ' }))
    await user.click(await screen.findByRole('button', { name: 'پاسخ' }))
    await screen.findByTestId('results')

    const all = await sessions.listRecent(10)
    expect(all).toHaveLength(1)
    expect(all[0]?.status).toBe('completed')
    expect(all[0]?.difficulty).toBe(2)
    expect(all[0]?.summary?.correctTrials).toBe(2)
    expect(await trials.countBySession(all[0]?.id as string)).toBe(2)
  }, 20_000)

  it('در فاز شمارش معکوس دکمه خروج دیده می‌شود و جلسه را aborted می‌کند', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const sessions = new InMemorySessionRepository()
    const props = makeProps({ deps: { sessions, trialEvents: new InMemoryTrialEventRepository(), settings: new InMemoryExerciseSettingsRepository() } })

    render(
      <MemoryRouter>
        <GameShell {...props} />
      </MemoryRouter>,
    )

    // تا میانهٔ شمارش معکوس جلو برویم — بدون دکمهٔ خروج، تنها راه خروج
    // همین ۳ ثانیه، تعویض تب (غیرمستقیم) بود
    await user.click(await screen.findByRole('button', { name: 'شروع تمرین' }))
    await screen.findByText('۳')

    const exit = screen.getByRole('button', { name: 'خروج از جلسه' })
    expect(exit).toBeInTheDocument()

    // خروج دوتایی-تأیید
    await user.click(exit)
    await user.click(screen.getByRole('button', { name: 'قطع جلسه — تأیید' }))

    expect(await screen.findByText('این جلسه نیمه‌کاره رها شد.')).toBeInTheDocument()
    const all = await sessions.listRecent(10)
    expect(all[0]?.status).toBe('aborted')
  }, 20_000)
})
