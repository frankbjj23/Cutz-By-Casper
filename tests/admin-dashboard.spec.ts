import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const dashboard = readFileSync("app/admin/page.tsx", "utf8");

test("admin dashboard no longer renders or queries the dormant booking prototype", () => {
  for (const retired of [
    "Website test appointments",
    "Website test services",
    "Upcoming appointments",
    "upcoming-heading",
    'from("appointments")',
    'from("services")',
    "AppointmentRow",
  ]) {
    expect(dashboard).not.toContain(retired);
  }
});

test("admin dashboard preserves activity, contacts, reviews and the Booksy handoff", () => {
  for (const retained of [
    "<AdminSiteActivity",
    'rpc("get_site_activity", { p_days: activityDays })',
    'from("booking_contacts")',
    "Master contacts",
    "Your combined contact list",
    'from("review_submissions")',
    'from("published_reviews")',
    "Reviews waiting",
    "Approve &amp; Publish",
    "<AdminReviewDeleteForm",
    "Booksy",
    '<Link href="/book"',
    "Check the customer booking page",
  ]) {
    expect(dashboard).toContain(retained);
  }
});

test("admin dashboard still authorizes staff before loading private data", () => {
  expect(dashboard).toContain("await requireBookingStaff()");
  expect(dashboard.indexOf("await requireBookingStaff()")).toBeLessThan(
    dashboard.indexOf("await Promise.all("),
  );
  expect(dashboard).toContain("index: false, follow: false, nocache: true");
});
