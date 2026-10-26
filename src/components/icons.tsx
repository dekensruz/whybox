// Line icons in one consistent style: 24px grid, 1.75 stroke, rounded joins.
import type { ReactNode } from 'react';

function Icon({ children, className = 'size-6' }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const HomeIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
  </Icon>
);

export const LessonsIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M5 4.5h10.5a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h10.5M9 8.5h6" />
  </Icon>
);

export const ProgressIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M4 19.5h16M7 16v-4M12 16V8M17 16v-6.5" />
  </Icon>
);

export const ProfileIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19.5a7 7 0 0 1 14 0" />
  </Icon>
);

export const PlusIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const CameraIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const QuestionIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M9.2 9.2a2.9 2.9 0 1 1 4.3 2.5c-.9.5-1.5 1.2-1.5 2.3v.5" />
    <circle cx="12" cy="18" r="0.9" fill="currentColor" stroke="none" />
  </Icon>
);

export const ChevronRightIcon = (props: { className?: string }) => (
  <Icon className={props.className ?? 'size-5'}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);
