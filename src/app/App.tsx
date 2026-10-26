import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LogoMark } from '@/components/Logo';
import { AuthPage } from '@/features/auth/AuthPage';
import { NewPasswordPage } from '@/features/auth/NewPasswordPage';
import { WelcomePage } from '@/features/auth/WelcomePage';
import { HomePage } from '@/features/home/HomePage';
import { LessonPage } from '@/features/lesson/LessonPage';
import { NewLessonPage } from '@/features/lesson/NewLessonPage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { useSession } from './SessionProvider';

/** Where a visitor belongs given their session: signed out, without a profile, or ready. */
function useStage() {
  const { loading, mode, profile } = useSession();
  if (loading) return 'loading';
  if (mode === 'signed-out') return 'signed-out';
  return profile ? 'ready' : 'onboarding';
}

function Gate({ stage, children }: { stage: 'signed-out' | 'onboarding' | 'ready'; children: ReactNode }) {
  const current = useStage();
  if (current === 'loading') return <Splash />;
  if (current !== stage) return <Navigate to={current === 'signed-out' ? '/welcome' : current === 'onboarding' ? '/onboarding' : '/'} replace />;
  return children;
}

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Gate stage="signed-out"><WelcomePage /></Gate>} />
        <Route path="/auth" element={<Gate stage="signed-out"><AuthPage /></Gate>} />
        <Route path="/password" element={<NewPasswordPage />} />
        <Route path="/onboarding" element={<Gate stage="onboarding"><OnboardingPage /></Gate>} />
        <Route path="/" element={<Gate stage="ready"><HomePage /></Gate>} />
        <Route path="/lesson/new/:mode" element={<Gate stage="ready"><NewLessonPage /></Gate>} />
        <Route path="/lesson/:id" element={<Gate stage="ready"><LessonPage /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
