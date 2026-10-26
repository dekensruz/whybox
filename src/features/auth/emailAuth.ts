// Email and password accounts. Confirmation and password reset use a 6-digit code sent by email
// (the Supabase email templates send {{ .Token }} instead of a link), so they work on any device.
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type CodePurpose = 'signup' | 'recovery';

export type AuthErrorKind = 'invalid-credentials' | 'email-not-confirmed' | 'invalid-code' | 'weak-password' | 'rate-limited' | 'unknown';

export class EmailAuthError extends Error {
  constructor(readonly kind: AuthErrorKind) {
    super(kind);
  }
}

const client = () => {
  if (!supabase) throw new EmailAuthError('unknown');
  return supabase.auth;
};

const toKind = (error: AuthError): AuthErrorKind => {
  switch (error.code) {
    case 'invalid_credentials':
      return 'invalid-credentials';
    case 'email_not_confirmed':
      return 'email-not-confirmed';
    case 'otp_expired':
    case 'otp_disabled':
      return 'invalid-code';
    case 'weak_password':
      return 'weak-password';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'rate-limited';
    default:
      return error.status === 429 ? 'rate-limited' : 'unknown';
  }
};

const check = ({ error }: { error: AuthError | null }) => {
  if (error) throw new EmailAuthError(toKind(error));
};

export const MIN_PASSWORD_LENGTH = 8;

export const signIn = async (email: string, password: string) => check(await client().signInWithPassword({ email, password }));

/** Creates the account; a confirmation code is then emailed. */
export const signUp = async (email: string, password: string) => check(await client().signUp({ email, password }));

export const sendResetCode = async (email: string) => check(await client().resetPasswordForEmail(email));

export const resendCode = async (email: string, purpose: CodePurpose) =>
  purpose === 'signup' ? check(await client().resend({ type: 'signup', email })) : sendResetCode(email);

/** Checks the 6-digit code. On success the user is signed in. */
export const verifyCode = async (email: string, code: string, purpose: CodePurpose) =>
  check(await client().verifyOtp({ email, token: code, type: purpose === 'signup' ? 'signup' : 'recovery' }));

export const setNewPassword = async (password: string) => check(await client().updateUser({ password }));
