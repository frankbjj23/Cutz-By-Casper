"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Appointment = {
  id: string;
  service_id: string;
  service_name: string;
  start_time_local: string;
  reschedule_allowed: boolean;
};

type Slot = {
  startTimeLocalISO: string;
  label: string;
};

export default function ManageAppointmentPage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then((res) => res.json())
      .then((data) => setAppointment(data.appointment ?? null))
      .catch(() => setMessage("Unable to load appointment."));
  }, [appointmentId]);

  useEffect(() => {
    if (!appointment?.service_id) return;
    fetch(`/api/availability?date=${date}&serviceId=${appointment.service_id}`)
      .then((res) => res.json())
      .then((data) => setSlots(data.slots ?? []))
      .catch(() => setMessage("Unable to load availability."));
  }, [appointment?.service_id, date]);

  const canReschedule = useMemo(() => appointment?.reschedule_allowed, [appointment]);

  const submitReschedule = async () => {
    if (!slot) return;
    setMessage(null);
    const res = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTimeLocalISO: slot }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Reschedule failed.");
      return;
    }
    setMessage("Reschedule confirmed. Check your SMS for the new time.");
  };

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-16">
      <div className="lux-card p-8">
        <h1 className="section-title">Manage appointment</h1>
        {appointment && (
          <div className="mt-4 text-sm text-ink/70">
            <p>Service: {appointment.service_name}</p>
            <p>Current time: {appointment.start_time_local}</p>
          </div>
        )}

        {!canReschedule && (
          <p className="mt-6 text-sm text-ink/70">
            Rescheduling is closed within 72 hours of your appointment.
          </p>
        )}

        {canReschedule && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
                New date
              </label>
              <input
                type="date"
                className="mt-2 w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {slots.map((slotOption) => (
                <button
                  key={slotOption.startTimeLocalISO}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    slot === slotOption.startTimeLocalISO
                      ? "border-ink bg-ink text-pearl"
                      : "border-fog bg-white text-ink"
                  }`}
                  onClick={() => setSlot(slotOption.startTimeLocalISO)}
                  type="button"
                >
                  {slotOption.label}
                </button>
              ))}
            </div>
            <button
              onClick={submitReschedule}
              className="w-full rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-pearl"
            >
              Confirm reschedule
            </button>
          </div>
        )}

        {message && <p className="mt-4 text-sm text-ink/70">{message}</p>}
      </div>
    </div>
  );
}
