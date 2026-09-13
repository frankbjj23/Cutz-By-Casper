// Only accept Google review-composer links, never a generic search or another
// website. Leave the configuration empty until Casper's listing is verified.
export function normalizeGoogleReviewUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) {
      return null;
    }

    if (
      url.hostname === "g.page" &&
      /^\/(?:r\/)?[A-Za-z0-9_-]+\/review\/?$/.test(url.pathname)
    ) {
      return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
    }

    if (
      url.hostname === "search.google.com" &&
      url.pathname === "/local/writereview"
    ) {
      const placeId = url.searchParams.get("placeid");
      if (!placeId || !/^[A-Za-z0-9_-]+$/.test(placeId)) return null;
      return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
    }
  } catch {
    return null;
  }

  return null;
}
