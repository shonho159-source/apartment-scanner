# סורק דירות — משימות

## בנייה (Claude)
- [x] שלד פרויקט: package.json, .gitignore, .env.example, config
- [x] scrape (Apify facebook-groups-scraper) + normalize
- [x] dedupe + history
- [x] classify — Claude API עם structured outputs
- [x] digest + notify (Green API)
- [x] pipeline + GitHub Actions workflow
- [x] dry-run מקומי עובר מקצה לקצה (בלי טוקנים — כשל חינני)
- [x] פורמט הודעת digest אומת עם נתוני דמה
- [x] בדיקת עשן: סריקה אמיתית מ-8 קבוצות ✓
- [x] הרצת אמת מלאה: 236 פוסטים → 15 רלוונטיים → נשלחו לוואטסאפ ✓
- [x] אופטימיזציית עלויות: מעבר ל-memo23 actor — $0.25/ריצה במקום $1.65 ✓
- [x] כיול סיווג: גיאוגרפיה (צפון לירקון/מזרח/דרום נפסלים), חדרים (2 נפסל), תיווך (עובר ומסומן), רחובות ראשיים (נפסלים) ✓

- [ ] כיול סיווג על פוסטים אמיתיים
- [x] בדיקת שליחה לוואטסאפ (`npm run test-whatsapp`) — נשלח לקבוצת "🏠 סורק דירות"
- [ ] E2E: `npm run dry-run` ואז ריצה אמיתית
- [ ] הרצת workflow_dispatch בענן + אימות cache

## נדרש משון
- [x] רשימת קבוצות פייסבוק ציבוריות → `config/groups.json` (8 קבוצות)
- [x] קריטריונים (תקציב 8K / 2.5-3 חד' / רצועה מערבית / מציאה עד 6.5K) → `config/criteria.json`
- [x] Green API — מוחזר מ-marketing command center; נוצרה קבוצה ייעודית "🏠 סורק דירות" (120363427530159835@g.us)
- [ ] יצירת ריפו GitHub פרטי + הזנת 5 secrets

## Review
(יעודכן בסיום)
