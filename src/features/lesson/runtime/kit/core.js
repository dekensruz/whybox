// Core of the Whybox scene kit, shared by the 2D and 3D renderers.
// It builds the page (title, scene, live measurements, controls), keeps the parameters with smooth glides,
// computes measurements from the lesson's own formulas, and exposes the window.whybox test interface.

export const COLORS = {
  ink: '#14161A', muted: '#5B6270', subtle: '#8A909C', line: '#E6E4DE', paper: '#FAFAF7', surface: '#FFFFFF',
  accent: '#F2A900', accentSoft: '#FDF3D8', water: '#3F7FB8', waterLight: '#D7E7F4', sky: '#F3F7FA',
  ground: '#CDBE9F', groundDark: '#9C8B6C', positive: '#2E7D5B', negative: '#B42318', warm: '#E0663A', cool: '#3F7FB8',
};

const GLIDE_MS = 600;

const STYLE = [
  '*{box-sizing:border-box}',
  `body{margin:0;background:${COLORS.paper};color:${COLORS.ink};font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}`,
  '.wb{max-width:640px;margin:0 auto;padding:16px 14px 20px;display:flex;flex-direction:column;gap:14px}',
  '.wb-title{font-size:17px;font-weight:650;letter-spacing:-.01em;margin:0}',
  `.wb-card{background:${COLORS.surface};border:1px solid ${COLORS.line};border-radius:16px;overflow:hidden}`,
  '.wb-stage{position:relative}',
  '.wb-stage canvas{display:block;width:100%}',
  '.wb-stage canvas.wb-overlay{position:absolute;inset:0;pointer-events:none}',
  `.wb-caption{padding:8px 12px;border-top:1px solid ${COLORS.line};font-size:12px;color:${COLORS.muted}}`,
  '.wb-results{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}',
  `.wb-result{background:${COLORS.surface};border:1px solid ${COLORS.line};border-radius:14px;padding:10px 12px}`,
  `.wb-result span{display:block;font-size:12px;color:${COLORS.muted}}`,
  '.wb-result strong{display:block;font-size:22px;font-weight:650;margin-top:2px;font-variant-numeric:tabular-nums}',
  '.wb-controls{padding:4px 16px}',
  `.wb-control{padding:12px 0;border-bottom:1px solid ${COLORS.line}}`,
  '.wb-control:last-child{border-bottom:0}',
  '.wb-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:14px}',
  '.wb-row b{font-variant-numeric:tabular-nums}',
  `.wb-control input[type=range]{width:100%;margin:12px 0 2px;accent-color:${COLORS.ink};height:28px}`,
  '.wb-switch{display:flex;gap:6px;margin-top:10px}',
  `.wb-switch button{flex:1;height:40px;border-radius:10px;border:1px solid ${COLORS.line};background:${COLORS.surface};font:inherit;font-size:14px;color:${COLORS.ink}}`,
  `.wb-switch button[aria-pressed=true]{background:${COLORS.ink};border-color:${COLORS.ink};color:${COLORS.paper}}`,
].join('');

const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

/**
 * Starts an experiment. `renderer` draws the scene: { mount(stage, options), resize(), render(values, measurements, seconds) }.
 * Returns `renderNow`, which paints the current state immediately.
 */
