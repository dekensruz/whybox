import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

const CONTROL =
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-ink placeholder:text-subtle transition-colors focus:border-ink focus:outline-none';

interface FieldProps {
  label: string;
  children: (id: string) => ReactNode;
}

function Field({ label, children }: FieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

export function TextField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <Field label={label}>{(id) => <input id={id} className={CONTROL} {...props} />}</Field>;
}

export function TextAreaField({ label, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label}>
      {(id) => <textarea id={id} className={`${CONTROL} h-auto min-h-32 resize-none py-3 leading-relaxed`} {...props} />}
    </Field>
  );
}

export function SelectField({ label, children, ...props }: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} className={`${CONTROL} appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10`} style={{ backgroundImage: CHEVRON }} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%235b6270' stroke-width='1.5'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`;
