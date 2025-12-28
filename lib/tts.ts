type SpeakOptions = {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  onEnd?: () => void;
};

const isSpeechSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) {
      resolve([]);
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }

    const handle = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener("voiceschanged", handle);
    };

    window.speechSynthesis.addEventListener("voiceschanged", handle);
  });
};

export const pickPreferredVoice = (voices: SpeechSynthesisVoice[]) => {
  if (!voices.length) return null;
  const preferredNames = [
    "female",
    "woman",
    "samantha",
    "victoria",
    "karen",
    "tessa",
    "serena",
    "moira",
    "google us english",
  ];
  const english = voices.filter((voice) => voice.lang?.toLowerCase().startsWith("en"));

  const matchByName = english.find((voice) =>
    preferredNames.some((name) => voice.name.toLowerCase().includes(name))
  );
  if (matchByName) return matchByName;

  return english[0] ?? voices[0] ?? null;
};

export const speak = async (text: string, options: SpeakOptions = {}) => {
  if (!isSpeechSupported() || !text.trim()) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = await getVoices();
  utterance.voice = options.voice ?? pickPreferredVoice(voices);
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.05;
  utterance.volume = options.volume ?? 1.0;
  if (options.onEnd) {
    utterance.onend = options.onEnd;
    utterance.onerror = options.onEnd;
  }
  window.speechSynthesis.speak(utterance);
};

export const stop = () => {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
};
