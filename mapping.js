/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
/* ══ Credit → Budget month push ══ */
function creditAutoDetectMonth() {
  // Find the most common YYYY-MM in the loaded transactions
  var counts = {};
  creditTransactions.forEach(function(tx) {
    if (!tx.date || tx.date.length < 7) return;
    var ym = tx.date.substring(0, 7); // "YYYY-MM"
    counts[ym] = (counts[ym] || 0) + 1;
  });
  var best = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; })[0];
  if (!best) return;

  var parts = best.split('-');
  var year  = parseInt(parts[0]);
  var moNum = parseInt(parts[1]) - 1; // 0-based index
  var moIds = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  var selMonth = document.getElementById('credit-target-month');
  var selYear  = document.getElementById('credit-target-year');
  if (selMonth && moIds[moNum]) selMonth.value = moIds[moNum];
  if (selYear)  selYear.value = year;
}

function renderPushToBudgetBtn() {
  var wrap = document.getElementById('credit-push-to-budget');
  if (!wrap) return;

  var MONTH_NAMES = {jan:'ינואר',feb:'פברואר',mar:'מרץ',apr:'אפריל',may:'מאי',jun:'יוני',
                     jul:'יולי',aug:'אוגוסט',sep:'ספטמבר',oct:'אוקטובר',nov:'נובמבר',dec:'דצמבר'};

  wrap.style.display = 'block';
  wrap.innerHTML =
    '<div style="background:rgba(108,99,255,.08);border:1px solid rgba(108,99,255,.3);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
      '<span style="font-size:1.3rem">📤</span>' +
      '<span style="flex:1;font-size:.88rem;color:var(--text)">שלח את נתוני הביצוע לטאב החודשי בתקציב</span>' +
      '<button onclick="creditPushToBudget()" style="background:linear-gradient(135deg,rgba(108,99,255,.8),rgba(139,92,246,.8));border:none;border-radius:9px;color:#fff;cursor:pointer;font-family:inherit;font-size:.88rem;font-weight:700;padding:9px 20px;white-space:nowrap">📊 שלח לתקציב</button>' +
    '</div>';
}

function creditPushToBudget() {
  var monthId = (document.getElementById('credit-target-month')||{}).value;
  var year    = parseInt((document.getElementById('credit-target-year')||{}).value);
  var MONTH_NAMES = {jan:'ינואר',feb:'פברואר',mar:'מרץ',apr:'אפריל',may:'מאי',jun:'יוני',
                     jul:'יולי',aug:'אוגוסט',sep:'ספטמבר',oct:'אוקטובר',nov:'נובמבר',dec:'דצמבר'};

  if (!monthId) { alert('יש לבחור חודש יעד לפני השליחה.'); return; }

  // Filter transactions to the selected month only (if year is set)
  var moIdx    = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthId);
  var monthStr = year ? (year + '-' + String(moIdx + 1).padStart(2, '0')) : null;

  var txs = creditTransactions.filter(function(tx) {
    if (tx.isRefund) return false;
    if (!monthStr)   return true; // no year filter — send all
    return tx.date && tx.date.substring(0, 7) === monthStr;
  });

  if (txs.length === 0) {
    var msg = monthStr
      ? 'לא נמצאו עסקאות לחודש ' + (MONTH_NAMES[monthId]||monthId) + ' ' + year + '.\nאם הדוח כולל מספר חודשים — נסה ללא שנה, או בדוק שתאריכי העסקאות תואמים.'
      : 'לא נמצאו עסקאות לשליחה.';
    alert(msg);
    return;
  }

  // Set the year in the target month tab if needed
  if (year) {
    var yearEl = document.getElementById('mo-' + monthId + '-year');
    if (yearEl && !yearEl.value) yearEl.value = year;
  }

  var label = (MONTH_NAMES[monthId]||monthId) + (year ? ' ' + year : '');
  moApplyCreditData(monthId, txs, label);

  // Navigate to the month tab
  switchTab('mo-' + monthId);

  // Flash success in the push button
  var wrap = document.getElementById('credit-push-to-budget');
  if (wrap) {
    var btn = wrap.querySelector('button');
    if (btn) { btn.textContent = '✅ נשלח!'; btn.style.background = 'rgba(67,233,123,.6)'; }
    setTimeout(function(){ renderPushToBudgetBtn(); }, 3000);
  }
}

