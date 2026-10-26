// Generated experiments run in a sandboxed iframe (scripts only, no access to the app).
// A small bridge script lets the app call their window.whybox test interface through postMessage.

// The frame grows to fit its content, so viewport-relative heights (100vh) must not feed back into it.
const BRIDGE = `<style>html,body{height:auto!important;min-height:0!important}</style><script>
(function () {
  var report = function () { parent.postMessage({ whyboxHeight: document.documentElement.scrollHeight }, '*'); };
  window.addEventListener('load', report);
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.documentElement);
})();
// Renders the page as a JPEG: the DOM goes through an SVG foreignObject, canvases are copied as images.
function whyboxSnapshot() {
  return new Promise(function (resolve, reject) {
    var root = document.documentElement;
    var width = root.scrollWidth, height = Math.min(root.scrollHeight, 1400);
    // A frame that is not laid out (hidden page) would give a blank picture.
    if (!width || !height) return reject(new Error('nothing to capture'));
    // Same for a canvas never painted, when the browser paused animations (minimized window).
    var blank = Array.prototype.some.call(document.querySelectorAll('canvas'), function (canvas) {
      var context = canvas.width && canvas.height && canvas.getContext('2d');
      if (!context) return false;
      var pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      var step = Math.max(4, Math.floor(pixels.length / 4 / 2000) * 4);
      for (var p = step; p < pixels.length; p += step) {
        if (pixels[p] !== pixels[0] || pixels[p + 1] !== pixels[1] || pixels[p + 2] !== pixels[2] || pixels[p + 3] !== pixels[3]) return false;
      }
      return true;
    });
    if (blank) return reject(new Error('scene not drawn'));
    document.querySelectorAll('input').forEach(function (input) { input.setAttribute('value', input.value); });
    var clone = root.cloneNode(true);
    var canvases = document.querySelectorAll('canvas'), copies = clone.querySelectorAll('canvas');
    for (var i = 0; i < canvases.length; i++) {
      var image = document.createElement('img');
      image.src = canvases[i].toDataURL();
      image.setAttribute('style', 'display:block;width:' + canvases[i].clientWidth + 'px;height:' + canvases[i].clientHeight + 'px');
      copies[i].parentNode.replaceChild(image, copies[i]);
    }
    clone.querySelectorAll('script').forEach(function (script) { script.remove(); });
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><foreignObject width="100%" height="100%">'
      + new XMLSerializer().serializeToString(clone) + '</foreignObject></svg>';
    var picture = new Image();
    picture.onload = function () {
      var canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      var context = canvas.getContext('2d');
      context.fillStyle = '#FAFAF7'; context.fillRect(0, 0, width, height);
      context.drawImage(picture, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    picture.onerror = function () { reject(new Error('snapshot failed')); };
    picture.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
window.addEventListener('message', function (event) {
  var data = event.data || {};
  if (!data.whyboxCall) return;
  var reply = function (payload) { parent.postMessage(Object.assign({ whyboxReply: data.whyboxCall }, payload), '*'); };
  var fail = function (error) { reply({ error: String(error && error.message || error) }); };
  try {
    if (data.method === 'snapshot') return whyboxSnapshot().then(function (image) { reply({ result: image }); }, fail);
    var api = window.whybox;
    if (!api) return reply({ error: 'not-ready' });
    var result = null;
    if (data.method === 'describe') result = { params: api.params };
    else if (data.method === 'set') { api.set(data.args[0], data.args[1]); result = true; }
    else if (data.method === 'measure') result = api.measure();
    reply({ result: JSON.parse(JSON.stringify(result)) });
  } catch (error) {
    fail(error);
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

  call<T>(method: 'describe' | 'set' | 'measure' | 'snapshot', args: unknown[] = [], timeoutMs = 2000): Promise<T> {
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
