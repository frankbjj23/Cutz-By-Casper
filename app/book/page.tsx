"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_display: string;
  note?: string | null;
  price_from?: boolean;
  deposit_amount: number;
};

type Slot = {
  startTimeLocalISO: string;
  label: string;
};

export default function BookPage() {
  const BUSINESS_PHONE_DISPLAY = "(201) 889-6440";
  const BUSINESS_PHONE_E164 = "+12018896440";

  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [policyAck, setPolicyAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        setServices(data.services ?? []);
        if (data.services?.length) {
          setServiceId(data.services[0].id);
        }
      })
      .catch(() => setError("Unable to load services."));
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId]
  );
  const isDirectService = Boolean(selectedService?.price_from);

  useEffect(() => {
    if (!serviceId || !date) return;
    if (isDirectService) {
      setSlots([]);
      setSlot("");
      return;
    }
    fetch(`/api/availability?date=${date}&serviceId=${serviceId}`)
      .then((res) => res.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setSlot("");
      })
      .catch(() => setError("Unable to load availability."));
  }, [serviceId, date, isDirectService]);

  const handleCheckout = async () => {
    setError(null);
    if (isDirectService) {
      setError("This service requires texting Casper directly to confirm.");
      return;
    }
    if (!slot || !policyAck || !serviceId) {
      setError("Select a time and accept the policy to continue.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/appointments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startTimeLocalISO: slot,
          fullName,
          phoneE164: phone,
          smsOptIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Unable to start checkout.");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-12">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-xs uppercase tracking-[0.35em] text-ink/60">
          Cutz By Casper
        </Link>
        <Link href="/" className="text-sm text-ink/70">
          Back to home
        </Link>
      </header>

      <div className="mt-10 space-y-10">
        <div>
          <h1 className="section-title">Book your appointment</h1>
          <p className="mt-3 text-sm text-ink/70">
            Select a service and a preferred time. Deposit secures the booking.
          </p>
        </div>

        <div className="lux-card p-6">
          <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
            Service
          </label>
          <select
            className="mt-3 w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.price_display}
              </option>
            ))}
          </select>
          {selectedService && (
            <div className="mt-4 space-y-2 text-sm text-ink/70">
              <p>{selectedService.duration_minutes} min</p>
              {selectedService.note && <p>{selectedService.note}</p>}
            </div>
          )}
        </div>

        <div className="lux-card p-6">
          <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
            Date
          </label>
          <input
            type="date"
            className="mt-3 w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <div className="mt-6">
            <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
              Available times
            </label>
            {isDirectService ? (
              <p className="mt-4 text-sm text-ink/70">
                This service requires texting Casper directly to confirm.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {slots.length === 0 && (
                  <p className="col-span-full text-sm text-ink/60">
                    No availability for this date.
                  </p>
                )}
                {slots.map((slotOption) => (
                  <button
                    key={slotOption.startTimeLocalISO}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      slot === slotOption.startTimeLocalISO
                        ? "border-ink bg-ink text-pearl"
                        : "border-fog bg-white text-ink hover:border-ink"
                    }`}
                    onClick={() => setSlot(slotOption.startTimeLocalISO)}
                    type="button"
                  >
                    {slotOption.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isDirectService && (
          <div className="lux-card space-y-4 p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-ink/60">
              Before & after hours
            </p>
            <p className="text-sm text-ink/70">
              This service requires texting Casper directly to confirm. Please text
              {` ${BUSINESS_PHONE_DISPLAY}`} to coordinate.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`sms:${BUSINESS_PHONE_E164}`}
                className="rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-ink/90"
              >
                Text Casper
              </a>
              <a
                href={`tel:${BUSINESS_PHONE_E164}`}
                className="rounded-full border border-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-ink transition hover:bg-ink hover:text-pearl"
              >
                Call
              </a>
            </div>
          </div>
        )}

        <div className="lux-card space-y-4 p-6">
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
              Full name
            </label>
            <input
              type="text"
              className="mt-2 w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-ink/60">
              Phone (E.164)
            </label>
            <input
              type="tel"
              placeholder="+15551234567"
              className="mt-2 w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={smsOptIn}
              onChange={(event) => setSmsOptIn(event.target.checked)}
            />
            I want SMS confirmations and reminders.
          </label>
        </div>

        <div className="lux-card space-y-4 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-ink/60">
            Deposit policy
          </p>
          <p className="text-sm text-ink/70">
            $20 deposit charged now to confirm booking. Reschedule allowed only 72+ hours
            before. 15+ minutes late is a no-show and deposit is forfeited. Deposit is
            non-refundable.
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/60">
            Strict policy on 24hr cancellations.
          </p>
          <label className="flex items-center gap-3 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={policyAck}
              onChange={(event) => setPolicyAck(event.target.checked)}
            />
            I acknowledge the policy.
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="w-full rounded-full bg-ink px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-pearl transition hover:bg-ink/90"
          onClick={handleCheckout}
          disabled={loading || isDirectService}
        >
          {loading
            ? "Starting checkout..."
            : `Pay $${selectedService?.deposit_amount ?? 20} deposit`}
        </button>
      </div>
    </div>
  );
}
