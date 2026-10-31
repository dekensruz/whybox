import { useEffect, useRef, useState } from 'react';
import { transcribe } from '@/features/lesson/api';
import { useI18n } from '@/i18n';
import { cx } from '@/lib/cx';
import { recordingSupported, startRecording, type Recording } from '@/lib/recorder';

const MAX_SECONDS = 60;

/** Speak instead of typing: records, transcribes with Muse Voice Transcribe, and hands back the text. */
export function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const { t } = useI18n();
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing' | 'error'>('idle');
  const [seconds, setSeconds] = useState(0);
  const recording = useRef<Recording | null>(null);

  useEffect(() => () => recording.current?.cancel(), []);

  useEffect(() => {
    if (state !== 'recording') return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  const stop = async () => {
    const current = recording.current;
    recording.current = null;
    if (!current) return;
    setState('transcribing');
    try {
      const text = await transcribe(await current.stop());
      if (text) onText(text);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (state === 'recording' && seconds >= MAX_SECONDS) void stop();
  });

  if (!recordingSupported()) return null;

  const start = async () => {
    try {
      recording.current = await startRecording();
      setSeconds(0);
      setState('recording');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={state === 'recording' ? stop : start}
        disabled={state === 'transcribing'}
        className={cx(
          'inline-flex h-12 items-center justify-center gap-2.5 rounded-xl border px-5 text-[15px] font-medium transition-colors',
          state === 'recording' ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-ink hover:border-ink/40',
        )}
      >
        {state === 'recording' ? (
          <span className="size-2.5 animate-pulse rounded-full bg-danger" aria-hidden />
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
            <rect x="9" y="3.5" width="6" height="11" rx="3" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V20.5" />
          </svg>
        )}
        {state === 'recording'
          ? `${t('voice.stop')} · ${seconds} s`
          : state === 'transcribing'
            ? t('voice.transcribing')
            : t('voice.speak')}
      </button>
      {state === 'error' && <p className="text-sm text-danger">{t('voice.error')}</p>}
    </div>
  );
}
