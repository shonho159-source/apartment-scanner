// שליחת הודעות וואטסאפ דרך Green API (fetch פשוט, בלי ספרייה).
// DRY_RUN=1 → מדפיס לקונסול במקום לשלוח.

import 'dotenv/config';
import { pathToFileURL } from 'node:url';

const GREEN_BASE = 'https://api.green-api.com';

export async function sendWhatsApp(messages) {
  if (process.env.DRY_RUN === '1') {
    for (const m of messages) console.log(`\n===== DRY RUN — הודעה =====\n${m}\n`);
    return true;
  }

  const id = process.env.GREEN_API_ID_INSTANCE;
  const token = process.env.GREEN_API_TOKEN;
  const chatId = process.env.WHATSAPP_CHAT_ID;
  if (!id || !token || !chatId) {
    throw new Error('חסרים GREEN_API_ID_INSTANCE / GREEN_API_TOKEN / WHATSAPP_CHAT_ID (ראה .env.example)');
  }

  for (const message of messages) {
    const res = await fetch(`${GREEN_BASE}/waInstance${id}/sendMessage/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Green API sendMessage failed: ${res.status} ${body.slice(0, 300)}`);
    }
    // הפרדה קלה בין הודעות כדי לא להיתקל ב-rate limit
    if (messages.length > 1) await new Promise((r) => setTimeout(r, 1500));
  }
  return true;
}

// בדיקת עשן עצמאית: `npm run test-whatsapp`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  sendWhatsApp(['✅ בדיקת חיבור — סורק הדירות מחובר לוואטסאפ.'])
    .then(() => console.log('נשלח בהצלחה.'))
    .catch((err) => {
      console.error('✖ שליחה נכשלה:', err.message);
      process.exit(1);
    });
}
