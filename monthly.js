/* ════════════════════════════════════════
   MONTHLY BUDGETS
════════════════════════════════════════ */

var MONTHS_LIST = [
  { id: 'jan', name: 'ינואר' },
  { id: 'feb', name: 'פברואר' },
  { id: 'mar', name: 'מרץ' },
  { id: 'apr', name: 'אפריל' },
  { id: 'may', name: 'מאי' },
  { id: 'jun', name: 'יוני' },
  { id: 'jul', name: 'יולי' },
  { id: 'aug', name: 'אוגוסט' },
  { id: 'sep', name: 'ספטמבר' },
  { id: 'oct', name: 'אוקטובר' },
  { id: 'nov', name: 'נובמבר' },
  { id: 'dec', name: 'דצמבר' }
];

var MONTH_DEFAULT_ROWS = {
  income:  ['שכר עבודה (נטו)', 'קצבת ילדים', 'הכנסה נוספת'],
  fixed:   ['שכירות / משכנתא', 'ארנונה', 'ועד בית', 'חשמל', 'מים וגז'],
  variable:['מזון וסופר', 'דלק ורכב', 'בריאות', 'ילדים וחינוך', 'פנאי ובילויים', 'הלבשה', 'מסעדות'],
  sub:     ['טלפון', 'אינטרנט', 'סטרימינג'],
  ins:     ['ביטוח חיים', 'ביטוח בריאות', 'ביטוח רכב']
};

function mId(mid, suffix) { return 'mo-' + mid + '-' + suffix; }

function createMonthPanel(monthId, monthName) {
  var p = mId.bind(null, monthId);
  var html = '<div class="tab-panel" id="panel-mo-' + monthId + '">' +

    // Title bar
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">' +
      '<span style="font-size:1.2rem;font-weight:800;color:var(--accent)">📅 תקציב ' + monthName + '</span>' +
      '<input class="bud-field" id="' + p('year') + '" type="number" placeholder="שנה" style="width:90px">' +
      '<span class="bud-sec-total" id="' + p('cf') + '" style="display:none"></span>' +
    '</div>' +

    '<div class="grid2">' +

    // INCOME
    moSection(p('income'), '💰 הכנסות', p('tot-income'), 'mo-row-2') +

    // FIXED
    moSection(p('fixed'), '📌 הוצאות קבועות', p('tot-fixed'), 'mo-row-2') +

    // VARIABLE
    moSection(p('variable'), '🛒 הוצאות משתנות', p('tot-var'), 'mo-row-2') +

    // SUBS + INS (side by side)
    moSection(p('sub'), '🔄 מנויים', p('tot-sub'), 'mo-row-2') +
    moSection(p('ins'), '🛡️ ביטוחים', p('tot-ins'), 'mo-row-2') +

    // INSTALLMENTS (full width)
    '<div class="section-card" style="grid-column:1/-1">' +
      '<div class="section-header">' +
        '<div class="section-title">🛍️ עסקאות בתשלומים</div>' +
        '<span class="bud-sec-total" id="' + p('tot-inst') + '">₪0</span>' +
      '</div>' +
      '<div class="bud-col-heads" style="display:grid;grid-template-columns:2fr 110px 110px 70px 70px;gap:8px;font-size:.73rem">' +
        '<span>שם העסקה</span><span>סכום כולל</span><span>תשלום חודשי</span><span>תשלום נוכחי</span><span>סה"כ תשלומים</span>' +
      '</div>' +
      '<div id="' + p('inst') + '"></div>' +
      '<button class="btn-add" onclick="moAddInst(\'' + monthId + '\')">+ הוסף עסקה</button>' +
    '</div>' +

    // DEBTS (full width)
    '<div class="section-card" style="grid-column:1/-1">' +
      '<div class="section-header">' +
        '<div class="section-title">💳 החזר חובות</div>' +
        '<span class="bud-sec-total" id="' + p('tot-debt') + '">₪0</span>' +
      '</div>' +
      '<div class="bud-col-heads" style="display:grid;grid-template-columns:1.5fr 110px 110px 90px;gap:8px;font-size:.73rem">' +
        '<span>שם הנושה / הלוואה</span><span>יתרה לסגירה</span><span>החזר חודשי</span><span>חודשים</span>' +
      '</div>' +
      '<div id="' + p('debt') + '"></div>' +
      '<button class="btn-add" onclick="moAddDebt(\'' + monthId + '\')">+ הוסף חוב</button>' +
    '</div>' +

    // SAVINGS (full width)
    '<div class="section-card" style="grid-column:1/-1">' +
      '<div class="section-header">' +
        '<div class="section-title">🏦 הפרשה לחיסכון</div>' +
        '<span class="bud-sec-total" id="' + p('tot-sav') + '">₪0</span>' +
      '</div>' +
      '<div class="bud-col-heads bud-3col"><span>שם / סוג חיסכון</span><span>הפרשה חודשית</span><span>סך נצבר</span></div>' +
      '<div id="' + p('saving') + '"></div>' +
      '<button class="btn-add" onclick="moAddSaving(\'' + monthId + '\')">+ הוסף חיסכון</button>' +
    '</div>' +

    '</div>' + // /grid2

    // Cash flow summary card
    '<div id="' + p('summary') + '" class="section-card" style="margin-top:4px">' +
      '<div class="section-header">' +
        '<div class="section-title">📊 סיכום תזרים — ' + monthName + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:4px 0 8px">' +
        moKpi(p('k-income'),  'הכנסות',           'var(--accent3)') +
        moKpi(p('k-exp'),     'הוצאות',            'var(--accent2)') +
        moKpi(p('k-sav'),     'הפרשה לחיסכון',    'var(--accent)') +
        moKpi(p('k-balance'), 'תזרים נטו',         'var(--accent4)') +
      '</div>' +
    '</div>' +
    '<div id="' + p('alerts') + '" style="margin-top:8px"></div>' +

  '</div>'; // /panel
  return html;
}

