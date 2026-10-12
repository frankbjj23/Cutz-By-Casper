# Booksy contact migration to the website and SQUIRE

## Approved direction

SQUIRE will be the main booking system. The website will retain its own private
master contact list. This supersedes the older custom-booking activation plan;
it does not activate the legacy custom appointment or payment system.

Keep Booksy active until future appointments, working hours, blocked time, prices,
policies, and the new booking flow have been reconciled. Contact migration alone
does not make the appointment calendar ready for cutover. Do not cancel Booksy
or send customer announcements as part of the contact import.

## Contact import completed — October 12, 2026

- The official owner-forwarded Booksy Excel export contained 239 source records.
  Its encrypted original is retained locally outside Git in `.private-migration/`.
- Imported into the existing private master list: 213 Booksy contact entries,
  plus the three unchanged website contacts, for 216 entries total.
- Consolidated 26 duplicate records across 22 groups using exact normalized
  full name plus phone, with a nonempty first and last name. Preserved all 193
  email addresses and 181 distinct phone numbers. Never merge by phone alone,
  name alone, or first name plus phone.
- Seventy entries remain separate with identity-review flags for shared contact
  details or matching names with different details. This is not a claim that all
  216 entries represent distinct people.
- Production batch: `03965231-ba24-458b-aabe-2ca6ff938b6b`. All 239 Booksy IDs
  and original source agreement flags remain linked to their master entries.
- Imported contacts have no expiry, no fabricated website consent, zero website
  handoffs, and no capture events. Source agreement flags do not grant new website
  marketing permission. No invitations or customer notifications were sent.
- New import tables retain active-staff RLS; the importer is a private,
  restricted function run through the administrative database connection. The
  same atomic import supports a rollback dry run and recognizes repeated file
  imports without adding records.
- Local verification: real export import and repeat import inside rollback;
  separate tests for shared phones, future website handoffs, source-history
  preservation, failed-import rollback, anonymous/nonstaff denial, staff reads;
  application lint, typecheck, production build, and 32 browser tests passed.
- SQUIRE is not imported yet. On October 12, human specialist Keylin V was asked
  for the exact template, secure upload channel, Casper-only versus shop-wide
  visibility, owner-approval requirements, and suppression of all notifications.
  Owner contact remains `emmix21379@gmail.com`. Do not upload before these points
  are resolved. Existing SQUIRE client count was verified as zero.
- Keylin V subsequently escalated the request to the migration team and quoted
  up to two business days, with updates by email. No customer file has been sent.
  We requested a case number, confirmation of Casper's email, and an explicit
  hold on actual import until the upload/privacy/notification questions are answered.
- SQUIRE confirmed case **0037902**. Keylin V said the migration team would
  address further questions by email; the visibility, notification, and upload
  requirements have not yet been answered. No import is confirmed or authorized
  to begin until those requirements are resolved.
- Post-import verification confirmed all three original website rows unchanged,
  nonstaff access denied, and Casper's existing active-staff identity able to read
  all 216 master entries and 239 source records. Security advisors reported no new
  contact-table warnings. Existing informational service-only capture-event RLS
  notice remains intentional. Existing Auth warning: [leaked-password protection
  is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection);
  no account-security settings were changed in this contact-import task.
- A live service-role regression check caught the capture RPC's new private-helper
  dependency. The follow-up migration inlines name normalization in that RPC, so
  no schema-access grants are needed. Service-role capture and repeat capture
  passed in a rolled-back production transaction afterward; test contacts were
  not retained. All existing access permissions remain unchanged.

The original three destination rows and methods were backed up locally before
the import. The production import was preceded by a live rollback dry run with
three contacts remaining and no saved import batch. Booksy appointments, account
state, and the public booking destination were not changed.

## Verified starting inventory — October 3, 2026 (America/New_York)

- Booksy business 697614: 237 client records shown. This is not a verified unique
  person count; repeated names exist.
