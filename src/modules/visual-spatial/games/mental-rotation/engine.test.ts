// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  applyRotation,
  configForDifficulty,
  isFullyAsymmetric,
  MENTAL_ROTATION_CONTENT_VERSION,
  MENTAL_ROTATION_ID,
  MENTAL_ROTATION_VERSION,
  mentalRotationDefinition as def,
  mirrorPolyomino,
} from './engine'
import type {
  MentalRotationConfig,
  MentalRotationTrial,
  MentalRotationVerdict,
  PolyominoCell,
} from './engine'

/**
 * تست‌های «چرخش ذهنی» — کاملاً قطعی (seed صریح).
 *
 * اصل غیرمدوری: صحت ground truth با پیاده‌سازی مستقلِ داخل همین فایل
 * بررسی می‌شود (نرمال‌سازی/چرخش/بازتاب محلی)، نه با فراخوانی همان
 * توابع موتور. مجموعهٔ چهار چرخش مستقل از جهت چرخش است، پس مقایسهٔ
 * «عضویت در مدار» اثبات‌پذیر و بدون وابستگی به قرارداد جهت موتور است.
 */

const SEED = 20261111

// ---------- هندسه محلی (مستقل از engine) ----------

type Cell = readonly [number, number]

function localKey(cells: readonly Cell[]): string {
  const minX = Math.min(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  return cells
    .map(([x, y]) => `${x - minX},${y - minY}`)
    .sort()
    .join(';')
}

/** یک ربع‌دور — جهتش برای «مجموعهٔ» مدار مهم نیست (مدار بسته است) */
function localRotate(cells: readonly Cell[]): Cell[] {
  return cells.map(([x, y]) => [y, -x])
}

function localMirror(cells: readonly Cell[]): Cell[] {
  return cells.map(([x, y]) => [-x, y])
}

/** کلیدهای هر ۴ چرخش یک شکل */
function rotationOrbitKeys(cells: readonly Cell[]): Set<string> {
  const keys = new Set<string>()
  let current = cells
  for (let i = 0; i < 4; i++) {
    keys.add(localKey(current))
    current = localRotate(current)
  }
  return keys
}

/** نامتقارن کامل محلی: اجتماع مدار چرخش‌های شکل و آینه‌اش دقیقاً ۸ کلید */
function localFullyAsymmetric(cells: readonly Cell[]): boolean {
  const union = new Set([...rotationOrbitKeys(cells), ...rotationOrbitKeys(localMirror(cells))])
  return union.size === 8
}

/** هم‌پیوندی با BFS چهارهمسایه‌ای */
function localConnected(cells: readonly Cell[]): boolean {
  const keys = new Set(cells.map((c) => localKey([c])))
  const start = cells[0]
  if (!start) return false
  const visited = new Set<string>([localKey([start])])
  const queue: Cell[] = [start]
  while (queue.length > 0) {
    const [x, y] = queue.shift() as Cell
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const neighbor: Cell = [x + dx, y + dy]
      const key = localKey([neighbor])
      if (keys.has(key) && !visited.has(key)) {
        visited.add(key)
        queue.push(neighbor)
      }
    }
  }
  return visited.size === keys.size
}

// ---------- اجرای جلسه ----------

function verdictOf(trial: MentalRotationTrial): MentalRotationVerdict {
  return trial.isMirror ? 'mirrored' : 'same'
}

function runSession(
  config: MentalRotationConfig,
  seed: number,
  answer: (trial: MentalRotationTrial, index: number) => MentalRotationVerdict | null,
): ReturnType<typeof def.getSummary> {
  let state = def.createSession('test', config, seed)
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    state = def.submitAnswer(step.state, answer(step.trial, i), 1200 + i * 50)
  }
  expect(def.isComplete(state)).toBe(true)
  return def.getSummary(state)
}