function moSection(listId, title, totalId, rowClass) {
  return '<div class="section-card">' +
    '<div class="section-header">' +
      '<div class="section-title">' + title + '</div>' +
      '<div class="bud-sec-compare" id="' + totalId + '">' +
        '<div class="bsc-item bsc-plan"><span class="bsc-lbl">תכנון</span><span class="bsc-val">₪0</span></div>' +
        '<div class="bsc-item bsc-actual"><span class="bsc-lbl">ביצוע</span><span class="bsc-val">₪0</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="bud-col-heads bud-actual-heads">' +
      '<span>פריט</span>' +
      '<span style="text-align:center;color:var(--accent)">תכנון ₪</span>' +
      '<span style="text-align:center;color:var(--accent3)">ביצוע ₪</span>' +
      '<span></span>' +
    '</div>' +
    '<div id="' + listId + '"></div>' +
    '<button class="btn-add" onclick="moAddSimple(\'' + listId + '\')">+ הוסף</button>' +
  '</div>';
}

function moKpi(id, label, color) {
  return '<div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:12px 14px">' +
    '<div style="font-size:.75rem;color:var(--muted);font-weight:600">' + label + '</div>' +
    '<div id="' + id + '" style="font-size:1.3rem;font-weight:900;color:' + color + ';margin-top:4px">₪0</div>' +
  '</div>';
}

function moSimpleRow(name) {
  return '<div class="bud-row-2">' +
    '<input class="bud-name" type="text" placeholder="פריט" value="' + (name||'') + '" oninput="moLive(this)">' +
    '<input class="bud-amt" type="number" placeholder="תכנון" min="0" oninput="moLive(this)">' +
    '<input class="bud-actual" type="number" placeholder="ביצוע" min="0" oninput="moLive(this)">' +
    '<button class="bud-del" onclick="budDel(this);moLiveFromDel(this)">✕</button>' +
  '</div>';
}

