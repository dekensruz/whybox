import { BadRequest, handle, json } from '../../server/http.js';
import { ModelError } from '../../server/meta.js';

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 60_000;

/**
 * Turns a learner's spoken question or answer into text with Muse Voice Transcribe.
 * The browser sends a short WAV recording (16 kHz mono), which is forwarded as the API expects it.
 */
export const POST = handle(async (request) => {
  if (!(request.headers.get('content-type') ?? '').startsWith('audio/wav')) throw new BadRequest('Expected a WAV recording');
  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0 || audio.byteLength > MAX_BYTES) throw new BadRequest('Recording is empty or too long');

  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new ModelError('MODEL_API_KEY is not configured', 500);
  const baseUrl = process.env.MODEL_API_BASE_URL || 'https://api.meta.ai/v1';

  const form = new FormData();
  form.append(
    'request',
    new Blob([JSON.stringify({ model: process.env.VOICE_MODEL || 'muse-voice-transcribe-1.0', audioEncoding: 'WAV', mode: 'PUSH_TO_TALK' })], {
      type: 'application/json',
    }),
  );
  form.append('audio', new Blob([audio], { type: 'audio/wav' }), 'speech.wav');

  const response = await fetch(`${baseUrl}/asr/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: Error) => {
    throw new ModelError(`Transcription request failed: ${error.message}`);
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ModelError(`Transcription API returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  const payload = (await response.json()) as { transcript?: string };
  return json({ text: (payload.transcript ?? '').trim() });
});