- Website project: Redeemed Booking. Three existing master contacts; all three
  have no expiry. Preserve them and their recorded consent.
- Website contact/method reads require active staff through row-level security.
- SQUIRE: Casper's barber account at The HairHub shows zero clients. No bulk
  import control is visible on its Clients page.
- Booksy export process checked through authenticated support chat. Human agent
  Dawid B confirmed that the registered account owner must email
  `us.dataexport@booksy.com`. The data team sends an encrypted file by email and
  its password by SMS to the phone on the account. No export order has been
  accepted yet, and no file or case number has been received. Confirmation of
  the owner email and turnaround is pending.
- SQUIRE support was asked for a secure import process, Casper-only assignment,
  opt-out handling, deduplication, and no invitations/marketing. At the user's
  direction, the support contact was submitted as Casper, emmix21379@gmail.com.
  Human agent Jemel L joined. Asked for a case and emailed requirements; template,
  shop permissions, client visibility, and case acceptance are still unconfirmed.
  The AI assistant's earlier import claims still need human confirmation.

## File preparation

1. Obtain the official full CSV/Excel export through a secure owner-approved
   channel. Preserve the original file without editing it.
2. Store personal data outside Git and outside public website assets. The local
   `.private-migration/` folder is ignored by Git but is not encrypted storage.
3. Record file SHA-256, export time, row count, and included columns. Never print
   names, phone numbers, or email addresses into routine logs.
4. Preview field mapping and counts before any import. Normalize email case and
   phone formats; do not invent missing fields. Retain Booksy client IDs.
5. Match against the three website contacts and against other source rows. An
   identical name alone is not a match. Shared family email/phone or conflicting
   names require review, not automatic merging.
6. Preserve recorded opt-outs. Missing marketing consent means unknown, not yes.
   Never treat a Booksy contact as having accepted the website contact notice.

## Required website implementation before importing

The current capture endpoint is for new website handoffs only. It requires a
website consent version/date, source `/book`, network fingerprint, and positive
handoff count. **Do not feed imported contacts through that endpoint** or invent
those values to satisfy its constraints.

Add a restricted server-side import path with:

- Source `booksy`, stable external client ID, batch ID, and actual import time.
- Import provenance separate from website consent and network-abuse metadata.
- No automatic expiry for imported records, with deletion still available.
- Zero website handoffs for import-only contacts; accurately labelled admin UI.
- Dry-run counts for new, matched, invalid, ambiguous, and previously imported
  rows. Ambiguous rows must be held for review.
- Transactional writes, repeat-import protection, and a batch audit suitable for
  reconciliation. Preserve existing contact methods and consent records.
- Active owner/administrator authorization and existing RLS; no public import API
  or client-side privileged keys. No new marketing permissions.

Verify against a test dataset first: repeated import, shared phone with different
names, crossed email/phone matches, malformed fields, missing methods, and denied
anonymous/non-staff access. Back up existing destination contacts before a live
write, then verify counts and samples after importing.

## Required SQUIRE confirmation before uploading

Ask a human import specialist for the exact template and secure upload channel,
whether The HairHub owner must approve, and whether imported clients are private
to Casper or visible shop-wide. Stop for approval if access would expand.
Confirm that invitations/marketing are suppressed and opt-outs are preserved.
Do not assume the AI assistant's statements establish these settings.

Keep a source-to-destination reconciliation report. Reconcile the same approved
contact set in the website and SQUIRE; retain unresolved rows for review. Do not
claim 237 unique imported contacts merely because Booksy displayed 237 records.

## Cutover gate (separate from contact import)

Export and reconcile future appointments, service mapping, durations, existing
deposits, hours, time off, and reminder ownership. Reconcile any changes made in
Booksy after the first export. Test SQUIRE booking, reschedule, and cancellation.
Only then switch the website to Casper's verified SQUIRE booking flow. Preserve
required Booksy historical/accounting records before an approved shutdown.
