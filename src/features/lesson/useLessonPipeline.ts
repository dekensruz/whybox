// Runs a lesson through its stages: plan, build the experiment, verify it (and repair it if needed).
// Progress is saved after each stage, so a lesson resumes where it stopped.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearnerContext } from '@shared/lesson';
import { requestPlan, requestSimulation } from './api';
import { getLesson, saveLesson } from './lessonStore';
import type { Lesson } from './types';
import { verifySimulation } from './verifySimulation';

const MAX_REPAIRS = 2;

export type PipelineStage = 'planning' | 'building' | 'verifying' | 'repairing';

export function useLessonPipeline(lessonId: string, learner: LearnerContext | null) {
  const [lesson, setLesson] = useState<Lesson | null>(() => getLesson(lessonId));
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const [checks, setChecks] = useState<{ passed: number; total: number } | null>(null);
  const running = useRef(false);

  const commit = (next: Lesson) => {
    saveLesson(next);
    setLesson(next);
    return next;
  };

  const run = useCallback(async () => {
    let current = getLesson(lessonId);
    if (!current || !learner || running.current || current.status === 'ready') return;
    running.current = true;
    try {
      if (!current.plan) {
        setStage('planning');
        const plan = await requestPlan(learner, { question: current.question, image: current.image });
        current = commit({ ...current, plan, status: 'building' });
      }
      const plan = current.plan!;

      let html = current.html;
      if (!html) {
        setStage('building');
        html = await requestSimulation(plan, learner);
        current = commit({ ...current, html, status: 'verifying' });
      }

      setStage('verifying');
      let result = await verifySimulation(plan, html);
      setChecks(result);
      let repairs = 0;
      while (result.failures.length > 0 && repairs < MAX_REPAIRS) {
        repairs++;
        setStage('repairing');
        html = await requestSimulation(plan, learner, { html, failures: result.failures });
        setStage('verifying');
        result = await verifySimulation(plan, html);
        setChecks(result);
      }

      commit({ ...current, html, status: 'ready', verification: { passed: result.passed, total: result.total, repairs } });
    } catch (error) {
      console.error(error);
      if (current) commit({ ...current, status: 'failed' });
    } finally {
      running.current = false;
      setStage(null);
    }
  }, [lessonId, learner]);

  useEffect(() => {
    // Starts or resumes the lesson; a failed lesson waits for `retry`.
    if (lesson && lesson.status !== 'ready' && lesson.status !== 'failed') void run();
  }, [lesson, run]);

  const retry = useCallback(() => {
    const current = getLesson(lessonId);
    if (current) commit({ ...current, status: current.plan ? (current.html ? 'verifying' : 'building') : 'planning' });
    void run();
  }, [lessonId, run]);

  return { lesson, stage, checks, retry };
}
