import type { ComponentType } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { HomeIcon, LessonsIcon, PlusIcon, ProfileIcon, ProgressIcon } from '@/components/icons';
import { Logo } from '@/components/Logo';
import { useI18n, type MessageKey } from '@/i18n';
import { cx } from '@/lib/cx';

const NAV: Array<{ to: string; label: MessageKey; icon: ComponentType<{ className?: string }> }> = [
  { to: '/', label: 'nav.home', icon: HomeIcon },
  { to: '/lessons', label: 'nav.lessons', icon: LessonsIcon },
  { to: '/progress', label: 'nav.progress', icon: ProgressIcon },
  { to: '/profile', label: 'nav.profile', icon: ProfileIcon },
];

/**
 * The frame of the signed-in app: a side menu on large screens, a bottom bar on phones.
 * Inside a lesson both step aside, so the learner stays focused on it; the lesson has its own way out.
 */
export function AppShell() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const inLesson = pathname.startsWith('/lesson/');
  const playingLesson = inLesson && !pathname.startsWith('/lesson/new/');

  return (
    <div className="min-h-dvh lg:flex">
      <aside className={cx('sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-8 border-r border-line bg-surface px-5 py-6', !playingLesson && 'lg:flex')}>
        <Logo />
        <NavLink
          to="/lesson/new/question"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-medium text-paper transition-colors hover:bg-ink/90"
        >
          <PlusIcon className="size-5" />
          {t('nav.newLesson')}
        </NavLink>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
                  isActive ? 'bg-paper font-medium text-ink' : 'text-muted hover:text-ink',
                )
              }
            >
              <Icon className="size-5" />
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className={cx('min-w-0 flex-1', !inLesson && 'pb-20 lg:pb-0')}>
        <Outlet />
      </div>

      {!inLesson && (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-md">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cx('flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-ink' : 'text-subtle')
                }
              >
                <Icon className="size-6" />
                {t(label)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
