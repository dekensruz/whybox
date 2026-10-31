import { useEffect, useRef, useState } from 'react';
import type { LessonPlan } from '@shared/lesson';
import { prepareExperiment, SimulationBridge } from './simulationBridge';

const MIN_HEIGHT = 420;
const MAX_HEIGHT = 1400;

interface SimulationFrameProps {
  html: string;
  plan: LessonPlan;
  language: string;
  /** Parameter values the experiment is driven to, e.g. by the current step of the guided tour. */
  state?: Record<string, number>;
  /** Called with the experiment's values and measurements whenever they change, including when the learner moves a control. */
  onValues?: (values: Record<string, number>, measures: Record<string, number>) => void;
  /** Whether the experiment may play its sound cues. */
  sound?: boolean;
  className?: string;
}

/** Displays a generated experiment in a sandbox that can run scripts but cannot reach the app. */
export function SimulationFrame({ html, plan, language, state, onValues, sound = true, className }: SimulationFrameProps) {
  const valuesListener = useRef(onValues);
  valuesListener.current = onValues;
  const frame = useRef<HTMLIFrameElement>(null);
  const bridge = useRef<SimulationBridge | null>(null);
  const [height, setHeight] = useState(640);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  // The lesson object is replaced whenever the lesson saves something (a prediction, an answer): only a real
  // change of content reloads the experiment. Otherwise the frame would wait forever for a load that never comes.
  const loadedSource = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    prepareExperiment(html, plan, language).then((prepared) => {
      if (cancelled || prepared === loadedSource.current) return;
      loadedSource.current = prepared;
      setLoaded(false);
      setSource(prepared);
    });
    return () => {
      cancelled = true;
    };
  }, [html, plan, language]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { whyboxHeight?: number; whyboxValues?: Record<string, number>; whyboxMeasures?: Record<string, number> };
      const reported = Number(data?.whyboxHeight);
      if (reported > 0) setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, reported)));
      if (data?.whyboxValues && typeof data.whyboxValues === 'object') valuesListener.current?.(data.whyboxValues, data.whyboxMeasures ?? {});
    };
    window.addEventListener('message', onMessage);
    bridge.current = frame.current ? new SimulationBridge(frame.current) : null;
    return () => {
      window.removeEventListener('message', onMessage);
      bridge.current?.dispose();
      bridge.current = null;
    };
  }, []);

  useEffect(() => {
    const current = bridge.current;
    if (!loaded || !state || !current) return;
    let cancelled = false;
    (async () => {
      await current.ready();
      for (const [name, value] of Object.entries(state)) {
        if (cancelled) return;
        await current.call('set', [name, value]);
      }
    })().catch(() => {
      /* the experiment keeps its current state */
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, state]);

  useEffect(() => {
    if (loaded) frame.current?.contentWindow?.postMessage({ whyboxSound: sound }, '*');
  }, [loaded, sound]);

  return (
    <iframe
      ref={frame}
      title={plan.title}
      sandbox="allow-scripts"
      srcDoc={source ?? ''}
      onLoad={() => source && setLoaded(true)}
      style={{ height }}
      className={`w-full rounded-2xl border border-line bg-paper ${className ?? ''}`}
    />
  );
}
