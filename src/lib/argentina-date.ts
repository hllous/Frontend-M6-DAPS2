const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

// en-CA formats dates as YYYY-MM-DD.
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ARGENTINA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha (YYYY-MM-DD) de un instante en la zona horaria de Argentina. */
export function todayInArgentina(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/** Día argentino (YYYY-MM-DD) de un timestamp ISO, o null si no es una fecha válida. */
export function argentinaDay(value: string): string | null {
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? null : dayFormatter.format(instant);
}
