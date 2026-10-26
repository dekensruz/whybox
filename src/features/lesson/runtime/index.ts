// Everything a generated experiment needs at run time, added in front of its own code:
// the lesson's parameters and formulas (compiled safely), then the 2D or 3D scene kit.
import kit2d from 'virtual:whybox-kit-2d';
import { toJavaScript } from '@shared/expression';
import type { LessonPlan } from '@shared/lesson';

/** JSON that can sit inside a <script> element. */
const scriptSafe = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

// The 3D kit carries three.js (about 500 KB): it is only downloaded for lessons that need it.
const loadKit = async (plan: LessonPlan) =>
  plan.simulation.dimension === '3d' ? (await import('virtual:whybox-kit-3d')).default : kit2d;

export const buildRuntime = async (plan: LessonPlan, language: string): Promise<string> => {
  const kit = await loadKit(plan);
  const { parameters, measurements } = plan.simulation;
  const names = parameters.map((parameter) => parameter.name);
  const compiled = measurements
    .map((m) => `{ name: ${scriptSafe(m.name)}, label: ${scriptSafe(m.label)}, unit: ${scriptSafe(m.unit)}, compute: function (p) { return ${toJavaScript(m.formula, names)}; } }`)
    .join(',\n');
  return `<script>
window.WHYBOX_SPEC = {
  title: ${scriptSafe(plan.title)},
  language: ${scriptSafe(language)},
  parameters: ${scriptSafe(parameters)},
  measurements: [${compiled}]
};
</script>
<script>${kit}</script>`;
};

/** Inserts the runtime at the very start of the document, before any of the experiment's own scripts. */
export const withRuntime = async (html: string, plan: LessonPlan, language: string) => {
  const runtime = await buildRuntime(plan, language);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (head) => `${head}${runtime}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${runtime}</head>`);
  return `${runtime}${html}`;
};
