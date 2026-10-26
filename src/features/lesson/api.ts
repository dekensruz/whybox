import type { CheckFailure, CounterTour, LearnerContext, LessonPlan, RealExperimentResult } from '@shared/lesson';
import type { Profile } from '@/features/profile/types';

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API error ${status}`);
  }
}

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
};

export const learnerFromProfile = (profile: Profile): LearnerContext => ({
  role: profile.role,
  levels: profile.levels,
  country: profile.country,
  city: profile.city,
  language: profile.learningLanguage,
  interests: profile.interests,
  subjects: profile.subjects,
  deviceUsage: profile.deviceUsage,
});

export const requestPlan = (learner: LearnerContext, input: { question?: string; image?: string }) =>
  post<{ plan: LessonPlan }>('/api/lessons/plan', { learner, ...input }).then((result) => result.plan);

export const requestSimulation = (
  plan: LessonPlan,
  learner: LearnerContext,
  repair?: { html: string; failures: CheckFailure[]; visualIssues?: string[] },
) => post<{ html: string }>('/api/lessons/simulation', { plan, learner, repair }).then((result) => result.html);

export const requestCounterTour = (plan: LessonPlan, learner: LearnerContext, idea: string) =>
  post<{ tour: CounterTour }>('/api/lessons/counter', { plan, learner, idea }).then((result) => result.tour);

/** Uploads the learner's video straight to private storage, then has it tracked and analysed. */
export const analyseRealExperiment = async (
  plan: LessonPlan,
  learner: LearnerContext,
  video: File,
  durationSeconds: number,
  objectSizeCm: number,
  onStage: (stage: 'uploading' | 'tracking') => void,
) => {
  onStage('uploading');
  const { path, uploadUrl } = await post<{ path: string; uploadUrl: string }>('/api/experiments/upload', { contentType: video.type });
  const upload = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': video.type }, body: video });
  if (!upload.ok) throw new ApiError(upload.status);
  onStage('tracking');
  return post<{ result: RealExperimentResult; found: boolean }>('/api/experiments/analyze', {
    path,
    plan,
    learner,
    durationSeconds,
    objectSizeCm,
  });
};

export const requestVisualReview = (plan: LessonPlan, snapshots: string[]) =>
  post<{ approved: boolean; issues: string[] }>('/api/lessons/review', { plan, snapshots });
