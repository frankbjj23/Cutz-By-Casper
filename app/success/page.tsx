"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Appointment = {
  id: string;
  start_time_local: string;
  service_name: string;
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/appointments/session?session_id=${sessionId}`);
        const data = await res.json();
        if (!active) return;
        if (data.appointment) {
          setAppointment(data.appointment);
          setLoading(false);
          return;
        }
      } catch {
        if (!active) return;
      }
      setTimeout(poll, 2500);
    };
    poll();
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-16">
      <div className="lux-card p-8">
        <h1 className="section-title">Booking confirmed</h1>
        {loading && (
          <p className="mt-4 text-sm text-ink/70">
            Finalizing your appointment. This can take a moment...
          </p>
        )}
        {appointment && (
          <div className="mt-6 space-y-3 text-sm text-ink/70">
            <p>Service: {appointment.service_name}</p>
            <p>Time: {appointment.start_time_local}</p>
            <Link
              href={`/manage/${appointment.id}`}
              className="inline-flex rounded-full border border-ink px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Manage appointment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-6 pb-24 pt-16">
          <div className="lux-card p-8">
            <h1 className="section-title">Booking confirmed</h1>
            <p className="mt-4 text-sm text-ink/70">Loading your appointment...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
