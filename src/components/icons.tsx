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

export const StarIcon = (props: { className?: string; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={props.className ?? 'size-5'} aria-hidden>
    <path
      d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
      fill={props.filled === false ? 'none' : 'currentColor'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const FlameIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M12 21c3.6 0 6-2.4 6-5.8 0-3.9-3.4-6.1-4.3-10.2-1.8 1.4-2.8 3.4-2.6 5.6-1-.6-1.7-1.6-1.9-2.9C7.6 9.3 6 11.8 6 15.2 6 18.6 8.4 21 12 21z" />
  </Icon>
);

export const TrophyIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v4M8.5 20h7M10 17h4" />
  </Icon>
);

export const SparkIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </Icon>
);

export const RefreshIcon = (props: { className?: string }) => (
  <Icon {...props}>
    <path d="M19 12a7 7 0 1 1-2-4.9M19 4v4h-4" />
  </Icon>
);
