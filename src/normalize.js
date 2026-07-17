// המרת פריטים גולמיים מה-Actor לסכמת פוסט אחידה.
// שמות השדות ב-Actor משתנים בין גרסאות — לכן הקריאה דפנסיבית עם כמה חלופות.

function postId(it) {
  return String(
    it.postId ?? it.id ?? it.legacyId ?? it.url ?? it.postUrl ?? it.facebookUrl ?? ''
  );
}

function postText(it) {
  return (it.text ?? it.message ?? it.postText ?? '').trim();
}

function postTime(it) {
  const t = it.time ?? it.timestamp ?? it.date ?? it.creation_time ?? null;
  if (t == null) return null;
  const d = typeof t === 'number' ? new Date(t < 1e12 ? t * 1000 : t) : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function postImages(it) {
  const atts = it.attachments ?? it.media ?? [];
  if (!Array.isArray(atts)) return [];
  return atts
    .map((a) => a?.image?.uri ?? a?.thumbnail ?? a?.url ?? null)
    .filter(Boolean)
    .slice(0, 3);
}

// מחזיר פוסטים מנורמלים; פוסטים בלי טקסט (תמונה בלבד) מסוננים — אין מה לסווג.
export function normalize(rawItems) {
  const posts = [];
  for (const it of rawItems) {
    const id = postId(it);
    const text = postText(it);
    if (!id || !text) continue;
    posts.push({
      id,
      url: it.url ?? it.postUrl ?? it.facebookUrl ?? null,
      text,
      author: it.user?.name ?? it.author ?? null,
      time: postTime(it),
      group: it._group ?? null,
      images: postImages(it),
    });
  }
  // דה-דופ בתוך הריצה עצמה (אותו פוסט יכול לחזור פעמיים)
  const byId = new Map(posts.map((p) => [p.id, p]));
  return [...byId.values()];
}
