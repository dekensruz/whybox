// Step 2 of a lesson: build the interactive experiment, and repair it when verification fails.
import type { CheckFailure, LearnerContext, LessonPlan } from '../shared/lesson.js';
import type { InputPart } from './meta.js';

const DESIGN_RULES = `Visual quality (this scene is the heart of the lesson, it must be beautiful and convincing):
- The scene tells the story at a glance and fills its frame: no large empty areas, nothing squeezed into a corner.
- Real proportions and real physics. If something must be exaggerated to be visible, say so in the caption.
- Show cause and effect with motion: when a value changes, the scene visibly reacts (particles speed up, an object sinks, a ray bends).
- At most 5 labels of 1 to 3 words each. Never write equations, calculations, sentences or numbers with their
  explanation inside the scene: the measurements already appear in the result cards below the scene.
- Leave free space around objects so labels have room. Never draw text boxes or panels inside the scene.
- Draw only what serves the idea. Flat, clean shapes, consistent strokes, no decoration, no emojis.
- Use the kit colors (g.colors). The accent color marks the one thing that matters most.`;

/** The 2D scene kit as the model sees it. The kit itself lives in src/features/lesson/runtime/kit. */
const KIT_GUIDE_2D = `The page, the controls, the live measurements, the test interface and the smooth transitions are already provided
by the Whybox scene kit. You only describe the scene, by calling WB.app once:

WB.app({
  world: { width: 100, height: 80 },         // your drawing units, y goes UP, origin bottom-left. Phones are narrow:
                                             // prefer a height of 70 to 100 for a width of 100, and use the whole area.
  caption: 'short note, e.g. what is exaggerated',  // optional
  switchLabels: { <switch parameter>: ['Off label', 'On label'] },  // for parameters with min 0, max 1, step 1
  draw(g, p, m, t) {
    // Called every frame. p: current parameter values (gliding smoothly between states), by name.
    // m: current measurement values, by name, computed by the kit from the lesson's exact formulas. Use them, never recompute.
    // t: seconds since start, for continuous motion.
  }
});

Drawing helpers (all positions and sizes in world units; o is an optional options object):
  g.rect(x, y, w, h, o)          bottom-left corner. o: fill, stroke, width, radius (px), dash, opacity, background
  g.circle(x, y, r, o)
  g.line(x1, y1, x2, y2, o)      o: color, width (px), dash
  g.polyline(points, o)          points: [[x, y], ...]. o: color, width, dash, smooth
  g.polygon(points, o)           o: fill, stroke, smooth, opacity, background
  g.arrow(x1, y1, x2, y2, o)     o: color, width, head (px), label — use for forces, motion, directions
  g.water(level, o)              water surface at height level. o: from, to, bottom, waves (amplitude), t, color, lineColor
  g.ground(level, o)             o: from, to, color
  g.flow(points, o)              dots moving along a path. o: count, speed (world units per second), t, color, size (px)
  g.dimension(x1, y1, x2, y2, text, o)  a measured distance with its value
  g.glow(x, y, r, strength, o)   soft light around a lamp or the sun, strength 0 to 1, stays inside the scene
  g.highlight(x, y, r)           draws the learner's eye to one spot
  g.label(text, x, y, o)         short label anchored at (x, y); the kit places it so labels never overlap, with a leader line.
                                 o: color, priority (higher is placed first)
  g.px(n)                        n screen pixels in world units (for fixed-size details)
  g.colors: ink, muted, subtle, line, surface, accent, accentSoft, water, waterLight, sky, ground, groundDark, positive, negative, warm, cool
Option objects with background: true do not push labels away. Shapes are drawn in the order you call them.
Name things in the scene with exactly the same words as the parameter labels. Draw each object with its usual simple
symbol (a bulb is a circle, a resistor a zigzag): never reuse one object's symbol for another.
Keep moving dots and glows away from labels; labels are drawn last, on top.

Example:
WB.app({
  world: { width: 100, height: 56 },
  draw(g, p, m, t) {
    var wire = [[15, 12], [15, 44], [85, 44], [85, 12], [15, 12]];
    g.polyline(wire, { width: 3 });
    g.flow(wire, { t: t, speed: 4 + m.current * 20, count: 16, color: g.colors.cool });
    g.circle(50, 44, 6, { fill: p.switchOn ? g.colors.accent : g.colors.surface, opacity: 0.4 + 0.6 * Math.min(1, m.power / 10) });
    g.rect(43, 8, 14, 8, { fill: g.colors.ink, radius: 3 });
    g.label('Pile ' + p.voltage + ' V', 50, 12);
    g.label('Ampoule', 50, 50, { priority: 1 });
  }
});`;

