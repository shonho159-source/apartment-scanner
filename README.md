# 🏠 סורק דירות — קבוצות פייסבוק → AI → וואטסאפ

סוכן שרץ פעמיים ביום (09:00 + 20:00 שעון ישראל), סורק קבוצות פייסבוק **ציבוריות** של דירות להשכרה בתל אביב, מסנן עם AI (gpt-5.4-mini) רק פוסטים של **דירות שלמות להשכרה** לפי הקריטריונים שלך, ושולח סיכום מסודר בוואטסאפ.

```
Apify (facebook-groups-scraper) → normalize → dedupe → OpenAI classify → WhatsApp (Green API)
```

## הקמה

1. **קבוצות** — ערוך את `config/groups.json`: הוסף את כתובות הקבוצות הציבוריות עם `"enabled": true`.
2. **קריטריונים** — ערוך את `config/criteria.json`: תקציב, חדרים, שכונות, תיווך.
3. **סודות** — העתק `.env.example` ל-`.env` ומלא:
   - `APIFY_TOKEN` — מ-console.apify.com
   - `OPENAI_API_KEY` — מ-platform.openai.com
   - `GREEN_API_ID_INSTANCE` + `GREEN_API_TOKEN` — הקם instance ב-green-api.com וסרוק QR מהוואטסאפ שלך
   - `WHATSAPP_CHAT_ID` — המספר שלך בפורמט `9725XXXXXXXX@c.us`
4. `npm install`

## הרצה

```bash
npm run scrape          # בדיקת עשן: סריקה בלבד, מדפיס דוגמאות
npm run test-whatsapp   # שולח הודעת בדיקה לוואטסאפ
npm run dry-run         # צינור מלא, מדפיס במקום לשלוח
npm start               # צינור מלא כולל שליחה
```

## הרצה אוטומטית בענן (GitHub Actions)

1. צור ריפו GitHub **פרטי** ודחוף את הקוד.
2. ב-Settings → Secrets and variables → Actions הוסף את חמשת הסודות מלמעלה.
3. ה-workflow (`.github/workflows/scan.yml`) ירוץ אוטומטית פעמיים ביום; אפשר גם להריץ ידנית מ-Actions → apartment-scan → Run workflow.

## עלויות

- Apify: ~$2.6–5 לכל 1,000 פוסטים (תלוי במספר הקבוצות; `resultsLimitPerGroup` מגביל)
- OpenAI (gpt-5.4-mini): אגורות ליום (פוסטים קצרים, batch-ים)
- GitHub Actions + Green API (שימוש אישי): חינם
