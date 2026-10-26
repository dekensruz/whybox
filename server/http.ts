import { ModelError } from './meta.js';

export class BadRequest extends Error {}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const MAX_BODY_BYTES = 12 * 1024 * 1024;

export const readBody = async <T>(request: Request): Promise<T> => {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) throw new BadRequest('Request is too large');
  try {
    return (await request.json()) as T;
  } catch {
    throw new BadRequest('Invalid JSON body');
  }
};

/** Wraps a handler so errors become clean JSON responses. */
export const handle =
  (handler: (request: Request) => Promise<Response>) =>
  async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof BadRequest) return json({ error: error.message }, 400);
      if (error instanceof ModelError) {
        console.error(error.message);
        return json({ error: 'generation_failed' }, error.status);
      }
      console.error(error);
      return json({ error: 'internal_error' }, 500);
    }
  };
