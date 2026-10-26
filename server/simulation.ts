// Step 2 of a lesson: build the interactive experiment, and repair it when verification fails.
import type { CheckFailure, LearnerContext, LessonPlan } from '../shared/lesson.js';
import type { InputPart } from './meta.js';

const DESIGN_RULES = `Visual quality (this experiment is the heart of the lesson, it must be beautiful and convincing):
- One large central scene, at least 60% of the screen height, that tells the story at a glance.
  Real proportions; if something must be exaggerated to be visible, say so in a small caption.
- Show cause and effect with motion: when a value changes, the scene visibly reacts (particles speed up, an object sinks, a ray bends).
- Every label sits in free space, outside shapes, with a thin leader line if needed. No label ever overlaps another label,
  a shape or an arrow. At most 6 short labels in the scene.
- Below the scene: the controls, then 1 to 3 large live measurements. Nothing else.

Design (very professional, simple and minimalist):
- Background #FAFAF7, text #14161A, secondary text #5B6270, lines #E6E4DE, one accent color #F2A900 for what matters most.
- Flat, clean shapes with a consistent stroke width. System font stack. No gradients, no shadows, no cartoon style, no emojis.
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
  set(name, value),   // updates the control and the measurements immediately; the scene glides to the new state in about 0.6 s
  measure()           // returns { <measurement name>: number } from the current state, computed synchronously
};
The lesson drives the experiment through set() to guide the learner step by step, so set() must always work and look smooth.`;
};

export const buildSimulationParts = (plan: LessonPlan, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You build the interactive experiment of a Whybox lesson.

Lesson: ${plan.title}
What the experiment shows: ${plan.simulation.description}
Everyday context of the learner: ${plan.hook}
The guided tour the lesson will play on it:
${plan.steps.map((step, index) => `  ${index + 1}. ${step.title}: ${JSON.stringify(step.parameters)}, the learner watches: ${step.observe}`).join('\n')}

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

export const buildRepairParts = (plan: LessonPlan, html: string, failures: CheckFailure[], visualIssues: string[] = []): InputPart[] => {
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
      text: `This interactive experiment failed its review before being shown to children.

${interfaceSpec(plan)}

${report ? `Failed calculation checks:\n${report}\n` : ''}${visualIssues.length ? `Problems seen on screen by the reviewer:\n${visualIssues.map((issue) => `- ${issue}`).join('\n')}\n` : ''}
Fix every problem. The controls, the display, the animation and measure() must all follow the formulas.

${DESIGN_RULES}

Answer with the complete corrected HTML file only, inside a single \`\`\`html code block.

Current file:
\`\`\`html
${html}
\`\`\``,
    },
  ];
};

/** A demanding teacher looks at pictures of the experiment and says whether it really teaches. */
export const buildVisualReviewParts = (plan: LessonPlan, snapshots: string[]): InputPart[] => [
  {
    type: 'input_text',
    text: `You review the interactive experiment of a lesson for children, before any child sees it.
You get pictures of the experiment on a phone screen: first at rest, then at each step of the guided tour.

Lesson: ${plan.title}
What the experiment must show: ${plan.simulation.description}
Guided tour:
${plan.steps.map((step, index) => `  Picture ${index + 2}. ${step.title}: the learner should see: ${step.observe}`).join('\n')}

Reject the experiment if any of these is true:
- A label overlaps another label, a shape, an arrow or a control, or text is cut off.
- The scene is small, squeezed into a corner, or leaves large empty areas.
- A child could not tell what is happening, or the key idea is not visible.
- A step picture does not clearly show what that step says the learner should see.
- The proportions or the physics look wrong (an object where it cannot be, arrows in the wrong direction).
- It looks cluttered, childish or unprofessional (decoration, emojis, inconsistent styles).

Answer with JSON only: { "approved": true or false, "issues": ["precise problem and how to fix it", ...] }
List at most 6 issues, the most important first. If approved, issues is empty.`,
  },
  ...snapshots.map((image): InputPart => ({ type: 'input_image', image_url: image })),
];

export const parseVisualReview = (text: string): { approved: boolean; issues: string[] } => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const review = JSON.parse(fenced ? fenced[1] : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as {
    approved?: unknown;
    issues?: unknown;
  };
  const issues = Array.isArray(review.issues) ? review.issues.map(String).slice(0, 6) : [];
  return { approved: review.approved === true && issues.length === 0, issues };
};

export const extractHtml = (text: string): string => {
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.search(/<!doctype html|<html/i);
  const end = text.lastIndexOf('</html>');
  if (start === -1 || end === -1) throw new Error('No HTML in the model answer');
  return text.slice(start, end + '</html>'.length);
};
