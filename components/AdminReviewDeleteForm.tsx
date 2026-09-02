"use client";

import { deleteReviewSubmission } from "@/app/admin/actions";

type AdminReviewDeleteFormProps = {
  displayName: string;
  hasPublishedReview: boolean;
  reviewId: string;
};

export default function AdminReviewDeleteForm({
  displayName,
  hasPublishedReview,
  reviewId,
}: AdminReviewDeleteFormProps) {
  return (
    <form
      action={deleteReviewSubmission}
      onSubmit={(event) => {
        const impact = hasPublishedReview
          ? "This will also remove the linked website review from the public page."
          : "This private submission cannot be recovered.";
        if (!window.confirm(`Permanently delete this review? ${impact}`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <button
        type="submit"
        aria-label={`Permanently delete review by ${displayName}`}
        className="border border-red-300/35 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-red-100 transition hover:border-red-200"
      >
        Delete permanently
      </button>
    </form>
  );
}
