import { useEffect, useRef, useState } from 'react';
import type { HomeExperiment, LearnerContext, LessonPlan, RealExperimentResult } from '@shared/lesson';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useI18n } from '@/i18n';
import { analyseRealExperiment } from '../api';
import { MotionChart } from './MotionChart';
import { TrackedVideo } from './TrackedVideo';

const MAX_SECONDS = 20;
const SUPPORTED = ['video/mp4', 'video/quicktime'];

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; stage: 'uploading' | 'tracking' }
  | { kind: 'done'; result: RealExperimentResult; videoUrl: string | null; objectSizeCm: number }
  | { kind: 'error'; message: 'tooLong' | 'notFound' | 'failed' };

const videoDuration = (url: string) =>
  new Promise<number>((resolve, reject) => {
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => resolve(probe.duration);
    probe.onerror = () => reject(new Error('Unreadable video'));
    probe.src = url;
  });

interface RealExperimentProps {
  plan: LessonPlan;
  experiment: HomeExperiment;
  learner: LearnerContext;
  /** A previous result, kept with the lesson (without the video, which is never stored). */
  saved?: RealExperimentResult & { objectSizeCm?: number };
  onResult: (result: RealExperimentResult & { objectSizeCm: number }) => void;
}

/** "Do it for real": the learner films the experiment at home, SAM 3.1 tracks the object, Whybox compares with the lesson. */
export function RealExperiment({ plan, experiment, learner, saved, onResult }: RealExperimentProps) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [size, setSize] = useState(String(experiment.targetSizeCm));
  const [status, setStatus] = useState<Status>(() =>
    saved ? { kind: 'done', result: saved, videoUrl: null, objectSizeCm: saved.objectSizeCm ?? experiment.targetSizeCm } : { kind: 'idle' },
  );

  // Object URLs keep the video in memory: release it when it is replaced or the lesson is left.
  const videoUrl = status.kind === 'done' ? status.videoUrl : null;
  useEffect(() => () => void (videoUrl && URL.revokeObjectURL(videoUrl)), [videoUrl]);

  const analyse = async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const duration = await videoDuration(url);
      if (!(duration > 0) || duration > MAX_SECONDS) {
        URL.revokeObjectURL(url);
        return setStatus({ kind: 'error', message: 'tooLong' });
      }
      const objectSizeCm = Number(size.replace(',', '.')) || experiment.targetSizeCm;
      // Some phones label MOV files oddly: send them under a supported type.
      const video = SUPPORTED.includes(file.type) ? file : new File([file], file.name, { type: 'video/mp4' });
      const { result, found } = await analyseRealExperiment(plan, learner, video, duration, objectSizeCm, (stage) =>
        setStatus({ kind: 'working', stage }),
      );
      if (!found) {
        URL.revokeObjectURL(url);
        return setStatus({ kind: 'error', message: 'notFound' });
      }
      setStatus({ kind: 'done', result, videoUrl: url, objectSizeCm });
      onResult({ ...result, objectSizeCm });
    } catch {
      URL.revokeObjectURL(url);
      setStatus({ kind: 'error', message: 'failed' });
    } finally {
      if (input.current) input.current.value = '';
    }
  };

  const picker = (
    <input
      ref={input}
      type="file"
      accept="video/*"
      capture="environment"
      className="hidden"
      onChange={(event) => analyse(event.target.files?.[0])}
    />
  );

  if (status.kind === 'working') {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-6" aria-live="polite">
        <span className="size-2.5 animate-pulse rounded-full bg-accent" aria-hidden />
        <p className="font-medium">{status.stage === 'uploading' ? t('lesson.real.uploading') : t('lesson.real.tracking')}</p>
      </div>
    );
  }

  if (status.kind === 'done') {
    const { result } = status;
    const axis = experiment.motion === 'swing' || experiment.motion === 'roll' ? 'side' : 'height';
    return (
      <div className="flex flex-col gap-5">
        {status.videoUrl && (
          <TrackedVideo src={status.videoUrl} track={result.track} frameWidth={result.frameWidth} frameHeight={result.frameHeight} />
        )}
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-5">
          <p className="font-medium">{t(`lesson.real.verdict.${result.verdict}`)}</p>
          <p className="leading-relaxed text-muted">{result.explanation}</p>
        </div>
        {result.metrics.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-muted">{t('lesson.real.measured')}</p>
            <div className="grid grid-cols-2 gap-3">
              {result.metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-line bg-surface px-4 py-3">
                  <p className="text-xs text-muted">{metric.label}</p>
                  <p className="text-xl font-semibold tabular-nums">
                    {metric.value} {metric.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">{t('lesson.real.trajectory')}</p>
          <MotionChart track={result.track} frameHeight={result.frameHeight} objectSizeCm={status.objectSizeCm} axis={axis} />
        </div>
        {picker}
        <Button variant="secondary" onClick={() => input.current?.click()}>
          {t('lesson.real.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="leading-relaxed text-muted">{t('lesson.real.intro')}</p>
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface px-5 py-5">
        <h3 className="font-semibold">{experiment.title}</h3>
        {experiment.materials.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-muted">{t('lesson.real.materials')}</p>
            <ul className="list-disc pl-5 leading-relaxed">
              {experiment.materials.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-muted">{t('lesson.real.steps')}</p>
          <ol className="list-decimal pl-5 leading-relaxed">
            {experiment.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        {experiment.prediction && (
          <p className="border-l-2 border-accent pl-3 leading-relaxed">
            <span className="font-medium">{t('lesson.real.expect')} : </span>
            {experiment.prediction}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <TextField label={t('lesson.real.sizeLabel')} inputMode="decimal" value={size} onChange={(event) => setSize(event.target.value)} />
        <p className="text-sm text-subtle">{t('lesson.real.sizeHint')}</p>
      </div>
      {status.kind === 'error' && (
        <p role="alert" className="text-sm text-danger">
          {t(`lesson.real.${status.message}`)}
        </p>
      )}
      {picker}
      <Button onClick={() => input.current?.click()}>{t('lesson.real.film')}</Button>
      <p className="text-center text-xs text-subtle">{t('lesson.real.privacy')}</p>
    </div>
  );
}
