import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { Chip } from '@/components/ui/Chip';
import { SelectField, TextField } from '@/components/ui/Field';
import {
  COUNTRIES,
  DEVICE_USAGES,
  FEATURED_COUNTRIES,
  INTERESTS,
  LEARNING_LANGUAGES,
  LEVELS,
  SUBJECTS,
  type DeviceUsage,
  type Level,
} from '@/features/profile/types';
import { useI18n, type MessageKey } from '@/i18n';
import type { Draft, StepId } from './steps';

const LEVEL_KEYS: Record<Level, 'primary' | 'lowerSecondary' | 'upperSecondary'> = {
  primary: 'primary',
  lower_secondary: 'lowerSecondary',
  upper_secondary: 'upperSecondary',
};

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-balance">{title}</h1>
        {hint && <p className="leading-relaxed text-muted text-pretty">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

interface StepContentProps {
  step: StepId;
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}

export function StepContent({ step, draft, update }: StepContentProps) {
  const { t, language } = useI18n();
  const isTeacher = draft.role === 'teacher';

  switch (step) {
    case 'role':
      return (
        <Question title={t('onboarding.role.title')}>
          <div role="radiogroup" className="flex flex-col gap-3">
            <ChoiceCard
              title={t('onboarding.role.student')}
              hint={t('onboarding.role.studentHint')}
              selected={draft.role === 'student'}
              onSelect={() => update({ role: 'student', levels: draft.levels.slice(0, 1) })}
            />
            <ChoiceCard
              title={t('onboarding.role.teacher')}
              hint={t('onboarding.role.teacherHint')}
              selected={draft.role === 'teacher'}
              onSelect={() => update({ role: 'teacher' })}
            />
          </div>
        </Question>
      );

    case 'name':
      return (
        <Question title={t('onboarding.name.title')} hint={t('onboarding.name.hint')}>
          <TextField
            label={t('onboarding.name.placeholder')}
            autoFocus
            autoComplete="given-name"
            maxLength={40}
            value={draft.firstName}
            onChange={(event) => update({ firstName: event.target.value })}
          />
        </Question>
      );

    case 'level':
      return (
        <Question
          title={isTeacher ? t('onboarding.level.teacherTitle') : t('onboarding.level.studentTitle')}
          hint={t('onboarding.level.hint')}
        >
          <div role={isTeacher ? 'group' : 'radiogroup'} className="flex flex-col gap-3">
            {LEVELS.map((level) => (
              <ChoiceCard
                key={level}
                multiple={isTeacher}
                title={t(`onboarding.level.${LEVEL_KEYS[level]}`)}
                hint={t(`onboarding.level.${LEVEL_KEYS[level]}Hint` as MessageKey)}
                selected={draft.levels.includes(level)}
                onSelect={() => update({ levels: isTeacher ? toggle(draft.levels, level) : [level] })}
              />
            ))}
          </div>
        </Question>
      );

    case 'place':
      return (
        <Question title={t('onboarding.place.title')} hint={t('onboarding.place.hint')}>
          <div className="flex flex-col gap-5">
            <CountrySelect value={draft.country} onChange={(country) => update({ country })} language={language} />
            <TextField
              label={t('onboarding.place.city')}
              placeholder={t('onboarding.place.cityPlaceholder')}
              autoComplete="address-level2"
              maxLength={60}
              value={draft.city}
              onChange={(event) => update({ city: event.target.value })}
            />
          </div>
        </Question>
      );

    case 'language': {
      const names = new Intl.DisplayNames([language], { type: 'language' });
      return (
        <Question title={t('onboarding.language.title')} hint={t('onboarding.language.hint')}>
          <div role="radiogroup" className="flex flex-col gap-3">
            {LEARNING_LANGUAGES.map((code) => (
              <ChoiceCard
                key={code}
                title={capitalize(names.of(code) ?? code)}
                selected={draft.learningLanguage === code}
                onSelect={() => update({ learningLanguage: code })}
              />
            ))}
          </div>
        </Question>
      );
    }

    case 'interests':
      return (
        <Question title={t('onboarding.interests.title')} hint={t('onboarding.interests.hint')}>
          <div className="flex flex-wrap gap-2.5">
            {INTERESTS.map((interest) => (
              <Chip
                key={interest}
                label={t(`options.interests.${interest}`)}
                selected={draft.interests.includes(interest)}
                onToggle={() => update({ interests: toggle(draft.interests, interest) })}
              />
            ))}
          </div>
        </Question>
      );

    case 'subjects':
      return (
        <Question
          title={isTeacher ? t('onboarding.subjects.teacherTitle') : t('onboarding.subjects.studentTitle')}
          hint={t('onboarding.subjects.hint')}
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2.5">
              {SUBJECTS.map((subject) => (
                <Chip
                  key={subject}
                  label={t(`options.subjects.${subject}`)}
                  selected={draft.subjects.includes(subject)}
                  onToggle={() => update({ subjects: toggle(draft.subjects, subject) })}
                />
              ))}
              {draft.subjects
                .filter((subject) => !isKnownSubject(subject))
                .map((subject) => (
                  <Chip key={subject} label={subject} selected onToggle={() => update({ subjects: toggle(draft.subjects, subject) })} />
                ))}
            </div>
            <CustomSubjectInput onAdd={(subject) => update({ subjects: addUnique(draft.subjects, subject) })} />
          </div>
        </Question>
      );

    case 'device':
      return (
        <Question title={t('onboarding.device.title')} hint={t('onboarding.device.hint')}>
          <div role="radiogroup" className="flex flex-col gap-3">
            {DEVICE_USAGES.map((usage: DeviceUsage) => (
              <ChoiceCard
                key={usage}
                title={t(`onboarding.device.${usage}`)}
                hint={t(`onboarding.device.${usage}Hint` as MessageKey)}
                selected={draft.deviceUsage === usage}
                onSelect={() => update({ deviceUsage: usage })}
              />
            ))}
          </div>
        </Question>
      );

    case 'done':
      return (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent-soft">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="var(--color-ink)" strokeWidth="2" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-balance">
            {t('onboarding.done.title', { name: draft.firstName.trim() })}
          </h1>
          <p className="leading-relaxed text-muted text-pretty">{t('onboarding.done.subtitle')}</p>
        </div>
      );
  }
}

function CountrySelect({ value, onChange, language }: { value: string; onChange: (code: string) => void; language: string }) {
  const { t } = useI18n();
  const names = new Intl.DisplayNames([language], { type: 'region' });
  const sortByName = (codes: string[]) =>
    codes.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name, language));
  const featured = sortByName(FEATURED_COUNTRIES);
  const others = sortByName(COUNTRIES.filter((code) => !FEATURED_COUNTRIES.includes(code)));

  return (
    <SelectField label={t('onboarding.place.country')} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="" disabled>
        {t('onboarding.place.countryPlaceholder')}
      </option>
      <optgroup label="—">
        {featured.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </optgroup>
      <optgroup label="—">
        {others.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </optgroup>
    </SelectField>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const isKnownSubject = (subject: string) => (SUBJECTS as readonly string[]).includes(subject);

/** Adds a custom subject unless the same name (any case) is already there. */
const addUnique = (list: string[], value: string) =>
  list.some((item) => item.toLowerCase() === value.toLowerCase()) ? list : [...list, value];

function CustomSubjectInput({ onAdd }: { onAdd: (subject: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const subject = capitalize(value.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!subject) return;
    onAdd(subject);
    setValue('');
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <div className="flex-1">
        <TextField
          label={t('onboarding.subjects.customLabel')}
          placeholder={t('onboarding.subjects.customPlaceholder')}
          maxLength={40}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={!subject}>
        {t('onboarding.subjects.add')}
      </Button>
    </form>
  );
}
