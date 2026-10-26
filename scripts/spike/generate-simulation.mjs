// Feasibility spike: can Muse Spark turn a lesson into a good interactive simulation,
// fast enough and cheap enough? Prints the generation time, token usage and an
// estimated cost, saves the simulation and opens it in the browser.
//
// Usage:
//   npm run spike:generate -- --lesson "Electric current in a simple circuit"
//   npm run spike:generate -- --image path/to/notebook-photo.jpg
//
// Options:
//   --lesson <text>   lesson topic or text
//   --image <path>    photo of a notebook page, blackboard or textbook page
//   --lang <code>     language of the labels (default: fr)
//   --model <id>      model id (default: GENERATION_MODEL or muse-spark-1.3)
//   --no-open         do not open the result in the browser
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const BASE_URL = process.env.MODEL_API_BASE_URL || 'https://api.meta.ai/v1';
const OUTPUT_DIR = '.spike-output';
const REQUEST_TIMEOUT_MS = 5 * 60_000;

// USD per 1M tokens. Unofficial figures, only used for a rough estimate.
const PRICES = {
  'muse-spark-1.3': { input: 1.25, output: 4.25 },
  'muse-wonder-1.0': { input: 4, output: 20 },
};

const IMAGE_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

const { values: args } = parseArgs({
  options: {
    lesson: { type: 'string' },
    image: { type: 'string' },
    lang: { type: 'string', default: 'fr' },
    model: { type: 'string', default: process.env.GENERATION_MODEL || 'muse-spark-1.3' },
    'no-open': { type: 'boolean', default: false },
  },
});

const fail = (message) => {
  console.error(`\nError: ${message}`);
  process.exit(1);
};

const buildPrompt = (lang) => `You are the simulation engine of Whybox, a learning tool for kids aged 10 to 15,
many of them in schools with no lab and no textbook.

From the lesson provided (text or photo of a notebook, blackboard or textbook page),
create ONE interactive simulation that shows how the thing really works inside.

Teaching style (like a great teacher who makes hard ideas obvious):
- Open with one concrete question from everyday life that the simulation answers.
- Explain step by step, in short plain sentences, each step tied to something visible on screen.
- Define every term the first time it appears, with a concrete everyday comparison.
- Give at least one worked example with real numbers and units.
- End with a one-sentence summary of what the child should remember.
- Calm, precise and respectful tone. No jargon left unexplained, no exclamation marks, no emojis.

Design (very professional, simple and minimalist):
- Light neutral background, dark text, one accent color, plenty of white space.
- System font stack, clear hierarchy, no decorative clutter, no gradients, no cartoon style, no emojis.
- Smooth, purposeful animation only where it helps understanding.

Requirements:
- A single self-contained HTML file. No external scripts, styles, fonts or images, no network calls.
- Show what is normally invisible (moving electrons, forces, light rays, pressure...).
- 2 to 4 controls (large sliders or buttons) that change the key parameters, with live values and units.
- Display at least one measured value that changes with the controls.
- The physics or math must be correct: compute values from the real formula of the lesson.
- Mobile first: works on a 360px wide phone screen, touch friendly.
- All visible text in this language: ${lang}.
- Expose a test interface for automatic verification:
  window.whybox = {
    params: { <name>: { value, min, max, unit } },  // every control
    set(name, value),                                // updates the control and the simulation
    measure()                                        // returns { <quantity>: number } computed by the simulation
  };

Answer with the complete HTML file only, inside a single \`\`\`html code block.`;

const buildContent = async () => {
  if (!args.lesson && !args.image) fail('provide --lesson "<text>" or --image <path>.');

  const content = [{ type: 'input_text', text: buildPrompt(args.lang) }];
  if (args.lesson) content.push({ type: 'input_text', text: `Lesson: ${args.lesson}` });
  if (args.image) {
    const mime = IMAGE_TYPES[path.extname(args.image).toLowerCase()];
    if (!mime) fail(`unsupported image type, use one of: ${Object.keys(IMAGE_TYPES).join(', ')}`);
    const data = await readFile(args.image).catch(() => fail(`cannot read ${args.image}`));
    content.push({ type: 'input_image', image_url: `data:${mime};base64,${data.toString('base64')}` });
  }
  return content;
};

const outputText = (response) =>
  response.output_text ??
  (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? '')
    .join('');

const extractHtml = (text) => {
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.search(/<!doctype html|<html/i);
  const end = text.lastIndexOf('</html>');
  return start !== -1 && end !== -1 ? text.slice(start, end + '</html>'.length) : null;
};

const slugify = (value) =>
  value.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'lesson';

const openInBrowser = (file) => {
  const absolute = path.resolve(file);
  const [command, commandArgs] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', absolute]]
      : [process.platform === 'darwin' ? 'open' : 'xdg-open', [absolute]];
  spawn(command, commandArgs, { detached: true, stdio: 'ignore' }).unref();
};

const main = async () => {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) fail('MODEL_API_KEY is not set. Add it to your environment or to a .env file.');

  const content = await buildContent();
  console.log(`Generating with ${args.model}...`);
  const startedAt = performance.now();

  const res = await fetch(`${BASE_URL}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: args.model, input: [{ type: 'message', role: 'user', content }] }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => fail(`request failed: ${error.message}`));

  const seconds = (performance.now() - startedAt) / 1000;
  if (!res.ok) fail(`API returned ${res.status}: ${await res.text()}`);

  const response = await res.json();
  const html = extractHtml(outputText(response));

  const runDir = path.join(OUTPUT_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(args.lesson ?? path.basename(args.image))}`);
  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, 'response.json'), JSON.stringify(response, null, 2));

  const usage = response.usage ?? {};
  const price = PRICES[args.model];
  const cost = price && usage.input_tokens != null
    ? (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1_000_000
    : null;

  console.log(`\nTime:          ${seconds.toFixed(1)} s`);
  console.log(`Input tokens:  ${usage.input_tokens ?? 'n/a'}`);
  console.log(`Output tokens: ${usage.output_tokens ?? 'n/a'}`);
  console.log(`Estimated cost: ${cost != null ? `$${cost.toFixed(4)}` : 'n/a'}`);

  if (!html) fail(`no HTML found in the answer. Raw response saved in ${runDir}`);

  const file = path.join(runDir, 'simulation.html');
  await writeFile(file, html);
  console.log(`\nSimulation saved: ${file}`);
  if (!args['no-open']) openInBrowser(file);
};

main();
