export type Role = 'student' | 'teacher';
export type Level = 'primary' | 'lower_secondary' | 'upper_secondary';
export type DeviceUsage = 'own' | 'shared' | 'classroom';

export interface Profile {
  role: Role;
  firstName: string;
  levels: Level[];
  country: string; // ISO 3166-1 alpha-2
  city: string;
  learningLanguage: string; // BCP 47 language code
  interests: string[];
  subjects: string[];
  deviceUsage: DeviceUsage;
}

export const LEVELS: Level[] = ['primary', 'lower_secondary', 'upper_secondary'];
export const DEVICE_USAGES: DeviceUsage[] = ['own', 'shared', 'classroom'];
export const INTERESTS = ['football', 'music', 'business', 'phones', 'games', 'cooking', 'nature', 'space', 'vehicles', 'drawing'] as const;
export const SUBJECTS = ['math', 'physics', 'chemistry', 'biology', 'technology'] as const;
export const LEARNING_LANGUAGES = ['fr', 'en', 'sw', 'ln', 'es', 'pt', 'ar', 'ja'];

// Shown first in the list; every other country is reachable below.
export const FEATURED_COUNTRIES = ['CD', 'RW', 'BI', 'UG', 'KE', 'TZ'];
export const COUNTRIES = [
  'CD', 'RW', 'BI', 'UG', 'KE', 'TZ', 'AO', 'BJ', 'BF', 'CM', 'CF', 'TD', 'CG', 'CI', 'DZ', 'EG', 'ET', 'GA', 'GH', 'GN',
  'MG', 'ML', 'MA', 'MZ', 'NE', 'NG', 'SN', 'ZA', 'SS', 'SD', 'TG', 'TN', 'ZM', 'ZW', 'BE', 'CA', 'CH', 'DE', 'ES', 'FR',
  'GB', 'IT', 'PT', 'US', 'BR', 'HT', 'MX', 'IN', 'JP', 'CN', 'KR', 'PH', 'ID', 'AE', 'SA', 'LB', 'AU',
];
