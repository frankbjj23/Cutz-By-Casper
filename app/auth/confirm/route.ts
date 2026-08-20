import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  // Never spend a one-time authentication token during a GET request. Email
  // security scanners routinely open links before the recipient can use them.
  // Owner access is verified by a code the recipient types into the site.
  return NextResponse.redirect(new URL("/admin/owner-access", requestUrl));
}
