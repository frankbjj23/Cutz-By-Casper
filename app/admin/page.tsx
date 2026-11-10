import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  approveReviewSubmission,
  rejectReviewSubmission,
  setPublishedReviewVisibility,
  signOutBookingStaff,
} from "@/app/admin/actions";
import AdminReviewDeleteForm from "@/components/AdminReviewDeleteForm";
import AdminSiteActivity from "@/components/AdminSiteActivity";
import { activityRange, type SiteActivity } from "@/lib/site-activity";
import { requireBookingStaff } from "@/lib/server/booking-auth";
import { createBookingServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Private Business Dashboard",
  robots: { index: false, follow: false, nocache: true },
};

type BookingContactRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  first_seen_at: string;
  last_seen_at: string;
  handoff_count: number;
  expires_at: string | null;
  origin: "website" | "booksy";
  needs_identity_review: boolean;
  alternate_names: string[];
  booking_contact_methods: Array<{
    kind: "email" | "phone";
    value: string;
  }>;
};

type ReviewSubmissionRow = {
  id: string;
  display_name: string;
  email: string;
  rating: number;
  review_text: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  moderated_at: string | null;
  published_review_id: string | null;
};

type PublishedReviewRow = {
  id: string;
  source: "booksy" | "website";
  display_name: string;
  rating: number;
  review_text: string;
  active: boolean;
};

function formatContactDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

type AdminPageProps = {
  searchParams: Promise<{ review?: string; reviewPage?: string; activityDays?: string }>;
};

const REVIEW_HISTORY_PAGE_SIZE = 50;