function updateMonthsLabel() {
  var months = Math.max(1, parseInt(document.getElementById('months-input').value) || 3);
  document.getElementById('months-input').value = months;
  var lbl = document.getElementById('months-label');
  if (lbl) lbl.textContent = months === 1 ? 'ללא חלוקה' : 'ממוצע ל-' + months + ' חודשים';
  // Re-populate credit into categories with updated month count
  if (creditTransactions.length) populateVarExpensesFromCredit();
}

function init() {
  // ── הכנסות ──
  addRow('income-list', 'הכנסה', false, 'בעל עבודה 1');
  addRow('income-list', 'הכנסה', false, 'בעל עבודה 2');
  addRow('income-list', 'הכנסה', false, 'אישה עבודה 1');
  addRow('income-list', 'הכנסה', false, 'אישה עבודה 2');
  addRow('income-list', 'הכנסה', false, 'קצבת ילדים');
  addRow('income-list', 'הכנסה', false, 'קצבאות נוספות');
  addRow('income-list', 'הכנסה', false, 'סיוע בשכר דירה');
  addRow('income-list', 'הכנסה', false, 'מזונות');
  addRow('income-list', 'הכנסה', false, 'הכנסה מנכס');
  addRow('income-list', 'הכנסה', false, 'סיוע מההורים');
  addRow('income-list', 'הכנסה', false, 'הכנסות מהעסק');

  // ── הוצאות קבועות ──
  addRow('fixed-list', 'הוצאה קבועה', false, 'שכר דירה / משכנתא');
  addRow('fixed-list', 'הוצאה קבועה', false, 'ועד בית');
  addRow('fixed-list', 'הוצאה קבועה', false, 'ארנונה');
  addRow('fixed-list', 'הוצאה קבועה', false, 'חשמל');
  addRow('fixed-list', 'הוצאה קבועה', false, 'גז');
  addRow('fixed-list', 'הוצאה קבועה', false, 'מים וביוב');
  addRow('fixed-list', 'הוצאה קבועה', false, 'תרומות בהוראת קבע');

  // ── הוצאות שנתיות (÷12) ──
  addAnnualRow('annual-list', 'חינוך, חוגים וקייטנות');
  addAnnualRow('annual-list', 'קייטנות');
  addAnnualRow('annual-list', 'ביטוחי בריאות וחיים');
  addAnnualRow('annual-list', 'ביטוחי רכב');
  addAnnualRow('annual-list', 'חופשות');
  addAnnualRow('annual-list', 'רישיון רכב + טסט');
  addAnnualRow('annual-list', 'מתנות לאירועים');
  addAnnualRow('annual-list', 'מתנות לבני/בנות זוג');
  addAnnualRow('annual-list', 'מנויים שנתיים');

  // ── מינויים ──
  addRow('sub-list', 'מינוי', false, 'Netflix');
  addRow('sub-list', 'מינוי', false, 'Spotify / Apple Music');
  addRow('sub-list', 'מינוי', false, 'כבלים / Hot / Yes');
  addRow('sub-list', 'מינוי', false, 'ספק אינטרנט');
  addRow('sub-list', 'מינוי', false, 'טלפון נייד');

  // ── ביטוחים ──
  addRow('insurance-list', 'ביטוח', false, 'ביטוח חיים');
  addRow('insurance-list', 'ביטוח', false, 'ביטוח בריאות / מכבי');
  addRow('insurance-list', 'ביטוח', false, 'ביטוח רכב חובה');
  addRow('insurance-list', 'ביטוח', false, 'ביטוח רכב מקיף');
  addRow('insurance-list', 'ביטוח', false, 'ביטוח רכוש / דירה');

  // ── הוצאות משתנות ──
  addVarRow('מזון לבית');
  addVarRow('אוכל בחוץ ובילויים');
  addVarRow('פארם');
  addVarRow('דלק וחניה');
  addVarRow('ביגוד והנעלה');
  addVarRow('תחב"צ');
  addVarRow('כבישי אגרה');
  addVarRow('תספורת וקוסמטיקה');
  addVarRow('תחביבים');
  addVarRow('תיקוני רכב');
  addVarRow('בריאות');
  addVarRow('בעלי חיים');
  addVarRow('חינוך / דמי כיס ילדים');
  addVarRow('עוזרת / שמרטף');
  addVarRow('יהדות / חגים');
  addVarRow('שונות');
  addVarRow('ביט ללא מעקב');
  addVarRow('מזומן ללא מעקב');

  // ── חובות והלוואות ──
  addDebtRow('debt-list', 'משכנתא');

  // ── חסכונות ונכסים ──
  addSavingRow('קרן חירום');
  addSavingRow('חיסכון בבית (מזומן)');
  addSavingRow('חיסכון בבנק');
  addSavingRow('חיסכון לטווח ארוך');
  addSavingRow('קרן השתלמות');
  addSavingRow('פנסיה');
  addSavingRow('קופת גמל להשקעה');
  addSavingRow('חסכונות ילדים');

  const zone = document.getElementById('upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFileUpload(e.dataTransfer.files);
  });
  document.getElementById('file-input').addEventListener('change', e => {
    handleFileUpload(e.target.files);
    e.target.value = '';
  });
}

