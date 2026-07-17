// מעקב אחרי פוסטים שכבר נשלחו כדי שאותה דירה לא תישלח פעמיים.
// הערה: מסננים לפי כלל הפוסטים שנסרקו (לא רק שנשלחו) — פוסט שסווג
// כלא-רלוונטי לא ייבדק שוב בריצה הבאה, וזה גם חוסך קריאות סיווג.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { paths } from './util/config.js';

function loadSeen() {
  if (!existsSync(paths.seen)) return {};
  try {
    return JSON.parse(readFileSync(paths.seen, 'utf8'));
  } catch {
    return {};
  }
}

export function filterUnseen(posts) {
  const seen = loadSeen();
  return posts.filter((p) => !seen[p.id]);
}

// נקרא אחרי ריצה מוצלחת: רושם את כל הפוסטים שנבדקו (רלוונטיים ושלא),
// ומגזם רשומות בנות יותר מ-30 יום כדי שהקובץ לא יתנפח.
export function commitSeen(posts) {
  const seen = loadSeen();
  const now = new Date().toISOString();
  for (const p of posts) {
    seen[p.id] = { sentAt: now, relevant: !!p.relevant };
  }
  const cutoff = Date.now() - 30 * 86400_000;
  for (const [id, rec] of Object.entries(seen)) {
    if (new Date(rec.sentAt).getTime() < cutoff) delete seen[id];
  }
  writeFileSync(paths.seen, JSON.stringify(seen, null, 2));
}
