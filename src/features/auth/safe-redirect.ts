export function getSafeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  return value && /^\/[^/]/.test(value) ? value : fallback;
}