/** The 3D scene kit (three.js) as the model sees it. */
const KIT_GUIDE_3D = `The page, the controls, the live measurements, the test interface, the lights, the camera that the learner
turns with one finger, and the smooth transitions are already provided by the Whybox 3D scene kit.
You only describe the scene, by calling WB.app3d once:

WB.app3d({
  camera: { position: [6, 4, 8], target: [0, 0, 0] },  // where the learner looks from at first; y goes UP
  autoRotate: false,                                     // true only if a slow turn helps (a planet, a molecule)
  caption: 'short note, e.g. sizes not to scale',       // optional
  switchLabels: { <switch parameter>: ['Off label', 'On label'] },
  setup(s) {
    // Called once: create every object here and return them by name.
    return { sun: s.sphere(1.2, { color: s.colors.accent, emissive: true }), earth: s.sphere(0.4, { color: s.colors.water }) };
  },
  update(s, p, m, t, o) {
    // Called every frame: move and change the objects created in setup. p: parameter values (gliding smoothly),
    // m: measurement values computed by the kit from the lesson's exact formulas, t: seconds, o: what setup returned.
    o.earth.at(5 * Math.cos(t * 0.3), 0, 5 * Math.sin(t * 0.3));
  }
});

Objects (positions are [x, y, z] arrays; every object has .position, .rotation, .scale, .visible, .at(x, y, z),
and meshes have .setColor(color) and .setOpacity(value)):
  s.sphere(radius, o)  s.box(w, h, d, o)  s.cylinder(radiusTop, radiusBottom, height, o)  s.cone(radius, height, o)
  s.torus(radius, tube, o)  s.plane(width, depth, o) (horizontal: ground, water, table)  s.group(o)  s.grid(size)
  common options o: color, position, rotation, opacity, emissive (true for things that give light), parent (a group)
  s.line(points, o)              o: color, dash. Returns a line with .setPoints(points)
  s.arrow(from, to, o)           o: color, head. Returns an arrow with .set(from, to): forces, motion, light rays
  s.flow(points, o)              dots moving along a path, animated by the kit. o: count, speed, color, size.
                                 Change .speed in update() to make the flow faster or slower
  s.light(position, o)           the light source of the scene (the Sun, a lamp): the side facing away becomes dark. o: color
  s.label(text, target, o)       label that follows a point [x, y, z] or an object; never overlaps other labels.
                                 o: color, priority. Returns { setText(text), setTarget(target), visible }
  s.colors: ink, muted, subtle, line, surface, accent, accentSoft, water, waterLight, sky, ground, groundDark, positive, negative, warm, cool

Keep the whole scene within about 10 units of the target so the first view shows everything. Use few objects
with simple shapes and segments; it must run smoothly on entry-level phones. Name things with exactly the same
words as the parameter labels.

Example:
WB.app3d({
  camera: { position: [0, 6, 10], target: [0, 0, 0] },
  setup(s) {
    var sun = s.sphere(1.4, { color: s.colors.accent, emissive: true });
    s.light([0, 0, 0]);
    var earth = s.sphere(0.5, { color: s.colors.water });
    s.label('Soleil', sun, { priority: 1 });
    var earthLabel = s.label('Terre', earth);
    return { earth: earth, earthLabel: earthLabel };
  },
  update(s, p, m, t, o) {
    var angle = (p.day / 365) * 2 * Math.PI;
    o.earth.at(6 * Math.cos(angle), 0, 6 * Math.sin(angle));
    o.earth.rotation.y = t;
  }
});`;

const kitGuide = (plan: LessonPlan) => (plan.simulation.dimension === '3d' ? KIT_GUIDE_3D : KIT_GUIDE_2D);

const interfaceSpec = (plan: LessonPlan) => {
  const parameters = plan.simulation.parameters
    .map((p) => `  - p.${p.name}: ${p.label}, ${p.min} to ${p.max} ${p.unit}, default ${p.default}`)
    .join('\n');
  const measurements = plan.simulation.measurements.map((m) => `  - m.${m.name}: ${m.label} (${m.unit}) = ${m.formula}`).join('\n');
  return `Parameters (the kit creates their controls):
${parameters}
Measurements (the kit computes and displays them):
${measurements}`;
};

export const buildSimulationParts = (plan: LessonPlan, learner: LearnerContext): InputPart[] => [
  {
    type: 'input_text',
    text: `You build the interactive experiment of a Whybox lesson.

Lesson: ${plan.title}
What the experiment shows: ${plan.simulation.description}
The guided tour the lesson will play on it (the scene must make each of these visible):
${plan.steps.map((step, index) => `  ${index + 1}. ${step.title}: ${JSON.stringify(step.parameters)}, the learner watches: ${step.observe}`).join('\n')}

${interfaceSpec(plan)}

${kitGuide(plan)}

${DESIGN_RULES}

All visible text in the language of this lesson (code: ${learner.language}).
The per-frame function runs on entry-level phones: keep it light, and never throw.

Answer with a complete minimal HTML file whose body contains only one <script> calling
${plan.simulation.dimension === '3d' ? 'WB.app3d' : 'WB.app'}, inside a single \`\`\`html code block.
Do not define window.whybox, controls or measurements yourself.`,
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
Fix every problem. If the file uses the scene kit (WB.app or WB.app3d), keep using it and only change the scene;
otherwise the controls, the display, the animation and measure() must all follow the formulas.

${kitGuide(plan)}

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
