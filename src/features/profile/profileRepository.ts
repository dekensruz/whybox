import { readJson, writeJson } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { Profile } from './types';

const GUEST_PROFILE_KEY = 'whybox.guest-profile';

interface ProfileRow {
  id: string;
  role: Profile['role'];
  first_name: string;
  levels: Profile['levels'];
  country: string;
  city: string;
  learning_language: string;
  interests: string[];
  subjects: string[];
  device_usage: Profile['deviceUsage'];
}

const fromRow = (row: ProfileRow): Profile => ({
  role: row.role,
  firstName: row.first_name,
  levels: row.levels,
  country: row.country,
  city: row.city,
  learningLanguage: row.learning_language,
  interests: row.interests,
  subjects: row.subjects,
  deviceUsage: row.device_usage,
});

const toRow = (userId: string, profile: Profile): ProfileRow => ({
  id: userId,
  role: profile.role,
  first_name: profile.firstName,
  levels: profile.levels,
  country: profile.country,
  city: profile.city,
  learning_language: profile.learningLanguage,
  interests: profile.interests,
  subjects: profile.subjects,
  device_usage: profile.deviceUsage,
});

/** Profile of a signed-in user, or of the guest when userId is null. */
export const loadProfile = async (userId: string | null): Promise<Profile | null> => {
  if (!userId || !supabase) return readJson<Profile>(GUEST_PROFILE_KEY);
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle<ProfileRow>();
  if (error) throw error;
  return data ? fromRow(data) : null;
};

export const saveProfile = async (userId: string | null, profile: Profile): Promise<void> => {
  if (!userId || !supabase) {
    writeJson(GUEST_PROFILE_KEY, profile);
    return;
  }
  const { error } = await supabase.from('profiles').upsert(toRow(userId, profile));
  if (error) throw error;
};

export const clearGuestProfile = () => writeJson(GUEST_PROFILE_KEY, null);