/* ════════════════════════════════════════
   ROW MANAGEMENT
════════════════════════════════════════ */
var LIST_TOTAL_MAP = {
  'income-list':    { id:'total-income', div:1 },
  'fixed-list':     { id:'total-fixed',  div:1 },
  'sub-list':       { id:'total-subs',   div:1 },
  'insurance-list': { id:'total-ins',    div:1 }
};

function addRow(listId, placeholder, focus, defaultName) {
  const list = document.getElementById(listId);
  const row = document.createElement('div');
  row.className = 'input-row';
  const cfg = LIST_TOTAL_MAP[listId];
  const oninputAttr = cfg ? ' oninput="updateSectionTotal(\'' + listId + '\',\'' + cfg.id + '\',' + cfg.div + ')"' : '';
  const ondelAttr   = cfg ? 'this.parentElement.remove();updateSectionTotal(\'' + listId + '\',\'' + cfg.id + '\',' + cfg.div + ')' : 'this.parentElement.remove()';
  row.innerHTML =
    '<input type="text" placeholder="' + placeholder + '" value="' + (defaultName || '') + '">' +
    '<input type="number" placeholder="₪ 0" min="0" step="1"' + oninputAttr + '>' +
    '<button class="btn-del" onclick="' + ondelAttr + '">×</button>';
  list.appendChild(row);
  if (focus) row.querySelector('input[type="text"]').focus();
}

function getRows(listId) {
  const list = document.getElementById(listId);
  const rows = list.querySelectorAll('.input-row');
  const result = [];
  rows.forEach(row => {
    if (row.hasAttribute('data-auto')) return; // credit-auto rows are saved via credit.transactions
    const inputs = row.querySelectorAll('input');
    const name = inputs[0].value.trim();
    const amt = parseFloat(inputs[1].value) || 0;
    if (name || amt) result.push({ name: name || '—', amt: amt });
  });
  return result;
}

/* ── LIVE SECTION TOTALS ── */
function updateSectionTotal(listId, displayId, divisor) {
  var list = document.getElementById(listId);
  var el = document.getElementById(displayId);
  if (!list || !el) return;
  var total = 0;
  list.querySelectorAll('.input-row').forEach(function(row) {
    var inputs = row.querySelectorAll('input[type="number"]');
    if (inputs.length) total += parseFloat(inputs[0].value) || 0;
  });
  el.textContent = fmt(total / (divisor || 1));
  updateLiveSummary();
}

function updateAnnualTotals() {
  var list = document.getElementById('annual-list');
  if (!list) return;
  var totalYr = 0;
  list.querySelectorAll('.annual-row').forEach(function(row) {
    var inputs = row.querySelectorAll('input[type="number"]');
    if (inputs.length) totalYr += parseFloat(inputs[0].value) || 0;
  });
  var elYr = document.getElementById('total-annual-yr');
  var elMo = document.getElementById('total-annual-mo');
  if (elYr) elYr.textContent = fmt(totalYr);
  if (elMo) elMo.textContent = fmt(totalYr / 12);
  updateLiveSummary();
}

