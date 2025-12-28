"use client";

type Props = {
  label?: string;
};

export default function AIAssistantOpenButton({ label = "Try AI Secretary" }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-ai-assistant"))}
      className="rounded-full border border-ink px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
    >
      {label}
    </button>
  );
}
