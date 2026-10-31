// 2D renderer: a canvas drawn every frame through the helpers of `g` (world units, y up, origin bottom-left).
import { COLORS } from './core.js';
import { drawIcon } from './icons.js';
import { drawLabels } from './labels.js';

export function createRenderer2d(options) {
  const world = options.world || { width: 100, height: 80 };
  let canvas, context, scale, cssWidth, cssHeight, labels, obstacles;

  const X = (x) => x * scale;
  const Y = (y) => cssHeight - y * scale;
  const addObstacle = (x, y, w, h) => obstacles.push({ x, y, w, h });

  const stroke = (o, fallback) => {
    context.lineWidth = o.width || 2;
    context.strokeStyle = o.color || fallback || COLORS.ink;
    context.setLineDash(o.dash ? [6, 5] : []);
    context.lineCap = 'round';
    context.lineJoin = 'round';
  };
  const paint = (o, defaultFill) => {
    const fill = o.fill === undefined ? defaultFill : o.fill;
    if (fill) {
      context.globalAlpha = o.opacity === undefined ? 1 : o.opacity;
      context.fillStyle = fill;
      context.fill();
      context.globalAlpha = 1;
    }
    if (o.stroke !== false && (o.stroke || o.color || !fill)) {
      stroke({ width: o.width, color: o.stroke || o.color, dash: o.dash });
      context.stroke();
    }
  };
  const tracePoints = (points, smooth) => {
    context.beginPath();
    points.forEach((point, index) => {
      const x = X(point[0]);
      const y = Y(point[1]);
      if (index === 0) return context.moveTo(x, y);
      if (smooth && index < points.length - 1) {
        const next = points[index + 1];
        context.quadraticCurveTo(x, y, (x + X(next[0])) / 2, (y + Y(next[1])) / 2);
      } else {
        context.lineTo(x, y);
      }
    });
  };
  const arrowHead = (x1, y1, x2, y2, size) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45));
    context.lineTo(x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45));
    context.closePath();
    context.fill();
  };
  const along = (points, distance) => {
    let total = 0;
    const segments = [];
    for (let i = 1; i < points.length; i++) {
      const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      segments.push(length);
      total += length;
    }
    if (!total) return points[0];
    let d = ((distance % total) + total) % total;
    for (let j = 0; j < segments.length; j++) {
      if (d <= segments[j]) {
        const k = segments[j] ? d / segments[j] : 0;
        return [points[j][0] + (points[j + 1][0] - points[j][0]) * k, points[j][1] + (points[j + 1][1] - points[j][1]) * k];
      }
      d -= segments[j];
    }
    return points[points.length - 1];
  };

  const g = {
    colors: COLORS,
    px: (n) => n / scale,
    rect(x, y, w, h, o = {}) {
      context.beginPath();
      if (context.roundRect) context.roundRect(X(x), Y(y + h), X(w), X(h), o.radius || 0);
      else context.rect(X(x), Y(y + h), X(w), X(h));
      paint(o, COLORS.surface);
      if (!o.background) addObstacle(X(x), Y(y + h), X(w), X(h));
    },
    circle(x, y, r, o = {}) {
      context.beginPath();
      context.arc(X(x), Y(y), X(r), 0, Math.PI * 2);
      paint(o, COLORS.surface);
      if (!o.background) addObstacle(X(x - r), Y(y + r), X(2 * r), X(2 * r));
    },
    line(x1, y1, x2, y2, o = {}) {
      context.beginPath();
      context.moveTo(X(x1), Y(y1));
      context.lineTo(X(x2), Y(y2));
      stroke(o);
      context.stroke();
    },
    polyline(points, o = {}) {
      tracePoints(points, o.smooth);
      stroke(o);
      context.stroke();
    },
    polygon(points, o = {}) {
      tracePoints(points, o.smooth);
      context.closePath();
      paint(o, COLORS.surface);
      if (!o.background) {
        const xs = points.map((p) => X(p[0]));
        const ys = points.map((p) => Y(p[1]));
        addObstacle(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      }
    },
    arrow(x1, y1, x2, y2, o = {}) {
      const color = o.color || COLORS.ink;
      context.beginPath();
      context.moveTo(X(x1), Y(y1));
      context.lineTo(X(x2), Y(y2));
      stroke({ width: o.width || 2.5, color, dash: o.dash });
      context.stroke();
      context.fillStyle = color;
      arrowHead(X(x1), Y(y1), X(x2), Y(y2), o.head || 10);
      if (o.label) g.label(o.label, x2, y2, { color });
    },
    water(level, o = {}) {
      const from = o.from === undefined ? 0 : o.from;
      const to = o.to === undefined ? world.width : o.to;
      const bottom = o.bottom === undefined ? 0 : o.bottom;
      const amplitude = o.waves || 0;
      const t = o.t || 0;
      const points = [];
      for (let i = 0; i <= 48; i++) {
        const x = from + ((to - from) * i) / 48;
        points.push([x, level + amplitude * Math.sin(x * 0.35 + t * 1.6)]);
      }
      tracePoints(points.concat([[to, bottom], [from, bottom]]), false);
      context.closePath();
      context.fillStyle = o.color || COLORS.waterLight;
      context.fill();
      tracePoints(points, false);
      stroke({ width: 2, color: o.lineColor || COLORS.water });
      context.stroke();
    },
    ground(level, o = {}) {
      const from = o.from || 0;
      const to = o.to === undefined ? world.width : o.to;
      g.rect(from, o.bottom || 0, to - from, level - (o.bottom || 0), { fill: o.color || COLORS.ground, stroke: false, background: true });
    },
    flow(points, o = {}) {
      const count = o.count || 12;
      const speed = o.speed === undefined ? 4 : o.speed;
      const t = o.t || 0;
      let total = 0;
      for (let i = 1; i < points.length; i++) total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      context.fillStyle = o.color || COLORS.ink;
      for (let n = 0; n < count; n++) {
        const position = along(points, (n * total) / count + speed * t);
        context.beginPath();
        context.arc(X(position[0]), Y(position[1]), o.size || 3.5, 0, Math.PI * 2);
        context.fill();
      }
    },
    dimension(x1, y1, x2, y2, text, o = {}) {
      const color = o.color || COLORS.muted;
      context.beginPath();
      context.moveTo(X(x1), Y(y1));
      context.lineTo(X(x2), Y(y2));
      stroke({ width: 1.5, color });
      context.stroke();
      context.fillStyle = color;
      arrowHead(X(x2), Y(y2), X(x1), Y(y1), 7);
      arrowHead(X(x1), Y(y1), X(x2), Y(y2), 7);
      if (text) g.label(text, (x1 + x2) / 2, (y1 + y2) / 2, { color, priority: o.priority });
    },
    glow(x, y, r, strength, o = {}) {
      const radius = Math.min(X(r), cssWidth / 3, cssHeight / 3);
      const gradient = context.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), radius);
      const color = o.color || '242,169,0';
      gradient.addColorStop(0, `rgba(${color},${0.55 * Math.max(0, Math.min(1, strength))})`);
      gradient.addColorStop(1, `rgba(${color},0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(X(x), Y(y), radius, 0, Math.PI * 2);
      context.fill();
    },
    highlight(x, y, r) {
      context.beginPath();
      context.arc(X(x), Y(y), X(r), 0, Math.PI * 2);
      context.fillStyle = COLORS.accentSoft;
      context.globalAlpha = 0.6;
      context.fill();
      context.globalAlpha = 1;
      stroke({ width: 2, color: COLORS.accent, dash: true });
      context.stroke();
    },
    icon(name, x, y, size, o = {}) {
      drawIcon(context, name, X(x), Y(y), X(size), o);
      if (!o.background) addObstacle(X(x - size / 2), Y(y + size / 2), X(size), X(size));
    },
    items(name, count, x, y, w, h, o = {}) {
      // Countable things in a neat grid, in reading order: `count` drawn, the rest of `total` as empty outlines.
      const filled = Math.max(0, Math.round(count));
      const slots = Math.min(60, Math.max(filled, Math.round(o.total || 0)));
      if (!slots) return;
      let best = { cols: 1, cell: 0 };
      for (let cols = 1; cols <= slots; cols++) {
        const cell = Math.min(w / cols, h / Math.ceil(slots / cols));
        if (cell > best.cell) best = { cols, cell };
      }
      const rows = Math.ceil(slots / best.cols);
      const left = x + (w - best.cols * best.cell) / 2;
      const top = y + h - (h - rows * best.cell) / 2;
      const crossedFrom = filled - Math.max(0, Math.round(o.crossed || 0));
      for (let i = 0; i < Math.min(slots, 60); i++) {
        const cx = left + ((i % best.cols) + 0.5) * best.cell;
        const cy = top - (Math.floor(i / best.cols) + 0.5) * best.cell;
        drawIcon(context, name, X(cx), Y(cy), X(best.cell * 0.82), { ...o, ghost: i >= filled, crossed: i < filled && i >= crossedFrom });
      }
      if (!o.background) addObstacle(X(left), Y(top), X(best.cols * best.cell), X(rows * best.cell));
    },
    bar(x, y, w, h, o = {}) {
      // A quantity as a bar on a shared scale: a light track for the whole scale, the value in color, and its name
      // written just above the left end, so it never needs a leader line.
      const full = o.full === undefined ? w : o.full;
      if (o.full !== undefined) {
        context.beginPath();
        if (context.roundRect) context.roundRect(X(x), Y(y + h), X(full), X(h), 6);
        else context.rect(X(x), Y(y + h), X(full), X(h));
        context.fillStyle = COLORS.line;
        context.fill();
      }
      if (w > 0) {
        context.beginPath();
        if (context.roundRect) context.roundRect(X(x), Y(y + h), X(Math.max(w, 0)), X(h), 6);
        else context.rect(X(x), Y(y + h), X(Math.max(w, 0)), X(h));
        context.fillStyle = o.color || COLORS.accent;
        context.fill();
      }
      if (o.label) {
        context.font = '600 12px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        context.fillStyle = COLORS.ink;
        context.textBaseline = 'bottom';
        context.fillText(String(o.label), X(x), Y(y + h) - 4);
      }
      addObstacle(X(x), Y(y + h) - 20, X(Math.max(full, w)), X(h) + 20);
    },
    label(text, x, y, o = {}) {
      labels.push({ text: String(text), ax: X(x), ay: Y(y), color: o.color || COLORS.ink, priority: o.priority || 0 });
    },
  };

  const resize = () => {
    const ratio = world.height / world.width;
    cssWidth = canvas.parentNode.clientWidth || 360;
    // The scene is the heart of the experiment: it keeps a generous height on narrow phones.
    cssHeight = Math.round(Math.min(560, Math.max(300, cssWidth * ratio)));
    scale = Math.min(cssWidth / world.width, cssHeight / world.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.height = `${cssHeight}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  return {
    mount(stage) {
      canvas = document.createElement('canvas');
      stage.appendChild(canvas);
      context = canvas.getContext('2d');
      resize();
    },
    resize,
    render(values, measurements, seconds) {
      if (canvas.parentNode.clientWidth && Math.abs(canvas.parentNode.clientWidth - cssWidth) > 1) resize();
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.fillStyle = options.background || COLORS.surface;
      context.fillRect(0, 0, cssWidth, cssHeight);
      labels = [];
      obstacles = [];
      options.draw(g, values, measurements, seconds);
      drawLabels(context, labels, obstacles, cssWidth, cssHeight);
    },
  };
}
