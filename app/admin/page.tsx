"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getSession().then(({ data }) => {
        setSessionEmail(data.session?.user.email ?? null);
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Supabase misconfigured.");
    }
  }, []);

  const handleLogin = async () => {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage("Logged in. Use the admin links.");
      setSessionEmail(email);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Supabase misconfigured.");
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setSessionEmail(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Supabase misconfigured.");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 pb-24 pt-16">
      <div className="lux-card p-8">
        <h1 className="section-title">Admin access</h1>
        {sessionEmail ? (
          <div className="mt-6 space-y-4 text-sm text-ink/70">
            <p>Signed in as {sessionEmail}</p>
            <div className="flex flex-col gap-3">
              <Link href="/admin/calendar" className="text-ink underline">
                Calendar
              </Link>
              <Link href="/admin/services" className="text-ink underline">
                Services
              </Link>
              <Link href="/admin/settings" className="text-ink underline">
                Settings
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-ink px-5 py-2 text-xs uppercase tracking-[0.2em]"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full rounded-full border border-fog bg-white px-4 py-3 text-sm"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              onClick={handleLogin}
              className="w-full rounded-full bg-ink px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-pearl"
            >
              Sign in
            </button>
          </div>
        )}
        {message && <p className="mt-4 text-sm text-ink/70">{message}</p>}
      </div>
    </div>
  );
}