function updateVarTotals() {
  var months = getVarMonths();
  var list = document.getElementById('var-list');
  if (!list) return;
  var totalRaw = 0;
  list.querySelectorAll('.input-row').forEach(function(row) {
    var inputs = row.querySelectorAll('input[type="number"]');
    if (inputs.length) totalRaw += parseFloat(inputs[0].value) || 0;
  });
  var elRaw = document.getElementById('total-var-raw');
  var elMo  = document.getElementById('total-var-mo');
  if (elRaw) elRaw.textContent = fmt(totalRaw);
  if (elMo)  elMo.textContent  = fmt(totalRaw / months);
  updateLiveSummary();
}

function updateDebtTotals() {
  var list = document.getElementById('debt-list');
  if (!list) return;
  var totalBal = 0, totalMo = 0;
  list.querySelectorAll('.debt-row').forEach(function(row) {
    totalBal += parseFloat((row.querySelector('.debt-balance') || {value:''}).value) || 0;
    totalMo  += parseFloat((row.querySelector('.debt-monthly') || {value:''}).value) || 0;
    // refresh total tag
    var months  = parseInt((row.querySelector('.debt-months') || {value:''}).value) || 0;
    var monthly = parseFloat((row.querySelector('.debt-monthly') || {value:''}).value) || 0;
    var tag = row.querySelector('.debt-total-tag');
    if (tag) tag.textContent = (monthly > 0 && months > 0) ? fmt(monthly * months) : '—';
  });
  var elBal = document.getElementById('total-debt-bal');
  var elMo  = document.getElementById('total-debt-mo');
  if (elBal) elBal.textContent = fmt(totalBal);
  if (elMo)  elMo.textContent  = fmt(totalMo);
  updateLiveSummary();
}

function updateAssetTotals() {
  var list = document.getElementById('asset-list');
  if (!list) return;
  var totalAccum = 0, totalMo = 0;
  list.querySelectorAll('.saving-row').forEach(function(row) {
    totalMo    += parseFloat((row.querySelector('.saving-monthly') || {value:''}).value) || 0;
    totalAccum += parseFloat((row.querySelector('.saving-accum')  || {value:''}).value) || 0;
  });
  // Also count legacy simple rows
  list.querySelectorAll('.input-row:not(.saving-row)').forEach(function(row) {
    var inputs = row.querySelectorAll('input[type="number"]');
    if (inputs.length) totalAccum += parseFloat(inputs[0].value) || 0;
  });
  var elAcc = document.getElementById('total-assets');
  var elMo  = document.getElementById('total-assets-mo');
  if (elAcc) elAcc.textContent = fmt(totalAccum);
  if (elMo)  elMo.textContent  = fmt(totalMo);
  updateLiveSummary();
}

