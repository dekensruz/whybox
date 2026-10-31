// Minimal client for the Meta Model API (Responses API), and for Muse Spark Open, the open-weight model served by Baseten.
import type { Usage } from '../shared/lesson.js';

export type InputPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string }
  | { type: 'input_video'; video_url: string };
export type Effort = 'minimal' | 'low' | 'medium' | 'high';

export const MODELS = {
  /** Writes and edits lessons. */
  generation: () => process.env.GENERATION_MODEL || 'muse-spark-1.3',
  /** Builds and repairs the interactive experiments, the hardest and most visible part. */
  simulation: () => process.env.SIMULATION_MODEL || 'muse-wonder-1.0',
  /** Finds and tracks objects in the learners' videos of real experiments. */
  segmentation: () => process.env.SEGMENTATION_MODEL || 'sam-3.1',
  /** Open-weight model for the tasks that read what learners write, so their words stay with a model anyone can host. */
  open: () => process.env.OPEN_MODEL || 'meta-models/muse-spark-open-1026',
};

/** Open-weight models are named by their path on Baseten, e.g. "meta-models/muse-spark-open-1026". */
const isOpenModel = (model: string) => model.includes('/');

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
  metadata,
}: {
  model: string;
  parts: InputPart[];
  effort?: Effort;
  metadata?: Record<string, string>;
}): Promise<{ text: string; usage: Usage }> => {
  if (isOpenModel(model)) return callOpenModel(model, parts);
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
      ...(metadata && { metadata }),
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

interface ChatPayload {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const OPEN_TIMEOUT_MS = 90_000;

/** Calls an open-weight model through Baseten's OpenAI-compatible Chat Completions API. */
const callOpenModel = async (model: string, parts: InputPart[]): Promise<{ text: string; usage: Usage }> => {
  const apiKey = process.env.BASETEN_API_KEY;
  if (!apiKey) throw new ModelError('BASETEN_API_KEY is not configured', 500);
  const baseUrl = process.env.BASETEN_BASE_URL || 'https://inference.baseten.co/v1';
  const content = parts.map((part) => {
    if (part.type === 'input_text') return { type: 'text', text: part.text };
    if (part.type === 'input_image') return { type: 'image_url', image_url: { url: part.image_url } };
    throw new ModelError(`${model} does not read videos`, 500);
  });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: 4096 }),
    signal: AbortSignal.timeout(OPEN_TIMEOUT_MS),
  }).catch((error: Error) => {
    throw new ModelError(`Open model request failed: ${error.message}`);
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ModelError(`Baseten returned ${response.status}: ${detail.slice(0, 500)}`, response.status === 429 ? 429 : 502);
  }

  const payload = (await response.json()) as ChatPayload;
  return {
    text: payload.choices?.[0]?.message?.content ?? '',
    usage: { inputTokens: payload.usage?.prompt_tokens ?? 0, outputTokens: payload.usage?.completion_tokens ?? 0 },
  };
};

/**
 * Runs a task on the open-weight model, and on Muse Spark if the open model is not configured,
 * fails, or answers something the task cannot use: the learner always gets an answer.
 */
export const openFirst = async <T>(task: (model: string) => Promise<T>): Promise<T> => {
  if (!process.env.BASETEN_API_KEY) return task(MODELS.generation());
  try {
    return await task(MODELS.open());
  } catch (error) {
    console.warn(`Open model failed, using ${MODELS.generation()}: ${(error as Error).message}`);
    return task(MODELS.generation());
  }
};