function moInstRow() {
  return '<div class="bud-row-2">' +
    '<input class="bud-name" type="text" placeholder="שם העסקה" oninput="moLive(this)">' +
    '<input style="width:90px" type="number" placeholder="סכום כולל" oninput="moLive(this)">' +
    '<input style="width:90px" type="number" placeholder="תשלום חודשי" oninput="moLive(this)">' +
    '<input style="width:60px;text-align:center" type="number" placeholder="נוכחי" oninput="moLive(this)">' +
    '<input style="width:60px;text-align:center" type="number" placeholder="סה&quot;כ" oninput="moLive(this)">' +
    '<button class="bud-del" onclick="budDel(this);moLiveFromDel(this)">✕</button>' +
  '</div>';
}

function moDebtRow() {
  return '<div class="bud-row-2">' +
    '<input class="bud-name" type="text" placeholder="שם הנושה / הלוואה" oninput="moLive(this)">' +
    '<input style="width:90px" type="number" placeholder="יתרה לסגירה" oninput="moLive(this)">' +
    '<input style="width:90px" type="number" placeholder="החזר חודשי" oninput="moLive(this)">' +
    '<input style="width:80px;text-align:center" type="number" placeholder="חודשים" oninput="moLive(this)">' +
    '<button class="bud-del" onclick="budDel(this);moLiveFromDel(this)">✕</button>' +
  '</div>';
}

function moSavingRow() {
  return '<div class="bud-row-2">' +
    '<input class="bud-name" type="text" placeholder="חיסכון" oninput="moLive(this)">' +
    '<input class="bud-amt" type="number" placeholder="חודשי" oninput="moLive(this)">' +
    '<input class="bud-amt" type="number" placeholder="נצבר" oninput="moLive(this)">' +
    '<button class="bud-del" onclick="budDel(this);moLiveFromDel(this)">✕</button>' +
  '</div>';
}

function moAddSimple(listId) {
  var list = document.getElementById(listId);
  var d = document.createElement('div'); d.innerHTML = moSimpleRow(''); list.appendChild(d.firstChild);
}
function moAddInst(mid) {
  var list = document.getElementById(mId(mid,'inst'));
  var d = document.createElement('div'); d.innerHTML = moInstRow(); list.appendChild(d.firstChild);
}
function moAddDebt(mid) {
  var list = document.getElementById(mId(mid,'debt'));
  var d = document.createElement('div'); d.innerHTML = moDebtRow(); list.appendChild(d.firstChild);
}
function moAddSaving(mid) {
  var list = document.getElementById(mId(mid,'saving'));
  var d = document.createElement('div'); d.innerHTML = moSavingRow(); list.appendChild(d.firstChild);
}

function moGetAmt(listId, col) {
  col = col === undefined ? 1 : col;
  var list = document.getElementById(listId);
  if (!list) return 0;
  var total = 0;
  list.querySelectorAll('.bud-row-2').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    total += parseFloat(inputs[col] ? inputs[col].value : 0) || 0;
  });
  return total;
}

function moLiveFromDel(btn) {
  var panel = btn.closest('.tab-panel');
  if (panel) moRecalc(panel.id.replace('panel-mo-', ''));
  if (typeof clientAutoSave === 'function') clientAutoSave();
}

function moLive(input) {
  var panel = input.closest('.tab-panel');
  if (panel) moRecalc(panel.id.replace('panel-mo-', ''));
  if (typeof clientAutoSave === 'function') clientAutoSave();
}

