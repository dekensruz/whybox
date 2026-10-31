// Automatic label placement, shared by the 2D and 3D renderers.
// Each label is anchored to a point on screen; it is placed where it overlaps nothing, with a leader line if it moved away.
import { COLORS } from './core.js';

const FONT = '600 12px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const HEIGHT = 20;
const DISTANCES = [10, 22, 36, 52, 70];
const MAX_LABELS = 5;
const MAX_CHARS = 26;

const overlap = (a, b) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

/**
 * labels: [{ text, ax, ay, color, priority }] in screen pixels; obstacles: [{ x, y, w, h }] to avoid if possible.
 * Draws every label on `context`.
 */
export function drawLabels(context, allLabels, obstacles, width, height) {
  context.font = FONT;
  const placed = [];
  // A clear scene has few, short labels: keep the most important ones and shorten long texts.
  const labels = allLabels
    .map((label, index) => Object.assign(label, { index }))
    .sort((a, b) => b.priority - a.priority || a.index - b.index)
    .slice(0, MAX_LABELS)
    .map((label) => Object.assign(label, { text: label.text.length > MAX_CHARS ? `${label.text.slice(0, MAX_CHARS - 1).trim()}…` : label.text }));
  labels.forEach((label) => {
    const w = context.measureText(label.text).width + 10;
    let best = null;
    DISTANCES.forEach((d) => {
      const offsets = [
        [d, -d - HEIGHT], [d, d], [-d - w, -d - HEIGHT], [-d - w, d],
        [-w / 2, -d - HEIGHT], [-w / 2, d], [d, -HEIGHT / 2], [-d - w, -HEIGHT / 2],
      ];
      offsets.forEach(([dx, dy], rank) => {
        const box = { x: label.ax + dx, y: label.ay + dy, w, h: HEIGHT };
        let score = d * 0.6 + rank * 0.1;
        if (box.x < 2 || box.y < 2 || box.x + w > width - 2 || box.y + HEIGHT > height - 2) score += 10000;
        placed.forEach((other) => (score += overlap(box, other) * 20));
        obstacles.forEach((other) => (score += overlap(box, other) * 0.5));
        if (!best || score < best.score) best = { box, score };
      });
    });
    placed.push(best.box);
    label.box = best.box;
  });

  labels.forEach((label) => {
    const { box } = label;
    const cx = Math.max(box.x, Math.min(label.ax, box.x + box.w));
    const cy = Math.max(box.y, Math.min(label.ay, box.y + box.h));
    if (Math.hypot(cx - label.ax, cy - label.ay) > 6) {
      context.beginPath();
      context.moveTo(label.ax, label.ay);
      context.lineTo(cx, cy);
      context.setLineDash([]);
      context.lineWidth = 1;
      context.strokeStyle = COLORS.subtle;
      context.stroke();
    }
    context.beginPath();
    if (context.roundRect) context.roundRect(box.x, box.y, box.w, box.h, 6);
    else context.rect(box.x, box.y, box.w, box.h);
    context.fillStyle = 'rgba(255,255,255,0.92)';
    context.fill();
    context.fillStyle = label.color || COLORS.ink;
    context.textBaseline = 'middle';
    context.fillText(label.text, box.x + 5, box.y + box.h / 2 + 0.5);
  });
}
