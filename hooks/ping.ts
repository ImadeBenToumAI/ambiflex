// The anonymous counts: the URLs the plugin downloads and the week they belong to. Pure; register.tsx sends them.
export const PING_URL = 'https://github.com/ImadeBenToumAI/ambiflex/releases/download/install-ping/installed.txt'

/** The ISO 8601 week of a date, as "2026-W43" (weeks start on Monday; week 1 holds the year's first Thursday). */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = t.getUTCFullYear()
  const n = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)
  return `${y}-W${String(n).padStart(2, '0')}`
}
export const weekUrl = (week: string) => PING_URL.replace('installed.txt', `active-${week}.txt`)
