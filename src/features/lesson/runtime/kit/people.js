// People who react, and the places where the scene happens: what makes a situation feel real rather than a diagram.
// All drawing here is in canvas pixels; the renderer converts from world units.
import { COLORS } from './core.js';

const SKINS = ['#8A5A3C', '#6B4430', '#A06B4A', '#7A4E35', '#94603F'];
const CLOTHES = [COLORS.cool, COLORS.warm, COLORS.positive, '#7D6BA8', COLORS.accent, '#C9786A'];

/** A stable pseudo-random number in [0, 1) for person `i`, so a crowd does not flicker between frames. */
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * A face centred on (x, y) with radius r. mood: -1 (sad) to 1 (happy). look: -1 (left) to 1 (right).
 * awake: 0 (eyes closed, bored) to 1. speaking: mouth opens and closes with t.
 */
function face(c, x, y, r, o, t) {
  const mood = clamp(o.mood === undefined ? 0.3 : o.mood, -1, 1);
  const look = clamp(o.look || 0, -1, 1);
  const awake = clamp(o.awake === undefined ? 1 : o.awake, 0, 1);
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = o.skin;
  c.fill();
  c.lineWidth = Math.max(1, r / 9);
  c.strokeStyle = COLORS.ink;
  c.stroke();

  const eyeY = y - r * 0.12;
  const eyeX = r * 0.36;
  const shift = look * r * 0.18;
  c.fillStyle = COLORS.ink;
  c.strokeStyle = COLORS.ink;
  [-1, 1].forEach((side) => {
    if (awake > 0.4) {
      c.beginPath();
      c.ellipse(x + side * eyeX + shift, eyeY, r * 0.09, r * 0.12 * awake, 0, 0, Math.PI * 2);
      c.fill();
    } else {
      c.beginPath();
      c.moveTo(x + side * eyeX - r * 0.12 + shift, eyeY);
      c.lineTo(x + side * eyeX + r * 0.12 + shift, eyeY);
      c.stroke();
    }
  });

  const mouthY = y + r * 0.42;
  if (o.speaking) {
    const open = 0.25 + 0.75 * Math.abs(Math.sin((t || 0) * 11 + (o.seed || 0)));
    c.beginPath();
    c.ellipse(x + shift * 0.5, mouthY, r * 0.2, r * 0.14 * open, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    c.beginPath();
    c.moveTo(x - r * 0.3 + shift * 0.5, mouthY - mood * r * 0.08);
    c.quadraticCurveTo(x + shift * 0.5, mouthY + mood * r * 0.28, x + r * 0.3 + shift * 0.5, mouthY - mood * r * 0.08);
    c.stroke();
  }
}

/**
 * A standing person, feet at (x, y), `height` pixels tall.
 * o: mood, look, awake, speaking, raise (0 to 1, the right arm goes up), color (clothes), seed (for skin and clothes).
 */
export function drawPerson(c, x, y, height, o = {}, t = 0) {
  const seed = o.seed || 0;
  const skin = o.skin || SKINS[Math.floor(hash(seed) * SKINS.length)];
  const cloth = o.color || CLOTHES[Math.floor(hash(seed + 7) * CLOTHES.length)];
  const r = height * 0.12;
  const headY = y - height + r;
  const shoulders = headY + r * 1.35;
  const hips = y - height * 0.42;
  const half = height * 0.17;
  c.save();
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.2, height / 70);
  c.strokeStyle = COLORS.ink;

  // Legs
  c.fillStyle = COLORS.ink;
  [-1, 1].forEach((side) => {
    c.beginPath();
    if (c.roundRect) c.roundRect(x + side * half * 0.45 - half * 0.22, hips - 2, half * 0.44, y - hips + 2, half * 0.15);
    else c.rect(x + side * half * 0.45 - half * 0.22, hips - 2, half * 0.44, y - hips + 2);
    c.fill();
  });

  // Arms: the right one rises with `raise`.
  const raise = clamp(o.raise || 0, 0, 1);
  c.lineWidth = height * 0.075;
  c.strokeStyle = skin;
  c.beginPath();
  c.moveTo(x - half * 0.9, shoulders + r * 0.3);
  c.lineTo(x - half * 1.15, hips + r * 0.2);
  const angle = Math.PI * (0.5 - 1.2 * raise);
  c.moveTo(x + half * 0.9, shoulders + r * 0.3);
  c.lineTo(x + half * 0.9 + Math.cos(angle) * height * 0.32, shoulders + r * 0.3 + Math.sin(angle) * height * 0.32);
  c.stroke();

  // Body
  c.lineWidth = Math.max(1.2, height / 70);
  c.strokeStyle = COLORS.ink;
  c.beginPath();
  if (c.roundRect) c.roundRect(x - half, shoulders, half * 2, hips - shoulders + 4, [half * 0.6, half * 0.6, half * 0.2, half * 0.2]);
  else c.rect(x - half, shoulders, half * 2, hips - shoulders + 4);
  c.fillStyle = cloth;
  c.fill();
  c.stroke();

  face(c, x, headY, r, { ...o, skin, seed }, t);
  c.restore();
}

