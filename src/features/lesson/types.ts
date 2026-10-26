import type { CounterTour, LessonPlan, RealExperimentResult, Understanding } from '@shared/lesson';

export type LessonStatus = 'planning' | 'building' | 'verifying' | 'ready' | 'failed';

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
  /** Result of the real experiment the learner filmed (the video itself is never stored). */
  realExperiment?: RealExperimentResult & { objectSizeCm: number };
}
