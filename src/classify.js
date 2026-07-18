// הלב של הסוכן: סיווג פוסטים עם OpenAI (gpt-5.4-mini — זול וחכם).
// כל batch של עד 20 פוסטים נשלח בקריאה אחת עם structured outputs (JSON schema strict),
// כך שהפלט תמיד JSON תקין — בלי פרסינג של טקסט חופשי. fetch ישיר, בלי SDK.

import 'dotenv/config';
import { criteria } from './util/config.js';

const OPENAI_BASE = 'https://api.openai.com/v1';
const MODEL = 'gpt-5.4-mini';
const BATCH_SIZE = 20;
const MAX_POST_CHARS = 1500;

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          relevant: { type: 'boolean' },
          reason: { type: 'string' },
          post_type: {
            type: 'string',
            enum: ['whole_apartment_offer', 'roommates', 'sublet', 'seeking', 'other'],
          },
          price: { type: ['integer', 'null'] },
          rooms: { type: ['number', 'null'] },
          size_sqm: { type: ['integer', 'null'] },
          neighborhood: { type: ['string', 'null'] },
          entry_date: { type: ['string', 'null'] },
          is_broker: { type: 'boolean' },
        },
        required: ['id', 'relevant', 'reason', 'post_type', 'price', 'rooms', 'size_sqm', 'neighborhood', 'entry_date', 'is_broker'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

function buildSystemPrompt() {
  const c = criteria;
  const rules = [
    'אתה מסנן פוסטים מקבוצות פייסבוק של דירות בתל אביב עבור אדם שמחפש לשכור דירה שלמה.',
    'פוסט רלוונטי (relevant=true) הוא אך ורק: הצעה של דירה שלמה להשכרה לטווח ארוך.',
    'פסול תמיד (relevant=false): פוסטים של אנשים שמחפשים דירה, חדר בדירת שותפים / מחפשים שותף.ה, סאבלט או השכרה לתקופה קצרה, מכירת דירות, פרסומות שאינן דירה ספציפית.',
  ];
  if (c.budgetMax) rules.push(`תקציב מקסימלי: ${c.budgetMax} ₪ לחודש. אם המחיר בפוסט גבוה מזה — לא רלוונטי. אם לא צוין מחיר — אל תפסול על סמך המחיר בלבד.`);
  if (c.roomsMin || c.roomsMax) {
    const range = [c.roomsMin ? `לפחות ${c.roomsMin}` : null, c.roomsMax ? `לכל היותר ${c.roomsMax}` : null].filter(Boolean).join(', ');
    rules.push(`מספר חדרים נדרש: ${range}. אם צוין בפוסט מספר חדרים מחוץ לטווח הזה (למשל דירת 2 חדרים כשהמינימום 2.5) — לא רלוונטי. דירת חדר, סטודיו או יחידת דיור — תמיד לא רלוונטי. אם מספר החדרים לא צוין כלל — אל תפסול על סמך זה בלבד.`);
  }
  if (c.sizeMinSqm) rules.push(`שטח מינימלי: ${c.sizeMinSqm} מ"ר. אם צוין בפוסט שטח קטן מזה — לא רלוונטי. אם השטח לא צוין — אל תפסול על סמך זה בלבד.`);
  if (Array.isArray(c.neighborhoods) && c.neighborhoods.length) {
    rules.push(`שכונות/אזורים מועדפים: ${c.neighborhoods.join(', ')}. אם צוינה שכונה שאינה ברשימה — לא רלוונטי; אם לא ברור מהפוסט — השאר רלוונטי.`);
  }
  if (Array.isArray(c.excludeNeighborhoods) && c.excludeNeighborhoods.length) {
    rules.push(`שכונות פסולות: ${c.excludeNeighborhoods.join(', ')}.`);
  }
  if (c.allowBroker === false) {
    rules.push('פוסטים של מתווכים (עמלת תיווך, "בבלעדיות", ניסוח שיווקי של משרד) — לא רלוונטיים.');
  } else {
    rules.push('תיווך אינו סיבה לפסילה: פוסט מתיווך שעומד בשאר הקריטריונים הוא רלוונטי (relevant=true) — פשוט סמן is_broker=true.');
  }
  if (c.notes) rules.push(`הנחיות נוספות מהמשתמש: ${c.notes}`);
  rules.push(
    'לכל פוסט חלץ גם: price (מחיר חודשי בש"ח, מספר בלבד או null), rooms (למשל 2.5 או null), size_sqm (שטח במ"ר או null), neighborhood (שם השכונה/הרחוב או null), entry_date (מועד כניסה כפי שמופיע בטקסט או null), is_broker (האם נראה שזה מתווך), reason (משפט קצר בעברית שמנמק את ההחלטה).',
    'החזר תוצאה אחת לכל פוסט, עם ה-id המדויק שקיבלת.'
  );
  return rules.join('\n');
}

async function classifyBatch(system, posts) {
  const payload = posts.map((p) => ({
    id: p.id,
    group: p.group,
    text: p.text.slice(0, MAX_POST_CHARS),
  }));
  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `סווג את הפוסטים הבאים:\n${JSON.stringify(payload)}` },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'post_classification', strict: true, schema: RESULT_SCHEMA },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (msg?.refusal) {
    console.warn(`⚠️  קריאת הסיווג נדחתה: ${msg.refusal} — מדלג על ה-batch.`);
    return [];
  }
  return JSON.parse(msg.content).results;
}

// מקבל פוסטים מנורמלים; מחזיר אותם עם שדות הסיווג ממוזגים.
export async function classify(posts) {
  if (!posts.length) return [];
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY לא הוגדר — אי אפשר לסווג. (ראה .env.example)');
  }
  const system = buildSystemPrompt();

  const verdicts = new Map();
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    try {
      const results = await classifyBatch(system, batch);
      for (const r of results) verdicts.set(r.id, r);
    } catch (err) {
      console.error(`   ✖ סיווג batch ${i / BATCH_SIZE + 1} נכשל: ${err.message}`);
    }
  }

  return posts.map((p) => {
    const v = verdicts.get(p.id);
    // פוסט שהסיווג שלו נכשל לא מסומן רלוונטי, אבל גם לא ייכנס ל-seen — ראה pipeline.
    if (!v) return { ...p, relevant: false, classified: false };
    return enforceHardRules({ ...p, ...v, classified: true });
  });
}

// אכיפה דטרמיניסטית של הכללים המספריים — לא סומכים על המודל בזה.
// המודל מחלץ (rooms/size/price), והקוד פוסל כשמה שחולץ מפר את הקריטריונים.
export function enforceHardRules(p) {
  if (!p.relevant) return p;
  const c = criteria;
  const violations = [];
  if (p.rooms != null && c.roomsMin && p.rooms < c.roomsMin) violations.push(`${p.rooms} חדרים < מינימום ${c.roomsMin}`);
  if (p.rooms != null && c.roomsMax && p.rooms > c.roomsMax) violations.push(`${p.rooms} חדרים > מקסימום ${c.roomsMax}`);
  if (p.size_sqm != null && c.sizeMinSqm && p.size_sqm < c.sizeMinSqm) violations.push(`${p.size_sqm} מ"ר < מינימום ${c.sizeMinSqm}`);
  if (p.price != null && c.budgetMax && p.price > c.budgetMax) violations.push(`${p.price} ₪ > תקציב ${c.budgetMax}`);
  if (!violations.length) return p;
  return { ...p, relevant: false, reason: `נפסל אוטומטית (אכיפת קוד): ${violations.join('; ')}` };
}