/**
 * Seated listeners seen from behind the speaker: rows of heads and shoulders filling the box (pixels).
 * o: attention (0 to 1, the share of people who listen; the others look away or doze), mood (of those who listen),
 * raise (share of listeners raising a hand), speaking (listeners chat between themselves when attention is low).
 */
export function drawCrowd(c, count, left, top, width, height, o = {}, t = 0) {
  const n = clamp(Math.round(count), 1, 40);
  const rows = Math.max(1, Math.round(Math.sqrt((n * height) / width)));
  const perRow = Math.ceil(n / rows);
  const cellW = width / perRow;
  const cellH = height / rows;
  const size = Math.min(cellW * 0.8, cellH * 1.1);
  const attention = clamp(o.attention === undefined ? 1 : o.attention, 0, 1);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const offset = row % 2 ? cellW * 0.25 : 0;
    const x = left + offset + (col + 0.5) * cellW;
    const base = top + (row + 1) * cellH;
    const listens = hash(i + 3) < attention;
    const skin = SKINS[Math.floor(hash(i) * SKINS.length)];
    const cloth = CLOTHES[Math.floor(hash(i + 7) * CLOTHES.length)];
    // Shoulders
    c.beginPath();
    c.ellipse(x, base, size * 0.42, size * 0.3, 0, Math.PI, 0);
    c.closePath();
    c.fillStyle = cloth;
    c.fill();
    c.lineWidth = Math.max(1, size / 30);
    c.strokeStyle = COLORS.ink;
    c.stroke();
    if (listens && hash(i + 11) < clamp(o.raise || 0, 0, 1)) {
      c.lineWidth = size * 0.1;
      c.strokeStyle = skin;
      c.beginPath();
      c.moveTo(x + size * 0.3, base - size * 0.2);
      c.lineTo(x + size * 0.38, base - size * 0.95);
      c.stroke();
    }
    const sway = listens ? 0 : (hash(i + 5) < 0.5 ? -1 : 1);
    face(
      c,
      x + sway * size * 0.06,
      base - size * 0.42 + (listens ? 0 : size * 0.05),
      size * 0.26,
      {
        skin,
        mood: listens ? (o.mood === undefined ? 0.4 : o.mood) : -0.2,
        look: listens ? 0 : sway,
        awake: listens ? 1 : hash(i + 9) < 0.5 ? 0.2 : 0.8,
        speaking: !listens && o.speaking && hash(i + 13) < 0.5,
        seed: i,
      },
      t,
    );
  }
}

const SETTINGS = {
  classroom(c, w, h) {
    c.fillStyle = '#F1ECE2';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#DCCDB0';
    c.fillRect(0, h * 0.8, w, h * 0.2);
    c.fillStyle = '#2F4A3E';
    c.fillRect(w * 0.2, h * 0.08, w * 0.6, h * 0.3);
    c.lineWidth = 4;
    c.strokeStyle = '#9C8B6C';
    c.strokeRect(w * 0.2, h * 0.08, w * 0.6, h * 0.3);
  },
  yard(c, w, h) {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#E4EEF6');
    sky.addColorStop(1, '#F6F3EA');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    c.fillStyle = COLORS.ground;
    c.fillRect(0, h * 0.8, w, h * 0.2);
  },
  market(c, w, h) {
    SETTINGS.yard(c, w, h);
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
      c.fillStyle = i % 2 ? COLORS.surface : COLORS.accentSoft;
      c.fillRect((w / stripes) * i, 0, w / stripes, h * 0.1);
    }
    c.fillStyle = '#B9A27E';
    c.fillRect(w * 0.05, h * 0.62, w * 0.9, h * 0.06);
  },
  home(c, w, h) {
    c.fillStyle = '#F3EEE4';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#D6C6A8';
    c.fillRect(0, h * 0.8, w, h * 0.2);
    c.fillStyle = '#DCEAF3';
    c.fillRect(w * 0.68, h * 0.12, w * 0.2, h * 0.24);
    c.lineWidth = 3;
    c.strokeStyle = '#B9A27E';
    c.strokeRect(w * 0.68, h * 0.12, w * 0.2, h * 0.24);
  },
  road(c, w, h) {
    SETTINGS.yard(c, w, h);
    c.fillStyle = '#9A9A94';
    c.fillRect(0, h * 0.72, w, h * 0.14);
    c.setLineDash([18, 14]);
    c.lineWidth = 3;
    c.strokeStyle = COLORS.surface;
    c.beginPath();
    c.moveTo(0, h * 0.79);
    c.lineTo(w, h * 0.79);
    c.stroke();
    c.setLineDash([]);
  },
  field(c, w, h) {
    SETTINGS.yard(c, w, h);
    c.fillStyle = '#B8CFA0';
    c.fillRect(0, h * 0.75, w, h * 0.25);
  },
};

export const SETTING_NAMES = Object.keys(SETTINGS);

/** Fills the whole scene with a calm, low-contrast place, drawn first so everything else stands out. */
export function drawSetting(c, name, w, h) {
  c.save();
  (SETTINGS[name] || SETTINGS.yard)(c, w, h);
  c.restore();
}
