import { BadRequest, handle, readBody } from '../../server/http.js';
import { ModelError } from '../../server/meta.js';

const MAX_CHARACTERS = 1200;
const TIMEOUT_MS = 60_000;

/** Says a card aloud with the tutor's open-weight voice (Kokoro on Modal), as a WAV file. */
export const POST = handle(async (request) => {
  const { text, language } = await readBody<{ text?: string; language?: string }>(request);
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_CHARACTERS) throw new BadRequest('Invalid text');
  const url = process.env.TTS_URL;
  const token = process.env.TTS_TOKEN;
  if (!url || !token) throw new ModelError('The tutor voice is not configured', 503);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, text: text.trim(), language: language === 'en' ? 'en' : 'fr' }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: Error) => {
    throw new ModelError(`Voice request failed: ${error.message}`);
  });
  if (!response.ok) throw new ModelError(`Voice service returned ${response.status}`);
  return new Response(await response.arrayBuffer(), {
    headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=86400' },
  });
});
