// Everyday objects drawn as clean flat pictograms, so scenes show real things instead of improvised shapes.
// Each icon is drawn in a unit box centred on (0, 0), from -0.5 to 0.5, with y going down (canvas space).
import { COLORS } from './core.js';

const BREAD = '#E3B26A';
const NOTE = '#CFE3D6';
const SKIN = '#8A5A3C';

const round = (c, x, y, w, h, r) => {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
};
const circle = (c, x, y, r) => {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
};
const shape = (c, points) => {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
};

/** Each entry draws with `fill(color)` (fill and outline) and `line()` (outline only), in unit coordinates. */
const ICONS = {
  coin(c, f, l, o) {
    circle(c, 0, 0, 0.42);
    f(o.color || COLORS.accent);
    circle(c, 0, 0, 0.29);
    l();
  },
  banknote(c, f, l, o) {
    round(c, -0.48, -0.27, 0.96, 0.54, 0.05);
    f(o.color || NOTE);
    circle(c, 0, 0, 0.13);
    l();
    round(c, -0.38, -0.17, 0.76, 0.34, 0.02);
    l();
  },
  bread(c, f, l, o) {
    round(c, -0.47, -0.2, 0.94, 0.42, 0.2);
    f(o.color || BREAD);
    [-0.2, 0, 0.2].forEach((x) => {
      c.beginPath();
      c.moveTo(x - 0.06, -0.12);
      c.lineTo(x + 0.06, 0.06);
      l();
    });
  },
  person(c, f, l, o) {
    circle(c, 0, -0.3, 0.15);
    f(SKIN);
    c.beginPath();
    c.moveTo(-0.24, 0.48);
    c.lineTo(-0.24, 0.05);
    c.quadraticCurveTo(-0.24, -0.11, -0.08, -0.11);
    c.lineTo(0.08, -0.11);
    c.quadraticCurveTo(0.24, -0.11, 0.24, 0.05);
    c.lineTo(0.24, 0.48);
    c.closePath();
    f(o.color || COLORS.cool);
  },
  child(c, f, l, o) {
    circle(c, 0, -0.15, 0.13);
    f(SKIN);
    round(c, -0.18, 0.01, 0.36, 0.47, 0.12);
    f(o.color || COLORS.warm);
  },
  ball(c, f, l, o) {
    circle(c, 0, 0, 0.4);
    f(o.color || COLORS.warm);
    c.beginPath();
    c.arc(-0.55, 0, 0.45, -0.7, 0.7);
    l();
    c.beginPath();
    c.arc(0.55, 0, 0.45, Math.PI - 0.7, Math.PI + 0.7);
    l();
  },
  stone(c, f, l, o) {
    shape(c, [[-0.42, 0.25], [-0.3, -0.15], [0, -0.28], [0.32, -0.18], [0.44, 0.2], [0.1, 0.3]]);
    f(o.color || COLORS.subtle);
  },
  bottle(c, f, l, o) {
    round(c, -0.08, -0.48, 0.16, 0.14, 0.02);
    f(COLORS.ink);
    round(c, -0.18, -0.34, 0.36, 0.82, 0.1);
    f(o.color || COLORS.waterLight);
  },
  cup(c, f, l, o) {
    c.beginPath();
    c.arc(0.3, 0, 0.13, -Math.PI / 2, Math.PI / 2);
    l();
    shape(c, [[-0.36, -0.3], [0.3, -0.3], [0.24, 0.32], [-0.3, 0.32]]);
    f(o.color || COLORS.surface);
  },
  bucket(c, f, l, o) {
    c.beginPath();
    c.arc(0, -0.25, 0.36, Math.PI, 0);
    l();
    shape(c, [[-0.4, -0.25], [0.4, -0.25], [0.3, 0.42], [-0.3, 0.42]]);
    f(o.color || COLORS.cool);
  },
  water(c, f, l, o) {
    c.beginPath();
    c.moveTo(0, -0.46);
    c.bezierCurveTo(0.3, -0.1, 0.34, 0.1, 0.32, 0.18);
    c.arc(0, 0.16, 0.32, 0, Math.PI);
    c.bezierCurveTo(-0.34, 0.1, -0.3, -0.1, 0, -0.46);
    f(o.color || COLORS.water);
  },
  house(c, f, l, o) {
    round(c, -0.36, -0.06, 0.72, 0.52, 0.02);
    f(o.color || COLORS.surface);
    shape(c, [[-0.46, -0.04], [0, -0.44], [0.46, -0.04]]);
    f(COLORS.warm);
    round(c, -0.08, 0.16, 0.16, 0.3, 0.02);
    f(COLORS.ink);
  },
  tree(c, f, l, o) {
    round(c, -0.06, 0.05, 0.12, 0.43, 0.02);
    f(COLORS.groundDark);
    circle(c, 0, -0.14, 0.33);
    f(o.color || COLORS.positive);
  },
  plant(c, f, l, o) {
    c.beginPath();
    c.moveTo(0, 0.12);
    c.lineTo(0, -0.3);
    l();
    c.beginPath();
    c.ellipse(-0.15, -0.2, 0.16, 0.08, -0.5, 0, Math.PI * 2);
    f(o.color || COLORS.positive);
    c.beginPath();
    c.ellipse(0.15, -0.3, 0.16, 0.08, 0.5, 0, Math.PI * 2);
    f(o.color || COLORS.positive);
    shape(c, [[-0.24, 0.1], [0.24, 0.1], [0.18, 0.46], [-0.18, 0.46]]);
    f(COLORS.warm);
  },
  sun(c, f, l, o) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.32, Math.sin(a) * 0.32);
      c.lineTo(Math.cos(a) * 0.47, Math.sin(a) * 0.47);
      l();
    }
    circle(c, 0, 0, 0.24);
    f(o.color || COLORS.accent);
  },
  cloud(c, f, l, o) {
    c.beginPath();
    c.arc(-0.2, 0.06, 0.18, Math.PI / 2, Math.PI * 1.5);
    c.arc(0, -0.08, 0.22, Math.PI, 0);
    c.arc(0.24, 0.06, 0.18, Math.PI * 1.5, Math.PI / 2);
    c.closePath();
    f(o.color || COLORS.surface);
  },
  phone(c, f, l, o) {
    round(c, -0.23, -0.46, 0.46, 0.92, 0.08);
    f(COLORS.ink);
    round(c, -0.17, -0.36, 0.34, 0.66, 0.03);
    f(o.color || COLORS.waterLight);
  },
  battery(c, f, l, o) {
    round(c, -0.08, -0.47, 0.16, 0.08, 0.02);
    f(COLORS.ink);
    round(c, -0.22, -0.4, 0.44, 0.86, 0.06);
    f(COLORS.surface);
    const level = Math.max(0, Math.min(1, o.level === undefined ? 1 : o.level));
    if (level > 0) {
      round(c, -0.15, 0.39 - 0.72 * level, 0.3, 0.72 * level, 0.03);
      f(o.color || COLORS.positive);
    }
  },
  bulb(c, f, l, o) {
    circle(c, 0, -0.12, 0.3);
    f(o.on === false ? COLORS.surface : o.color || COLORS.accent);
    round(c, -0.13, 0.18, 0.26, 0.24, 0.04);
    f(COLORS.subtle);
  },
  box(c, f, l, o) {
    round(c, -0.42, -0.34, 0.84, 0.72, 0.03);
    f(o.color || COLORS.ground);
    c.beginPath();
    c.moveTo(-0.42, -0.14);
    c.lineTo(0.42, -0.14);
    l();
  },
  bag(c, f, l, o) {
    c.beginPath();
    c.arc(0, -0.2, 0.16, Math.PI, 0);
    l();
    shape(c, [[-0.34, -0.2], [0.34, -0.2], [0.4, 0.44], [-0.4, 0.44]]);
    f(o.color || COLORS.accentSoft);
  },
  book(c, f, l, o) {
    round(c, -0.38, -0.42, 0.76, 0.84, 0.04);
    f(o.color || COLORS.cool);
    round(c, -0.26, -0.3, 0.52, 0.2, 0.02);
    f(COLORS.surface);
  },
  car(c, f, l, o) {
    shape(c, [[-0.48, 0.18], [-0.48, -0.02], [-0.26, -0.06], [-0.14, -0.28], [0.2, -0.28], [0.32, -0.06], [0.48, -0.02], [0.48, 0.18]]);
    f(o.color || COLORS.warm);
    circle(c, -0.26, 0.2, 0.11);
    f(COLORS.ink);
    circle(c, 0.26, 0.2, 0.11);
    f(COLORS.ink);
  },
  bicycle(c, f, l, o) {
    circle(c, -0.27, 0.15, 0.2);
    l();
    circle(c, 0.27, 0.15, 0.2);
    l();
    c.beginPath();
    c.moveTo(-0.27, 0.15);
    c.lineTo(-0.05, -0.15);
    c.lineTo(0.2, -0.15);
    c.lineTo(0.27, 0.15);
    c.moveTo(-0.05, -0.15);
    c.lineTo(0.02, 0.15);
    c.lineTo(0.2, -0.15);
    l(o.color || COLORS.cool);
  },
  clock(c, f, l, o) {
    circle(c, 0, 0, 0.42);
    f(o.color || COLORS.surface);
    const a = ((o.value || 0) % 1) * Math.PI * 2 - Math.PI / 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -0.22);
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * 0.32, Math.sin(a) * 0.32);
    l();
  },
  pot(c, f, l, o) {
    round(c, -0.4, -0.2, 0.8, 0.56, 0.12);
    f(o.color || COLORS.muted);
    round(c, -0.46, -0.26, 0.92, 0.08, 0.03);
    f(COLORS.ink);
  },
  fish(c, f, l, o) {
    c.beginPath();
    c.ellipse(-0.06, 0, 0.32, 0.18, 0, 0, Math.PI * 2);
    f(o.color || COLORS.cool);
    shape(c, [[0.22, 0], [0.46, -0.17], [0.46, 0.17]]);
    f(o.color || COLORS.cool);
  },
};

