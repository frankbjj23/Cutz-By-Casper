import { DateTime } from "luxon";
import { supabaseAdmin } from "../lib/supabase/admin";

const main = async () => {
  const supabase = supabaseAdmin;
  const now = DateTime.utc().toISO();

  const { error } = await supabase
    .from("appointments")
    .update({ status: "expired" })
    .eq("status", "pending_payment")
    .lt("hold_expires_at_utc", now);

  if (error) {
    console.error("Failed to expire holds", error.message);
    process.exit(1);
  }

  console.log("Expired pending holds if any.");
};

main();
