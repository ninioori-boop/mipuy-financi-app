/* ════════════════════════════════════════
   FILE UPLOAD
════════════════════════════════════════ */
function handleFileUpload(files) {
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (!pendingFiles.find(function(p){ return p.name === f.name; })) {
      pendingFiles.push(f);
    }
  }
  renderFileList();
}

function renderFileList() {
  const fl = document.getElementById('file-list');
  fl.innerHTML = '';
  pendingFiles.forEach(function(f, i) {
    const chip = document.createElement('div');
    chip.className = 'file-chip';
    chip.innerHTML =
      '<span><span class="chip-name">📄 ' + f.name + '</span></span>' +
      '<button class="btn-del" onclick="removePendingFile(' + i + ')">×</button>';
    fl.appendChild(chip);
  });
  document.getElementById('parse-btn').style.display = pendingFiles.length ? 'block' : 'none';
  const countBar = document.getElementById('file-count-bar');
  if (countBar) {
    if (pendingFiles.length > 0) {
      countBar.style.display = 'block';
      countBar.textContent = '📁 ' + pendingFiles.length + ' כרטיסים נבחרו';
    } else {
      countBar.style.display = 'none';
    }
  }
}

function removePendingFile(idx) {
  pendingFiles.splice(idx, 1);
  renderFileList();
}

/* ════════════════════════════════════════
   SMART PATTERN DETECTION
════════════════════════════════════════ */
function detectSmartPatterns(txs) {
  const standingOrders = [];
  const installments   = [];
  const refunds        = [];
  const merchantMap    = {}; // key: normalized desc → [{amount, tx}]

  txs.forEach(function(t) {
    if (t.isStandingOrder) standingOrders.push(t);
    if (t.installment)     installments.push(t);
    if (t.isRefund)        refunds.push(t);

    if (!t.isRefund) {
      const key = t.desc.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!merchantMap[key]) merchantMap[key] = [];
      merchantMap[key].push(t);
    }
  });

  // Recurring: same merchant + same rounded amount appearing 2+ times
  const recurring = [];
  const seen = {};
  Object.entries(merchantMap).forEach(function(entry) {
    const group = entry[1];
    if (group.length < 2) return;
    const amtBuckets = {};
    group.forEach(function(t) {
      const k = Math.round(t.amount * 10); // round to 0.1 ILS
      if (!amtBuckets[k]) amtBuckets[k] = [];
      amtBuckets[k].push(t);
    });
    Object.entries(amtBuckets).forEach(function(e2) {
      if (e2[1].length >= 2) {
        const uid = group[0].desc + '|' + e2[0];
        if (!seen[uid]) {
          seen[uid] = true;
          recurring.push({
            desc:     group[0].desc,
            amount:   group[0].amount,
            count:    e2[1].length,
            category: group[0].category,
            dates:    e2[1].map(function(t){ return t.date; }).filter(Boolean)
          });
        }
      }
    });
  });

  return { standingOrders: standingOrders, installments: installments, refunds: refunds, recurring: recurring };
}

