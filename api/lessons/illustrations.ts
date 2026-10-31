import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { illustrate } from '../../server/illustrations.js';

const KINDS = ['hook', 'summary'] as const;

/** Illustrates one card of a lesson (the opening question or what to remember) with Muse Image. */
export const POST = handle(async (request) => {
  const { scene, kind } = await readBody<{ scene?: string; kind?: string }>(request);
  if (typeof scene !== 'string' || !scene.trim() || scene.length > 400) throw new BadRequest('Invalid scene');
  if (!KINDS.includes(kind as (typeof KINDS)[number])) throw new BadRequest('Invalid illustration kind');
  return json({ image: await illustrate(scene.trim()) });
});
