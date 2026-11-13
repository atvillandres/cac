/**
 * Port of libraries.pbl `f_filedate`.
 * Filename stem: YY + monthLetter(a–l) + DD + …
 * Example: `26k13FO1` → 2026-11-13
 */
const MONTH_LETTER: Record<string, string> = {
  a: "01",
  b: "02",
  c: "03",
  d: "04",
  e: "05",
  f: "06",
  g: "07",
  h: "08",
  i: "09",
  j: "10",
  k: "11",
  l: "12",
};

export function parseFileDate(filename: string): string {
  const stem = filename.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, "") ?? filename;
  const letter = (stem[2] ?? "").toLowerCase();
  const month = MONTH_LETTER[letter];
  if (!month) return "1901-01-01";
  const yy = stem.slice(0, 2);
  const dd = stem.slice(3, 5);
  return `20${yy}-${month}-${dd}`;
}