function renderSmartAnalysis() {
  var creditTransactions = (_ccCtx === 'import-') ? importCreditTransactions : window.creditTransactions;
  const container = document.getElementById(_ccCtx + 'smart-analysis');
  const patterns  = detectSmartPatterns(creditTransactions);
  const total     = patterns.standingOrders.length + patterns.installments.length +
                    patterns.refunds.length + patterns.recurring.length;

  if (total === 0) { container.style.display = 'none'; return; }
  container.style.display = 'block';

  var sections = [
    {
      id:    'sa-standing',
      icon:  '📌',
      title: 'הוראות קבע',
      badge: patterns.standingOrders.length,
      color: '',
      items: patterns.standingOrders.map(function(t) {
        return { desc: t.desc, amt: t.amount, meta: t.date || '', tag: 'הוראת קבע', tagClass: '' };
      })
    },
    {
      id:    'sa-install',
      icon:  '📅',
      title: 'תשלומים',
      badge: patterns.installments.length,
      color: 'orange',
      items: patterns.installments.map(function(t) {
        const pct = Math.round(t.installment.current / t.installment.total * 100);
        const remaining = t.installment.total - t.installment.current;
        return {
          desc: t.desc,
          amt:  t.amount,
          meta: 'תשלום ' + t.installment.current + ' מתוך ' + t.installment.total +
                (remaining > 0 ? ' · נותרו ' + remaining : ' · אחרון!'),
          tag: t.installment.current + '/' + t.installment.total,
          tagClass: 'orange',
          progress: pct
        };
      })
    },
    {
      id:    'sa-recurring',
      icon:  '🔄',
      title: 'חוזרים / מנויים אפשריים',
      badge: patterns.recurring.length,
      color: '',
      items: patterns.recurring.map(function(r) {
        return { desc: r.desc, amt: r.amount, meta: 'מופיע ' + r.count + ' פעמים', tag: 'חוזר', tagClass: '' };
      })
    },
    {
      id:    'sa-refunds',
      icon:  '↩️',
      title: 'החזרים / זיכויים',
      badge: patterns.refunds.length,
      color: 'green',
      items: patterns.refunds.map(function(t) {
        return { desc: t.desc, amt: t.amount, meta: t.date || '', tag: 'זיכוי', tagClass: 'green' };
      })
    }
  ].filter(function(s){ return s.items.length > 0; });

  var html = '<div class="section-card" style="margin-bottom:20px">' +
    '<div class="section-title" style="margin-bottom:14px">🔍 ניתוח חכם</div>';

  sections.forEach(function(s) {
    var badgeClass = s.color ? ' ' + s.color : '';
    html += '<div class="smart-section">' +
      '<div class="smart-section-hdr" onclick="toggleSmartSection(\'' + s.id + '\')" id="hdr-' + s.id + '">' +
        '<div class="smart-hdr-left">' +
          '<span class="smart-hdr-icon">' + s.icon + '</span>' +
          '<span class="smart-hdr-title">' + s.title + '</span>' +
          '<span class="smart-badge' + badgeClass + '">' + s.badge + '</span>' +
        '</div>' +
        '<span style="color:var(--muted);font-size:.8rem">▶</span>' +
      '</div>' +
      '<div class="smart-body" id="' + s.id + '">';

    s.items.forEach(function(item) {
      html += '<div class="smart-row">' +
        '<div class="smart-row-desc">' + escHtml(item.desc) + '</div>';
      if (item.meta) html += '<div class="smart-row-meta">' + escHtml(item.meta) + '</div>';
      html += '<div class="smart-row-amt">' + fmt(item.amt) + '</div>' +
        '<span class="smart-row-tag ' + (item.tagClass||'') + '">' + item.tag + '</span>';
      if (item.progress !== undefined) {
        html += '</div><div style="padding: 0 0 8px 0">' +
          '<div class="smart-progress-bar"><div class="smart-progress-fill" style="width:' + item.progress + '%"></div></div>';
      }
      html += '</div>';
    });

    html += '</div></div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function toggleSmartSection(id) {
  var body = document.getElementById(id);
  var hdr  = document.getElementById('hdr-' + id);
  if (!body) return;
  var open = body.classList.toggle('open');
  hdr.classList.toggle('open', open);
  hdr.querySelector('span:last-child').textContent = open ? '▼' : '▶';
}

async function parseFiles() {
  _ccCtx = '';
  if (!pendingFiles.length) return;
  showLoading('מנתח קבצים...');
  try {
    // Clear deleted-category memory so previously blocked cats reappear
    deletedAutoCats = {};
    // Only parse files not yet parsed — append to existing transactions instead of resetting
    var _alreadyParsed = uploadedFiles.map(function(f) { return f.name; });
    var _newFiles = pendingFiles.filter(function(f) { return _alreadyParsed.indexOf(f.name) === -1; });
    var _newTxs = [];
    for (let i = 0; i < _newFiles.length; i++) {
      const f = _newFiles[i];
      const rows = await parseExcelFile(f);
      const txs = extractTransactions(rows, f.name);
      creditTransactions.push.apply(creditTransactions, txs);
      _newTxs = _newTxs.concat(txs);
      uploadedFiles.push({ name: f.name, rowCount: txs.length });
    }
    hideLoading();
    renderSmartAnalysis();
    renderCreditSummary();
    document.getElementById(_ccCtx + 'credit-results').style.display = 'block';
    if (!_ccCtx) populateVarExpensesFromCredit();
    if (!_ccCtx) creditAutoDetectMonth();
    renderPushToBudgetBtn();
    // Auto-run AI for any unclassified transactions
    var unmatchedCount = creditTransactions.filter(function(t) { return t.category === 'שונות'; }).length;
    if (unmatchedCount > 0) {
      analyzeWithAI();
    }
  } catch(e) {
    hideLoading();
    alert('שגיאה בפענוח הקובץ: ' + e.message);
  }
}

/* ════════════════════════════════════════
   AI ANALYSIS — Claude (Anthropic)
════════════════════════════════════════ */
// API key is stored securely in Vercel Environment Variables.
// All Claude API calls go through /api/categorize (serverless proxy).

async function analyzeWithAI() {
  var creditTransactions = (_ccCtx === 'import-') ? importCreditTransactions : window.creditTransactions;
  const unmatched = creditTransactions
    .map(function(t, i) { return { idx: i, t: t }; })
    .filter(function(item) { return item.t.category === 'שונות' && !item.t.isRefund; });

  if (!unmatched.length) {
    return;
  }

  showLoading('Claude מנתח ' + unmatched.length + ' עסקאות...');

  const catList = ALL_CATEGORIES.join(', ');
  const systemPrompt =
    'אתה מומחה לניתוח הוצאות פיננסיות בישראל.\n' +
    'קבל רשימת עסקאות מכרטיס אשראי ישראלי וסווג כל עסקה לקטגוריה אחת.\n\n' +
    'קטגוריות אפשריות בלבד:\n' + catList + '\n\n' +
    '=== חוקי קטגוריזציה ===\n' +
    '- ביטוח לאומי: רק ביטוח לאומי ממשלתי (מל"ל)\n' +
    '- ארנונה: תשלומי ארנונה לעירייה בלבד\n' +
    '- מיסים: מס הכנסה, מע"מ, רמ"י, טאבו, רשות המסים\n' +
    '- עמלות בנק ואשראי: עמלות בנק, דמי כרטיס, ריבית, PayPal, Payoneer, דמי ניהול\n' +
    '- ביט ללא מעקב: העברות ביט, paybox\n' +
    '- מזומן ללא מעקב: משיכת מזומן, ATM, כספומט\n' +
    '- תחבצ: תחבורה ציבורית, רכבת ישראל, אגד, דן, גט, אובר, יאנגו, קורקינט\n' +
    '- כבישי אגרה: כביש 6, נתיבי איילון, מנהרות הכרמל, דרך ארץ\n' +
    '- דלק וחניה: תחנות דלק (פז, סונול, דלק, אלון, TEN), חניה, פנגו, סלופארק, Cellopark\n' +
    '- אוכל בחוץ ובילויים: מסעדות, קפה, ברים, ולט (Wolt), תן-ביס, קולנוע, פיצה, שווארמה, פלאפל\n' +
    '- מזון לבית: סופרמרקטים, שופרסל, רמי לוי, יינות ביתן, ויקטורי, קרפור, AM:PM, מכולת\n' +
    '- ריהוט והבית: IKEA, הום סנטר, ACE, ריהוט, עיצוב בית, לרוא מרלן\n' +
    '- ביגוד והנעלה: חנויות אופנה, נעליים, ספורט, H&M, Zara, Castro, Fox, Golf, Renuar\n' +
    '- פארם: בתי מרקחת, סופר-פארם, NEW PHARM, YES PHARM, ויטמינים, תוספי תזונה\n' +
    '- בריאות: רופאים, מרפאות, בתי חולים, דנטיסט, אופטיקה, פיזיותרפיה (לא קופת חולים)\n' +
    '- קופת חולים: מכבי, כללית, מאוחדת, לאומית — תשלומי חבר בקופה בלבד\n' +
    '- תקשורת: סלקום, בזק, HOT, Partner, גולן טלקום, נטפליקס, ספוטיפיי, חברות אינטרנט\n' +
    '- השקעות: מניות, קריפטו, etoro, binance, פלוס500, בתי השקעות\n' +
    '- חופשה וטיול: טיסות, מלונות, booking, airbnb, סוכנויות נסיעות — סווג לפי שם העסק גם אם בחו"ל\n\n' +
    '=== זיהוי שמות ישראליים בתעתיק לועזי ===\n' +
    'aroma/aroma espresso=אוכל | cofix/קופיקס=אוכל | shufersal/שופרסל=מזון לבית\n' +
    'rami levy=מזון לבית | egged/agd=תחבצ | kvish 6/כביש 6=כבישי אגרה\n' +
    'delek=דלק | clalit=קופת חולים | maccabi=קופת חולים | meuhedet=קופת חולים\n' +
    'leumit=קופת חולים | harel=ביטוח | migdal=ביטוח | phoenix=ביטוח\n' +
    'supergas=הוצאות בית | hot mobile=תקשורת | golan telecom=תקשורת\n\n' +
    '=== שמות קטועים נפוצים בדוחות ישראליים ===\n' +
    '"שופרסל דיל"/"שופרסל אונל"=מזון לבית | "סופר-פא"/"super-p"=פארם\n' +
    '"הולמס פל"=חדר כושר | "מכבידנ"=בריאות | "נתיבי אי"=כבישי אגרה\n' +
    '"ביטוח לאו"=ביטוח לאומי | "קסטרו מד"=ביגוד | "hot mobi"=תקשורת\n\n' +
    '=== כללים ===\n' +
    '- בע"מ / ltd / llc הן סיומות משפטיות — התעלם מהן לצורך סיווג\n' +
    '- שם עיר בסוף שם עסק (נתניה, ת"א, ר"ג) — חלק ממיקום, לא מהשם\n' +
    '- אם לא בטוח — השתמש ב"שונות"\n' +
    '- אל תמציא קטגוריות חדשות\n\n' +
    'פורמט תגובה — JSON בלבד ללא טקסט נוסף:\n' +
    '{"expenses":[{"description":"תיאור מקורי מדויק","amount":מספר,"category":"קטגוריה"}]}';

  // חלק לבאצ'ים של 80 עסקאות כדי לא לחרוג ממגבלת טוקנים
  const BATCH = 80;
  let updated = 0;

  try {
    for (let b = 0; b < unmatched.length; b += BATCH) {
      const batch = unmatched.slice(b, b + BATCH);
      showLoading('Claude מנתח... (' + Math.min(b + BATCH, unmatched.length) + '/' + unmatched.length + ')');

      const lines = batch.map(function(item) {
        return item.t.desc + ' | ₪' + item.t.amount.toFixed(2);
      }).join('\n');

      var res;
      var lastErr;
      for (var attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            showLoading('מנסה שוב... (' + attempt + '/2)');
            await new Promise(function(r){ setTimeout(r, 1500 * attempt); });
          }
          // קריאה דרך serverless proxy — המפתח נשמר ב-Vercel ולא בקוד
          res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system: systemPrompt,
              message: 'סווג את העסקאות הבאות:\n' + lines
            })
          });
          lastErr = null;
          break;
        } catch(fetchErr) {
          lastErr = fetchErr;
        }
      }
      if (lastErr) throw lastErr;

      if (!res.ok) {
        const errData = await res.json().catch(function(){ return {}; });
        const msg = (errData.error && errData.error.message) || ('שגיאת API ' + res.status);
        throw new Error(msg);
      }

      const data = await res.json();
      const rawText = data.text || '';

      // חלץ JSON גם אם Claude עטף אותו בטקסט
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('תגובה לא תקינה מ-Claude');
      const parsed = JSON.parse(jsonMatch[0]);
      const aiExpenses = parsed.expenses || [];

      aiExpenses.forEach(function(exp, i) {
        if (i < batch.length) {
          const validCat = ALL_CATEGORIES.indexOf(exp.category) !== -1 ? exp.category : 'שונות';
          if (validCat !== 'שונות') {
            creditTransactions[batch[i].idx].category = validCat;
            saveToLearnedDB(creditTransactions[batch[i].idx].desc, validCat);
            updated++;
          }
        }
      });
    }

    hideLoading();
    renderSmartAnalysis();
    renderCreditSummary();
    if (!_ccCtx) populateVarExpensesFromCredit();

    const notice = document.createElement('div');
    notice.style.cssText = 'background:rgba(108,99,255,.15);border:1px solid rgba(108,99,255,.4);border-radius:10px;padding:12px 16px;font-size:.85rem;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:10px;';
    notice.innerHTML = '<span style="font-size:1.3rem">🤖</span><span>Claude סיווג <strong>' + updated + '</strong> מתוך <strong>' + unmatched.length + '</strong> עסקאות לא מזוהות</span>';
    document.getElementById(_ccCtx + 'credit-results').insertAdjacentElement('afterbegin', notice);
    setTimeout(function(){
      notice.style.opacity = '0'; notice.style.transition = 'opacity 1s';
      setTimeout(function(){ if (notice.parentNode) notice.remove(); }, 1100);
    }, 7000);

    if (updated > 0) promptExportLearnedDB(updated);

  } catch(e) {
    hideLoading();
    var errMsg = e.message || 'שגיאה לא ידועה';
    var hint = '';
    if (errMsg.toLowerCase().includes('failed to fetch') || errMsg.toLowerCase().includes('networkerror')) {
      hint = ' — בדוק חיבור לאינטרנט או שמפתח ה-API תקין';
    } else if (errMsg.includes('401') || errMsg.toLowerCase().includes('authentication')) {
      hint = ' — מפתח API לא תקין או פג תוקף';
    } else if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate')) {
      hint = ' — חריגה ממגבלת קריאות, נסה שוב בעוד כמה שניות';
    }
    var errBanner = document.createElement('div');
    errBanner.id = 'ai-error-banner';
    errBanner.style.cssText = 'background:rgba(255,101,132,.12);border:1px solid rgba(255,101,132,.4);border-radius:10px;padding:12px 16px;font-size:.85rem;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    errBanner.innerHTML =
      '<span style="font-size:1.2rem">⚠️</span>' +
      '<span style="flex:1">שגיאה בניתוח AI: <strong>' + errMsg + '</strong>' + hint + '</span>' +
      '<button onclick="document.getElementById(\'ai-error-banner\').remove();analyzeWithAI()" ' +
        'style="background:rgba(108,99,255,.2);border:1px solid rgba(108,99,255,.5);border-radius:7px;color:var(--accent);padding:5px 14px;cursor:pointer;font-family:inherit;font-size:.82rem;white-space:nowrap">🔄 נסה שוב</button>' +
      '<button onclick="document.getElementById(\'ai-error-banner\').remove()" ' +
        'style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;padding:2px 6px">✕</button>';
    var results = document.getElementById('credit-results');
    if (results) {
      var existing = document.getElementById('ai-error-banner');
      if (existing) existing.remove();
      results.insertAdjacentElement('afterbegin', errBanner);
    } else {
      alert('שגיאה בניתוח AI: ' + errMsg + hint);
    }
  }
}

