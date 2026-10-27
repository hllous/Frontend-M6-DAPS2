const MOBILE_BREAKPOINT_TOKEN = "--services-mobile-breakpoint";
const MOBILE_BREAKPOINT_FALLBACK = 760;

export function servicesMobileBreakpoint() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return MOBILE_BREAKPOINT_FALLBACK;
  }

  const value = Number.parseFloat(
    window.getComputedStyle(document.documentElement)
      .getPropertyValue(MOBILE_BREAKPOINT_TOKEN),
  );
  return Number.isFinite(value) ? value : MOBILE_BREAKPOINT_FALLBACK;
}
