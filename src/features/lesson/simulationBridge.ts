// Generated experiments run in a sandboxed iframe (scripts only, no access to the app).
// A small bridge script lets the app call their window.whybox test interface through postMessage.

// The frame grows to fit its content, so viewport-relative heights (100vh) must not feed back into it.
const BRIDGE = `<style>html,body{height:auto!important;min-height:0!important}</style><script>
(function () {
  var report = function () { parent.postMessage({ whyboxHeight: document.documentElement.scrollHeight }, '*'); };
  window.addEventListener('load', report);
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.documentElement);
})();
window.addEventListener('message', function (event) {
  var data = event.data || {};
  if (!data.whyboxCall) return;
  var reply = function (payload) { parent.postMessage(Object.assign({ whyboxReply: data.whyboxCall }, payload), '*'); };
  try {
    var api = window.whybox;
    if (!api) return reply({ error: 'not-ready' });
    var result = null;
    if (data.method === 'describe') result = { params: api.params };
    else if (data.method === 'set') { api.set(data.args[0], data.args[1]); result = true; }
    else if (data.method === 'measure') result = api.measure();
    reply({ result: JSON.parse(JSON.stringify(result)) });
  } catch (error) {
    reply({ error: String(error && error.message || error) });
  }
});
</script>`;

/** Adds the bridge to a generated experiment. */
export const withBridge = (html: string) =>
  /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${BRIDGE}</body>`) : `${html}${BRIDGE}`;

export class SimulationBridge {
  private nextId = 0;
  private pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor(private readonly frame: HTMLIFrameElement) {
    window.addEventListener('message', this.onMessage);
  }

  dispose() {
    window.removeEventListener('message', this.onMessage);
    this.pending.forEach(({ reject }) => reject(new Error('disposed')));
    this.pending.clear();
  }

  call<T>(method: 'describe' | 'set' | 'measure', args: unknown[] = [], timeoutMs = 2000): Promise<T> {
    const id = ++this.nextId;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.frame.contentWindow?.postMessage({ whyboxCall: id, method, args }, '*');
    });
  }

  /** Waits until the experiment has defined window.whybox. */
  async ready(timeoutMs = 8000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        return await this.call<{ params: Record<string, unknown> }>('describe', [], 500);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    throw new Error('The experiment did not expose its test interface');
  }

  private onMessage = (event: MessageEvent) => {
    if (event.source !== this.frame.contentWindow) return;
    const data = event.data as { whyboxReply?: number; result?: unknown; error?: string };
    const entry = data?.whyboxReply !== undefined ? this.pending.get(data.whyboxReply) : undefined;
    if (!entry || data.whyboxReply === undefined) return;
    this.pending.delete(data.whyboxReply);
    if (data.error) entry.reject(new Error(data.error));
    else entry.resolve(data.result);
  };
}
