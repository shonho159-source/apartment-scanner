// ארכיון מתגלגל של כל הפוסטים שנסרקו (data/history.jsonl) — לדיבוג וכיול הסיווג.
// אובייקט JSON אחד לשורה.

import { appendFileSync } from 'node:fs';
import { paths } from './config.js';

export function appendHistory(rows) {
  if (!rows.length) return;
  const at = new Date().toISOString();
  const lines = rows.map((r) => JSON.stringify({ ...r, scrapedAt: at })).join('\n') + '\n';
  appendFileSync(paths.history, lines);
}
