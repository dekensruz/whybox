import { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { VoiceButton } from '@/components/VoiceButton';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/Field';
import { useI18n } from '@/i18n';
import { compressImage } from '@/lib/image';
import { createLesson } from './lessonStore';

export function NewLessonPage() {
  const { mode } = useParams<{ mode: string }>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);

  if (mode !== 'question' && mode !== 'photo') return <Navigate to="/" replace />;
  const isPhoto = mode === 'photo';
  const canSubmit = isPhoto ? Boolean(image) : text.trim().length >= 3;

  const pickImage = async (file: File | undefined) => {
    if (file) setImage(await compressImage(file));
  };

  const submit = () => {
    const lesson = createLesson({ question: text.trim() || undefined, image: image ?? undefined });
    navigate(`/lesson/${lesson.id}`, { replace: true });
  };

  return (
    <Screen
      header={<BackButton to="/" />}
      footer={
        <Button block onClick={submit} disabled={!canSubmit}>
          {t('newLesson.submit')}
        </Button>
      }
    >
      <div className="flex flex-col gap-8 pt-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-balance">
            {isPhoto ? t('newLesson.photoTitle') : t('newLesson.questionTitle')}
          </h1>
          <p className="leading-relaxed text-muted text-pretty">{isPhoto ? t('newLesson.photoHint') : t('newLesson.questionHint')}</p>
        </div>

        {isPhoto && (
          <div className="flex flex-col gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => pickImage(event.target.files?.[0])}
            />
            {image ? (
              <img src={image} alt="" className="max-h-80 w-full rounded-2xl border border-line object-contain bg-surface" />
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface text-muted transition-colors hover:border-ink/30"
              >
                <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                <span className="text-[15px] font-medium text-ink">{t('newLesson.photoPick')}</span>
              </button>
            )}
            {image && (
              <Button variant="secondary" onClick={() => fileInput.current?.click()}>
                {t('newLesson.photoChange')}
              </Button>
            )}
          </div>
        )}

        <TextAreaField
          label={isPhoto ? t('newLesson.photoNote') : t('newLesson.questionLabel')}
          placeholder={isPhoto ? t('newLesson.photoNotePlaceholder') : t('newLesson.questionPlaceholder')}
          maxLength={500}
          autoFocus={!isPhoto}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <VoiceButton onText={(spoken) => setText((current) => (current.trim() ? `${current.trim()} ${spoken}` : spoken))} />
      </div>
    </Screen>
  );
}
