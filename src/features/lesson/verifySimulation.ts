// Automatic verification: drives the experiment through its test interface and compares
// every measurement with the formula of the lesson, before a learner ever sees it.
import { evaluate } from '@shared/expression';
import type { CheckFailure, LessonPlan } from '@shared/lesson';
import { SimulationBridge, withBridge } from './simulationBridge';

const RELATIVE_TOLERANCE = 0.02;
const RANDOM_CASES = 3;

export interface VerificationResult {
  passed: number;
  total: number;
  failures: CheckFailure[];
}

const snap = (value: number, min: number, step: number) => Number((Math.round((value - min) / step) * step + min).toFixed(6));

/** Defaults, each parameter at its bounds, then a few random combinations. */
const buildCases = (plan: LessonPlan): Array<Record<string, number>> => {
  const { parameters } = plan.simulation;
  const defaults = Object.fromEntries(parameters.map((p) => [p.name, p.default]));
  const cases = [defaults];
  for (const parameter of parameters) {
    cases.push({ ...defaults, [parameter.name]: parameter.min }, { ...defaults, [parameter.name]: parameter.max });
  }
  for (let index = 0; index < RANDOM_CASES; index++) {
    cases.push(
      Object.fromEntries(
        parameters.map((p) => [p.name, snap(p.min + Math.random() * (p.max - p.min), p.min, p.step)]),
      ),
    );
  }
  const seen = new Set<string>();
  return cases.filter((item) => {
    const key = JSON.stringify(item);
    return seen.has(key) ? false : (seen.add(key), true);
  });
};

const matches = (expected: number, received: unknown) =>
  typeof received === 'number' &&
  Number.isFinite(received) &&
  Math.abs(received - expected) <= Math.max(1e-6, RELATIVE_TOLERANCE * Math.abs(expected));

/** Loads the experiment in an invisible sandboxed frame and runs every check. */
export const verifySimulation = async (plan: LessonPlan, html: string): Promise<VerificationResult> => {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:360px;height:720px;border:0;';
  const bridge = new SimulationBridge(frame);
  const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
  frame.srcdoc = withBridge(html);
  document.body.appendChild(frame);

  const failures: CheckFailure[] = [];
  let total = 0;
  try {
    await loaded;
    await bridge.ready();
    for (const parameters of buildCases(plan)) {
      for (const [name, value] of Object.entries(parameters)) await bridge.call('set', [name, value]);
      const measured = await bridge.call<Record<string, number>>('measure').catch(() => ({}) as Record<string, number>);
      for (const measurement of plan.simulation.measurements) {
        const expected = evaluate(measurement.formula, parameters);
        if (!Number.isFinite(expected)) continue;
        total++;
        const received = measured?.[measurement.name];
        if (!matches(expected, received)) {
          failures.push({ parameters, measurement: measurement.name, expected, received: typeof received === 'number' ? received : null });
        }
      }
    }
  } catch (error) {
    // An experiment that cannot be driven at all fails every check.
    const defaults = Object.fromEntries(plan.simulation.parameters.map((p) => [p.name, p.default]));
    failures.push({ parameters: defaults, measurement: `test interface (${(error as Error).message})`, expected: 0, received: null });
    total = Math.max(total, failures.length);
  } finally {
    bridge.dispose();
    frame.remove();
  }
  return { passed: Math.max(0, total - failures.length), total, failures };
};
