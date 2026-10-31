import { useEffect, useRef } from 'react';
import type { TrackPoint } from '@shared/lesson';

interface TrackedVideoProps {
  src: string;
  track: TrackPoint[];
  frameWidth: number;
  frameHeight: number;
}

/** The learner's own video, with the path SAM tracked drawn on top and the object outlined as it moves. */
export function TrackedVideo({ src, track, frameWidth, frameHeight }: TrackedVideoProps) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const element = video.current;
      const overlay = canvas.current;
      if (element && overlay && element.videoWidth) {
        const width = element.clientWidth;
        const height = element.clientHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (overlay.width !== Math.round(width * dpr)) {
          overlay.width = Math.round(width * dpr);
          overlay.height = Math.round(height * dpr);
        }
        const context = overlay.getContext('2d')!;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, width, height);

        // The video is letterboxed inside its element (object-fit: contain): map source pixels to that box.
        const scale = Math.min(width / frameWidth, height / frameHeight);
        const offsetX = (width - frameWidth * scale) / 2;
        const offsetY = (height - frameHeight * scale) / 2;
        const toScreen = (point: TrackPoint) => [offsetX + point.x * scale, offsetY + point.y * scale] as const;

        const now = element.currentTime;
        const past = track.filter((point) => point.t <= now);
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#F2A900';
        context.beginPath();
        past.forEach((point, index) => {
          const [x, y] = toScreen(point);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();

        const current = past[past.length - 1];
        if (current) {
          const [x, y] = toScreen(current);
          context.strokeStyle = '#FFFFFF';
          context.lineWidth = 2;
          context.strokeRect(x - (current.w * scale) / 2, y - (current.h * scale) / 2, current.w * scale, current.h * scale);
          context.fillStyle = '#F2A900';
          context.beginPath();
          context.arc(x, y, 4, 0, Math.PI * 2);
          context.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [track, frameWidth, frameHeight]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink">
      <video ref={video} src={src} controls playsInline muted loop className="block max-h-[70vh] w-full object-contain" />
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
