import { z } from "zod";

export const checkoutSchema = z.object({
  serviceId: z.string().uuid(),
  startTimeLocalISO: z.string().min(10),
  fullName: z.string().min(2),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/),
  smsOptIn: z.boolean(),
});

export const rescheduleSchema = z.object({
  startTimeLocalISO: z.string().min(10),
});

export const statusSchema = z.object({
  status: z.enum(["completed", "cancelled", "no_show"]),
});

export const serviceSchema = z.object({
  name: z.string().min(2),
  duration_minutes: z.number().min(15),
  price_display: z.string().min(1),
  deposit_amount: z.number().min(0),
  active: z.boolean(),
});

export const settingsSchema = z.object({
  id: z.string().uuid().optional(),
  time_zone: z.string().min(1),
  buffer_minutes: z.number().min(0),
  working_hours_json: z.record(z.array(z.object({ start: z.string(), end: z.string() }))),
});
