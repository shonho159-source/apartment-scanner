// חלון סריקה אדפטיבי: במקום חלון קבוע (שמייצר חיוב כפול על חפיפות או חורים
// כשה-cron מתעכב), נזכר מתי הריצה המוצלחת האחרונה וסורקים בדיוק מאז + באפר.
// המצב נשמר ב-data/last-run.json (מגיע עם ה-cache של Actions בין ריצות).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { paths, groupsConfig } from './config.js';

export function windowHoursSinceLastRun() {
  const run = groupsConfig.run || {};
  const fallback = run.fallbackWindowHours ?? 17;
  const buffer = run.windowBufferHours ?? 2;
  const max = run.maxWindowHours ?? 26;
  if (!existsSync(paths.lastRun)) return fallback;
  try {
    const { at } = JSON.parse(readFileSync(paths.lastRun, 'utf8'));
    const hours = (Date.now() - new Date(at).getTime()) / 3600_000;
    if (!Number.isFinite(hours) || hours <= 0) return fallback;
    return Math.min(max, Math.ceil(hours + buffer));
  } catch {
    return fallback;
  }
}

export function commitLastRun() {
  writeFileSync(paths.lastRun, JSON.stringify({ at: new Date().toISOString() }, null, 2));
}
