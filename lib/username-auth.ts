import { supabase } from '@/lib/supabase';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const ACCOUNT_DOMAIN = 'accounts.lernzeit.invalid';

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase('en-US');
}

export function usernameError(value: string, allowEmail = false) {
  const username = normalizeUsername(value);
  if (!username) return 'Enter a username.';
  if (allowEmail && /^\S+@\S+\.\S+$/.test(username)) return '';
  if (!USERNAME_PATTERN.test(username)) {
    return 'Use 3–24 letters, numbers, dots, underscores, or hyphens.';
  }
  return '';
}

function usernameEmail(username: string) {
  const normalized = normalizeUsername(username);
  return normalized.includes('@')
    ? normalized
    : `${normalized}@${ACCOUNT_DOMAIN}`;
}

export function signInWithUsername(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: usernameEmail(username),
    password,
  });
}

export function signUpWithUsername(username: string, password: string) {
  const normalized = normalizeUsername(username);
  return supabase.auth.signUp({
    email: usernameEmail(normalized),
    password,
    options: {
      data: { username: normalized, full_name: normalized },
    },
  });
}

export function accountUsername(
  user: { user_metadata?: Record<string, unknown>; email?: string } | null,
) {
  if (!user) return '';
  const metadataUsername = user.user_metadata?.username;
  if (typeof metadataUsername === 'string' && metadataUsername.trim()) {
    return metadataUsername;
  }
  return user.email?.split('@')[0] ?? 'Player';
}
