"use client";

import { useEffect, useState } from "react";

type Settings = {
  id: string;
  time_zone: string;
  buffer_minutes: number;
  working_hours_json: Record<string, { start: string; end: string }[]>;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data.settings ?? null))
      .catch(() => setMessage("Unable to load settings."));
  }, []);

  const saveSettings = async () => {
    if (!settings) return;
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Unable to save settings.");
      return;
    }
    setMessage("Settings saved.");
  };

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-16">
      <h1 className="section-title">Settings</h1>
      {settings && (
        <div className="mt-6 lux-card space-y-4 p-6">
          <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
            Time zone
          </label>
          <input
            className="w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
            value={settings.time_zone}
            onChange={(event) =>
              setSettings({ ...settings, time_zone: event.target.value })
            }
          />
          <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
            Buffer minutes
          </label>
          <input
            type="number"
            className="w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
            value={settings.buffer_minutes}
            onChange={(event) =>
              setSettings({ ...settings, buffer_minutes: Number(event.target.value) })
            }
          />
          <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
            Working hours (JSON)
          </label>
          <textarea
            className="min-h-[200px] w-full rounded-2xl border border-fog bg-white p-4 text-xs"
            value={JSON.stringify(settings.working_hours_json, null, 2)}
            onChange={(event) => {
              try {
                const parsed = JSON.parse(event.target.value);
                setSettings({ ...settings, working_hours_json: parsed });
              } catch {
                // ignore invalid JSON
              }
            }}
          />
          <button
            onClick={saveSettings}
            className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-pearl"
          >
            Save settings
          </button>
        </div>
      )}
      {message && <p className="mt-4 text-sm text-ink/70">{message}</p>}
    </div>
  );
}
