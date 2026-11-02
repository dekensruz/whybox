import type { CounterTour, LessonPlan, Narration, RealExperimentResult, Understanding } from '@shared/lesson';

export type IllustrationKind = 'hook' | 'summary' | 'exercise' | `concept${number}`;

export type LessonStatus = 'planning' | 'building' | 'verifying' | 'ready' | 'failed' | 'refused';

export interface Verification {
  passed: number;
  total: number;
  repairs: number;
  /**
   * Outcome of the review of the experiment's pictures by Muse Wonder: approved as is, approved after a fix,
   * improved by a fix with remarks left, or skipped (pictures unavailable).
   */
  visualReview?: 'approved' | 'fixed' | 'improved' | 'skipped';
}

/** What the learner did in the lesson: it feeds the learner memory. */
export interface LessonOutcome {
  chosen: number;
  predictionCorrect: boolean;
  tourCompleted?: boolean;
  understanding?: Understanding;
  exercise?: { correct: boolean; attempts: number };
  /** Stars won in the lesson's challenges and missions (up to 3 each). */
  stars?: number;
}

export interface Lesson {
  id: string;
  createdAt: string;
  status: LessonStatus;
  question?: string;
  image?: string;
  plan?: LessonPlan;
  html?: string;
  verification?: Verification;
  outcome?: LessonOutcome;
  /** Tour built against the learner's wrong prediction; null when it could not be built. */
  counter?: CounterTour | null;
  /** Illustrations already generated and stored on the device (images live in IndexedDB). */
  illustrated?: Partial<Record<IllustrationKind, boolean>>;
  /** Result of the real experiment the learner filmed (the video itself is never stored). */
  realExperiment?: RealExperimentResult & { objectSizeCm: number };
  /** Why Whybox did not make a lesson of this question, and a nearby question it can explore instead. */
  refused?: { reason: string; alternative: string };
  /** What the tutor says aloud on each card; null when it could not be written. */
  narration?: Narration | null;
}
