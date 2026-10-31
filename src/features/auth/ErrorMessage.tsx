import { useI18n } from '@/i18n';
import type { AuthErrorKind } from './emailAuth';

export function ErrorMessage({ kind }: { kind: AuthErrorKind | null }) {
  const { t } = useI18n();
  if (!kind) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {t(`auth.errors.${kind}`)}
    </p>
  );
}
