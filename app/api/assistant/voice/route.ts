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
  voiceEnabled: z.boolean().optional(),
});

const synthesizeSpeech = async (text: string) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: text,
      format: "mp3",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { audioBase64: base64, audioMime: "audio/mpeg" };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: true, message: "Invalid payload" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        replyText:
          "AI Secretary isn’t configured yet. The site owner needs to set OPENAI_API_KEY. For now, please use the normal booking page or call/text Casper.",
        actions: [
          { type: "open_booking", label: "Book Now", url: "/book" },
          { type: "call", label: "Call", url: "tel:+12018896440" },
          { type: "text", label: "Text", url: "sms:+12018896440" },
        ],
      });
    }

    const { replyText, actions } = await generateAssistantReply(parsed.data.messages);
    let audio: { audioBase64: string; audioMime: string } | null = null;
    if (parsed.data.voiceEnabled) {
      audio = await synthesizeSpeech(replyText);
    }

    return NextResponse.json(
      {
        replyText,
        actions,
        audioBase64: audio?.audioBase64,
        audioMime: audio?.audioMime,
      },
      { status: 200 }
    );
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);
    return NextResponse.json(
      { error: true, message: "Assistant failed", detail },
      { status: 500 }
    );
  }
}
