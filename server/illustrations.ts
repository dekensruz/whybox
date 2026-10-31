// Illustrations of a lesson with Muse Image, all in the same calm Whybox style.
import { ModelError } from './meta.js';

const STYLE = [
  'Flat minimalist editorial illustration, calm and warm.',
  'Palette: off-white background #FAFAF7, near-black ink #14161A for outlines, amber #F2A900 as the single accent,',
  'with soft muted blues, greens and earth tones. Simple geometric shapes, gentle shading, plenty of empty space.',
  'People, when present, are African children and adults in everyday clothes, drawn with dignity and warmth.',
  'Absolutely no text, letters, numbers, labels, logos or speech bubbles anywhere in the image.',
].join(' ');

const TIMEOUT_MS = 90_000;

/** Generates one landscape illustration and returns it as a JPEG data URL. */
export const illustrate = async (scene: string): Promise<string> => {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new ModelError('MODEL_API_KEY is not configured', 500);
  const baseUrl = process.env.MODEL_API_BASE_URL || 'https://api.meta.ai/v1';

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL || 'muse-image-1.0',
      prompt: `${STYLE}\n\nScene: ${scene}`,
      n: 1,
      size: '1536x1024',
      output_format: 'jpeg',
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: Error) => {
    throw new ModelError(`Image request failed: ${error.message}`);
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ModelError(`Image API returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  const payload = (await response.json()) as { data?: Array<{ b64_json?: string }> };
  const image = payload.data?.[0]?.b64_json;
  if (!image) throw new ModelError('Image API returned no image');
  return `data:image/jpeg;base64,${image}`;
};