describe('Mental Rotation — engine', () => {
  it('سطح‌های دشواری درست پیکربندی می‌شوند (بلوک ۵→۱۰، پنجرهٔ پاسخ، ۱۶ مرحله)', () => {
    const l1 = configForDifficulty(1)
    const l2 = configForDifficulty(2)
    const l3 = configForDifficulty(3)
    const l4 = configForDifficulty(4)
    const l5 = configForDifficulty(5)
    expect(l1.blocks).toBe(5)
    expect(l2.blocks).toBe(6)
    expect(l3.blocks).toBe(7)
    expect(l4.blocks).toBe(8)
    expect(l5.blocks).toBe(10)
    // سطح ۱ و ۲ بی‌مهلت؛ سپس ۸ث → ۶٫۵ث → ۵ث
    expect(l1.responseWindowMs).toBeNull()
    expect(l2.responseWindowMs).toBeNull()
    expect(l3.responseWindowMs).toBe(8000)
    expect(l4.responseWindowMs).toBe(6500)
    expect(l5.responseWindowMs).toBe(5000)
    // دامنهٔ زاویه با دشواری زیاد می‌شود
    expect(l1.allowedAngles).toEqual([0, 90])
    expect(l2.allowedAngles).toEqual([0, 90, 180])
    expect(l3.allowedAngles).toEqual([0, 90, 180, 270])
    expect(l5.allowedAngles).toEqual([0, 90, 180, 270])
    for (const config of [l1, l2, l3, l4, l5]) {
      expect(config.totalTrials).toBe(16)
    }
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تبدیل‌های هندسی با مثال دست‌محور پین می‌شوند', () => {
    const lTromino: readonly PolyominoCell[] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ]
    // چرخش ربع‌دور: (x,y)→(y,−x) و بازگشت به مبدا
    expect(applyRotation(lTromino, 1)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ])
    // L-ترومینو کیرال نیست: آینه‌اش دقیقاً همان چرخش ربع‌دور است —
    // دلیل وجود غربال تقارن هنگام تولید
    expect(mirrorPolyomino(lTromino)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ])
    expect(isFullyAsymmetric(lTromino)).toBe(false)
    // L-پنتومینو نامتقارن کامل است
    const lPentomino: readonly PolyominoCell[] = [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
    ]
    expect(isFullyAsymmetric(lPentomino)).toBe(true)
  })

  it('تولید از seed قطعی است و شکل‌ها همیشه نامتقارن و هم‌پیوندند', () => {
    const config = configForDifficulty(4)
    let s1 = def.createSession('a', config, SEED)
    let s2 = def.createSession('b', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const r1 = def.nextTrial(s1)
      const r2 = def.nextTrial(s2)
      s1 = r1.state
      s2 = r2.state
      const t1 = r1.trial
      const t2 = r2.trial
      expect(t1).toEqual(t2)
      expect(t1.reference).toHaveLength(config.blocks)
      expect(t1.candidate).toHaveLength(config.blocks)
      expect(localFullyAsymmetric(t1.reference)).toBe(true)
      expect(localConnected(t1.reference)).toBe(true)
    }
    // seed متفاوت → جلسهٔ متفاوت (سه مرحلهٔ اول با هم برابر نیستند)
    let s3 = def.createSession('c', config, SEED + 1)
    const trialsA: unknown[] = []
    const trialsB: unknown[] = []
    let sa = def.createSession('a2', config, SEED)
    for (let i = 0; i < 3; i++) {
      const ra = def.nextTrial(sa)
      sa = ra.state
      const rb = def.nextTrial(s3)
      s3 = rb.state
      trialsA.push(ra.trial)
      trialsB.push(rb.trial)
    }
    expect(trialsA).not.toEqual(trialsB)
  })

  it('در همهٔ سطح‌ها (۱ تا ۵) هر شکل هر مرحله نامتقارن کامل است', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const config = configForDifficulty(difficulty)
      let state = def.createSession('sym', config, SEED + difficulty)
      for (let i = 0; i < config.totalTrials; i++) {
        const step = def.nextTrial(state)
        const trial = step.trial
        expect(trial.blocks).toBe(config.blocks)
        expect(trial.reference).toHaveLength(config.blocks)
        expect(localFullyAsymmetric(trial.reference)).toBe(true)
        expect(localConnected(trial.reference)).toBe(true)
        state = def.submitAnswer(step.state, verdictOf(trial), 900)
      }
    }
  })

  it('ground truth هر مرحله درست است (گزینه دقیقاً در مدار درست است)', () => {
    // با پیاده‌سازی هندسهٔ محلی: اگر !isMirror گزینه باید در مدار چرخش‌های
    // خود مرجع (و نه مدار آینه) باشد؛ اگر isMirror برعکس.
    for (const difficulty of [2, 5]) {
      const config = configForDifficulty(difficulty)
      let state = def.createSession('gt', config, SEED - difficulty)
      for (let i = 0; i < config.totalTrials; i++) {
        const step = def.nextTrial(state)
        const trial = step.trial
        const sameOrbit = rotationOrbitKeys(trial.reference)
        const mirrorOrbit = rotationOrbitKeys(localMirror(trial.reference))
        const candidateKey = localKey(trial.candidate)
        expect(config.allowedAngles).toContain(trial.rotationDegrees)
        if (trial.isMirror) {
          expect(mirrorOrbit.has(candidateKey)).toBe(true)
          expect(sameOrbit.has(candidateKey)).toBe(false)
        } else {
          expect(sameOrbit.has(candidateKey)).toBe(true)
          expect(mirrorOrbit.has(candidateKey)).toBe(false)
        }
        state = def.submitAnswer(step.state, verdictOf(trial), 1000)
      }
      // پاسخ‌های درستِ همهٔ مراحل → دقت ۱۰۰
      expect(def.getSummary(state).accuracy).toBe(100)
    }
  })

  it('ثبت پاسخ: درست / نادرست / بی‌پاسخی (null) → omission با RT تهی', () => {
    const config = configForDifficulty(1)
    const base = def.createSession('ans', config, SEED)
    const { trial } = def.nextTrial(base)
    const withTrial = { ...base, currentTrial: trial }

    const correct = def.submitAnswer(withTrial, verdictOf(trial), 1234)
    expect(correct.results[0]?.outcome).toBe('correct')
    expect(correct.results[0]?.correct).toBe(true)
    expect(correct.results[0]?.expected).toBe(trial.isMirror ? 'mirrored' : 'same')
    expect(correct.results[0]?.reactionTimeMs).toBe(1234)
    // stimulus خام ground truth کامل را دارد
    expect((correct.results[0]?.stimulus as { isMirror: boolean }).isMirror).toBe(trial.isMirror)

    const wrongAnswer: MentalRotationVerdict = trial.isMirror ? 'same' : 'mirrored'
    const wrong = def.submitAnswer(withTrial, wrongAnswer, 2000)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)

    const omitted = def.submitAnswer(withTrial, null, 0)
    expect(omitted.results[0]?.outcome).toBe('omission')
    expect(omitted.results[0]?.reactionTimeMs).toBeNull()
    expect(omitted.results[0]?.correct).toBe(false)
  })

  it('جلسهٔ ۱۶ مرحله‌ای کامل می‌شود؛ خلاصه و باندهای زاویه درست‌اند', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('full', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // زوج: پاسخ درست با RT صعودی · فرد: پاسخ معکوس
      const answer =
        i % 2 === 0
          ? verdictOf(step.trial)
          : step.trial.isMirror
            ? ('same' as const)
            : ('mirrored' as const)
      state = def.submitAnswer(step.state, answer, 1000 + i * 100)
    }
    expect(() => def.nextTrial(state)).toThrow('همه مراحل تولید شده‌اند')
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe(MENTAL_ROTATION_ID)
    expect(summary.exerciseVersion).toBe(MENTAL_ROTATION_VERSION)
    expect(summary.contentVersion).toBe(MENTAL_ROTATION_CONTENT_VERSION)
    expect(summary.domain).toBe('visual-spatial')
    expect(summary.totalTrials).toBe(16)
    expect(summary.correctTrials).toBe(8)
    expect(summary.accuracy).toBe(50)
    // میانگین RT: ۱۰۰۰ + میانگین(۱۰۰×i برای i=۰..۱۵) = ۱۰۰۰ + ۷۵۰
    expect(summary.metrics['meanReactionTimeMs']).toBe(1750)
    // هر دو باند زاویه در سطح ۳ حضور دارند و دقت صفر یا ۱۰۰ ناخالص نیست
    expect(summary.metrics['accuracyLowAngleBand']).toBeDefined()
    expect(summary.metrics['accuracyHighAngleBand']).toBeDefined()
    const low = summary.metrics['accuracyLowAngleBand'] as number
    const high = summary.metrics['accuracyHighAngleBand'] as number
    expect(low).toBeGreaterThanOrEqual(0)
    expect(low).toBeLessThanOrEqual(100)
    expect(high).toBeGreaterThanOrEqual(0)
    expect(high).toBeLessThanOrEqual(100)
  })

  it('باند خالی زاویه از خلاصه حذف می‌شود (سطح ۱: فقط زاویه‌های ۰ و ۹۰)', () => {
    const config = configForDifficulty(1)
    const summary = runSession(config, SEED + 5, (trial) => verdictOf(trial))
    expect(summary.metrics['accuracyLowAngleBand']).toBe(100)
    expect(summary.metrics['accuracyHighAngleBand']).toBeUndefined()
  })
})
