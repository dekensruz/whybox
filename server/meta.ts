// Minimal client for the Meta Model API (Responses API).
import type { Usage } from '../shared/lesson.js';

export type InputPart = { type: 'input_text'; text: string } | { type: 'input_image'; image_url: string };
export type Effort = 'minimal' | 'low' | 'medium' | 'high';

export const MODELS = {
  /** Writes and edits lessons. */
  generation: () => process.env.GENERATION_MODEL || 'muse-spark-1.3',
  /** Builds and repairs the interactive experiments, the hardest and most visible part. */
  simulation: () => process.env.SIMULATION_MODEL || 'muse-wonder-1.0',
};

export class ModelError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

interface ResponsesPayload {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

const TIMEOUT_MS = 4 * 60_000;

export const callModel = async ({
  model,
  parts,
  effort,
}: {
  model: string;
  parts: InputPart[];
  effort?: Effort;
}): Promise<{ text: string; usage: Usage }> => {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new ModelError('MODEL_API_KEY is not configured', 500);
  const baseUrl = process.env.MODEL_API_BASE_URL || 'https://api.meta.ai/v1';

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      input: [{ type: 'message', role: 'user', content: parts }],
      ...(effort && { reasoning: { effort } }),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: Error) => {
    throw new ModelError(`Model request failed: ${error.message}`);
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ModelError(`Model API returned ${response.status}: ${detail.slice(0, 500)}`, response.status === 429 ? 429 : 502);
  }

  const payload = (await response.json()) as ResponsesPayload;
  const text =
    payload.output_text ??
    (payload.output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('');

  return {
    text,
    usage: { inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0 },
  };
};
