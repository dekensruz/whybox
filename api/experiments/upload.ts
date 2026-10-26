import { BadRequest, handle, json, readBody } from '../../server/http.js';
import { EXPERIMENT_BUCKET, supabaseAdmin } from '../../server/supabaseAdmin.js';
import { ModelError } from '../../server/meta.js';

const EXTENSIONS: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov' };

/**
 * Gives the browser a one-time URL to upload its video straight to private storage:
 * phone videos are too large to pass through an API function.
 */
export const POST = handle(async (request) => {
  const { contentType } = await readBody<{ contentType?: string }>(request);
  const extension = EXTENSIONS[contentType ?? ''];
  if (!extension) throw new BadRequest('Unsupported video format');

  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabaseAdmin().storage.from(EXPERIMENT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new ModelError(`Upload URL failed: ${error?.message}`, 500);
  return json({ path, uploadUrl: data.signedUrl });
});