/* ════════════════════════════════════════
   AUTO-POPULATE MANUAL MAPPING FROM CREDIT
════════════════════════════════════════ */
// Categories that map to variable expenses (not fixed/subscriptions)
var VAR_CATEGORIES = [
  'מזון לבית','אוכל בחוץ ובילויים','פארם','דלק וחניה','ביגוד והנעלה',
  'תחבצ','כבישי אגרה','תספורת וקוסמטיקה','תחביבים',
  'תיקוני רכב','בריאות','בעלי חיים','חינוך וקייטנות','שונות',
  'ביט ללא מעקב','מזומן ללא מעקב','מתנות','עוזרת בית','סיגריות',
  'צעצועים','כלי בית','ריהוט והבית','תרומות',
  'ציוד עסקי/משרדי','חומרי בניין'
];
var ANNUAL_CATEGORIES = ['חופשה וטיול'];
var FIXED_CATEGORIES = [
  'קופת חולים','משכנתא','שכר דירה',
  'ארנונה','דמי ניהול בניין','החזר הלוואות','הוצאות בית','מיסים',
  'חשמל','גז','מים','ועד בית','ביוב','אינטרנט קווי'
];
var INSURANCE_CATEGORIES = ['ביטוח','ביטוח לאומי','ביטוח רכב','ביטוח חיים','ביטוח בריאות','ביטוח רכוש'];
var SUB_CATEGORIES = ['תקשורת','חדר כושר','עמלות בנק ואשראי','נטפליקס','ספוטיפיי','אפל','גוגל'];
var SKIP_CATEGORIES = ['הכנסות','חסכונות','השקעות','העברות ואשראי']; // לא הוצאות