export function startExperiment(options, renderer) {
  const spec = window.WHYBOX_SPEC || { title: '', language: 'en', parameters: [], measurements: [] };
  const format = (value) => {
    if (!isFinite(value)) return '–';
    const abs = Math.abs(value);
    const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : abs >= 1 ? 2 : 3;
    return new Intl.NumberFormat(spec.language, { maximumFractionDigits: digits }).format(value);
  };

  // ------------------------------------------------------------ state with smooth glides
  const targets = {};
  const glides = {};
  spec.parameters.forEach((p) => {
    targets[p.name] = p.default;
    glides[p.name] = { from: p.default, start: 0 };
  });
  const shown = (now) => {
    const values = {};
    spec.parameters.forEach((p) => {
      const glide = glides[p.name];
      const k = Math.min(1, (now - glide.start) / GLIDE_MS);
      values[p.name] = glide.from + (targets[p.name] - glide.from) * ease(k);
    });
    return values;
  };
  const measureAt = (values) => {
    const result = {};
    spec.measurements.forEach((m) => {
      const value = Number(m.compute(values));
      result[m.name] = isFinite(value) ? value : 0;
    });
    return result;
  };
  const clamp = (p, value) => {
    const v = Math.min(p.max, Math.max(p.min, Number(value)));
    return isFinite(v) ? v : p.default;
  };

  // ------------------------------------------------------------ page
  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const root = document.createElement('main');
  root.className = 'wb';
  const title = document.createElement('h1');
  title.className = 'wb-title';
  title.textContent = options.title || spec.title;
  root.appendChild(title);

  const card = document.createElement('section');
  card.className = 'wb-card';
  const stage = document.createElement('div');
  stage.className = 'wb-stage';
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', options.title || spec.title);
  card.appendChild(stage);
  if (options.caption) {
    const caption = document.createElement('div');
    caption.className = 'wb-caption';
    caption.textContent = options.caption;
    card.appendChild(caption);
  }
  root.appendChild(card);

  const resultNodes = {};
  const results = document.createElement('section');
  results.className = 'wb-results';
  spec.measurements.forEach((m) => {
    const box = document.createElement('div');
    box.className = 'wb-result';
    const label = document.createElement('span');
    label.textContent = m.label;
    const value = document.createElement('strong');
    box.append(label, value);
    resultNodes[m.name] = value;
    results.appendChild(box);
  });
  root.appendChild(results);

  const controlNodes = {};
  const controls = document.createElement('section');
  controls.className = 'wb-card wb-controls';
  spec.parameters.forEach((p) => {
    const row = document.createElement('div');
    row.className = 'wb-control';
    const head = document.createElement('div');
    head.className = 'wb-row';
    const label = document.createElement('span');
    label.textContent = p.label;
    const value = document.createElement('b');
    head.append(label, value);
    row.appendChild(head);
    const isSwitch = p.min === 0 && p.max === 1 && p.step === 1;
    let input;
    if (isSwitch) {
      input = document.createElement('div');
      input.className = 'wb-switch';
      ((options.switchLabels && options.switchLabels[p.name]) || ['0', '1']).forEach((text, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.addEventListener('click', () => setTarget(p.name, index, true));
        input.appendChild(button);
      });
    } else {
      input = document.createElement('input');
      input.type = 'range';
      input.min = p.min;
      input.max = p.max;
      input.step = p.step;
      input.setAttribute('aria-label', p.label);
      input.addEventListener('input', () => setTarget(p.name, Number(input.value), false));
    }
    row.appendChild(input);
    controls.appendChild(row);
    controlNodes[p.name] = { value, input, isSwitch, unit: p.unit };
  });
  root.appendChild(controls);
  document.body.appendChild(root);

  const syncControls = () => {
    spec.parameters.forEach((p) => {
      const node = controlNodes[p.name];
      const v = targets[p.name];
      node.value.textContent = node.isSwitch ? '' : format(v) + (node.unit ? ` ${node.unit}` : '');
      if (node.isSwitch) {
        Array.prototype.forEach.call(node.input.children, (button, index) => button.setAttribute('aria-pressed', String(index === v)));
      } else if (document.activeElement !== node.input) {
        node.input.value = v;
      }
    });
    const measured = measureAt(targets);
    spec.measurements.forEach((m) => {
      resultNodes[m.name].textContent = format(measured[m.name]) + (m.unit ? ` ${m.unit}` : '');
    });
  };

  function setTarget(name, value, animate) {
    const p = spec.parameters.find((item) => item.name === name);
    if (!p) return;
    const now = performance.now();
    glides[name] = { from: animate ? shown(now)[name] : clamp(p, value), start: now };
    targets[name] = clamp(p, value);
    syncControls();
  }

  // ------------------------------------------------------------ rendering
  const startTime = performance.now();
  let failed = false;
  const renderNow = () => {
    const now = performance.now();
    const values = shown(now);
    try {
      renderer.render(values, measureAt(values), (now - startTime) / 1000);
      failed = false;
    } catch (error) {
      if (!failed) console.error(error);
      failed = true;
    }
  };
  const loop = () => {
    renderNow();
    requestAnimationFrame(loop);
  };

  renderer.mount(stage, options);
  window.addEventListener('resize', () => renderer.resize());
  syncControls();
  requestAnimationFrame(loop);

  window.whybox = {
    get params() {
      const params = {};
      spec.parameters.forEach((p) => {
        params[p.name] = { value: targets[p.name], min: p.min, max: p.max, unit: p.unit };
      });
      return params;
    },
    set: (name, value) => setTarget(name, value, true),
    measure: () => measureAt(targets),
  };
  return renderNow;
}
