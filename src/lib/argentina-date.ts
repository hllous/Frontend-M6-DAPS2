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

// Una fecha de calendario no tiene hora: se formatea en UTC para que no corra de día.
const calendarDayLabelFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" });
const dateTimeLabelFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ARGENTINA_TIME_ZONE,
});

/**
 * "7 dic 2026" para una fecha de calendario: acepta YYYY-MM-DD o el ISO a medianoche
 * UTC con el que el backend serializa un `@db.Date`. Si no es una fecha, la devuelve tal cual.
 */
export function formatCalendarDay(value: string): string {
  const day = value.slice(0, 10);
  const date = new Date(`${day}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(date.getTime()) ? calendarDayLabelFormatter.format(date) : value;
}

/** "22 sept 2026, 10:43 a. m." en hora argentina. Si no es una fecha, la devuelve tal cual. */
export function formatArgentinaDateTime(value: string): string {
  const instant = new Date(value);
  return Number.isNaN(instant.getTime()) ? value : dateTimeLabelFormatter.format(instant);
}
