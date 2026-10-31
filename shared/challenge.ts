// Where a challenge step starts, shared by the server (which checks the challenge) and the app (which plays it).

/**
 * The controls to find keep the previous step's values; every other control takes this step's values, the givens of
 * the question. Without controls to find, the challenge starts from the previous step.
 */
export const challengeStart = (
  defaults: Record<string, number>,
  previous: Record<string, number>,
  step: Record<string, number>,
  find: string[],
): Record<string, number> => {
  const before = { ...defaults, ...previous };
  if (!find.length) return before;
  const start = { ...defaults, ...step };
  for (const name of find) start[name] = before[name];
  return start;
};
