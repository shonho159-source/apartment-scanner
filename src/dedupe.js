// מניעת כפילויות בשתי רמות:
// 1. מזהה פוסט — אותו פוסט בדיוק לא נבדק פעמיים.
// 2. טביעת אצבע של הטקסט — אותה מודעה שהודבקה בכמה קבוצות (id שונה, טקסט זהה)
//    נבדקת ונשלחת פעם אחת בלבד.
// הערה: מסננים לפי כלל הפוסטים שנסרקו (לא רק שנשלחו) — פוסט שסווג
// כלא-רלוונטי לא ייבדק שוב, וזה גם חוסך קריאות סיווג.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { paths } from './util/config.js';

export function fingerprint(text) {
  const norm = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').slice(0, 400);
  return createHash('sha1').update(norm).digest('hex');
}

function loadSeen() {
  if (!existsSync(paths.seen)) return { posts: {}, fingerprints: {} };
  try {
    const raw = JSON.parse(readFileSync(paths.seen, 'utf8'));
    // מיגרציה מהמבנה הישן (מפה שטוחה של post-id → רשומה)
    if (!raw.posts) return { posts: raw, fingerprints: {} };
    return { posts: raw.posts, fingerprints: raw.fingerprints ?? {} };
  } catch {
    return { posts: {}, fingerprints: {} };
  }
}

// מחזיר רק פוסטים חדשים באמת: לא נראו לפי id, לא נראו לפי טקסט,
// וגם בתוך הריצה עצמה — עותק אחד לכל טקסט.
export function filterUnseen(posts) {
  const seen = loadSeen();
  const inRun = new Set();
  const fresh = [];
  for (const p of posts) {
    const fp = fingerprint(p.text);
    if (seen.posts[p.id] || seen.fingerprints[fp] || inRun.has(fp)) continue;
    inRun.add(fp);
    fresh.push({ ...p, _fp: fp });
  }
  return fresh;
}

// נקרא אחרי ריצה מוצלחת: רושם id + טביעת אצבע לכל הפוסטים שנבדקו,
// ומגזם רשומות בנות יותר מ-30 יום כדי שהקובץ לא יתנפח.
export function commitSeen(posts) {
  const seen = loadSeen();
  const now = new Date().toISOString();
  for (const p of posts) {
    seen.posts[p.id] = { sentAt: now, relevant: !!p.relevant };
    seen.fingerprints[p._fp ?? fingerprint(p.text)] = now;
  }
  const cutoff = Date.now() - 30 * 86400_000;
  for (const [id, rec] of Object.entries(seen.posts)) {
    if (new Date(rec.sentAt).getTime() < cutoff) delete seen.posts[id];
  }
  for (const [fp, at] of Object.entries(seen.fingerprints)) {
    if (new Date(at).getTime() < cutoff) delete seen.fingerprints[fp];
  }
  writeFileSync(paths.seen, JSON.stringify(seen, null, 2));
}
