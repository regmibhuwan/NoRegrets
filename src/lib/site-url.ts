/**
 * Base URL for auth email links (must match Supabase → Auth → URL Configuration).
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://yourdomain.com) so reset and
 * confirmation links never point at localhost.
 */
export function getPublicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    return raw.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}
