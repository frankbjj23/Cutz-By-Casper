import { DateTime } from "luxon";
import { getSupabaseClient } from "@/lib/supabase/client";
import { generateSlots } from "@/lib/availability";
import { fetchSettings } from "@/lib/server/appointments";
import { createCheckoutSession } from "@/lib/server/checkout";
import { DEMO_MODE, HAS_STRIPE } from "@/lib/env";

export type AssistantAction = {
  type: "checkout" | "call" | "text" | "open_booking";
  label: string;
  url?: string;
};

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

const BUSINESS_FALLBACK = {
  name: "Casper (Cutz By Casper)",
  address: "442 Ridge Rd, Lyndhurst, NJ 07071",
  phone: "(201) 889-6440",
  phoneE164: "+12018896440",
  policyText: "STRICT POLICY ON 24hr CANCELLATIONS",
  hours: [
    { day: "Sunday", hours: "09:00–13:00" },
    { day: "Monday", hours: "Closed" },
    { day: "Tuesday", hours: "Closed" },
    { day: "Wednesday", hours: "11:00–18:00" },
    { day: "Thursday", hours: "10:00–19:00" },
    { day: "Friday", hours: "12:00–19:00" },
    { day: "Saturday", hours: "10:00–17:00" },
  ],
};

const tools = [
  {
    type: "function",
    function: {
      name: "list_services",
      description:
        "List services with durations, pricing, and whether they can be booked online.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_available_slots",
      description: "Get available appointment slots for a service on a date.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string" },
          dateISO: { type: "string", description: "YYYY-MM-DD in local time" },
        },
        required: ["serviceId", "dateISO"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_checkout",
      description:
        "Create a Stripe Checkout session after the user confirms service, time, and policies.",
      parameters: {
        type: "object",
        properties: {
          serviceId: { type: "string" },
          startTimeLocalISO: { type: "string" },
          fullName: { type: "string" },
          phoneE164: { type: "string" },
          smsOptIn: { type: "boolean" },
        },
        required: ["serviceId", "startTimeLocalISO", "fullName", "phoneE164", "smsOptIn"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_info",
      description: "Get address, phone, weekly hours, and policy copy.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const paymentNote =
  DEMO_MODE || !HAS_STRIPE
    ? "Demo mode: no payment is collected right now. Explain this if asked."
    : "Payments are collected via Stripe deposit.";

const systemPrompt = `
You are the AI secretary for “Cutz By Casper.” You are warm, efficient, and professional.
Use short sentences. Confirm details. Offer clear choices. Speak like a receptionist.
Example tone: “Of course. What day works best for you? I can do Wednesday at 2:00, 3:15,
or 4:30. Which would you like?”

Hard rules:
- Never guess availability or pricing. Always call tools.
- Always confirm service + date/time + deposit policy before creating checkout.
- Never finalize a booking without explicit confirmation like “Yes, book it.”
- Deposit $20 charged immediately to book.
- Reschedule only 72+ hours before.
- 15+ minutes late = no-show, deposit forfeited.
- For “Before & After Hours Appointments (Text me direct) — $100+”, do NOT book online.
  Provide call/text instructions instead.
Collect: service, preferred day/time, full name, phone (E.164), SMS opt-in.
Offer up to 3 available slots.
Always restate appointment details and policies right before checkout.
${paymentNote}
`.trim();

const safeParseArgs = (raw: string | undefined) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const callOpenAI = async (messages: any[]) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error: ${text}`);
  }
  return response.json();
};

const handleTool = async (name: string, args: any) => {
  const supabase = getSupabaseClient();
  const settings = await fetchSettings();

  switch (name) {
    case "list_services": {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, duration_minutes, price_display, note, price_from")
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) {
        return { error: error.message };
      }
      const services = (data ?? []) as any[];
      return {
        services: services.map((service) => ({
          id: service.id,
          name: service.name,
          duration_minutes: service.duration_minutes,
          price_display: service.price_display,
          note: service.note ?? null,
          price_from: service.price_from ?? false,
          bookable_online: !service.price_from,
        })),
      };
    }
    case "get_available_slots": {
      const { serviceId, dateISO } = args ?? {};
      if (!serviceId || !dateISO) {
        return { error: "Missing serviceId or dateISO" };
      }

      const service = await supabase
        .from("services")
        .select("duration_minutes, price_from")
        .eq("id", serviceId)
        .single();
      if (service.error) {
        return { error: service.error.message };
      }
      const serviceData = service.data as { duration_minutes: number; price_from?: boolean } | null;
      if (!serviceData) {
        return { error: "Service not found" };
      }
      if (serviceData.price_from) {
        return { slots: [] };
      }

      const localStart = DateTime.fromISO(dateISO, {
        zone: settings.time_zone,
      }).startOf("day");
      const localEnd = localStart.endOf("day");
      const dayStartUtc = localStart.toUTC().toISO();
      const dayEndUtc = localEnd.toUTC().toISO();

      const { data: appointments } = await supabase
        .from("appointments")
        .select("start_time_utc, end_time_utc, status, hold_expires_at_utc")
        .lt("start_time_utc", dayEndUtc)
        .gt("end_time_utc", dayStartUtc)
        .in("status", ["booked", "pending_payment"]);

      const { data: blocks } = await supabase
        .from("time_blocks")
        .select("start_time_utc, end_time_utc")
        .lt("start_time_utc", dayEndUtc)
        .gt("end_time_utc", dayStartUtc);

      const nowUtc = DateTime.utc().toISO();
      const appointmentList = (appointments ?? []) as Array<{
        status: string;
        hold_expires_at_utc?: string | null;
        start_time_utc?: string;
        end_time_utc?: string;
      }>;
      const filtered = appointmentList.filter((appt) => {
        if (appt.status !== "pending_payment") return true;
        return appt.hold_expires_at_utc && appt.hold_expires_at_utc > nowUtc;
      });
      const busyAppointments = [...filtered, ...(blocks ?? [])].filter(
        (appt) => appt.start_time_utc && appt.end_time_utc
      ) as Array<{
        start_time_utc: string;
        end_time_utc: string;
        status?: string;
        hold_expires_at_utc?: string | null;
      }>;

      const slots = generateSlots({
        date: dateISO,
        timeZone: settings.time_zone,
        workingHours: settings.working_hours_json as any,
        serviceDurationMinutes: serviceData.duration_minutes,
        bufferMinutes: settings.buffer_minutes,
        appointments: busyAppointments,
      });
      return { slots };
    }
    case "create_checkout": {
      try {
        const result = await createCheckoutSession(args);
        return result;
      } catch (error) {
        return { error: error instanceof Error ? error.message : "Checkout failed." };
      }
    }
    case "get_business_info": {
      return {
        name: BUSINESS_FALLBACK.name,
        address: settings.address ?? BUSINESS_FALLBACK.address,
        phone: settings.phone ?? BUSINESS_FALLBACK.phone,
        phoneE164: BUSINESS_FALLBACK.phoneE164,
        policyText: settings.policy_text ?? BUSINESS_FALLBACK.policyText,
        timeZone: settings.time_zone ?? "America/New_York",
        hours: settings.working_hours_json ?? BUSINESS_FALLBACK.hours,
        rules: {
          deposit: "$20 charged immediately to book",
          reschedule: "Allowed only 72+ hours before",
          late: "15+ minutes late = no-show; deposit forfeited",
        },
      };
    }
    default:
      return { error: "Unknown tool" };
  }
};

export const generateAssistantReply = async (messages: AssistantMessage[]) => {
  let actions: AssistantAction[] = [];
  let replyText = "";
  let conversation: any[] = [...messages];

  for (let i = 0; i < 3; i += 1) {
    const response = await callOpenAI(conversation);
    const message = response.choices?.[0]?.message;
    if (!message) {
      throw new Error("No assistant response");
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      replyText = message.content ?? "";
      break;
    }

    conversation = [
      ...conversation,
      {
        role: "assistant",
        content: message.content ?? "",
        tool_calls: toolCalls,
      },
    ];

    for (const call of toolCalls) {
      const args = safeParseArgs(call.function?.arguments);
      const toolResult = await handleTool(call.function.name, args);
      const checkoutUrl = (toolResult as { checkoutUrl?: string }).checkoutUrl;
      if (call.function.name === "create_checkout" && checkoutUrl) {
        actions.push({
          type: "checkout",
          label: "Open Stripe Checkout",
          url: checkoutUrl,
        });
      }
      conversation.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  if (!replyText) {
    replyText = "I can help with services and availability. What would you like to book?";
  }

  if (!actions.length) {
    const phone = BUSINESS_FALLBACK.phoneE164;
    const lower = replyText.toLowerCase();
    if (lower.includes("text") || lower.includes("call")) {
      actions = [
        { type: "text", label: "Text Casper", url: `sms:${phone}` },
        { type: "call", label: "Call Casper", url: `tel:${phone}` },
      ];
    }
  }

  return { replyText, actions };
};