// Deleted auto categories — persisted across sessions
var deletedAutoCats = {}; // { cat: true }

function recordDeletedAutoCat(cat) {
  deletedAutoCats[cat] = true;
  if (typeof clientAutoSave === 'function') clientAutoSave();
  // שמור מיד ל-Firebase — מחיקה היא click ולא input, לכן לא נתפסת ע"י fbDebouncedSave
  if (typeof fbSaveNow === 'function') fbSaveNow();
}

function resetDeletedAutoCats() {
  deletedAutoCats = {};
  if (typeof fbSaveNow === 'function') fbSaveNow();
  if (creditTransactions.length) populateVarExpensesFromCredit();
}

function toggleCatDetail(btn) {
  var wrap = btn.closest('.cat-auto-wrap');
  var panel = wrap.querySelector('.cat-detail-panel');
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  var count = btn.getAttribute('data-count') || '';
  btn.textContent = (isOpen ? '▶ ' : '▲ ') + count + ' פריטים';
}

function updateTxCatFromMapping(idx, newCat) {
  if (idx < 0 || idx >= creditTransactions.length) return;
  creditTransactions[idx].category = newCat;
  saveToLearnedDB(creditTransactions[idx].desc, newCat);
  renderCreditSummary();
  populateVarExpensesFromCredit();
}

