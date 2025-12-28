import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAssistantReply } from "@/lib/server/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    })
  ),
  localeTimeZone: z.string().optional(),
});

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 25;
const rateState = new Map<string, { count: number; resetAt: number }>();

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
};

const rateLimit = (request: Request) => {
  const ip = getClientIp(request);
  const now = Date.now();
  const existing = rateState.get(ip);
  if (!existing || existing.resetAt <= now) {
    rateState.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return null;
  }
  if (existing.count >= RATE_MAX) {
    return existing.resetAt - now;
  }
  existing.count += 1;
  return null;
};

export async function POST(request: Request) {
  try {
    const rate = rateLimit(request);
    if (rate !== null) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          replyText:
            "AI Secretary isn’t configured yet. The site owner needs to set OPENAI_API_KEY. For now, please use the normal booking page or call/text Casper.",
          actions: [
            { type: "open_booking", label: "Book Now", url: "/book" },
            { type: "call", label: "Call", url: "tel:+12018896440" },
            { type: "text", label: "Text", url: "sms:+12018896440" },
          ],
        },
        { status: 200 }
      );
    }

    const { replyText, actions } = await generateAssistantReply(parsed.data.messages);
    return NextResponse.json({ replyText, actions }, { status: 200 });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);
    console.error("assistant error", detail);
    return NextResponse.json(
      {
        error: true,
        message: "Assistant failed",
        detail: detail || "Assistant unavailable.",
      },
      { status: 500 }
    );
  }
}
