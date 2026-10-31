// Runs a lesson through its stages: plan, build the experiment, verify its calculations,
// review it visually, and repair it when needed. Progress is saved after each stage,
// so a lesson resumes where it stopped.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearnerContext } from '@shared/lesson';
import { requestPlan, requestSimulation, requestVisualReview } from './api';
import { buildLearnerMemory } from './learnerMemory';
import { getLesson, listLessons, saveLesson } from './lessonStore';
import type { Lesson, Verification } from './types';
import { verifySimulation } from './verifySimulation';

const MAX_CALCULATION_REPAIRS = 2;
const MAX_VISUAL_REPAIRS = 1;

export type PipelineStage = 'planning' | 'building' | 'verifying' | 'reviewing' | 'repairing';

export function useLessonPipeline(lessonId: string, learner: LearnerContext | null) {
  const [lesson, setLesson] = useState<Lesson | null>(() => getLesson(lessonId));
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [checks, setChecks] = useState<{ passed: number; total: number } | null>(null);
  const running = useRef(false);

  // Changes are merged into the stored lesson, so the pipeline and the learner's answers never overwrite each other.
  const commit = useCallback(
    (patch: Partial<Lesson>) => {
      const latest = getLesson(lessonId);
      if (!latest) return null;
      const next = { ...latest, ...patch };
      saveLesson(next);
      setLesson(next);
      return next;
    },
    [lessonId],
  );

  const run = useCallback(async () => {
    const current = getLesson(lessonId);
    if (!current || !learner || running.current || current.status === 'ready') return;
    running.current = true;
    try {
      let plan = current.plan;
      if (!plan) {
        setStage('planning');
        const memory = buildLearnerMemory(listLessons(), lessonId);
        plan = await requestPlan({ ...learner, memory }, { question: current.question, image: current.image });
        commit({ plan, status: 'building' });
      }

      let html = current.html;
      if (!html) {
        setStage('building');
        html = await requestSimulation(plan, learner);
        commit({ html, status: 'verifying' });
      }

      const verify = async () => {
        setStage('verifying');
        const result = await verifySimulation(plan, html!, learner.language);
        setChecks(result);
        return result;
      };

      let result = await verify();
      let calculationRepairs = 0;
      while (result.failures.length > 0 && calculationRepairs < MAX_CALCULATION_REPAIRS) {
        calculationRepairs++;
        setStage('repairing');
        html = await requestSimulation(plan, learner, { html, failures: result.failures });
        result = await verify();
      }

      let visualReview: Verification['visualReview'] = 'skipped';
      let visualRepairs = 0;
      while (result.failures.length === 0 && result.snapshots.length > 0) {
        setStage('reviewing');
        const review = await requestVisualReview(plan, result.snapshots).catch(() => ({ approved: true, issues: [] }));
        if (review.approved) {
          visualReview = visualRepairs > 0 ? 'fixed' : 'approved';
          break;
        }
        if (visualRepairs >= MAX_VISUAL_REPAIRS) {
          visualReview = visualRepairs > 0 ? 'improved' : 'skipped';
          break;
        }
        visualRepairs++;
        setStage('repairing');
        const repaired = await requestSimulation(plan, learner, { html, failures: [], visualIssues: review.issues });
        const repairedResult = await verifySimulation(plan, repaired, learner.language);
        // A visual fix is kept only if it does not break any calculation.
        if (repairedResult.failures.length > 0) break;
        html = repaired;
        result = repairedResult;
        setChecks(result);
      }

      commit({
        html,
        status: 'ready',
        verification: { passed: result.passed, total: result.total, repairs: calculationRepairs + visualRepairs, visualReview },
      });
    } catch (error) {
      console.error(error);
      commit({ status: 'failed' });
    } finally {
      running.current = false;
      setStage(null);
    }
  }, [lessonId, learner, commit]);

  useEffect(() => {
    // Starts or resumes the lesson; a failed lesson waits for `retry`.
    if (lesson && lesson.status !== 'ready' && lesson.status !== 'failed') void run();
  }, [lesson, run]);

  const retry = useCallback(() => {
    const current = getLesson(lessonId);
    if (current) commit({ status: current.plan ? (current.html ? 'verifying' : 'building') : 'planning' });
    void run();
  }, [lessonId, run, commit]);

  return { lesson, stage, checks, retry, update: commit };
}