function moRecalc(mid) {
  var p = mId.bind(null, mid);
  function mf(n) { return '₪' + Math.round(n||0).toLocaleString('he-IL'); }
  function ms(id, v) { var el=document.getElementById(id); if(el) el.textContent=v; }

  // Budget (col 1) and Actual (col 2) for simple sections
  var bIncome = moGetAmt(p('income'), 1);  var aIncome = moGetAmt(p('income'), 2);
  var bFixed  = moGetAmt(p('fixed'),  1);  var aFixed  = moGetAmt(p('fixed'),  2);
  var bVar    = moGetAmt(p('variable'),1); var aVar    = moGetAmt(p('variable'),2);
  var bSub    = moGetAmt(p('sub'),    1);  var aSub    = moGetAmt(p('sub'),    2);
  var bIns    = moGetAmt(p('ins'),    1);  var aIns    = moGetAmt(p('ins'),    2);
  var tInst   = moGetAmt(p('inst'),   2);
  var tDebt   = moGetAmt(p('debt'),   2);
  var tSav    = moGetAmt(p('saving'), 1);

  // bExp excludes savings so each box is independent: income − expenses − savings = cashflow
  var bExp     = bFixed + bVar + bSub + bIns + tInst + tDebt;
  var aExp     = aFixed + aVar + aSub + aIns + tInst + tDebt;
  var bBalance = bIncome - bExp - tSav;
  var aBalance = aIncome > 0 || aExp > 0 ? aIncome - aExp - tSav : null;

  // Update compare sections (sections with .bud-sec-compare)
  function setCompare(id, budget, actual, isIncome) {
    var el = document.getElementById(id);
    if (!el || !el.classList.contains('bud-sec-compare')) { if(el) el.textContent = mf(budget); return; }
    var planEl   = el.querySelector('.bsc-plan .bsc-val');
    var actualEl = el.querySelector('.bsc-actual .bsc-val');
    if (planEl)   planEl.textContent   = mf(budget);
    if (actualEl) actualEl.textContent = actual > 0 ? mf(actual) : '—';
    // remove existing badge
    var old = el.querySelector('.bsc-diff'); if (old) old.remove();
    if (actual > 0 && budget > 0) {
      var diff = isIncome ? actual - budget : budget - actual;
      var badge = document.createElement('span');
      badge.className = 'bsc-diff ' + (diff >= 0 ? 'ok' : 'over');
      badge.textContent = (diff >= 0 ? '+' : '') + mf(diff);
      el.appendChild(badge);
    }
  }

  setCompare(p('tot-income'), bIncome, aIncome, true);
  setCompare(p('tot-fixed'),  bFixed,  aFixed,  false);
  setCompare(p('tot-var'),    bVar,    aVar,    false);
  setCompare(p('tot-sub'),    bSub,    aSub,    false);
  setCompare(p('tot-ins'),    bIns,    aIns,    false);
  ms(p('tot-inst'), mf(tInst));
  ms(p('tot-debt'), mf(tDebt));
  ms(p('tot-sav'),  mf(tSav));

  // KPI summary
  ms(p('k-income'),  mf(bIncome));
  ms(p('k-exp'),     mf(bExp));
  ms(p('k-sav'),     mf(tSav));
  ms(p('k-balance'), mf(bBalance));

  // If actual data exists, update KPI with actual values (append sub-label)
  function kpiSub(id, budget, actual, isIncome) {
    var el = document.getElementById(id);
    if (!el) return;
    var sub = el.parentElement.querySelector('.kpi-actual-sub');
    if (actual > 0) {
      var diff = isIncome ? actual - budget : budget - actual;
      var color = diff >= 0 ? 'var(--accent3)' : 'var(--accent2)';
      var sign  = diff >= 0 ? '+' : '';
      if (!sub) {
        sub = document.createElement('div');
        sub.className = 'kpi-actual-sub';
        sub.style.cssText = 'font-size:.7rem;margin-top:2px;font-weight:600;';
        el.parentElement.appendChild(sub);
      }
      sub.style.color = color;
      sub.textContent = 'ביצוע: ' + mf(actual) + '  (' + sign + mf(diff) + ')';
    } else if (sub) { sub.remove(); }
  }
  kpiSub(p('k-income'), bIncome, aIncome, true);
  kpiSub(p('k-exp'),    bExp,    aExp,    false);

  // Cash flow bar
  var cfEl = document.getElementById(p('cf'));
  if (cfEl) {
    var displayBal  = bBalance;
    var hasActual   = aIncome > 0 || aExp > 0;
    if (hasActual) {
      cfEl.textContent = 'תכנון: ' + (bBalance >= 0 ? '+' : '') + mf(bBalance) + '  |  ביצוע: ' + (aBalance >= 0 ? '+' : '') + mf(aBalance);
      displayBal = aBalance;
    } else {
      cfEl.textContent = 'תזרים: ' + (bBalance >= 0 ? '+' : '') + mf(bBalance);
    }
    cfEl.style.color       = displayBal >= 0 ? 'var(--accent3)' : 'var(--accent2)';
    cfEl.style.borderColor = displayBal >= 0 ? 'rgba(67,233,123,.35)' : 'rgba(255,101,132,.35)';
    cfEl.style.background  = displayBal >= 0 ? 'rgba(67,233,123,.08)' : 'rgba(255,101,132,.08)';
  }

  // Budget overage alerts
  moCheckAlerts(mid, {
    bIncome: bIncome, aIncome: aIncome,
    bFixed: bFixed,   aFixed: aFixed,
    bVar: bVar,       aVar: aVar,
    bSub: bSub,       aSub: aSub,
    bIns: bIns,       aIns: aIns,
    bExp: bExp,       aExp: aExp,
    aBalance: aBalance
  });
}

