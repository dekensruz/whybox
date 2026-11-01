// The tutor's voice: the device's own speech synthesis, free and offline on most phones. The learner's choice to turn it
// off is remembered.
import { readStorage, writeStorage } from './storage';

const KEY = 'whybox.voice';

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
export const voiceEnabled = () => readStorage(KEY) !== 'off';
export const setVoiceEnabled = (on: boolean) => writeStorage(KEY, on ? null : 'off');

/** The most natural voice for the language: neural voices first, then online ones, then any local one. */
const pickVoice = (language: string) => {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith(language.toLowerCase()));
  const score = (voice: SpeechSynthesisVoice) =>
    (/natural|neural/i.test(voice.name) ? 4 : 0) + (/google|online/i.test(voice.name) ? 2 : 0) + (voice.localService ? 0 : 1);
  return voices.sort((a, b) => score(b) - score(a))[0];
};

// Some browsers load their voices after the page: ask once early so they are ready for the first sentence.
if (speechSupported()) window.speechSynthesis.getVoices();

let current = 0;

export interface SpeakEvents {
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Says `text`, sentence by sentence (long utterances get cut off in some browsers), replacing whatever was being said.
 * onEnd is called once, when everything has been said or when something else interrupts it.
 */
export const speak = (text: string, language: string, events: SpeakEvents = {}) => {
  if (!speechSupported()) return;
  const synthesis = window.speechSynthesis;
  const id = ++current;
  synthesis.cancel();
  const sentences = text.match(/[^.!?…]+[.!?…]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  if (!sentences.length) return events.onEnd?.();
  const voice = pickVoice(language);
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    events.onEnd?.();
  };
  sentences.forEach((sentence, index) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = voice?.lang ?? language;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    if (index === 0) utterance.onstart = () => id === current && events.onStart?.();
    if (index === sentences.length - 1) utterance.onend = end;
    utterance.onerror = end;
    synthesis.speak(utterance);
  });
  // A newer request, or stop(), ends this one.
  const watch = window.setInterval(() => {
    if (id !== current || (!synthesis.speaking && !synthesis.pending)) {
      window.clearInterval(watch);
      end();
    }
  }, 250);
};

export const stopSpeaking = () => {
  if (!speechSupported()) return;
  current++;
  window.speechSynthesis.cancel();
};
