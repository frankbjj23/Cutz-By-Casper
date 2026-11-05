import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const headers = { "Cache-Control": "no-store" };
const reply = (status: number) => new Response(null, { status, headers });
const paths = new Set(["/", "/book", "/styles", "/reviews", "/privacy"]);

Deno.serve(async (request) => {
  if (request.method !== "POST") return reply(405);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415);
  if (Number(request.headers.get("content-length")) > 1024) return reply(413);
  let raw: string;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const buffer = new Uint8Array(1024);
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > buffer.byteLength) { await reader.cancel(); return reply(413); }
      buffer.set(value, size);
      size += value.byteLength;
    }
    raw = new TextDecoder().decode(buffer.subarray(0, size));
  } catch { return reply(400); }
  const secret = Deno.env.get("REVIEW_RECEIVER_SECRET")?.trim() ?? "";
  const timestamp = request.headers.get("x-redeemed-timestamp") ?? "";
  const signature = request.headers.get("x-redeemed-signature") ?? "";
  if (!/^[a-f0-9]{64}$/.test(secret)) { console.error("activity.secret_missing"); return reply(503); }
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)) return reply(401);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signatureBytes = new Uint8Array(signature.match(/../g)!.map((hex) => parseInt(hex, 16)));
  if (!await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(`redeemed-traffic-v1\n${timestamp}\n${raw}`))) return reply(401);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return reply(400); }
  if (!body || typeof body.sessionHash !== "string" || !/^[a-f0-9]{64}$/.test(body.sessionHash) ||
    typeof body.networkHash !== "string" || !/^[a-f0-9]{64}$/.test(body.networkHash) ||
    typeof body.path !== "string" || !paths.has(body.path)) return reply(400);
  let secrets: Record<string, string> = {};
  try { secrets = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}"); } catch { /* Legacy key fallback. */ }
  const serviceKey = secrets.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!url || !serviceKey) return reply(503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await db.rpc("record_site_activity", {
    p_session_hash: body.sessionHash, p_network_hash: body.networkHash, p_path: body.path,
  });
  if (error) {
    if (error.message === "activity_rate_limited") return reply(429);
    console.error("activity.record_failed", { code: error.code });
    return reply(503);
  }
  return reply(204);
});
