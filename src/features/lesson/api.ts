import type { CheckFailure, LearnerContext, LessonPlan } from '@shared/lesson';
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

export const requestVisualReview = (plan: LessonPlan, snapshots: string[]) =>
  post<{ approved: boolean; issues: string[] }>('/api/lessons/review', { plan, snapshots });