function moCheckAlerts(mid, d) {
  var alertsEl = document.getElementById(mId(mid, 'alerts'));
  if (!alertsEl) return;

  // Only show alerts when actual data exists
  var hasActual = d.aIncome > 0 || d.aExp > 0;
  if (!hasActual) { alertsEl.innerHTML = ''; return; }

  var alerts = [];
  function mf(n) { return '₪' + Math.round(n||0).toLocaleString('he-IL'); }

  // Overall overage
  if (d.bExp > 0 && d.aExp > d.bExp) {
    var over = d.aExp - d.bExp;
    var pct = Math.round((over / d.bExp) * 100);
    alerts.push({ level: pct >= 20 ? 'high' : 'med', msg: 'חריגה כוללת מהתקציב: ' + mf(over) + ' (' + pct + '%)' });
  }

  // Section overages
  var sections = [
    { label: 'הוצאות קבועות', b: d.bFixed, a: d.aFixed },
    { label: 'הוצאות משתנות', b: d.bVar,   a: d.aVar },
    { label: 'מנויים',        b: d.bSub,   a: d.aSub },
    { label: 'ביטוחים',       b: d.bIns,   a: d.aIns }
  ];
  sections.forEach(function(s) {
    if (s.b > 0 && s.a > s.b) {
      var over = s.a - s.b;
      var pct = Math.round((over / s.b) * 100);
      if (pct >= 10) {
        alerts.push({ level: pct >= 25 ? 'high' : 'med', msg: s.label + ': חריגה של ' + mf(over) + ' (' + pct + '%)' });
      }
    }
  });

  // Negative balance alert
  if (d.aBalance !== null && d.aBalance < 0) {
    alerts.push({ level: 'high', msg: 'תזרים שלילי: ' + mf(d.aBalance) });
  }

  // Income below plan
  if (d.bIncome > 0 && d.aIncome > 0 && d.aIncome < d.bIncome * 0.9) {
    var diff = d.bIncome - d.aIncome;
    alerts.push({ level: 'med', msg: 'הכנסה נמוכה מהתכנון ב-' + mf(diff) });
  }

  if (!alerts.length) { alertsEl.innerHTML = ''; return; }

  alertsEl.innerHTML = alerts.map(function(a) {
    var bg    = a.level === 'high' ? 'rgba(255,101,132,.12)' : 'rgba(255,180,50,.1)';
    var bc    = a.level === 'high' ? 'rgba(255,101,132,.4)'  : 'rgba(255,180,50,.35)';
    var icon  = a.level === 'high' ? '🔴' : '🟡';
    return '<div style="background:' + bg + ';border:1px solid ' + bc + ';border-radius:8px;padding:8px 12px;font-size:.82rem;color:var(--text);display:flex;align-items:center;gap:8px;">' +
      '<span>' + icon + '</span><span>' + a.msg + '</span></div>';
  }).join('');
}


function moUploadCredit(monthId) {
  _moCreditTarget = monthId;
  var inp = document.getElementById('mo-credit-file-input');
  if (inp) { inp.value = ''; inp.click(); }
}