/* ── LIVE CASHFLOW SUMMARY ── */
function updateLiveSummary() {
  var incomes   = getRows('income-list');
  var annuals   = getAnnualRows('annual-list');
  var debts     = getDebtRows('debt-list');
  var assets    = getSavingRows();
  var varMonths = getVarMonths();

  // Helper: sum ALL input-rows in a list (including data-auto credit rows)
  function sumList(listId) {
    var list = document.getElementById(listId);
    if (!list) return 0;
    var sum = 0;
    list.querySelectorAll('.input-row').forEach(function(row) {
      var inputs = row.querySelectorAll('input[type="number"]');
      if (inputs.length) sum += parseFloat(inputs[0].value) || 0;
    });
    return sum;
  }

  var totalIncome  = incomes.reduce(function(s,r){ return s+r.amt; }, 0);
  var totalFixed   = sumList('fixed-list');
  var totalAnnual  = annuals.reduce(function(s,r){ return s+r.amt; }, 0);
  var totalSubs    = sumList('sub-list');
  var totalIns     = sumList('insurance-list');
  // Sum ALL var rows from DOM (including data-auto credit rows) for correct cash flow
  var totalVar = (function() {
    var list = document.getElementById('var-list');
    if (!list) return 0;
    var sum = 0;
    list.querySelectorAll('.input-row').forEach(function(row) {
      var inputs = row.querySelectorAll('input[type="number"]');
      if (inputs.length) {
        var raw = parseFloat(inputs[0].value) || 0;
        sum += row.hasAttribute('data-inst') ? raw : raw / varMonths;
      }
    });
    return sum;
  })();
  var totalDebtMo  = debts.reduce(function(s,r){ return s+r.amt; }, 0);
  var totalDebtBal = debts.reduce(function(s,r){ return s+r.balance; }, 0);
  var totalAssetsAccum = assets.reduce(function(s,r){ return s+r.amt; }, 0);
  var totalAssetsMo    = assets.reduce(function(s,r){ return s+r.monthly; }, 0);

  // Credit data is already populated into fixed/var/sub lists via populateVarExpensesFromCredit()
  // so no separate credit line needed — totals already include it
  var totalExp = totalFixed + totalAnnual + totalSubs + totalIns + totalVar + totalDebtMo;
  var cashflow = totalIncome - totalExp;

  // Income rows
  var incRowsEl = document.getElementById('ls-income-rows');
  if (incRowsEl) {
    incRowsEl.innerHTML = incomes.map(function(r) {
      return '<div class="ls-row"><span class="ls-label">' + escHtml(r.name) + '</span><span class="ls-amt income">' + fmt(r.amt) + '</span></div>';
    }).join('');
  }

  // Simple totals
  var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
  set('ls-income-total', fmt(totalIncome));
  set('ls-fixed', fmt(totalFixed));
  set('ls-subs', fmt(totalSubs));
  set('ls-ins', fmt(totalIns));
  set('ls-var', fmt(totalVar));
  set('ls-annual', fmt(totalAnnual));
  set('ls-debt-mo', fmt(totalDebtMo));
  set('ls-exp-total', fmt(totalExp));
  set('ls-cf-inc', fmt(totalIncome));
  set('ls-cf-exp', fmt(totalExp));
  set('ls-assets-accum', fmt(totalAssetsAccum));
  set('ls-assets-mo', fmt(totalAssetsMo));
  set('ls-debt-bal', fmt(totalDebtBal));
  set('ls-debt-mo-2', fmt(totalDebtMo));

  var divEl = document.getElementById('ls-var-div');
  if (divEl) divEl.textContent = '÷' + varMonths;

  // Cash flow banner
  var cfVal = document.getElementById('ls-cf-value');
  var cfBanner = document.getElementById('ls-cf-banner');
  if (cfVal) cfVal.textContent = (cashflow >= 0 ? '+' : '') + fmt(cashflow);
  if (cfBanner) cfBanner.className = 'ls-cashflow-banner ' + (cashflow >= 0 ? 'positive' : 'negative');
}

/* ── INSTALLMENT ROW ── */
function addInstallmentRow(defaultName, focus) {
  var list = document.getElementById('installment-list');
  var row = document.createElement('div');
  row.className = 'input-row inst-row';
  row.innerHTML =
    '<input type="text" placeholder="שם החברה" value="' + (defaultName || '') + '" style="flex:1;min-width:130px">' +
    '<input type="number" class="inst-total"   placeholder="סכום כולל ₪"       min="0" step="1" oninput="updateInstTag(this)">' +
    '<input type="number" class="inst-monthly" placeholder="תשלום חודשי ₪"     min="0" step="1" oninput="updateInstTotals()">' +
    '<input type="number" class="inst-cur"     placeholder="שולמו"              min="0" step="1" oninput="updateInstTag(this)">' +
    '<input type="number" class="inst-max"     placeholder="מתוך"               min="1" step="1" oninput="updateInstTag(this)">' +
    '<span class="inst-remaining-tag">—</span>' +
    '<button class="btn-del" onclick="this.parentElement.remove();updateInstTotals()">×</button>';
  list.appendChild(row);
  if (focus) row.querySelector('input[type="text"]').focus();
}

function updateInstTag(input) {
  var row = input.closest('.inst-row');
  if (!row) return;
  var monthly  = parseFloat((row.querySelector('.inst-monthly') || {value:''}).value) || 0;
  var cur      = parseInt((row.querySelector('.inst-cur')  || {value:''}).value) || 0;
  var max      = parseInt((row.querySelector('.inst-max')  || {value:''}).value) || 0;
  var tag      = row.querySelector('.inst-remaining-tag');
  if (!tag) return;
  if (cur > 0 && max > 0) {
    var remaining = Math.max(0, max - cur);
    var debt = monthly > 0 ? monthly * remaining : 0;
    tag.textContent = remaining + ' נותרו' + (debt > 0 ? ' (' + fmt(debt) + ')' : '');
  } else {
    tag.textContent = '—';
  }
  updateInstTotals();
}