export const ICON_NAMES = Object.keys(ICONS);

/**
 * Draws icon `name` centred on (x, y) in canvas pixels, `size` pixels wide.
 * o: color (main fill), opacity, ghost (an empty dashed outline: a missing item), crossed (struck out), and per-icon
 * options (battery: level 0 to 1, bulb: on, clock: value 0 to 1).
 */
export function drawIcon(context, name, x, y, size, o = {}) {
  const draw = ICONS[name] || ICONS.box;
  const c = context;
  c.save();
  c.translate(x, y);
  c.scale(size, size);
  c.lineWidth = Math.max(1.2, Math.min(2, size / 22)) / size;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.setLineDash(o.ghost ? [4 / size, 3 / size] : []);
  // A missing item stays discreet: it shows the room left without competing with the real items.
  c.globalAlpha = o.ghost ? 0.4 : o.opacity === undefined ? 1 : o.opacity;
  const fill = (color) => {
    if (!o.ghost) {
      c.fillStyle = color;
      c.fill();
    }
    c.strokeStyle = o.ghost ? COLORS.subtle : COLORS.ink;
    c.stroke();
  };
  const line = (color) => {
    c.strokeStyle = o.ghost ? COLORS.subtle : color || COLORS.ink;
    c.stroke();
  };
  draw(c, fill, line, o);
  if (o.crossed) {
    c.setLineDash([]);
    c.lineWidth = 3 / size;
    c.strokeStyle = COLORS.negative;
    c.beginPath();
    c.moveTo(-0.42, -0.42);
    c.lineTo(0.42, 0.42);
    c.moveTo(0.42, -0.42);
    c.lineTo(-0.42, 0.42);
    c.stroke();
  }
  c.restore();
}
