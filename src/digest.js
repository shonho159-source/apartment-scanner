// בניית הודעת הוואטסאפ בעברית מתוך הפוסטים הרלוונטיים.
// סדר: מציאות דחופות (עד urgentPriceMax) → ללא תיווך → תיווך.

import { criteria } from './util/config.js';

const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function isUrgent(p) {
  return criteria.urgentPriceMax != null && p.price != null && p.price <= criteria.urgentPriceMax;
}

function sortForDigest(posts) {
  return [...posts].sort((a, b) => {
    const tier = (p) => (isUrgent(p) ? 0 : p.is_broker ? 2 : 1);
    return tier(a) - tier(b) || (a.price ?? Infinity) - (b.price ?? Infinity);
  });
}

function timeSlotLabel() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jerusalem' })
      .format(new Date())
  );
  return hour < 13 ? 'בוקר' : 'ערב';
}

function dateLabel() {
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'Asia/Jerusalem' })
    .format(new Date());
}

function formatPost(p, idx) {
  const num = isUrgent(p) ? '🚨' : NUM_EMOJI[idx] ?? `${idx + 1}.`;
  const parts = [
    p.rooms ? `${p.rooms} חד'` : null,
    p.size_sqm ? `${p.size_sqm} מ"ר` : null,
    p.neighborhood || null,
    p.price ? `${p.price.toLocaleString('he-IL')} ₪` : 'מחיר לא צוין',
    p.entry_date ? `כניסה: ${p.entry_date}` : null,
  ].filter(Boolean);

  const meta = [
    p.is_broker ? 'תיווך' : 'ללא תיווך',
    p.group ? `קבוצה: ${p.group}` : null,
  ].filter(Boolean);

  const head = isUrgent(p)
    ? `${num} מציאה! ${parts.join(' | ')}`
    : `${num} ${parts.join(' | ')}`;
  const lines = [head, `   ${meta.join(' · ')}`];
  if (p.reason) lines.push(`   💬 ${p.reason}`);
  if (p.url) lines.push(`   🔗 ${p.url}`);
  return lines.join('\n');
}

// מחזיר מערך הודעות (מפוצל אם ארוך מדי לוואטסאפ אחד קריא).
export function buildDigest(relevantPosts, totalScanned) {
  const header = `🏠 סריקת דירות — ${dateLabel()}, ${timeSlotLabel()}`;

  if (!relevantPosts.length) {
    return [`${header}\nנסרקו ${totalScanned} פוסטים — לא נמצאו דירות רלוונטיות בסריקה זו.`];
  }

  const sorted = sortForDigest(relevantPosts);
  const urgentCount = sorted.filter(isUrgent).length;
  const intro = `${header}\nנמצאו ${sorted.length} דירות רלוונטיות מתוך ${totalScanned} פוסטים`
    + (urgentCount ? ` — מתוכן ${urgentCount} 🚨 מתחת ל-${criteria.urgentPriceMax.toLocaleString('he-IL')} ₪!` : ':');
  const cards = sorted.map(formatPost);

  const messages = [];
  let current = intro;
  for (const card of cards) {
    if (current.length + card.length + 2 > 3500) {
      messages.push(current);
      current = card;
    } else {
      current += `\n\n${card}`;
    }
  }
  messages.push(current);
  return messages;
}
