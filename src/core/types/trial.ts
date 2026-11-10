import type { RecordedTrial, TrialOutcome } from './exercise'

/**
 * رویداد خام یک مرحله در IndexedDB — مبنای تحلیل آینده.
 * id ترکیبی sessionId:trialIndex است تا ثبت تکراری یک مرحله عملاً
 * غیرممکن شود (upsert روی کلید یکتا).
 */
export interface TrialEventRecord extends RecordedTrial {
  readonly id: string
  readonly sessionId: string
  readonly difficulty: number
  readonly exerciseVersion: string
  /** epoch milliseconds */
  readonly createdAt: number
}

export function toTrialEventRecord(
  sessionId: string,
  difficulty: number,
  exerciseVersion: string,
  trial: RecordedTrial,
  createdAt: number,
): TrialEventRecord {
  return {
    ...trial,
    id: `${sessionId}:${trial.trialIndex}`,
    sessionId,
    difficulty,
    exerciseVersion,
    createdAt,
  }
}

export type { TrialOutcome }
