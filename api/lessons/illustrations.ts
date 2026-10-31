import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { illustrate } from '../../server/illustrations.js';

const KIND = /^(hook|summary|exercise|concept[0-4])$/;

/** Illustrates one card of a lesson (the opening question, a key word, the exercise, what to remember) with Muse Image. */
export const POST = handle(async (request) => {
  const { scene, kind } = await readBody<{ scene?: string; kind?: string }>(request);
  if (typeof scene !== 'string' || !scene.trim() || scene.length > 400) throw new BadRequest('Invalid scene');
  if (typeof kind !== 'string' || !KIND.test(kind)) throw new BadRequest('Invalid illustration kind');
  return json({ image: await illustrate(scene.trim()) });
});
