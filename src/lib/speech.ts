// The tutor's voice. First choice: a natural open-weight voice (Kokoro, served by the Whybox API). If it is not
// available, the device's own speech synthesis, free and offline on most phones. The learner's choice to turn the voice
// off is remembered. voiceLevel() tells how loud the voice is right now, for the avatar's lips.
import { readStorage, writeStorage } from './storage';

const KEY = 'whybox.voice';

export const speechSupported = () =>
  typeof window !== 'undefined' && (typeof Audio !== 'undefined' || ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window));
export const voiceEnabled = () => readStorage(KEY) !== 'off';
export const setVoiceEnabled = (on: boolean) => writeStorage(KEY, on ? null : 'off');

export interface SpeakEvents {
  onStart?: () => void;
  onEnd?: () => void;
}

// ------------------------------------------------------------ natural voice

/** Once the service has failed, the device voice is used for the rest of the visit. */
let naturalVoice: 'unknown' | 'available' | 'unavailable' = 'unknown';
const recordings = new Map<string, Promise<string>>();

const recording = (text: string, language: string) => {
  const key = `${language}:${text}`;
  let url = recordings.get(key);
  if (!url) {
    url = fetch('/api/voice/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language }) }).then(
      async (response) => {
        if (!response.ok) throw new Error(`Voice ${response.status}`);
        naturalVoice = 'available';
        return URL.createObjectURL(await response.blob());
      },
    );
    url.catch(() => {
      recordings.delete(key);
      naturalVoice = 'unavailable';
    });
    recordings.set(key, url);
  }
  return url;
};

/** Starts preparing what the tutor will say next, so it plays without waiting. */
export const prepareSpeech = (text: string, language: string) => {
  if (text && naturalVoice !== 'unavailable') recording(text, language).catch(() => undefined);
};

let player: HTMLAudioElement | null = null;
let analyser: AnalyserNode | null = null;
let samples: Uint8Array<ArrayBuffer> | null = null;

const audioPlayer = () => {
  if (!player) {
    player = new Audio();
    try {
      const context = new AudioContext();
      const source = context.createMediaElementSource(player);
      analyser = context.createAnalyser();
      analyser.fftSize = 512;
      samples = new Uint8Array(analyser.fftSize);
      source.connect(analyser).connect(context.destination);
      player.addEventListener('play', () => void context.resume());
    } catch {
      analyser = null;
    }
  }
  return player;
};

// ------------------------------------------------------------ device voice

/** The most natural device voice for the language: neural voices first, then online ones, then any local one. */
const pickVoice = (language: string) => {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith(language.toLowerCase()));
  const score = (voice: SpeechSynthesisVoice) =>
    (/natural|neural/i.test(voice.name) ? 4 : 0) + (/google|online/i.test(voice.name) ? 2 : 0) + (voice.localService ? 0 : 1);
  return voices.sort((a, b) => score(b) - score(a))[0];
};

// Some browsers load their voices after the page: ask once early so they are ready for the first sentence.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.getVoices();

const speakWithDevice = (text: string, language: string, isCurrent: () => boolean, events: SpeakEvents) => {
  if (!('speechSynthesis' in window)) return events.onEnd?.();
  const synthesis = window.speechSynthesis;
  const sentences = text.match(/[^.!?…]+[.!?…]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  if (!sentences.length) return events.onEnd?.();
  const voice = pickVoice(language);
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    deviceSpeaking = false;
    events.onEnd?.();
  };
  sentences.forEach((sentence, index) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = voice?.lang ?? language;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    if (index === 0)
      utterance.onstart = () => {
        if (!isCurrent()) return;
        deviceSpeaking = true;
        events.onStart?.();
      };
    if (index === sentences.length - 1) utterance.onend = end;
    utterance.onerror = end;
    synthesis.speak(utterance);
  });
  // A newer request, or stop(), ends this one.
  const watch = window.setInterval(() => {
    if (!isCurrent() || (!synthesis.speaking && !synthesis.pending)) {
      window.clearInterval(watch);
      end();
    }
  }, 250);
};

// ------------------------------------------------------------ speaking

let current = 0;
let deviceSpeaking = false;

/**
 * Says `text`, replacing whatever was being said. onEnd is called once, when everything has been said or when
 * something else interrupts it.
 */
export const speak = (text: string, language: string, events: SpeakEvents = {}) => {
  const id = ++current;
  const isCurrent = () => id === current;
  silence();
  if (!text.trim()) return events.onEnd?.();
  if (naturalVoice === 'unavailable') return speakWithDevice(text, language, isCurrent, events);

  recording(text, language)
    .then((url) => {
      if (!isCurrent()) return;
      const audio = audioPlayer();
      let ended = false;
      const end = () => {
        if (ended) return;
        ended = true;
        audio.onended = audio.onerror = audio.onpause = null;
        events.onEnd?.();
      };
      audio.onended = end;
      audio.onerror = end;
      audio.onpause = end;
      audio.src = url;
      audio
        .play()
        .then(() => isCurrent() && events.onStart?.())
        .catch(end);
    })
    .catch(() => isCurrent() && speakWithDevice(text, language, isCurrent, events));
};

function silence() {
  player?.pause();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  deviceSpeaking = false;
}

export const stopSpeaking = () => {
  current++;
  silence();
};

/** How loud the tutor is speaking right now, from 0 to 1. */
export const voiceLevel = () => {
  if (player && !player.paused && analyser && samples) {
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
    return Math.min(1, Math.sqrt(sum / samples.length) * 4);
  }
  // The device voice gives no sound to measure: an even rhythm of syllables.
  if (deviceSpeaking) return 0.35 + 0.35 * Math.abs(Math.sin(performance.now() / 90));
  return 0;
};
