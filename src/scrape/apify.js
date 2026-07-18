// לקוח Apify: מריץ את memo23/facebook-public-group-posts-scraper על כל הקבוצות
// הפעילות בריצה אחת (startUrls מרובים), ומחזיר את הפריטים הגולמיים.
//
// למה האקטור הזה (קבוצות ציבוריות בלבד, ללא לוגין, ללא עוגיות):
//   $1.5 לאלף פוסטים, בלי דמי actor-start, וסינון שעות (onlyPostsNewerThanHours)
//   בחינם — לעומת האקטור הרשמי שגובה ~$0.29 להתנעה + אירוע filter-applied לכל
//   פוסט. שדות הפלט זהים (text, url, time, user, groupTitle, attachments).

import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { groupsConfig } from '../util/config.js';
import { windowHoursSinceLastRun } from '../util/window.js';

const APIFY_BASE = 'https://api.apify.com/v2';

export function enabledGroups() {
  return (groupsConfig.groups || []).filter((g) => g.enabled && g.url);
}

function buildInput(groups) {
  const run = groupsConfig.run || {};
  return {
    startUrls: groups.map((g) => ({ url: g.url })),
    // חלון אדפטיבי (מאז הריצה האחרונה + באפר) — משלמים רק על מה שחדש באמת,
    // והסינון כאן חינם באקטור הזה.
    onlyPostsNewerThanHours: windowHoursSinceLastRun(),
    maxItems: run.resultsLimitPerGroup ?? 60,
    viewOption: 'CHRONOLOGICAL',
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// הרצה אסינכרונית: התנעה → המתנה לסיום → משיכת התוצאות מה-dataset.
// ה-endpoint הסינכרוני (run-sync) מוגבל ל-5 דקות — לא מספיק לריצות גדולות.
export async function runActor(actorId, input, token) {
  const run = groupsConfig.run || {};
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${token}`
      + `&timeout=${run.timeoutSecs ?? 1500}`
      + `&memory=${run.memoryMbytes ?? 1024}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }
  );
  if (!startRes.ok) {
    const body = await startRes.text().catch(() => '');
    throw new Error(`Apify start ${actorId} failed: ${startRes.status} ${body.slice(0, 300)}`);
  }
  const { id: runId, defaultDatasetId } = (await startRes.json()).data;

  const deadline = Date.now() + (run.pollTimeoutSecs ?? 1800) * 1000;
  let status = 'RUNNING';
  while (Date.now() < deadline) {
    await sleep(10_000);
    const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token}`);
    if (!res.ok) continue; // שגיאת רשת נקודתית — ננסה שוב בסיבוב הבא
    status = (await res.json()).data.status;
    if (!['RUNNING', 'READY'].includes(status)) break;
  }
  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run ${runId} ended with status ${status}`);
  }

  const itemsRes = await fetch(`${APIFY_BASE}/datasets/${defaultDatasetId}/items?token=${token}&clean=true`);
  if (!itemsRes.ok) {
    throw new Error(`Apify dataset fetch failed: ${itemsRes.status}`);
  }
  return itemsRes.json();
}

// מחזיר [{...rawItem, _group: <שם הקבוצה>}]
export async function scrapeGroups() {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.warn('⚠️  APIFY_TOKEN לא הוגדר — אין מה לסרוק. (ראה .env.example)');
    return [];
  }
  const groups = enabledGroups();
  if (!groups.length) {
    console.warn('⚠️  אין קבוצות פעילות ב-config/groups.json — הוסף קבוצות עם enabled:true.');
    return [];
  }

  const actorId = groupsConfig.run?.actorId ?? 'apify~facebook-groups-scraper';
  const items = await runActor(actorId, buildInput(groups), token);

  // שיוך כל פוסט לקבוצה שלו לפי התאמת URL (best-effort; נופל ל"קבוצה לא ידועה").
  const byUrl = groups.map((g) => ({ ...g, key: g.url.replace(/\/+$/, '') }));
  const tagged = items.map((it) => {
    const src = it.facebookUrl || it.groupUrl || it.url || '';
    const match = byUrl.find((g) => src.startsWith(g.key));
    return { ...it, _group: it.groupTitle ?? match?.name ?? 'קבוצה לא ידועה' };
  });

  console.log(`   נסרקו ${tagged.length} פוסטים מ-${groups.length} קבוצות`);
  return tagged;
}

// הרצה עצמאית כבדיקת עשן: `node src/scrape/apify.js`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  scrapeGroups().then((items) => {
    console.log(`\nסה"כ פוסטים: ${items.length}`);
    for (const it of items.slice(0, 3)) {
      console.log('---');
      console.log(JSON.stringify(it, null, 2).slice(0, 1200));
    }
  });
}
