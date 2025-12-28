"use client";

import { useEffect, useState } from "react";

type Appointment = {
  id: string;
  start_time_local: string;
  end_time_local: string;
  service_name: string;
  customer_name: string;
  status: string;
  late_eligible: boolean;
};

export default function AdminCalendarPage() {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");

  useEffect(() => {
    fetch(`/api/admin/appointments?date=${date}`)
      .then((res) => res.json())
      .then((data) => setAppointments(data.appointments ?? []))
      .catch(() => setMessage("Unable to load appointments."));
  }, [date]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Update failed.");
      return;
    }
    setAppointments((prev) =>
      prev.map((appt) => (appt.id === id ? { ...appt, status } : appt))
    );
  };

  const createBlock = async () => {
    const res = await fetch("/api/admin/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, startTime: blockStart, endTime: blockEnd }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error ?? "Unable to block time.");
      return;
    }
    setMessage("Time blocked.");
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-16">
      <h1 className="section-title">Calendar</h1>
      <div className="mt-6 flex items-center gap-3">
        <input
          type="date"
          className="rounded-full border border-fog bg-white px-4 py-2 text-sm"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <span className="text-sm text-ink/60">Day view</span>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <input
          type="time"
          className="rounded-full border border-fog bg-white px-4 py-2"
          value={blockStart}
          onChange={(event) => setBlockStart(event.target.value)}
        />
        <input
          type="time"
          className="rounded-full border border-fog bg-white px-4 py-2"
          value={blockEnd}
          onChange={(event) => setBlockEnd(event.target.value)}
        />
        <button
          className="rounded-full border border-ink px-4 py-2 text-xs uppercase tracking-[0.2em]"
          onClick={createBlock}
        >
          Block time
        </button>
      </div>

      <div className="mt-8 space-y-4">
        {appointments.map((appt) => (
          <div key={appt.id} className="lux-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{appt.service_name}</p>
                <p className="text-xs text-ink/60">{appt.customer_name}</p>
                <p className="text-xs text-ink/60">
                  {appt.start_time_local} - {appt.end_time_local}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  className="rounded-full border border-ink px-3 py-1"
                  onClick={() => updateStatus(appt.id, "completed")}
                >
                  Completed
                </button>
                <button
                  className="rounded-full border border-ink px-3 py-1"
                  onClick={() => updateStatus(appt.id, "cancelled")}
                >
                  Cancelled
                </button>
                {appt.late_eligible && (
                  <button
                    className="rounded-full border border-ink px-3 py-1"
                    onClick={() => updateStatus(appt.id, "no_show")}
                  >
                    Mark No-Show
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-ink/50">
              Status: {appt.status}
            </p>
            {appt.late_eligible && (
              <p className="mt-2 text-xs text-ink/60">
                Eligible to mark no-show (15+ minutes late).
              </p>
            )}
          </div>
        ))}
      </div>

      {message && <p className="mt-4 text-sm text-ink/70">{message}</p>}
    </div>
  );
}