function moHandleCreditUpload(input) {
  var monthId = _moCreditTarget;
  if (!monthId || !input.files || !input.files[0]) return;
  var file = input.files[0];

  moShowBanner(monthId, 'מנתח את הקובץ "' + file.name + '"…', 'info');

  parseExcelFile(file).then(function(rows) {
    var txs = extractTransactions(rows, file.name);
    if (!txs || txs.length === 0) {
      moShowBanner(monthId, 'לא נמצאו עסקאות בקובץ. בדוק שהקובץ הוא דוח אשראי תקין.', 'warn');
      return;
    }
    moApplyCreditData(monthId, txs, file.name);
  }).catch(function(err) {
    moShowBanner(monthId, 'שגיאה בקריאת הקובץ: ' + (err.message || err), 'warn');
  });
}

/* ════════════════════════════════════════
   FILL ACTUAL FROM CREDIT DATA (per month)
════════════════════════════════════════ */

// Shared: apply a set of already-parsed transactions to a month's actual columns
function moApplyCreditData(monthId, txs, sourceLabel) {
  var FIXED_C = ['שכר דירה','ארנונה','דמי ניהול בניין','החזר הלוואות','הוצאות בית','משכנתא','קופת חולים','מיסים'];
  var VAR_C   = ['מזון לבית','אוכל בחוץ ובילויים','פארם','דלק וחניה','ביגוד והנעלה','תחבצ','כבישי אגרה','תספורת וקוסמטיקה','תחביבים','חופשה וטיול','תיקוני רכב','בריאות','בעלי חיים','חינוך וקייטנות','שונות','ביט ללא מעקב','מזומן ללא מעקב','מתנות','עוזרת בית','סיגריות','צעצועים','כלי בית','ריהוט והבית','תרומות','ציוד עסקי/משרדי','חומרי בניין'];
  var SUB_C   = ['תקשורת','חדר כושר','עמלות בנק ואשראי'];
  var INS_C   = ['ביטוח','ביטוח לאומי'];

  var filtered = txs.filter(function(tx){ return !tx.isRefund; });

  // Sum by category
  var catSums = {};
  filtered.forEach(function(tx) {
    var cat = tx.category || 'שונות';
    catSums[cat] = (catSums[cat] || 0) + tx.amount;
  });

  var p = mId.bind(null, monthId);

  function fillSection(sectionId, categories) {
    var list = document.getElementById(sectionId);
    if (!list) return;
    // Clear existing auto-rows from previous import, then clear actuals on manual rows
    list.querySelectorAll('.mo-auto-row').forEach(function(r){ r.remove(); });
    list.querySelectorAll('.bud-actual').forEach(function(el){ el.value = ''; });

    categories.forEach(function(cat) {
      var sum = catSums[cat];
      if (!sum) return;
      var matched = false;
      list.querySelectorAll('.bud-row-2').forEach(function(row) {
        var nameEl = row.querySelector('.bud-name');
        if (nameEl && nameEl.value.trim() === cat && !matched) {
          var actualEl = row.querySelector('.bud-actual');
          if (actualEl) { actualEl.value = Math.round(sum); matched = true; }
        }
      });
      if (!matched) {
        list.insertAdjacentHTML('beforeend',
          '<div class="bud-row-2 mo-auto-row">' +
            '<input class="bud-name" type="text" value="' + cat + '" oninput="moLive(this)">' +
            '<input class="bud-amt" type="number" placeholder="תכנון" min="0" oninput="moLive(this)">' +
            '<input class="bud-actual" type="number" value="' + Math.round(sum) + '" min="0" oninput="moLive(this)">' +
            '<button class="bud-del" onclick="budDel(this);moLiveFromDel(this)">✕</button>' +
          '</div>');
      }
    });
  }

  fillSection(p('fixed'),    FIXED_C);
  fillSection(p('variable'), VAR_C);
  fillSection(p('sub'),      SUB_C);
  fillSection(p('ins'),      INS_C);
  moRecalc(monthId);

  // Save to localStorage immediately so data survives page refresh
  if (typeof clientAutoSave === 'function') clientAutoSave();

  var total = filtered.reduce(function(s,t){return s+t.amount;},0);
  moShowBanner(monthId,
    'יובאו ' + filtered.length + ' עסקאות מ' + sourceLabel + ' — סה"כ ₪' + Math.round(total).toLocaleString('he-IL'),
    'ok');
}

