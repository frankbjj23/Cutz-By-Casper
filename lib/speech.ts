type SpeechCallbacks = {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onEnd?: (finalTranscript: string) => void;
  onError?: () => void;
};

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
  );
};

export const isSpeechRecognitionSupported = () => Boolean(getSpeechRecognition());

export const createSpeechRecognizer = (callbacks: SpeechCallbacks) => {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = "";

  recognition.onstart = () => callbacks.onStart?.();
  recognition.onerror = () => callbacks.onError?.();
  recognition.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interim += transcript;
      }
    }
    const current = (finalTranscript + interim).trim();
    callbacks.onResult?.(current, Boolean(finalTranscript));
  };
  recognition.onend = () => callbacks.onEnd?.(finalTranscript.trim());

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
};
