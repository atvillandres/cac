/** Ports of libraries helpers f_padleftzero / f_padrightspace / f_padrightzero. */

export function padRightSpace(value: string, width: number): string {
  const s = value ?? "";
  if (s.length >= width) return s.slice(0, width);
  return s + " ".repeat(width - s.length);
}

export function padLeftZero(value: string | number, width: number): string {
  const s = String(value ?? "");
  if (s.length >= width) return s.slice(-width);
  return "0".repeat(width - s.length) + s;
}

export function padRightZero(value: string, width: number): string {
  const s = value ?? "";
  if (s.length >= width) return s.slice(0, width);
  return s + "0".repeat(width - s.length);
}

export function padLeftSpace(value: string, width: number): string {
  const s = value ?? "";
  if (s.length >= width) return s.slice(-width);
  return " ".repeat(width - s.length) + s;
}

/**
 * Legacy LSP amount: STRING(amt,"00000000000000.00") then MID(4,11)+MID(16)
 * → 13-char implied-2 integer (no decimal point).
 */
export function amountToLspImplied13(amount: number): string {
  const formatted = Math.abs(amount).toFixed(2).padStart(17, "0");
  const whole = formatted.slice(3, 14);
  const decimal = formatted.slice(15);
  return padLeftZero(whole + decimal, 13);
}

/** Convert decimal amount to fixed 16-char implied-2-decimal integer string. */
export function amountToImplied2(amount: number, width = 16): string {
  const cents = Math.round(Math.abs(amount) * 100);
  return padLeftZero(String(cents), width);
}

export function formatMmDdYy(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

export function formatMmDdYyyy(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${mm}${dd}${yyyy}`;
}
