import type { DeviceUsage, Profile, Role } from '@/features/profile/types';

export type StepId = 'role' | 'name' | 'level' | 'place' | 'language' | 'interests' | 'subjects' | 'device' | 'done';

export type Draft = Omit<Profile, 'role' | 'deviceUsage'> & {
  role: Role | undefined;
  deviceUsage: DeviceUsage | undefined;
};

export const STEPS_BY_ROLE: Record<Role, StepId[]> = {
  student: ['role', 'name', 'level', 'place', 'language', 'interests', 'subjects', 'device', 'done'],
  teacher: ['role', 'name', 'level', 'subjects', 'place', 'language', 'device', 'done'],
};