function populateVarExpensesFromCredit() {
  if (!creditTransactions.length) return;

  var months = Math.max(1, parseInt(document.getElementById('months-input').value) || 3);

  // Sum by category AND collect tx indices — exclude refunds
  var catMap = {}, catTxs = {};
  creditTransactions.forEach(function(t, i) {
    if (t.isRefund) return;
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    if (!catTxs[t.category]) catTxs[t.category] = [];
    catTxs[t.category].push(i);
  });

  // Remove debug panel if present from previous session
  var _dbgEl = document.getElementById('mapping-debug-output');
  if (_dbgEl) _dbgEl.remove();

  // Preserve which detail panels were open
  var openCats = {};
  ['var-list','fixed-list','sub-list','insurance-list'].forEach(function(listId) {
    var list = document.getElementById(listId);
    list.querySelectorAll('.cat-auto-wrap').forEach(function(wrap) {
      var panel = wrap.querySelector('.cat-detail-panel');
      if (panel && panel.style.display !== 'none') openCats[wrap.dataset.cat] = true;
    });
  });

  Object.entries(catMap).forEach(function(entry) {
    var cat = entry[0], totalAmt = entry[1];
    if (totalAmt <= 0) return;
    if (SKIP_CATEGORIES.indexOf(cat) !== -1) return; // הכנסות/חסכונות/השקעות — לא הוצאות
    if (deletedAutoCats[cat]) return;                // המשתמש מחק קטגוריה זו
    var listId = null;
    var isVar    = VAR_CATEGORIES.indexOf(cat) !== -1;
    var isAnnual = ANNUAL_CATEGORIES.indexOf(cat) !== -1;
    var isIns    = INSURANCE_CATEGORIES.indexOf(cat) !== -1;
    if (isVar)         listId = 'var-list';
    else if (isAnnual) listId = 'annual-list';
    else if (isIns)    listId = 'insurance-list';
    else if (FIXED_CATEGORIES.indexOf(cat) !== -1) listId = 'fixed-list';
    else if (SUB_CATEGORIES.indexOf(cat) !== -1)   listId = 'sub-list';
    if (!listId) return; // קטגוריה לא מוכרת — מתעלמים

    var icon = CATEGORY_ICONS[cat] || '📦';
    var txIndices = catTxs[cat] || [];
    var txCount   = txIndices.length;
    var storeAmt, displayMonthly;
    if (isVar) {
      // משתנות: מחלקים לפי מספר חודשים שהמשתמש הגדיר
      storeAmt       = totalAmt;
      displayMonthly = Math.round(totalAmt / months);
    } else if (isAnnual) {
      // שנתיות: מחלקים ב-12 לקבלת ממוצע חודשי, שומרים סכום שנתי
      storeAmt       = Math.round(totalAmt / months * 12);
      displayMonthly = Math.round(storeAmt / 12);
    } else {
      // קבועות / ביטוחים / מנויים: סכום חודשי = סה"כ חלקי מספר חודשים
      storeAmt       = Math.round(totalAmt / months);
      displayMonthly = storeAmt;
    }

    // Annual categories get a dedicated annual-row (not cat-auto-wrap)
    if (isAnnual) {
      var annList = document.getElementById('annual-list');
      if (!annList) return;
      // Update existing annual row in-place if present
      var existingAnn = null;
      annList.querySelectorAll('.input-row[data-auto]').forEach(function(w){ if (w.dataset.cat === cat) existingAnn = w; });
      if (existingAnn) {
        var annAmt = existingAnn.querySelector('input[type="number"]');
        if (annAmt) annAmt.value = storeAmt;
        var annTag = existingAnn.querySelector('.yearly-tag');
        if (annTag) annTag.textContent = '₪' + fmt(displayMonthly) + ' / חודש';
        return;
      }
      var annRow = document.createElement('div');
      annRow.className = 'input-row annual-row';
      annRow.setAttribute('data-auto', '1');
      annRow.setAttribute('data-cat', cat);
      annRow.innerHTML =
        '<input type="text" value="' + icon + ' ' + cat + '" readonly style="color:var(--accent);font-weight:600">' +
        '<input type="number" value="' + storeAmt + '" min="0" step="1" oninput="updateAnnualTag(this);updateAnnualTotals()">' +
        '<span class="yearly-tag">₪' + fmt(displayMonthly) + ' / חודש</span>' +
        '<button class="btn-del" onclick="recordDeletedAutoCat(\'' + cat.replace(/'/g,"\\'") + '\');this.closest(\'.annual-row\').remove();updateAnnualTotals()">×</button>';
      annList.appendChild(annRow);
      return;
    }

    var oninputAttr, ondelAttr;
    var delRecord = "recordDeletedAutoCat('" + cat.replace(/'/g,"\\'") + "');";
    if (isVar) {
      oninputAttr = 'updateVarTag(this);updateVarTotals()';
      ondelAttr   = delRecord + "this.closest('.cat-auto-wrap').remove();updateVarTotals()";
    } else if (listId === 'fixed-list') {
      oninputAttr = "updateSectionTotal('fixed-list','total-fixed',1)";
      ondelAttr   = delRecord + "this.closest('.cat-auto-wrap').remove();updateSectionTotal('fixed-list','total-fixed',1)";
    } else if (listId === 'insurance-list') {
      oninputAttr = "updateSectionTotal('insurance-list','total-ins',1)";
      ondelAttr   = delRecord + "this.closest('.cat-auto-wrap').remove();updateSectionTotal('insurance-list','total-ins',1)";
    } else {
      oninputAttr = "updateSectionTotal('sub-list','total-subs',1)";
      ondelAttr   = delRecord + "this.closest('.cat-auto-wrap').remove();updateSectionTotal('sub-list','total-subs',1)";
    }

    var monthlyTag = isVar
      ? '<span class="var-monthly-tag" title="סה&quot;כ בדוח: ₪' + Math.round(totalAmt) + ' ÷ ' + months + ' חודשים">÷' + months + ' = ' + fmt(displayMonthly) + '/חודש</span>'
      : '';

    // Build detail table rows
    var detailRows = txIndices.map(function(txIdx) {
      var t = creditTransactions[txIdx];
      var opts = ALL_CATEGORIES.map(function(c) {
        return '<option value="' + escHtml(c) + '"' + (c === t.category ? ' selected' : '') + '>' + escHtml(c) + '</option>';
      }).join('');
      return '<tr>' +
        '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escHtml(t.desc) + '">' + escHtml(t.desc) + '</td>' +
        '<td style="text-align:left;direction:ltr;white-space:nowrap;color:var(--accent4)">' + fmt(t.amount) + '</td>' +
        '<td><select class="cat-select" style="font-size:.75rem;padding:2px 4px" onchange="updateTxCatFromMapping(' + txIdx + ',this.value)"><option value="">—</option>' + opts + '</select></td>' +
        '</tr>';
    }).join('');

    // Update existing auto-row in-place if present (additive: second report doesn't reset)
    var existingWrap = null;
    document.getElementById(listId).querySelectorAll('.cat-auto-wrap').forEach(function(w){ if (w.dataset.cat === cat) existingWrap = w; });
    if (existingWrap) {
      var amtInput = existingWrap.querySelector('input[type="number"]');
      if (amtInput) amtInput.value = Math.round(storeAmt);
      var detBtn = existingWrap.querySelector('.btn-detail');
      if (detBtn) {
        var isOpen = detBtn.textContent.startsWith('▲');
        detBtn.dataset.count = txCount;
        detBtn.textContent = (isOpen ? '▲ ' : '▶ ') + txCount + ' פריטים';
      }
      var tagEl = existingWrap.querySelector('.var-monthly-tag');
      if (tagEl && isVar) {
        tagEl.title = 'סה"כ בדוח: ₪' + Math.round(totalAmt) + ' ÷ ' + months + ' חודשים';
        tagEl.textContent = '÷' + months + ' = ' + fmt(displayMonthly) + '/חודש';
      }
      var tbody = existingWrap.querySelector('.cat-detail-table tbody');
      if (tbody) tbody.innerHTML = detailRows;
      return;
    }

    var isDetailOpen = !!openCats[cat];
    var wrap = document.createElement('div');
    wrap.className = 'cat-auto-wrap';
    wrap.dataset.cat = cat;
    wrap.innerHTML =
      '<div class="input-row' + (isVar ? ' var-row' : '') + '" data-auto="1" style="border-radius:' + (isDetailOpen ? '8px 8px 0 0' : '8px') + '">' +
        '<input type="text" value="' + icon + ' ' + cat + '" readonly style="color:var(--accent);font-weight:600">' +
        '<input type="number" value="' + Math.round(storeAmt) + '" min="0" step="1" oninput="' + oninputAttr + '">' +
        monthlyTag +
        '<button class="btn-detail" data-count="' + txCount + '" onclick="toggleCatDetail(this)">' + (isDetailOpen ? '▲ ' : '▶ ') + txCount + ' פריטים</button>' +
        '<button class="btn-del" onclick="' + ondelAttr + '">×</button>' +
      '</div>' +
      '<div class="cat-detail-panel" style="display:' + (isDetailOpen ? 'block' : 'none') + '">' +
        '<table class="cat-detail-table">' +
          '<thead><tr><th>תיאור</th><th>סכום</th><th>קטגוריה</th></tr></thead>' +
          '<tbody>' + detailRows + '</tbody>' +
        '</table>' +
      '</div>';

    document.getElementById(listId).appendChild(wrap);
  });

  // Remove stale auto-rows for categories no longer in catMap
  ['var-list','fixed-list','sub-list','insurance-list'].forEach(function(listId) {
    document.getElementById(listId).querySelectorAll('.cat-auto-wrap').forEach(function(w) {
      if (!catMap[w.dataset.cat] || catMap[w.dataset.cat] <= 0) w.remove();
    });
  });
  document.getElementById('annual-list').querySelectorAll('.input-row[data-auto]').forEach(function(r) {
    if (!catMap[r.dataset.cat] || catMap[r.dataset.cat] <= 0) r.remove();
  });

  // Trigger all section totals + live summary
  updateSectionTotal('fixed-list', 'total-fixed', 1);
  updateSectionTotal('sub-list', 'total-subs', 1);
  updateSectionTotal('insurance-list', 'total-ins', 1);
  updateVarTotals();
  updateAnnualTotals();

  // Show notification
  showAutoFillNotice(months);
}

function showAutoFillNotice(months) {
  var existing = document.getElementById('autofill-notice');
  if (existing) existing.remove();
  var notice = document.createElement('div');
  notice.id = 'autofill-notice';
  notice.style.cssText = 'background:rgba(108,99,255,.15);border:1px solid rgba(108,99,255,.4);border-radius:10px;padding:12px 16px;font-size:.85rem;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:10px;';
  var monthsText = (months && months > 1)
    ? 'הוצאות משתנות חולקו ב-<strong>' + months + ' חודשים</strong> לקבלת ממוצע חודשי'
    : 'סכומים הועברו כמות שהם (דוח חודש אחד)';
  notice.innerHTML = '<span style="font-size:1.2rem">✅</span><span>נתוני הכרטיס הועברו לטאב <strong>מיפוי ידני</strong> — ' + monthsText + '. ניתן לערוך כל שורה.</span>';
  document.getElementById('credit-results').insertAdjacentElement('beforebegin', notice);
  setTimeout(function(){ if (notice.parentNode) notice.style.opacity = '0'; notice.style.transition='opacity 1s'; setTimeout(function(){ if (notice.parentNode) notice.remove(); }, 1100); }, 7000);
}

/* ════════════════════════════════════════
   CREDIT SUMMARY — ACCORDION
════════════════════════════════════════ */
function renderCreditSummary() {
  var creditTransactions = (_ccCtx === 'import-') ? importCreditTransactions : window.creditTransactions;
  const ctx = _ccCtx;
  const total = creditTransactions.reduce(function(s,t){ return s + (t.isRefund ? -t.amount : t.amount); }, 0);

  // Stats bar
  const totalInstallDebt = creditTransactions.reduce(function(sum, t) {
    if (!t.installment) return sum;
    const remaining = t.installment.total - t.installment.current;
    return sum + (remaining > 0 ? t.amount * remaining : 0);
  }, 0);
  document.getElementById(ctx + 'stats-bar').innerHTML =
    '<div class="stat-chip">קבצים: <strong>' + uploadedFiles.length + '</strong></div>' +
    '<div class="stat-chip">עסקאות: <strong>' + creditTransactions.length + '</strong></div>' +
    '<div class="stat-chip">סה"כ חיובים: <strong>' + fmt(total) + '</strong></div>' +
    (totalInstallDebt > 0 ? '<div class="stat-chip" title="סך כל התשלומים העתידיים שנותרו לתשלומים פעילים" style="border-color:rgba(247,151,30,.4);color:var(--accent4)">📅 חוב תשלומים: <strong>' + fmt(totalInstallDebt) + '</strong></div>' : '');

  // Build category map
  const catMap = {}, catTxs = {};
  creditTransactions.forEach(function(t, idx) {
    catMap[t.category] = (catMap[t.category] || 0) + (t.isRefund ? -t.amount : t.amount);
    if (!catTxs[t.category]) catTxs[t.category] = [];
    catTxs[t.category].push(idx);
  });

  const sorted = Object.entries(catMap).sort(function(a,b){ return b[1]-a[1]; });
  const list = document.getElementById(ctx + 'accordion-list');
  // Preserve open state
  const openCats = {};
  list.querySelectorAll('.acc-header.open').forEach(function(h){ openCats[h.dataset.cat] = true; });
  list.innerHTML = '';

  // Show/hide AI button based on unmatched count
  const unmatchedCount = creditTransactions.filter(function(t){ return t.category === 'שונות'; }).length;
  const aiBtnWrap = document.getElementById(ctx + 'ai-btn-wrap');
  if (aiBtnWrap) {
    aiBtnWrap.style.display = unmatchedCount > 0 ? 'block' : 'none';
    const lbl = document.getElementById(ctx + 'ai-btn-label');
    if (lbl) lbl.textContent = 'שפר קטגוריות עם AI — ' + unmatchedCount + ' עסקאות בקטגוריית "שונות"';
  }

  sorted.forEach(function(entry) {
    const cat = entry[0], catTotal = entry[1];
    const icon = CATEGORY_ICONS[cat] || '📦';
    const txIdxs = catTxs[cat];
    const pctVal = total > 0 ? (catTotal / total * 100).toFixed(1) : '0';
    const isOpen = !!openCats[cat];

    // Header
    const header = document.createElement('div');
    header.className = 'acc-header' + (isOpen ? ' open' : '');
    header.dataset.cat = cat;
    header.innerHTML =
      '<div class="acc-left">' +
        '<span class="acc-icon">' + icon + '</span>' +
        '<span class="acc-cat">' + cat + '</span>' +
        '<span class="acc-count">' + txIdxs.length + ' פריטים</span>' +
      '</div>' +
      '<div class="acc-right">' +
        '<div class="acc-bar-wrap"><div class="acc-bar-fill" style="width:' + pctVal + '%"></div></div>' +
        '<span class="acc-pct">' + pctVal + '%</span>' +
        '<span class="acc-total">' + fmt(catTotal) + '</span>' +
        '<span class="acc-arrow">' + (isOpen ? '▼' : '▶') + '</span>' +
      '</div>';
    header.onclick = (function(c, cx) { return function() { toggleAccordion(c, cx); }; })(cat, ctx);

    // Body
    const body = document.createElement('div');
    body.className = 'acc-body';
    body.id = ctx + 'acc-body-' + cat.replace(/[^a-zA-Zא-ת0-9]/g,'_');
    body.style.display = isOpen ? 'block' : 'none';

    const table = document.createElement('table');
    table.className = 'trans-table';
    table.innerHTML = '<thead><tr><th>תיאור</th><th>סכום</th><th>קטגוריה</th><th>קובץ</th><th style="width:100px"></th></tr></thead>';
    const tbody = document.createElement('tbody');
    txIdxs.forEach(function(realIdx) {
      const t = creditTransactions[realIdx];
      const tr = document.createElement('tr');
      tr.id = 'tx-row-' + realIdx;
      const instBadge = t.installment
        ? '<span style="font-size:.68rem;background:rgba(247,151,30,.12);color:var(--accent4);border:1px solid rgba(247,151,30,.35);border-radius:99px;padding:1px 7px;margin-left:6px;white-space:nowrap">📅 ' + t.installment.current + '/' + t.installment.total + '</span>'
        : '';
      const remaining = t.installment ? Math.max(0, t.installment.total - t.installment.current) : 0;
      const instAmtNote = t.installment
        ? '<div style="font-size:.7rem;color:var(--text-muted);margin-top:2px">' +
            'תשלום חודשי: <strong>' + fmt(t.amount) + '</strong>' +
            (t.originalAmount ? ' | מחיר מקורי: <strong>' + fmt(t.originalAmount) + '</strong>' : '') +
            (remaining > 0 ? ' | נותרו ' + remaining + ' תשלומים (<strong>' + fmt(t.amount * remaining) + '</strong>)' : ' | <span style="color:#4caf50">✓ הסתיים</span>') +
          '</div>'
        : '';
      tr.innerHTML =
        '<td>' + escHtml(t.desc) + instBadge + instAmtNote + '</td>' +
        '<td class="amount-cell" id="' + ctx + 'tx-amt-cell-' + realIdx + '">' + fmt(t.amount) + '</td>' +
        '<td>' + buildCatSelect(t.category, realIdx, ctx) + '</td>' +
        '<td class="source-cell">' + escHtml(t.source.replace(/\.[^.]+$/,'')) + '</td>' +
        '<td><div class="tx-actions">' +
          '<button class="tx-btn edit" title="ערוך סכום" onclick="startEditAmount(' + realIdx + ',\'' + ctx + '\',this)">✏️</button>' +
          '<button class="tx-btn search" title="חפש באינטרנט" onclick="searchBusiness(\'' + escHtml(t.desc).replace(/'/g,'\\\'') + '\')">🔍</button>' +
          '<button class="tx-btn del" title="מחק עסקה" onclick="deleteTx(' + realIdx + ',\'' + ctx + '\')">🗑️</button>' +
        '</div></td>';
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    body.appendChild(table);

    const item = document.createElement('div');
    item.className = 'acc-item';
    item.appendChild(header);
    item.appendChild(body);
    list.appendChild(item);
  });
}

function filterTransactions(query) {
  var q = (query || '').trim().toLowerCase();
  document.querySelectorAll('#' + _ccCtx + 'accordion-list .acc-item').forEach(function(item) {
    var header = item.querySelector('.acc-header');
    var body = item.querySelector('.acc-body');
    var rows = item.querySelectorAll('tbody tr');
    if (!q) {
      // Reset: show all items, restore collapsed state
      item.style.display = '';
      rows.forEach(function(row) { row.style.display = ''; });
      return;
    }
    var catName = header ? (header.querySelector('.acc-cat') || {textContent:''}).textContent.toLowerCase() : '';
    var catMatch = catName.includes(q);
    var visibleCount = 0;
    rows.forEach(function(row) {
      var desc = row.querySelector('td');
      var match = catMatch || (desc && desc.textContent.toLowerCase().includes(q));
      row.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    item.style.display = visibleCount === 0 ? 'none' : '';
    if (visibleCount > 0 && body) {
      body.style.display = 'block';
      if (header) {
        header.classList.add('open');
        var arrow = header.querySelector('.acc-arrow');
        if (arrow) arrow.textContent = '▼';
      }
    }
  });
}

function toggleAccordion(cat, ctx) {
  ctx = (ctx !== undefined) ? ctx : _ccCtx;
  const safeId = cat.replace(/[^a-zA-Zא-ת0-9]/g,'_');
  const body = document.getElementById(ctx + 'acc-body-' + safeId);
  const header = body ? body.previousSibling : null;
  if (!body || !header) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  header.classList.toggle('open', !isOpen);
  header.querySelector('.acc-arrow').textContent = isOpen ? '▶' : '▼';
}

function buildCatSelect(selected, txIdx, ctx) {
  var px = (ctx || '');
  var icon = CATEGORY_ICONS[selected] || '📦';
  var label = selected || 'שונות';
  return '<div class="cat-picker" id="' + px + 'cp-' + txIdx + '" data-ctx="' + px + '">' +
    '<button type="button" class="cat-picker-btn" onclick="catPickerOpen(\'' + px + '\',' + txIdx + ',event)" title="' + label + '">' +
      icon + ' ' + label +
    '</button>' +
    '<div class="cat-picker-dropdown" id="' + px + 'cpd-' + txIdx + '">' +
      '<input class="cat-picker-search" type="text" placeholder="🔍 חפש קטגוריה..." ' +
        'oninput="catPickerFilter(\'' + px + '\',' + txIdx + ',this.value)" ' +
        'onkeydown="catPickerKey(\'' + px + '\',' + txIdx + ',event)" ' +
        'autocomplete="off">' +
      '<div class="cat-picker-list" id="' + px + 'cpl-' + txIdx + '">' +
        catPickerOpts(selected, txIdx, '', px) +
      '</div>' +
    '</div>' +
  '</div>';
}

function catPickerOpts(selected, txIdx, filter, ctx) {
  var px = (ctx || '');
  var q = (filter || '').toLowerCase().trim();
  var html = '';
  var cats = q ? ALL_CATEGORIES.filter(function(c){ return c.toLowerCase().includes(q); }) : ALL_CATEGORIES;
  if (!cats.length) return '<div class="cat-picker-empty">לא נמצאה קטגוריה</div>';
  cats.forEach(function(c) {
    var icon = CATEGORY_ICONS[c] || '📦';
    html += '<div class="cat-picker-opt' + (c === selected ? ' selected' : '') + '" ' +
      'onclick="catPickerSelect(\'' + px + '\',' + txIdx + ',\'' + c.replace(/'/g,"\\'") + '\',this)" ' +
      'data-cat="' + c.replace(/"/g,'&quot;') + '">' +
      icon + ' ' + c + '</div>';
  });
  return html;
}

function catPickerOpen(ctx, txIdx, e) {
  e.stopPropagation();
  var px = (ctx || '');
  document.querySelectorAll('.cat-picker-dropdown.open').forEach(function(d) {
    if (d.id !== px + 'cpd-' + txIdx) d.classList.remove('open');
  });
  var dd = document.getElementById(px + 'cpd-' + txIdx);
  if (!dd) return;
  var isOpen = dd.classList.contains('open');
  dd.classList.toggle('open', !isOpen);
  if (!isOpen) {
    var inp = dd.querySelector('.cat-picker-search');
    if (inp) { inp.value = ''; inp.focus(); }
    var list = document.getElementById(px + 'cpl-' + txIdx);
    if (list) {
      var sel = list.querySelector('.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }
  }
}

function catPickerFilter(ctx, txIdx, q) {
  var px = (ctx || '');
  var selected = creditTransactions[txIdx] ? creditTransactions[txIdx].category : '';
  var list = document.getElementById(px + 'cpl-' + txIdx);
  if (list) list.innerHTML = catPickerOpts(selected, txIdx, q, px);
}

function catPickerKey(ctx, txIdx, e) {
  var px = (ctx || '');
  var list = document.getElementById(px + 'cpl-' + txIdx);
  if (!list) return;
  var opts = list.querySelectorAll('.cat-picker-opt');
  var hi = list.querySelector('.highlighted');
  var idx = Array.prototype.indexOf.call(opts, hi);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (hi) hi.classList.remove('highlighted');
    var next = opts[Math.min(idx + 1, opts.length - 1)];
    if (next) { next.classList.add('highlighted'); next.scrollIntoView({ block: 'nearest' }); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (hi) hi.classList.remove('highlighted');
    var prev = opts[Math.max(idx - 1, 0)];
    if (prev) { prev.classList.add('highlighted'); prev.scrollIntoView({ block: 'nearest' }); }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    var target = hi || opts[0];
    if (target) catPickerSelect(px, txIdx, target.dataset.cat, target);
  } else if (e.key === 'Escape') {
    var dd = document.getElementById(px + 'cpd-' + txIdx);
    if (dd) dd.classList.remove('open');
  }
}

function catPickerSelect(ctx, txIdx, cat, optEl) {
  var px = (ctx || '');
  var dd = document.getElementById(px + 'cpd-' + txIdx);
  var btn = document.querySelector('#' + px + 'cp-' + txIdx + ' .cat-picker-btn');
  if (btn) btn.textContent = (CATEGORY_ICONS[cat] || '📦') + ' ' + cat;
  if (dd) dd.classList.remove('open');
  updateTxCat(txIdx, cat, px);
}

// Close picker when clicking outside
document.addEventListener('click', function() {
  document.querySelectorAll('.cat-picker-dropdown.open').forEach(function(d) {
    d.classList.remove('open');
  });
});

function updateTxCat(idx, newCat, ctx) {
  if (idx < 0 || idx >= creditTransactions.length) return;
  creditTransactions[idx].category = newCat;
  saveToLearnedDB(creditTransactions[idx].desc, newCat);
  _ccCtx = ctx || '';
  renderCreditSummary();
  if (!_ccCtx) populateVarExpensesFromCredit();
}

function deleteTx(idx, ctx) {
  if (idx < 0 || idx >= creditTransactions.length) return;
  creditTransactions.splice(idx, 1);
  _ccCtx = ctx || '';
  renderCreditSummary();
  if (!_ccCtx) populateVarExpensesFromCredit();
}

function searchBusiness(desc) {
  window.open('https://www.google.com/search?q=' + encodeURIComponent(desc), '_blank');
}

function startEditAmount(idx, ctx, btn) {
  var px = ctx || '';
  var cell = btn ? btn.closest('tr').querySelector('.amount-cell') : document.getElementById(px + 'tx-amt-cell-' + idx);
  if (!cell || cell.querySelector('input')) return; // already editing
  const t = creditTransactions[idx];
  cell.innerHTML =
    '<div style="display:flex;gap:4px;align-items:center;direction:ltr">' +
    '<input class="tx-amount-input" id="' + px + 'tx-amt-input-' + idx + '" type="number" step="0.01" value="' + t.amount + '">' +
    '<button class="tx-btn edit" title="אשר" onclick="confirmEditAmount(' + idx + ',\'' + px + '\')">✓</button>' +
    '<button class="tx-btn del" title="בטל" onclick="cancelEditAmount(' + idx + ',\'' + px + '\')">✗</button>' +
    '</div>';
  const input = document.getElementById(px + 'tx-amt-input-' + idx);
  if (input) { input.focus(); input.select(); }
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') confirmEditAmount(idx, px);
    if (e.key === 'Escape') cancelEditAmount(idx, px);
  });
}

function confirmEditAmount(idx, ctx) {
  var px = ctx || '';
  const input = document.getElementById(px + 'tx-amt-input-' + idx);
  if (!input) return;
  const val = parseFloat(input.value);
  if (isNaN(val) || val < 0) { cancelEditAmount(idx, px); return; }
  creditTransactions[idx].amount = val;
  _ccCtx = px;
  renderCreditSummary();
  if (!_ccCtx) populateVarExpensesFromCredit();
}

function cancelEditAmount(idx, ctx) {
  var px = ctx || '';
  const cell = document.getElementById(px + 'tx-amt-cell-' + idx);
  if (cell) cell.innerHTML = fmt(creditTransactions[idx].amount);
}