function updateInstTotals() {
  var list = document.getElementById('installment-list');
  if (!list) return;
  var totalMo = 0, totalDebt = 0;
  list.querySelectorAll('.inst-row').forEach(function(row) {
    var monthly = parseFloat((row.querySelector('.inst-monthly') || {value:''}).value) || 0;
    var cur     = parseInt((row.querySelector('.inst-cur')  || {value:''}).value) || 0;
    var max     = parseInt((row.querySelector('.inst-max')  || {value:''}).value) || 0;
    totalMo  += monthly;
    if (cur > 0 && max > 0) totalDebt += monthly * Math.max(0, max - cur);
  });
  var elMo   = document.getElementById('total-inst-mo');
  var elDebt = document.getElementById('total-inst-debt');
  if (elMo)   elMo.textContent   = fmt(totalMo);
  if (elDebt) elDebt.textContent = fmt(totalDebt);
  syncInstallmentsToVar(totalMo);
}

function syncInstallmentsToVar(totalMo) {
  var varList = document.getElementById('var-list');
  if (!varList) return;
  // Remove ALL existing inst rows
  varList.querySelectorAll('.input-row[data-inst]').forEach(function(r) { r.remove(); });
  if (!totalMo || totalMo <= 0) { updateVarTotals(); return; }
  // Add one row per installment (divided by 1 — monthly payment as-is)
  var instList = document.getElementById('installment-list');
  if (instList) {
    instList.querySelectorAll('.inst-row').forEach(function(instRow) {
      var name    = instRow.querySelector('input[type="text"]').value.trim();
      var monthly = parseFloat((instRow.querySelector('.inst-monthly') || {value:''}).value) || 0;
      if (!monthly) return;
      var label = name ? 'הוצאות בתשלומים — ' + name : 'הוצאות בתשלומים';
      var varRow = document.createElement('div');
      varRow.className = 'input-row var-row';
      varRow.setAttribute('data-inst', '1');
      varRow.innerHTML =
        '<input type="text" value="' + label.replace(/"/g, '&quot;') + '" readonly style="color:var(--accent4);font-weight:600;flex:1">' +
        '<input type="number" value="' + Math.round(monthly) + '" readonly style="color:var(--accent4)">' +
        '<span class="var-monthly-tag" style="border-color:rgba(247,151,30,.35);background:rgba(247,151,30,.1);color:var(--accent4)">' + fmt(monthly) + '/חודש</span>' +
        '<span style="width:34px;flex-shrink:0"></span>';
      varList.appendChild(varRow);
    });
  }
  updateVarTotals();
}

function getInstallmentRows() {
  var list = document.getElementById('installment-list');
  if (!list) return [];
  var result = [];
  list.querySelectorAll('.inst-row').forEach(function(row) {
    var name    = row.querySelector('input[type="text"]').value.trim();
    var total   = parseFloat((row.querySelector('.inst-total')   || {value:''}).value) || 0;
    var monthly = parseFloat((row.querySelector('.inst-monthly') || {value:''}).value) || 0;
    var cur     = parseInt((row.querySelector('.inst-cur')   || {value:''}).value) || 0;
    var max     = parseInt((row.querySelector('.inst-max')   || {value:''}).value) || 0;
    if (name || monthly) result.push({ name: name || '—', total, amt: monthly, current: cur, maxPay: max, remaining: Math.max(0, max - cur) });
  });
  return result;
}

/* ── SAVING ROW ── */
function addSavingRow(defaultName, focus) {
  var list = document.getElementById('asset-list');
  var row = document.createElement('div');
  row.className = 'input-row saving-row';
  row.innerHTML =
    '<input type="text" placeholder="סוג החיסכון" value="' + (defaultName || '') + '" style="flex:1">' +
    '<input type="number" class="saving-monthly" placeholder="הפרשה חודשית ₪" min="0" step="1" oninput="updateAssetTotals()">' +
    '<input type="number" class="saving-accum"   placeholder="סכום מצטבר ₪"  min="0" step="1" oninput="updateAssetTotals()">' +
    '<button class="btn-del" onclick="this.parentElement.remove();updateAssetTotals()">×</button>';
  list.appendChild(row);
  if (focus) row.querySelector('input[type="text"]').focus();
}

function getSavingRows() {
  var list = document.getElementById('asset-list');
  var result = [];
  list.querySelectorAll('.saving-row').forEach(function(row) {
    var name   = row.querySelector('input[type="text"]').value.trim();
    var mo     = parseFloat((row.querySelector('.saving-monthly') || {value:''}).value) || 0;
    var accum  = parseFloat((row.querySelector('.saving-accum')  || {value:''}).value) || 0;
    if (name || mo || accum) result.push({ name: name || '—', amt: accum, accum: accum, monthly: mo });
  });
  return result;
}

function getVarMonths() {
  return Math.max(1, parseInt(document.getElementById('var-months-input').value) || 3);
}

function varMonthsChange(delta) {
  const inp = document.getElementById('var-months-input');
  const cur = Math.max(1, parseInt(inp.value) || 3);
  const next = Math.min(24, Math.max(1, cur + delta));
  inp.value = next;
  const lbl = document.getElementById('var-months-label');
  if (lbl) lbl.textContent = next === 1 ? 'חודש ← ללא חלוקה' : 'חודשים ← ÷' + next;
  // Update all manual var row tags (skip auto/inst rows — they're rebuilt by updateInstTotals)
  document.querySelectorAll('#var-list .var-row:not([data-auto]):not([data-inst])').forEach(function(row) {
    const amtInput = row.querySelectorAll('input')[1];
    const tag = row.querySelector('.var-monthly-tag');
    if (tag && amtInput) {
      const raw = parseFloat(amtInput.value) || 0;
      tag.textContent = next === 1 ? fmt(raw) + '/חודש' : '÷' + next + ' = ' + fmt(raw / next) + '/חודש';
    }
  });
  // Rebuild the installment summary row with updated months
  updateInstTotals();
}

function addVarRow(defaultName, focus) {
  const list = document.getElementById('var-list');
  const months = getVarMonths();
  const row = document.createElement('div');
  row.className = 'input-row var-row';
  row.innerHTML =
    '<input type="text" placeholder="הוצאה" value="' + (defaultName || '') + '">' +
    '<input type="number" placeholder="₪ סכום" min="0" step="1" oninput="updateVarTag(this);updateVarTotals()">' +
    '<span class="var-monthly-tag">' + (months === 1 ? '₪0/חודש' : '÷' + months + ' = ₪0/חודש') + '</span>' +
    '<button class="btn-del" onclick="this.parentElement.remove();updateVarTotals()">×</button>';
  list.appendChild(row);
  if (focus) row.querySelector('input[type="text"]').focus();
}

function updateVarTag(input) {
  const months = getVarMonths();
  const raw = parseFloat(input.value) || 0;
  const tag = input.parentElement.querySelector('.var-monthly-tag');
  if (tag) tag.textContent = months === 1 ? fmt(raw) + '/חודש' : '÷' + months + ' = ' + fmt(raw / months) + '/חודש';
}

function getVarRows() {
  const months = getVarMonths();
  const list = document.getElementById('var-list');
  const result = [];
  list.querySelectorAll('.input-row').forEach(function(row) {
    if (row.hasAttribute('data-auto')) return; // auto rows come from credit.transactions
    const inputs = row.querySelectorAll('input');
    const name = inputs[0] ? inputs[0].value.trim() : '';
    const raw = parseFloat((inputs[1] || {value:''}).value) || 0;
    // inst rows store the monthly payment directly (÷1), all other rows divide by varMonths
    const isInst = row.hasAttribute('data-inst');
    if (name || raw) result.push({ name: name || '—', amt: isInst ? raw : raw / months, raw: raw });
  });
  return result;
}

function addAnnualRow(listId, defaultName, focus) {
  const list = document.getElementById(listId);
  const row = document.createElement('div');
  row.className = 'input-row annual-row';
  row.innerHTML =
    '<input type="text" placeholder="שם ההוצאה" value="' + (defaultName || '') + '">' +
    '<input type="number" placeholder="₪ סכום שנתי" min="0" step="1" oninput="updateAnnualTag(this);updateAnnualTotals()">' +
    '<span class="yearly-tag">₪0 / חודש</span>' +
    '<button class="btn-del" onclick="this.parentElement.remove();updateAnnualTotals()">×</button>';
  list.appendChild(row);
  if (focus) row.querySelector('input[type="text"]').focus();
}

function updateAnnualTag(input) {
  const val = parseFloat(input.value) || 0;
  const tag = input.parentElement.querySelector('.yearly-tag');
  if (tag) tag.textContent = fmt(val / 12) + ' / חודש';
}

function getAnnualRows(listId) {
  const list = document.getElementById(listId);
  const result = [];
  list.querySelectorAll('.annual-row').forEach(function(row) {
    if (row.hasAttribute('data-auto')) return; // auto rows restored by rebuildMappingFromAutoRows
    const inputs = row.querySelectorAll('input');
    const name = inputs[0].value.trim();
    const yearly = parseFloat(inputs[1].value) || 0;
    if (name || yearly) result.push({ name: name || '—', amt: yearly / 12, yearly: yearly });
  });
  return result;
}

function addDebtRow(listId, defaultName, focus) {
  const list = document.getElementById(listId);
  const row = document.createElement('div');
  row.className = 'input-row debt-row';
  row.innerHTML =
    '<input type="text"   class="debt-name"     placeholder="שם הנושה / הלוואה" value="' + (defaultName || '') + '" style="flex:1;min-width:130px">' +
    '<input type="number" class="debt-original"  placeholder="יתרה התחלתית ₪"   min="0" step="1" title="סכום ההלוואה המקורי">' +
    '<input type="number" class="debt-balance"   placeholder="יתרה לסגירה ₪"    min="0" step="1" oninput="updateDebtRow(this)" title="כמה נשאר לשלם">' +
    '<input type="number" class="debt-rate"      placeholder="ריבית %"           min="0" step="0.01" oninput="updateDebtRow(this)" title="אחוז ריבית שנתי">' +
    '<input type="number" class="debt-months"    placeholder="חודשים"            min="1" step="1"   oninput="updateDebtRow(this)" title="מספר חודשים להלוואה">' +
    '<input type="number" class="debt-monthly"   placeholder="החזר חודשי ₪"     min="0" step="1"   oninput="updateDebtRow(this)" title="החזר חודשי — נכלל בהוצאות">' +
    '<span class="debt-total-tag">—</span>' +
    '<button class="btn-del" onclick="this.parentElement.remove();updateDebtTotals()">×</button>';
  list.appendChild(row);
  if (focus) row.querySelector('.debt-name').focus();
}

function updateDebtRow(input) {
  var row = input.closest('.debt-row');
  if (!row) return;
  var balance    = parseFloat((row.querySelector('.debt-balance')  || {value:''}).value) || 0;
  var rateAnnual = parseFloat((row.querySelector('.debt-rate')     || {value:''}).value) || 0;
  var months     = parseInt((row.querySelector('.debt-months')     || {value:''}).value) || 0;
  var monthlyInp = row.querySelector('.debt-monthly');
  // Auto-calc monthly via Shpitzer when balance + months given
  if (balance > 0 && months > 0 && monthlyInp && input.classList.contains('debt-monthly') === false) {
    var mr = rateAnnual / 100 / 12;
    var calcMonthly;
    if (mr === 0) {
      calcMonthly = balance / months;
    } else {
      var pf = Math.pow(1 + mr, months);
      calcMonthly = balance * mr * pf / (pf - 1);
    }
    monthlyInp.value = Math.round(calcMonthly);
  }
  var monthly = parseFloat((monthlyInp || {value:''}).value) || 0;
  var tag = row.querySelector('.debt-total-tag');
  if (tag) tag.textContent = (monthly > 0 && months > 0) ? fmt(monthly * months) : '—';
  updateDebtTotals();
}

function getDebtRows(listId) {
  const list = document.getElementById(listId);
  const result = [];
  list.querySelectorAll('.debt-row').forEach(function(row) {
    const name     = (row.querySelector('.debt-name')     || {value:''}).value.trim();
    const original = parseFloat((row.querySelector('.debt-original') || {value:''}).value) || 0;
    const balance  = parseFloat((row.querySelector('.debt-balance')  || {value:''}).value) || 0;
    const rate     = parseFloat((row.querySelector('.debt-rate')     || {value:''}).value) || 0;
    const months   = parseInt((row.querySelector('.debt-months')     || {value:''}).value) || 0;
    const monthly  = parseFloat((row.querySelector('.debt-monthly')  || {value:''}).value) || 0;
    if (name || balance || monthly) result.push({ name: name || '—', original, balance, rate, months, monthly, amt: monthly });
  });
  return result;
}

/* ════════════════════════════════════════
   TAB SWITCHING
════════════════════════════════════════ */
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  setActivePhaseFromTab(tab);
}

