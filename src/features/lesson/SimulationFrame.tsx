import { useEffect, useMemo, useRef, useState } from 'react';
import { withBridge } from './simulationBridge';

const MIN_HEIGHT = 420;
const MAX_HEIGHT = 1400;

/** Displays a generated experiment in a sandbox that can run scripts but cannot reach the app. */
export function SimulationFrame({ html, title }: { html: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(640);
  const source = useMemo(() => withBridge(html), [html]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const reported = Number((event.data as { whyboxHeight?: number })?.whyboxHeight);
      if (reported > 0) setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, reported)));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={frame}
      title={title}
      sandbox="allow-scripts"
      srcDoc={source}
      style={{ height }}
      className="w-full rounded-2xl border border-line bg-paper"
    />
  );
}