function readPositivePage(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

const reviewNotices: Record<string, string> = {
  approved: "The review is now approved and public.",
  rejected: "The review was rejected and remains private.",
  deleted: "The private review record and any linked website review were deleted.",
  "visibility-updated": "The public review visibility was updated.",
  invalid: "That review request was invalid.",
  "approve-error": "The review could not be approved.",
  "reject-error": "The review could not be rejected.",
  "delete-error": "The review could not be deleted.",
  "visibility-error": "The review visibility could not be updated.",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const query = await searchParams;
  const activityDays = activityRange(query.activityDays);
  const reviewHistoryPage = readPositivePage(query.reviewPage);
  const reviewHistoryFrom = (reviewHistoryPage - 1) * REVIEW_HISTORY_PAGE_SIZE;
  const reviewHistoryTo = reviewHistoryFrom + REVIEW_HISTORY_PAGE_SIZE - 1;
  const staff = await requireBookingStaff();
  const supabase = await createBookingServerClient();

  const now = new Date().toISOString();
  const [
    { data: bookingContacts, error: bookingContactError, count: bookingContactCount },
    {
      data: pendingReviewSubmissions,
      error: reviewSubmissionError,
      count: pendingReviewCount,
    },
    {
      data: resolvedReviewSubmissions,
      error: reviewHistoryError,
      count: reviewHistoryCount,
    },
    { data: publishedReviews, error: publishedReviewError },
    { data: activity, error: activityError },
  ] =
    await Promise.all([
      supabase!
        .from("booking_contacts")
        .select(
          "id, full_name, alternate_names, email, phone_e164, first_seen_at, last_seen_at, handoff_count, expires_at, origin, needs_identity_review, booking_contact_methods(kind, value)",
          { count: "exact" },
        )
        .order("last_seen_at", { ascending: false })
        .limit(500),
      supabase!
        .from("review_submissions")
        .select(
          "id, display_name, email, rating, review_text, status, created_at, moderated_at, published_review_id",
          { count: "exact" },
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(250),
      supabase!
        .from("review_submissions")
        .select(
          "id, display_name, email, rating, review_text, status, created_at, moderated_at, published_review_id",
          { count: "exact" },
        )
        .neq("status", "pending")
        .order("created_at", { ascending: false })
        .range(reviewHistoryFrom, reviewHistoryTo),
      supabase!
        .from("published_reviews")
        .select("id, source, display_name, rating, review_text, active")
        .order("display_order", { ascending: true })
        .limit(100),
      supabase!.rpc("get_site_activity", { p_days: activityDays }),
    ]);

  if (activityError) console.error("admin.activity_unavailable", { code: activityError.code });

  const contactRows = (bookingContacts ?? []) as BookingContactRow[];
  const pendingReviewRows = (pendingReviewSubmissions ?? []) as ReviewSubmissionRow[];
  const resolvedReviewRows = (resolvedReviewSubmissions ?? []) as ReviewSubmissionRow[];
  const reviewHistoryTotalPages = Math.max(
    1,
    Math.ceil((reviewHistoryCount ?? resolvedReviewRows.length) / REVIEW_HISTORY_PAGE_SIZE),
  );
  if (!reviewHistoryError && reviewHistoryPage > reviewHistoryTotalPages) {
    const redirectParams = new URLSearchParams({
      reviewPage: String(reviewHistoryTotalPages),
    });
    if (query.review) redirectParams.set("review", query.review);
    redirect(`/admin?${redirectParams.toString()}#review-history`);
  }
  const publicReviewRows = (publishedReviews ?? []) as PublishedReviewRow[];
  const reviewNotice = query.review ? reviewNotices[query.review] : null;

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
      <div className="flex flex-col gap-6 border-b border-gold/25 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Private administration</p>
          <h1 className="mt-4 font-display text-4xl text-pearl sm:text-6xl">
            Business dashboard
          </h1>
          <p className="mt-4 text-sm text-pearl/60">
            Signed in as {staff.email ?? "approved staff"} · {staff.role}
          </p>
        </div>
        <form action={signOutBookingStaff}>
          <button
            type="submit"
            className="border border-pearl/25 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-pearl transition hover:border-gold hover:text-gold"
          >
            Sign out
          </button>
        </form>
      </div>

      <AdminSiteActivity activity={activityError ? null : activity as SiteActivity | null} days={activityDays} updatedAt={now} />

      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Business summary">
        <div className="lux-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Master contacts</p>
          <p className="mt-3 font-display text-4xl text-gold">
            {bookingContactError ? "—" : (bookingContactCount ?? contactRows.length)}
          </p>
        </div>
        <div className="lux-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Reviews waiting</p>
          <p className="mt-3 font-display text-4xl text-gold">
            {reviewSubmissionError
              ? "—"
              : (pendingReviewCount ?? pendingReviewRows.length)}
          </p>
        </div>
        <div className="lux-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-pearl/55">Booking provider</p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-pearl">
            Booksy
          </p>
          <Link href="/book" className="mt-3 inline-block text-xs text-gold underline underline-offset-4">Check the customer booking page</Link>
        </div>
      </section>

      <p className="mt-3 text-xs leading-6 text-pearl/55">
        New appointments and availability are managed in Booksy. This dashboard manages website visits, contacts, and reviews.
      </p>

      <section
        id="review-moderation"
        className="mt-8 scroll-mt-24 border border-gold/25 bg-[#111113] p-5 sm:p-8"
        aria-labelledby="review-moderation-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Review manager</p>
            <h2 id="review-moderation-heading" className="mt-4 font-display text-3xl text-pearl">
              Approve before it appears
            </h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-pearl/50">
            Visitor email stays private. Approval publishes only the display name, rating,
            and review text with a Redeemed website review label.
          </p>
        </div>

        {reviewNotice ? (
          <p
            role="status"
            className={`mt-6 border p-4 text-sm ${
              query.review?.includes("error") || query.review === "invalid"
                ? "border-red-300/40 bg-red-950/30 text-red-100"
                : "border-gold/30 bg-gold/5 text-pearl/75"
            }`}
          >
            {reviewNotice}
          </p>
        ) : null}

        {reviewSubmissionError ? (
          <p role="alert" className="mt-6 border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100">
            The private review inbox could not be loaded.
          </p>
        ) : pendingReviewRows.length === 0 ? (
          <p className="mt-8 text-sm leading-7 text-pearl/60">
            No reviews are waiting for approval.
          </p>
        ) : (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {pendingReviewRows.map((review) => (
              <article key={review.id} className="border border-white/10 bg-black/20 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-pearl">{review.display_name}</p>
                    <p className="mt-1 break-all text-xs text-pearl/55">{review.email}</p>
                  </div>
                  <p aria-label={`${review.rating} out of 5 stars`} className="tracking-[0.2em] text-gold">
                    {"★".repeat(review.rating)}
                  </p>
                </div>
                <blockquote className="mt-5 text-sm leading-7 text-pearl/75">
                  “{review.review_text}”
                </blockquote>
                <p className="mt-4 text-xs text-pearl/55">
                  Sent {formatContactDate(review.created_at)}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <form action={approveReviewSubmission}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button
                      type="submit"
                      aria-label={`Approve and publish review by ${review.display_name}`}
                      className="primary-button"
                    >
                      Approve &amp; Publish
                    </button>
                  </form>
                  <form action={rejectReviewSubmission}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button
                      type="submit"
                      aria-label={`Reject review by ${review.display_name}`}
                      className="secondary-button"
                    >
                      Reject
                    </button>
                  </form>
                  <AdminReviewDeleteForm
                    displayName={review.display_name}
                    reviewId={review.id}
                    hasPublishedReview={Boolean(review.published_review_id)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}

        <div id="review-history" className="mt-10 scroll-mt-24 border-t border-white/10 pt-8">
          <h3 className="font-display text-2xl text-pearl">Submission history</h3>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-pearl/50">
            Approved and rejected submissions stay private here until an administrator
            permanently deletes them. Deleting an approved submission also removes its
            linked website review, but can never remove a Booksy highlight.
          </p>
          {reviewHistoryError ? (
            <p role="alert" className="mt-5 text-sm text-red-100">
              The review history could not be loaded.
            </p>
          ) : resolvedReviewRows.length === 0 ? (
            <p className="mt-5 text-sm text-pearl/55">No moderated website reviews yet.</p>
          ) : (
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {resolvedReviewRows.map((review) => (
                <article
                  key={review.id}
                  className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-pearl">{review.display_name}</p>
                      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-gold">
                        {review.status}
                      </span>
                      <span aria-label={`${review.rating} out of 5 stars`} className="text-gold">
                        {"★".repeat(review.rating)}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-pearl/55">{review.email}</p>
                    <p className="mt-3 text-sm leading-6 text-pearl/65">
                      “{review.review_text}”
                    </p>
                    <p className="mt-2 text-xs text-pearl/55">
                      Sent {formatContactDate(review.created_at)}
                      {review.moderated_at
                        ? ` · Moderated ${formatContactDate(review.moderated_at)}`
                        : ""}
                    </p>
                  </div>
                  <AdminReviewDeleteForm
                    displayName={review.display_name}
                    reviewId={review.id}
                    hasPublishedReview={Boolean(review.published_review_id)}
                  />
                </article>
              ))}
            </div>
          )}
          {!reviewHistoryError && reviewHistoryTotalPages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-between gap-4"
              aria-label="Review history pages"
            >
              {reviewHistoryPage > 1 ? (
                <Link
                  href={`/admin?reviewPage=${reviewHistoryPage - 1}#review-history`}
                  className="secondary-button"
                >
                  Newer reviews
                </Link>
              ) : (
                <span />
              )}
              <p className="text-xs uppercase tracking-[0.16em] text-pearl/50">
                Page {Math.min(reviewHistoryPage, reviewHistoryTotalPages)} of{" "}
                {reviewHistoryTotalPages}
              </p>
              {reviewHistoryPage < reviewHistoryTotalPages ? (
                <Link
                  href={`/admin?reviewPage=${reviewHistoryPage + 1}#review-history`}
                  className="secondary-button"
                >
                  Older reviews
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </div>

        <div className="mt-10 border-t border-white/10 pt-8">
          <h3 className="font-display text-2xl text-pearl">Published highlights</h3>
          {publishedReviewError ? (
            <p role="alert" className="mt-5 text-sm text-red-100">
              Published reviews could not be loaded.
            </p>
          ) : publicReviewRows.length === 0 ? (
            <p className="mt-5 text-sm text-pearl/55">No reviews are published yet.</p>
          ) : (
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {publicReviewRows.map((review) => (
                <article key={review.id} className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <p className="font-semibold text-pearl">
                      {review.display_name}
                      <span className="ml-3 text-[0.62rem] uppercase tracking-[0.16em] text-gold">
                        {review.source === "booksy" ? "Booksy" : "Website"}
                      </span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-pearl/60">“{review.review_text}”</p>
                  </div>
                  <form action={setPublishedReviewVisibility}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="active" value={review.active ? "false" : "true"} />
                    <button
                      type="submit"
                      aria-label={`${review.active ? "Hide" : "Show"} review by ${review.display_name}`}
                      className="secondary-button min-w-28"
                    >
                      {review.active ? "Hide" : "Show"}
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 border border-gold/25 bg-[#111113] p-5 sm:p-8" aria-labelledby="contacts-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Master contact sheet</p>
            <h2 id="contacts-heading" className="mt-4 font-display text-3xl text-pearl">
              Your combined contact list
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-5 text-pearl/50">
            Website contacts and imported Booksy clients. The approved cleanup combines entries sharing an email or phone number, keeping all names and contact details. A shared entry may include family members. These are not confirmed appointments.
          </p>
        </div>

        {bookingContactError ? (
          <p role="alert" className="mt-6 border border-red-300/40 bg-red-950/30 p-4 text-sm text-red-100">
            The master contact sheet could not be loaded.
          </p>
        ) : contactRows.length === 0 ? (
          <p className="mt-8 text-sm leading-7 text-pearl/60">
            No contacts have been saved or imported yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto border border-pearl/10">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Private master contact sheet with website contacts and imported Booksy clients
              </caption>
              <thead className="bg-black/35 text-[0.65rem] uppercase tracking-[0.16em] text-pearl/55">
                <tr>
                  <th scope="col" className="px-4 py-4 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Source</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Phone</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-4 font-semibold">First saved</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Last handoff</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold">Handoffs</th>
                  <th scope="col" className="px-4 py-4 font-semibold">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl/10">
                {contactRows.map((contact) => {
                  const phones = contact.booking_contact_methods
                    .filter((method) => method.kind === "phone")
                    .map((method) => method.value);
                  const emails = contact.booking_contact_methods
                    .filter((method) => method.kind === "email")
                    .map((method) => method.value);

                  if (phones.length === 0 && contact.phone_e164) phones.push(contact.phone_e164);
                  if (emails.length === 0 && contact.email) emails.push(contact.email);

                  return (
                    <tr key={contact.id} className="align-top text-pearl/70">
                      <th scope="row" className="px-4 py-5 font-semibold text-pearl">
                        {contact.full_name}
                        {contact.alternate_names.length > 0 && (
                          <p className="mt-2 max-w-56 text-xs font-normal leading-5 text-pearl/60">
                            Also listed as: {contact.alternate_names.join("; ")}
                          </p>
                        )}
                        {contact.needs_identity_review && (
                          <p className="mt-2 max-w-48 text-xs font-normal leading-5 text-gold">
                            Review remaining details — no confirmed email or phone match
                          </p>
                        )}
                      </th>
                      <td className="whitespace-nowrap px-4 py-5 text-xs text-pearl/60">
                        {contact.origin === "booksy" ? "Booksy import" : "Website"}
                      </td>
                      <td className="space-y-1 px-4 py-5">
                        {phones.map((phone) => <p key={phone}>{phone}</p>)}
                      </td>
                      <td className="space-y-1 px-4 py-5">
                        {emails.map((email) => <p key={email} className="break-all">{email}</p>)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-5">
                        {formatContactDate(contact.first_seen_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-5">
                        {contact.handoff_count > 0 ? formatContactDate(contact.last_seen_at) : "No website handoff"}
                      </td>
                      <td className="px-4 py-5 text-center font-semibold text-gold">
                        {contact.handoff_count}
                      </td>
                      <td className="px-4 py-5 text-xs leading-5 text-pearl/50">
                        {contact.expires_at
                          ? `Legacy notice: expires ${formatContactDate(contact.expires_at)}`
                          : "Kept until deleted"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </main>
  );
}
