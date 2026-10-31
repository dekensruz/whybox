import type { TrackPoint } from '@shared/lesson';
import { useI18n } from '@/i18n';

const WIDTH = 320;
const HEIGHT = 180;
const PAD = { left: 40, right: 12, top: 12, bottom: 30 };

interface MotionChartProps {
  track: TrackPoint[];
  frameHeight: number;
  objectSizeCm: number;
  /** Swings and rolls are about horizontal position; falls and floats about height. */
  axis: 'height' | 'side';
}

const niceTicks = (min: number, max: number, count = 4) => {
  const span = max - min || 1;
  const step = 10 ** Math.floor(Math.log10(span / count));
  const nice = [1, 2, 5, 10].map((k) => k * step).find((s) => span / s <= count) ?? step * 10;
  const ticks = [];
  for (let value = Math.ceil(min / nice) * nice; value <= max + 1e-9; value += nice) ticks.push(Number(value.toFixed(6)));
  return ticks;
};

/** The measured motion as a simple, readable curve. */
export function MotionChart({ track, frameHeight, objectSizeCm, axis }: MotionChartProps) {
  const { t, language } = useI18n();
  if (track.length < 2) return null;

  const sizes = track.map((point) => Math.max(point.w, point.h)).sort((a, b) => a - b);
  const scale = objectSizeCm / Math.max(1, sizes[Math.floor(sizes.length / 2)]);
  const start = track[0].t;
  const points = track.map((point) => ({
    t: point.t - start,
    v: axis === 'height' ? (frameHeight - point.y) * scale : point.x * scale,
  }));
  const base = Math.min(...points.map((p) => p.v));
  points.forEach((p) => (p.v -= base));

  const tMax = Math.max(...points.map((p) => p.t)) || 1;
  const vMax = Math.max(...points.map((p) => p.v)) || 1;
  const x = (value: number) => PAD.left + (value / tMax) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) => HEIGHT - PAD.bottom - (value / vMax) * (HEIGHT - PAD.top - PAD.bottom);
  const format = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={t('lesson.real.trajectory')}>
        {niceTicks(0, vMax).map((tick) => (
          <g key={`v${tick}`}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" />
            <text x={PAD.left - 6} y={y(tick)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="var(--color-subtle)">
              {format.format(tick)}
            </text>
          </g>
        ))}
        {niceTicks(0, tMax).map((tick) => (
          <text key={`t${tick}`} x={x(tick)} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize="10" fill="var(--color-subtle)">
            {format.format(tick)}
          </text>
        ))}
        <polyline
          points={points.map((p) => `${x(p.t)},${y(p.v)}`).join(' ')}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <text x={WIDTH - PAD.right} y={HEIGHT - 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">
          {t('lesson.real.chartTime')}
        </text>
        <text x={4} y={PAD.top - 2} fontSize="10" fill="var(--color-muted)">
          {axis === 'height' ? t('lesson.real.chartHeight') : t('lesson.real.chartSide')}
        </text>
      </svg>
    </figure>
  );
}
