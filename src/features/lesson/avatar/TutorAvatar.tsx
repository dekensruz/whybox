import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import { voiceLevel } from '@/lib/speech';
import { createTutor, type Tutor, type TutorGesture } from './tutorScene';

interface TutorAvatarProps {
  gesture: TutorGesture;
  speaking: boolean;
  /** Says the card again, or stops while speaking. */
  onToggle: () => void;
  /** Shown instead when the device cannot draw 3D. */
  fallback: React.ReactNode;
}

/** The tutor in 3D, beside the lesson: she gestures with the moment of the lesson and her lips follow her voice. */
export default function TutorAvatar({ gesture, speaking, onToggle, fallback }: TutorAvatarProps) {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const tutor = useRef<Tutor | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    try {
      tutor.current = createTutor(canvas.current);
      tutor.current.setVoiceLevel(voiceLevel);
    } catch {
      setFailed(true);
    }
    return () => {
      tutor.current?.dispose();
      tutor.current = null;
    };
  }, []);

  useEffect(() => {
    tutor.current?.setGesture(gesture);
  }, [gesture]);

  if (failed) return <>{fallback}</>;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={speaking ? t('lesson.tutorStop') : t('lesson.tutorListen')}
      aria-pressed={speaking}
      className="relative -mt-20 h-32 w-24 shrink-0 self-end lg:-mt-28 lg:h-44 lg:w-32"
    >
      <canvas ref={canvas} className="h-full w-full" />
      {!speaking && (
        <span aria-hidden className="absolute bottom-1 right-1 flex size-6 items-center justify-center rounded-full bg-ink text-paper">
          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor">
            <path d="M3.5 2.2v7.6L9.6 6z" />
          </svg>
        </span>
      )}
    </button>
  );
}
