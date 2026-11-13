/**
 * Port of libraries.pbl `f_miscfiledate`.
 * Stem: C + MM + DD + … → 200C-MM-DD
 * Example: `61113BPY` → 2006-11-13
 */
export function parseMiscFileDate(filename: string): string {
  const stem = filename.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? filename;
  if (stem.length < 5) return "1901-01-01";
  const centuryDigit = stem[0]!;
  const mm = stem.slice(1, 3);
  const dd = stem.slice(3, 5);
  const yyyy = `200${centuryDigit}`;
  const iso = `${yyyy}-${mm}-${dd}`;
  const dt = new Date(iso + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return "1901-01-01";
  if (String(dt.getMonth() + 1).padStart(2, "0") !== mm) return "1901-01-01";
  if (String(dt.getDate()).padStart(2, "0") !== dd) return "1901-01-01";
  return iso;
}
