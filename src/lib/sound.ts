// Short generated sound cues for the lesson, with no audio files to download. The learner's choice to mute is remembered.
import { readStorage, writeStorage } from './storage';

const KEY = 'whybox.sound';

export const soundEnabled = () => readStorage(KEY) !== 'off';
export const setSoundEnabled = (on: boolean) => writeStorage(KEY, on ? null : 'off');

let context: AudioContext | null = null;

const note = (audio: AudioContext, frequency: number, start: number, duration: number, volume: number) => {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
};

/** Two soft falling notes: "not yet", never harsh. */
export const miss = () => {
  if (!soundEnabled()) return;
  try {
    context = context ?? new AudioContext();
    const now = context.currentTime;
    [392, 329.63].forEach((frequency, index) => note(context!, frequency, now + index * 0.14, 0.35, 0.05));
  } catch {
    /* sound is optional */
  }
};

/** A rising three-note chime; `grand` adds a fourth, higher note for the last success. */
export const chime = (grand = false) => {
  if (!soundEnabled()) return;
  try {
    context = context ?? new AudioContext();
    const now = context.currentTime;
    const notes = grand ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => note(context!, frequency, now + index * 0.11, 0.45, 0.07));
  } catch {
    /* sound is optional */
  }
};
