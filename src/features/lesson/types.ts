import type { LessonPlan } from '@shared/lesson';

export type LessonStatus = 'planning' | 'building' | 'verifying' | 'ready' | 'failed';

export interface Verification {
  passed: number;
  total: number;
  repairs: number;
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
}
