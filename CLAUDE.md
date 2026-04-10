# CLAUDE.md — מדריך עבודה עם mipuy-financi-app

## מבנה הפרויקט

### קבצי ה-App (סדר טעינה ב-index.html)
| קובץ | שורות | תפקיד |
|---|---|---|
| `globals.js` | 3618 | BUSINESS_DB + כל הגלובלים + מערכי קטגוריות |
| `mapping.js` | 684 | טאב מיפוי ידני — init, addRow, row management, tab switching |
| `parsing.js` | 229 | פענוח קבצים — parseExcelFile, categorize, normalizeForLookup |
| `credit.js` | 997 | טאב דוחות אשראי — parseFiles, AI analysis, populateVarExpensesFromCredit |
| `utils.js` | 355 | charts, PDF, reset, utilities + קריאה ל-init() |
| `monthly.js` | 555 | טאבי תקציב חודשי — initMonths, moRecalc, moApplyCreditData |
| `import-budget.js` | 355 | טאב ייבוא לתקציב — importParseFiles, importSendToBudget |
| `annual.js` | 400 | טאב תכנון שנתי — annualRender, anPullActuals |
| `control.js` | 1496 | learnedDB + budget tab + goals + phase bar + control tab + subs |
| `client.js` | 663 | ניהול לקוחות — clientSave, clientRestoreData, clientCollectData |
| `bank.js` | 491 | טאב דוח עו"ש |
| `trends.js` | 205 | טאב מגמות + onboarding |

### קבצים נוספים
| קובץ | תפקיד |
|---|---|
| `index.html` | מבנה HTML של הדף (~1,350 שורות) |
| `style.css` | כל ה-CSS (~1,946 שורות) |
| `auth.js` | Firebase Authentication (נטען **אחרי** כל קבצי ה-app) |
| `db.js` | Firestore wrappers |
| `api/analyze.js` | Serverless proxy → Claude API |
| `api/categorize.js` | Serverless proxy → Claude API (batch) |

---

## גלובלים קריטיים

| משתנה | תפקיד | מי משנה אותו |
|---|---|---|
| `creditTransactions` | עסקאות טאב האשראי **בלבד** — חייב להיות `var`, לא `let` | `parseFiles`, `clientRestoreData` |
| `importCreditTransactions` | עסקאות טאב הייבוא — **עצמאי לחלוטין** מ-creditTransactions | `importParseFiles` |
| `_ccCtx` | `''` = טאב אשראי, `'import-'` = טאב ייבוא — קובע לאיזה DOM הפונקציות כותבות | `parseFiles`, `importParseFiles` |
| `deletedAutoCats` | קטגוריות שהמשתמש מחק ידנית מהמיפוי — מתאפס בכל העלאה חדשה | `parseFiles`, `clientRestoreData` |
| `cmActiveId` | ID הלקוח הפעיל ב-localStorage | `clientInit`, `clientLoad`, `clientCreate` |
| `uploadedFiles` | רשימת קבצים שכבר עובדו (למניעת עיבוד כפול) | `parseFiles`, `importParseFiles` |

---

## אינווריאנטים — כללי "לעולם לא"

```
❌ creditTransactions = importCreditTransactions
   (גרם לבאג: מיפוי ידני נדרס בנתוני הייבוא אחרי רענון)

❌ clientSave() כשcreditTransactions מצביע על importCreditTransactions
   (גרם לבאג: localStorage נשמר עם נתוני ייבוא במקום נתוני אשראי)

❌ let/const לגלובלים שצריך גישה דרך window.X
   (גרם לבאג: let creditTransactions → window.creditTransactions = undefined)

✅ renderSmartAnalysis / renderCreditSummary / analyzeWithAI
   תמיד בודקים _ccCtx ומשתמשים במערך הנכון:
   var creditTransactions = (_ccCtx === 'import-') ? importCreditTransactions : window.creditTransactions;

✅ ב-importSendToBudget: switchTab() קודם, אחר כך moApplyCreditData()
   (switchTab → syncManualToMonth מאכלס תכנון, ואז moApplyCreditData מוסיף ביצוע)
```

---

## פונקציות בעלות תופעות לוואי רחבות

| פונקציה | משפיעה על |
|---|---|
| `populateVarExpensesFromCredit()` | כל קטגוריות המיפוי הידני (var/fixed/sub/insurance/annual lists) |
| `clientRestoreData(data)` | כל ה-DOM של האפליקציה — נקרא פעם אחת בטעינת הדף |
| `clientSave()` | שומר את כל נתוני ה-DOM ל-localStorage |
| `syncManualToMonth(mid)` | מוחק ומחדש את כל שורות התכנון בטאב החודש |
| `switchTab(tab)` | מפעיל syncManualToMonth לכל טאב חודשי |

---

## רשימת בדיקה לפני כל push

בדוק את כל הנקודות האלה ידנית לפני `git push`:

```
[ ] טאב דוחות: העלה קובץ אקסל → עסקאות מופיעות ברשימה
[ ] טאב דוחות: עסקאות עוברות למיפוי (משתנות / קבועות / ביטוחים / מנויים)
[ ] טאב ייבוא לתקציב: העלה קובץ → המיפוי הידני לא השתנה ולא התאפס
[ ] טאב ייבוא לתקציב: לחץ "שלח ביצוע" → נתונים בעמודת ביצוע בחודש שנבחר
[ ] רענן דף → נתוני המיפוי הידני נשמרו
[ ] רענן דף → נתוני עמודת ביצוע בחודש נשמרו
```

---

## הערות פיתוח

- **CDN scripts** נטענים לפני app.js: Firebase, Chart.js, jsPDF, html2canvas, SheetJS (xlsx)
- **auth.js** חייב להיטען **אחרי** app.js (סדר ב-index.html)
- **BUSINESS_DB** — מיפוי גדול של שמות עסקים לקטגוריות (~3,000 ערכים), בתחילת app.js
- **localStorage keys**: `finapp_client_index`, `finapp_client_data_{id}`, `finapp_learnedDB`
- אין package.json — ה-JS הוא vanilla, ספריות דרך CDN בלבד
