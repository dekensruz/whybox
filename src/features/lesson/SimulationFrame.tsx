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
}

/** Displays a generated experiment in a sandbox that can run scripts but cannot reach the app. */
export function SimulationFrame({ html, plan, language, state }: SimulationFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const bridge = useRef<SimulationBridge | null>(null);
  const [height, setHeight] = useState(640);
  const [loaded, setLoaded] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    prepareExperiment(html, plan, language).then((prepared) => !cancelled && setSource(prepared));
    return () => {
      cancelled = true;
    };
  }, [html, plan, language]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const reported = Number((event.data as { whyboxHeight?: number })?.whyboxHeight);
      if (reported > 0) setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, reported)));
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

  return (
    <iframe
      ref={frame}
      title={plan.title}
      sandbox="allow-scripts"
      srcDoc={source ?? ''}
      onLoad={() => source && setLoaded(true)}
      style={{ height }}
      className="w-full rounded-2xl border border-line bg-paper"
    />
  );
}
