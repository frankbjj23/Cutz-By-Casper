"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSpeechRecognizer, isSpeechRecognitionSupported } from "@/lib/speech";
import { getVoices, pickPreferredVoice, speak, stop } from "@/lib/tts";

type Message = {
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
};

type AssistantAction = {
  type: "checkout" | "call" | "text" | "open_booking";
  label: string;
  url?: string;
};

type AssistantModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AIAssistantModal({ isOpen, onClose }: AssistantModalProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help you pick a service and time. What are you looking to book?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastCheckoutUrl, setLastCheckoutUrl] = useState<string | null>(null);
  const [handsFree, setHandsFree] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const speechRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasInteractedRef = useRef(false);
  const autoStartRef = useRef(false);
  const autoListenRef = useRef<number | null>(null);

  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), []);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => {
      transcriptRef.current?.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) {
      setInput("");
      setListening(false);
      setLiveTranscript("");
      speechRef.current?.stop();
      autoStartRef.current = false;
      if (autoListenRef.current) {
        window.clearTimeout(autoListenRef.current);
        autoListenRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !voiceReady) return;
    getVoices().then((voices) => {
      setVoiceOptions(voices);
      const stored = window.localStorage.getItem("ai-secretary-voice");
      if (stored) {
        setSelectedVoiceName(stored);
      } else {
        const preferred = pickPreferredVoice(voices);
        if (preferred?.name) {
          setSelectedVoiceName(preferred.name);
        }
      }
    });
    const storedEnabled = window.localStorage.getItem("ai-secretary-voice-enabled");
    if (storedEnabled) {
      setVoiceEnabled(storedEnabled === "true");
    }
    const storedHandsFree = window.localStorage.getItem("ai-secretary-hands-free");
    if (storedHandsFree) {
      setHandsFree(storedHandsFree === "true");
    }
    const storedAudioUnlocked = window.localStorage.getItem("ai-secretary-audio");
    if (storedAudioUnlocked) {
      setAudioUnlocked(storedAudioUnlocked === "true");
    }
  }, [isOpen, voiceReady]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !speechSupported) return;
    if (autoStartRef.current) return;
    autoStartRef.current = true;
    const timer = window.setTimeout(() => {
      startListening();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [isOpen, speechSupported]);

  const markInteraction = () => {
    if (!hasInteractedRef.current) {
      hasInteractedRef.current = true;
      setVoiceReady(true);
      const stored = window.localStorage.getItem("ai-secretary-voice-enabled");
      if (!stored) {
        setVoiceEnabled(true);
        window.localStorage.setItem("ai-secretary-voice-enabled", "true");
      }
    }
  };

  const playEarcon = (frequency = 520) => {
    if (typeof window === "undefined") return;
    try {
      const audio = new window.AudioContext();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.08);
      osc.onended = () => audio.close();
    } catch {
      // ignore
    }
  };

  const unlockAudio = async () => {
    if (typeof window === "undefined") return;
    try {
      const silentWav =
        "data:audio/wav;base64,UklGRqQMAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
      const audio = new Audio(silentWav);
      audio.volume = 0.01;
      await audio.play();
      audio.pause();
      setAudioUnlocked(true);
      window.localStorage.setItem("ai-secretary-audio", "true");
    } catch {
      // ignore
    }
  };

  const getSelectedVoice = () =>
    voiceOptions.find((voice) => voice.name === selectedVoiceName) ?? null;

  const scheduleAutoListen = () => {
    if (!handsFree || !speechSupported || !isOpen || listening || loading) return;
    if (autoListenRef.current) {
      window.clearTimeout(autoListenRef.current);
    }
    autoListenRef.current = window.setTimeout(() => {
      autoListenRef.current = null;
      if (!listening) {
        startListening();
      }
    }, 400);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    markInteraction();
    stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      const endpoint = voiceEnabled ? "/api/assistant/voice" : "/api/assistant";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          voiceEnabled,
        }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        if (process.env.NODE_ENV !== "production") {
          console.error("Assistant non-JSON response:", text.slice(0, 400));
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Assistant error: server returned non-JSON (status ${res.status}).`,
          },
        ]);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail ?? data.message ?? "Assistant unavailable.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Assistant error: ${detail}` },
        ]);
        setLoading(false);
        return;
      }

      if (data.actions?.some((action: AssistantAction) => action.type === "checkout")) {
        if (lastCheckoutUrl) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Checkout already created. Please use the existing link.",
            },
          ]);
          setLoading(false);
          return;
        }
        const checkoutAction = data.actions.find(
          (action: AssistantAction) => action.type === "checkout"
        );
        if (checkoutAction?.url) {
          setLastCheckoutUrl(checkoutAction.url);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.replyText ?? "How else can I help?",
          actions: data.actions ?? [],
        },
      ]);

      if (voiceEnabled && hasInteractedRef.current) {
        if (data.audioBase64 && data.audioMime) {
          try {
            const binary = atob(data.audioBase64);
            const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
            const blob = new Blob([bytes], { type: data.audioMime });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            setSpeaking(true);
            audio.onended = () => {
              setSpeaking(false);
              URL.revokeObjectURL(url);
              scheduleAutoListen();
            };
            audio.onerror = () => {
              setSpeaking(false);
              URL.revokeObjectURL(url);
              scheduleAutoListen();
            };
            await audio.play();
          } catch {
            setSpeaking(false);
            speak(data.replyText ?? "", {
              voice: getSelectedVoice(),
              onEnd: () => {
                setSpeaking(false);
                scheduleAutoListen();
              },
            });
          }
        } else {
          setSpeaking(true);
          speak(data.replyText ?? "", {
            voice: getSelectedVoice(),
            onEnd: () => {
              setSpeaking(false);
              scheduleAutoListen();
            },
          });
        }
      } else {
        scheduleAutoListen();
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Sorry, I ran into an issue. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: AssistantAction) => {
    markInteraction();
    if (action.type === "open_booking") {
      router.push("/book");
      return;
    }
    if (action.url) {
      if (action.type === "checkout") {
        window.open(action.url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = action.url;
      }
    }
  };

  const startListening = () => {
    if (!speechSupported || listening) return;
    markInteraction();
    stop();
    setSpeaking(false);
    setLiveTranscript("");
    playEarcon(600);
    if ("vibrate" in navigator) {
      navigator.vibrate?.(10);
    }
    const recognizer = createSpeechRecognizer({
      onStart: () => setListening(true),
      onResult: (transcript) => setLiveTranscript(transcript),
      onEnd: (transcript) => {
        setListening(false);
        setLiveTranscript("");
        playEarcon(440);
      if (transcript) {
        sendMessage(transcript);
      }
    },
      onError: () => setListening(false),
    });
    speechRef.current = recognizer;
    recognizer?.start();
  };

  const stopListening = () => {
    speechRef.current?.stop();
    setListening(false);
    setLiveTranscript("");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 px-4 pb-8 pt-16 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="AI Secretary"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-pearl shadow-soft"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-fog px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/60">Assistant</p>
            <h2 className="text-lg font-semibold text-ink">AI Secretary</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div
          ref={transcriptRef}
          className="max-h-[55vh] space-y-4 overflow-y-auto px-6 py-5"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] space-y-3 ${
                message.role === "user" ? "ml-auto text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block rounded-2xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "bg-ink text-pearl"
                    : "border border-fog bg-white text-ink"
                }`}
              >
                {message.content}
              </div>
              {message.actions?.length ? (
                <div className="flex flex-wrap gap-3">
                  {message.actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleAction(action)}
                      className="rounded-full border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {listening && liveTranscript ? (
            <div className="max-w-[85%] space-y-3 text-left">
              <div className="inline-block rounded-2xl border border-fog bg-white px-4 py-3 text-sm text-ink/70">
                {liveTranscript}
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/50">
                <span className="h-2 w-2 rounded-full bg-ink motion-safe:animate-pulse" />
                Listening...
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-fog px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
              className="flex-1 rounded-full border border-fog bg-white px-4 py-3 text-sm"
              placeholder="Type your request..."
            />
            {speechSupported ? (
              <button
                type="button"
                onClick={() => (listening ? stopListening() : startListening())}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    if (listening) {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }
                }}
                className={`rounded-full border px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  listening
                    ? "border-ink bg-ink text-pearl"
                    : "border-fog text-ink hover:border-ink"
                }`}
              >
                {listening ? "Listening" : "Tap to talk"}
              </button>
            ) : (
              <span className="text-xs text-ink/50">
                Voice not supported on this browser.
              </span>
            )}
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={loading}
              className="rounded-full bg-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-ink/90"
            >
              {loading ? "Sending" : "Send"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/60">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(event) => {
                  markInteraction();
                  const enabled = event.target.checked;
                  setVoiceEnabled(enabled);
                  window.localStorage.setItem(
                    "ai-secretary-voice-enabled",
                    enabled ? "true" : "false"
                  );
                }}
              />
              Voice replies
            </label>
            {speechSupported && (
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink/60">
                <input
                  type="checkbox"
                  checked={handsFree}
                  onChange={(event) => {
                    markInteraction();
                    const enabled = event.target.checked;
                    setHandsFree(enabled);
                    window.localStorage.setItem(
                      "ai-secretary-hands-free",
                      enabled ? "true" : "false"
                    );
                    if (enabled) {
                      scheduleAutoListen();
                    }
                  }}
                />
                Hands-free
              </label>
            )}
            {!audioUnlocked && (
              <button
                type="button"
                onClick={() => {
                  markInteraction();
                  unlockAudio();
                }}
                className="rounded-full border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
              >
                Enable audio
              </button>
            )}
            <button
              type="button"
              className="text-xs uppercase tracking-[0.2em] text-ink/60 hover:text-ink"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? "Hide" : "Advanced"}
            </button>
            {speaking && (
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-ink/60">
                Speaking...
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current = null;
                    }
                    setSpeaking(false);
                  }}
                  className="rounded-full border border-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
          {showAdvanced && (
            <div className="mt-4 space-y-2 text-xs text-ink/70">
              <label className="block text-xs uppercase tracking-[0.2em] text-ink/60">
                Voice
              </label>
              <select
                className="w-full rounded-full border border-fog bg-white px-3 py-2 text-xs"
                value={selectedVoiceName}
                onChange={(event) => {
                  setSelectedVoiceName(event.target.value);
                  window.localStorage.setItem("ai-secretary-voice", event.target.value);
                }}
              >
                {voiceOptions.map((voice) => (
                  <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
          <p className="mt-3 text-xs text-ink/50">
            By using voice, you consent to voice processing on your device.
          </p>
        </div>
      </div>
    </div>
  );
}
