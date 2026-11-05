import Link from "next/link";
import AdminActivityRefresh from "@/components/AdminActivityRefresh";
import type { SiteActivity } from "@/lib/site-activity";

const number = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US");
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", month: "short", day: "numeric",
}).format(new Date(`${value}T12:00:00Z`));

export default function AdminSiteActivity({ activity, days, updatedAt }: {
  activity: SiteActivity | null; days: number; updatedAt: string;
}) {
  const today = activity?.days[0];
  const totalVisits = activity?.days.reduce((sum, day) => sum + (day.visits ?? 0), 0) ?? 0;
  const totalSignups = activity?.days.reduce((sum, day) => sum + day.new_contacts, 0) ?? 0;
  const started = activity ? new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(activity.tracking_started_at)) : null;

  return <section id="site-activity" aria-labelledby="activity-heading"
    className="mt-8 scroll-mt-24 border border-gold/35 bg-[#111113] p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div>
        <p className="eyebrow">Website activity</p>
        <h2 id="activity-heading" className="mt-4 font-display text-3xl text-pearl sm:text-4xl">Daily visits &amp; signups</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-pearl/60">
          See how visitors use the site—not who has completed a SQUIRE booking. All days use New Jersey time.
        </p>
      </div>
      <AdminActivityRefresh />
    </div>
    <nav aria-label="Activity date range" className="mt-6 flex flex-wrap gap-2">
      {[7, 30, 90].map((range) => <Link key={range} href={`/admin?activityDays=${range}#site-activity`}
        aria-current={range === days ? "page" : undefined}
        className={`border px-4 py-2 text-xs font-semibold ${range === days ? "border-gold bg-gold text-ink" : "border-pearl/20 text-pearl/70 hover:border-gold"}`}>
        {range} days
      </Link>)}
    </nav>
    {!activity || !today ? <p role="alert" className="mt-6 border border-red-300/30 p-4 text-sm text-red-100">
      Activity is temporarily unavailable. This is not a zero-traffic report. Your contacts and booking link are unaffected.
    </p> : <>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Visits today", value: today.visits, detail: "Anonymous browser-tab sessions" },
          { label: "New contacts today", value: today.new_contacts, detail: "Website signups, not imported clients" },
          { label: "Booking visits today", value: today.booking_visits, detail: "Visits to /book, not appointments" },
          { label: `${days}-day visits`, value: totalVisits, detail: `${totalSignups} new website contacts in this period` },
        ].map((card) => <div key={card.label} className="border border-white/10 bg-black/20 p-4 sm:p-5">
          <p className="text-[0.65rem] uppercase tracking-[0.13em] text-pearl/65">{card.label}</p>
          <p className="mt-3 font-display text-4xl text-gold">{number(card.value)}</p>
          <p className="mt-2 text-xs leading-5 text-pearl/55">{card.detail}</p>
        </div>)}
      </div>
      <p className="mt-5 text-xs leading-6 text-pearl/65">
        Traffic tracking started {started} Eastern. Earlier traffic is unavailable (—), not zero.
        The first day is partial. Contact signup history comes from the saved master list.
      </p>
      <div tabIndex={0} role="region" aria-label="Scrollable daily website activity" className="mt-5 max-h-96 overflow-auto border border-white/10 focus:outline-gold">
        <table className="w-full min-w-[540px] text-left text-sm">
          <caption className="sr-only">Daily website visits and new contacts for the last {days} days, Eastern time</caption>
          <thead className="sticky top-0 bg-[#19191b] text-xs text-pearl/65"><tr>
            <th scope="col" className="p-4">Day</th><th scope="col" className="p-4 text-right">Visits</th>
            <th scope="col" className="p-4 text-right">Page visits</th><th scope="col" className="p-4 text-right">Booking visits</th>
            <th scope="col" className="p-4 text-right">New contacts</th>
          </tr></thead>
          <tbody className="divide-y divide-white/10 text-pearl/80">{activity.days.map((day, index) => <tr key={day.day}>
            <th scope="row" className="whitespace-nowrap p-4 font-medium">{index === 0 ? "Today" : dateLabel(day.day)}</th>
            <td className="p-4 text-right tabular-nums">{number(day.visits)}</td>
            <td className="p-4 text-right tabular-nums">{number(day.page_visits)}</td>
            <td className="p-4 text-right tabular-nums">{number(day.booking_visits)}</td>
            <td className="p-4 text-right tabular-nums text-gold">{number(day.new_contacts)}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <details className="mt-5 text-xs leading-6 text-pearl/60">
        <summary className="cursor-pointer font-semibold text-pearl/85">How these numbers work</summary>
        <p className="mt-3">A visit is one browser-tab session, restarting after 30 minutes without a tracked page load or a new Eastern day.
          Each public page counts once per visit, so reloading a page does not inflate the total. These are estimates, not identified people.
          Admin and preview pages, known bots, and browsers requesting Do Not Track or Global Privacy Control are excluded; blockers may reduce counts.</p>
        <p className="mt-3">Signups mean new website-only master contacts, not login accounts. Imported contacts and repeat submissions do not count again.
          Merging or deleting a master contact may adjust its historical count. There are {number(activity.total_contacts)} saved contacts:
          {" "}{number(activity.imported_contacts)} linked to imports and {number(activity.website_contacts)} website-only contacts.
          Nothing here confirms an appointment or links an anonymous visit to a person.</p>
        <Link href="#contacts-heading" className="mt-3 inline-block text-gold underline underline-offset-4">View the master contact sheet</Link>
      </details>
      <p className="mt-4 text-xs text-pearl/45">Updated {new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeStyle: "short" }).format(new Date(updatedAt))} Eastern. Use Refresh activity for the latest counts.</p>
    </>}
  </section>;
}
