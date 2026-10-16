const KEY = "neon-overdrive-v1";
const defaults = () => ({
  version: 1,
  best: 0,
  runs: [],
  settings: { muted: false, reduced: false },
});
const finite = (n) => Number.isSafeInteger(n) && n >= 0;
const validDate = (value) => {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
};
export function load(db) {
  try {
    db ??= globalThis.localStorage;
    const d = JSON.parse(db?.getItem(KEY) || "null");
    if (!d || d.version !== 1) return defaults();
    return {
      version: 1,
      best: finite(d.best) ? d.best : 0,
      runs: Array.isArray(d.runs)
        ? d.runs
            .filter(
              (r) =>
                r &&
                finite(r.score) &&
                finite(r.time) &&
                finite(r.sector) &&
                r.sector >= 1 &&
                r.sector <= 5 &&
                (r.status === "won" || r.status === "lost") &&
                validDate(r.date),
            )
            .slice(0, 20)
        : [],
      settings: {
        muted: d.settings?.muted === true,
        reduced: d.settings?.reduced === true,
      },
    };
  } catch {
    return defaults();
  }
}
export function save(data, db) {
  try {
    db ??= globalThis.localStorage;
    if (!db) return false;
    db.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function record(data, s, db) {
  const result = {
    ...data,
    best: Math.max(data.best, s.score),
    runs: [
      {
        score: s.score,
        sector: s.sector,
        time: Math.round(s.time),
        status: s.status,
        date: new Date().toISOString(),
        combo: s.maxCombo || 0,
      },
      ...data.runs,
    ].slice(0, 20),
  };
  save(result, db);
  return result;
}