// Read from global creditTransactions filtered by this month
function moFillActual(monthId) {
  var yearEl  = document.getElementById('mo-' + monthId + '-year');
  var year    = yearEl ? (parseInt(yearEl.value) || new Date().getFullYear()) : new Date().getFullYear();
  var moIdx   = MONTHS_LIST.findIndex(function(m){ return m.id === monthId; });
  if (moIdx === -1) return;
  var monthStr = year + '-' + String(moIdx + 1).padStart(2, '0');
  var moName   = MONTHS_LIST[moIdx].name;

  var txs = (typeof creditTransactions !== 'undefined') ? creditTransactions : [];
  var monthTxs = txs.filter(function(tx){
    return !tx.isRefund && tx.date && tx.date.substring(0, 7) === monthStr;
  });
  if (monthTxs.length === 0) {
    moShowBanner(monthId, 'לא נמצאו עסקאות אשראי לחודש ' + moName + ' ' + year + '. העלה דוח אשראי עבור חודש זה.', 'warn');
    return;
  }
  moApplyCreditData(monthId, monthTxs, moName + ' ' + year);
}

function moShowBanner(monthId, msg, type) {
  var panel = document.getElementById('panel-mo-' + monthId);
  if (!panel) return;
  var existing = panel.querySelector('.mo-fill-banner');
  if (existing) existing.remove();
  var colors = type === 'ok'
    ? 'background:rgba(67,233,123,.1);border-color:rgba(67,233,123,.4);color:var(--accent3)'
    : type === 'info'
    ? 'background:rgba(108,99,255,.1);border-color:rgba(108,99,255,.4);color:var(--accent)'
    : 'background:rgba(255,199,0,.08);border-color:rgba(255,199,0,.35);color:#fbbf24';
  var icon = type === 'ok' ? '✅' : type === 'info' ? '⏳' : '⚠️';
  var el = document.createElement('div');
  el.className = 'mo-fill-banner';
  el.style.cssText = 'border:1px solid;border-radius:10px;padding:10px 16px;font-size:.85rem;margin-bottom:14px;display:flex;align-items:center;gap:10px;' + colors;
  el.innerHTML = '<span style="font-size:1.1rem">' + icon + '</span><span style="flex:1">' + msg + '</span>' +
    '<button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1rem;color:inherit;opacity:.6">✕</button>';
  panel.insertBefore(el, panel.firstChild);
}

function initMonths() {
  var tabContainer   = document.getElementById('month-tab-btns');
  var panelContainer = document.getElementById('month-panels-container');

  if (tabContainer && tabContainer.children.length > 0) return;

  MONTHS_LIST.forEach(function(mo) {
    // Tab button
    var btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.id = 'tab-mo-' + mo.id;
    btn.textContent = '📅 תקציב ' + mo.name;
    btn.onclick = function() { switchTab('mo-' + mo.id); };
    tabContainer.appendChild(btn);

    // Panel
    var d = document.createElement('div');
    d.innerHTML = createMonthPanel(mo.id, mo.name);
    panelContainer.appendChild(d.firstChild);

    // Default rows
    var defs = MONTH_DEFAULT_ROWS;
    function fillList(listId, names) {
      var list = document.getElementById(mId(mo.id, listId));
      if (!list) return;
      names.forEach(function(name) {
        var d2 = document.createElement('div'); d2.innerHTML = moSimpleRow(name); list.appendChild(d2.firstChild);
      });
    }
    var syncFromManual = ['jan','feb','mar','apr','may','jun'].indexOf(mo.id) !== -1;
    fillList('income',   defs.income);
    if (!syncFromManual) fillList('fixed',    defs.fixed);
    fillList('variable', defs.variable);
    if (!syncFromManual) fillList('sub',      defs.sub);
    if (!syncFromManual) fillList('ins',      defs.ins);
    // One blank row for inst, debt, saving
    moAddInst(mo.id); moAddDebt(mo.id);
    if (!syncFromManual) moAddSaving(mo.id);

    // Set current year
    var yearEl = document.getElementById(mId(mo.id, 'year'));
    if (yearEl) yearEl.value = new Date().getFullYear();
  });
}

