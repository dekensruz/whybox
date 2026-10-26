// Step 2 of a lesson: build the interactive experiment, and repair it when verification fails.
import type { CheckFailure, LearnerContext, LessonPlan } from '../shared/lesson';
import type { InputPart } from './meta';

const DESIGN_RULES = `Design (very professional, simple and minimalist):
- Background #FAFAF7, text #14161A, secondary text #5B6270, lines #E6E4DE, one accent color #F2A900 for what matters most.
- System font stack, clear hierarchy, generous spacing, rounded corners. No gradients, no cartoon style, no emojis.
- Purposeful animation only where it helps understanding (moving particles, forces, flows).
- Mobile first: fits a 360px wide screen without horizontal scrolling, controls are large and touch friendly.`;

const interfaceSpec = (plan: LessonPlan) => {
  const parameters = plan.simulation.parameters
    .map((p) => `  - ${p.name}: ${p.label}, ${p.min} to ${p.max} ${p.unit}, step ${p.step}, default ${p.default}`)
    .join('\n');
  const measurements = plan.simulation.measurements
    .map((m) => `  - ${m.name}: ${m.label} (${m.unit}) = ${m.formula}`)
    .join('\n');
  return `Parameters (one control each, showing the live value and unit):
${parameters}
Measurements (displayed live, computed with exactly these formulas):
${measurements}

Expose this test interface, using exactly these names:
window.whybox = {
  params: { <parameter name>: { value, min, max, unit } },
  set(name, value),   // updates the control, the display and the simulation immediately
  measure()           // returns { <measurement name>: number } from the current state, computed synchronously
};`;
};

export const buildSimulationParts = (plan: LessonPlan, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You build the interactive experiment of a Whybox lesson.

Lesson: ${plan.title}
What the experiment shows: ${plan.simulation.description}
Everyday context of the learner: ${plan.hook}

${interfaceSpec(plan)}

The app shows the explanations around the experiment, so the experiment itself contains only:
the visual scene, the controls, the live measurements, and short labels. No paragraphs of text.
All visible text in the language of this lesson (code: ${learner.language}).
Make the invisible visible (particles, forces, rays, flows), driven by the real values.

${DESIGN_RULES}

Technical rules:
- One self-contained HTML file. No external scripts, styles, fonts or images, no network calls.
- Use <canvas> or inline SVG. Keep it lightweight so it runs smoothly on an entry-level Android phone.
- Never throw errors; measure() must always return finite numbers.

Answer with the complete HTML file only, inside a single \`\`\`html code block.`,
  },
];

export const buildRepairParts = (plan: LessonPlan, html: string, failures: CheckFailure[]): InputPart[] => {
  const report = failures
    .slice(0, 8)
    .map(
      (failure) =>
        `- With ${JSON.stringify(failure.parameters)}, ${failure.measurement} should be ${failure.expected} but measure() returned ${failure.received}`,
    )
    .join('\n');
  return [
    {
      type: 'input_text',
      text: `This interactive experiment failed its automatic verification.

${interfaceSpec(plan)}

Failed checks:
${report}

Fix the experiment so every check passes: the controls, the display, the animation and measure() must all follow the formulas.
Keep the same design. Answer with the complete corrected HTML file only, inside a single \`\`\`html code block.

Current file:
\`\`\`html
${html}
\`\`\``,
    },
  ];
};

export const extractHtml = (text: string): string => {
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.search(/<!doctype html|<html/i);
  const end = text.lastIndexOf('</html>');
  if (start === -1 || end === -1) throw new Error('No HTML in the model answer');
  return text.slice(start, end + '</html>'.length);
};
