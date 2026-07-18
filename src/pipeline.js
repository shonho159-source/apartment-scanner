// הצינור המלא: scrape → normalize → dedupe → classify → digest → WhatsApp.
//
// הרצה: `node src/pipeline.js`  (או `npm start`)
//        `DRY_RUN=1 node src/pipeline.js` להדפסה בלי שליחה.

import 'dotenv/config';
import { scrapeGroups } from './scrape/apify.js';
import { windowHoursSinceLastRun, commitLastRun } from './util/window.js';
import { normalize } from './normalize.js';
import { appendHistory } from './util/history.js';
import { filterUnseen, commitSeen } from './dedupe.js';
import { classify } from './classify.js';
import { buildDigest } from './digest.js';
import { sendWhatsApp } from './notify/whatsapp.js';

async function main() {
  console.log('▶ סורק קבוצות פייסבוק...');
  const raw = await scrapeGroups();

  const all = normalize(raw);
  // רשת ביטחון על החלון האדפטיבי (הסינון האמיתי נעשה בצד Apify, שם הוא חינם).
  // פוסט בלי חותמת זמן נשאר — הדה-דופ ימנע כפילויות ממילא.
  const windowHours = windowHoursSinceLastRun();
  const cutoff = Date.now() - windowHours * 3600_000;
  const posts = all.filter((p) => !p.time || new Date(p.time).getTime() >= cutoff);
  console.log(`✓ אחרי נירמול: ${all.length} פוסטים עם טקסט, ${posts.length} בחלון של ${windowHours} שעות`);

  const fresh = filterUnseen(posts);
  console.log(`✓ חדשים (לא נבדקו בעבר): ${fresh.length}`);
  appendHistory(fresh);

  console.log('▶ מסווג עם AI...');
  const classified = await classify(fresh);
  const relevant = classified.filter((p) => p.relevant);
  console.log(`✓ רלוונטיים: ${relevant.length} מתוך ${classified.length}`);

  const messages = buildDigest(relevant, fresh.length);
  await sendWhatsApp(messages);

  // רושמים ל-seen רק פוסטים שסווגו בפועל — פוסט שה-batch שלו נכשל ייבדק שוב בריצה הבאה.
  if (process.env.DRY_RUN !== '1') {
    commitSeen(classified.filter((p) => p.classified));
    commitLastRun();
  }

  console.log(`✅ סיום. נשלחו ${messages.length} הודעות (${relevant.length} דירות).`);
}

main().catch((err) => {
  console.error('✖ הפייפליין נכשל:', err);
  process.exit(1);
});
