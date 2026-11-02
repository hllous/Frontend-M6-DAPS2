type IndicatorNumberOptions = {
  maximumFractionDigits?: 0 | 1;
  signDisplay?: Intl.NumberFormatOptions["signDisplay"];
};

const formatters = new Map<string, Intl.NumberFormat>();

export function formatIndicatorNumber(value: number, options: IndicatorNumberOptions = {}) {
  const maximumFractionDigits = options.maximumFractionDigits ?? 0;
  const signDisplay = options.signDisplay ?? "auto";
  const key = `${maximumFractionDigits}:${signDisplay}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits, signDisplay });
    formatters.set(key, formatter);
  }
  return formatter.format(value);
}
