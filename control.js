/* ════════════════════════════════════════
   LEARNED DB (localStorage)
════════════════════════════════════════ */
window.learnedDB = (function() {
  try { return JSON.parse(localStorage.getItem('finapp_learnedDB') || '{}'); }
  catch(e) { return {}; }
})();

function saveToLearnedDB(rawDesc, category) {
  if (!rawDesc || !category || category === 'שונות') return;
  var key = normalizeForLookup(rawDesc);
  if (!key) key = rawDesc.toLowerCase().trim();
  if (!key) return;
  window.learnedDB[key] = category;
  try { localStorage.setItem('finapp_learnedDB', JSON.stringify(window.learnedDB)); } catch(e) {}
  updateLearnedDBCounter();
}

function updateLearnedDBCounter() {
  var n = Object.keys(window.learnedDB).length;
  var el = document.getElementById('learned-db-count');
  if (el) el.textContent = n;
}

function exportLearnedDB() {
  var json = JSON.stringify(window.learnedDB, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'מאגר_עסקים_אישי.json'; a.click();
  URL.revokeObjectURL(url);
}

function promptExportLearnedDB(newCount) {
  var existing = document.getElementById('ai-export-prompt');
  if (existing) existing.remove();
  var count = Object.keys(window.learnedDB).length;
  var el = document.createElement('div');
  el.id = 'ai-export-prompt';
  el.style.cssText = 'background:rgba(67,233,123,.1);border:1px solid rgba(67,233,123,.4);border-radius:10px;padding:12px 16px;font-size:.85rem;color:var(--text);margin-bottom:16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
  el.innerHTML =
    '<span style="font-size:1.2rem">💾</span>' +
    '<span style="flex:1">AI למד <strong>' + newCount + '</strong> עסקים חדשים (סה"כ <strong>' + count + '</strong> במאגר האישי). שמור כדי לא לאבד את הלמידה.</span>' +
    '<button onclick="exportLearnedDB();document.getElementById(\'ai-export-prompt\').remove()" ' +
      'style="background:rgba(67,233,123,.25);border:1px solid rgba(67,233,123,.5);border-radius:7px;color:var(--accent3);padding:6px 14px;cursor:pointer;font-family:inherit;font-size:.82rem;font-weight:700;white-space:nowrap">' +
      '📥 שמור מאגר</button>' +
    '<button onclick="document.getElementById(\'ai-export-prompt\').remove()" ' +
      'style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;padding:2px 6px">✕</button>';
  var results = document.getElementById('credit-results');
  if (results) results.insertAdjacentElement('afterbegin', el);
}

function importLearnedDB(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var imported = JSON.parse(e.target.result);
      if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error();
      var count = 0;
      Object.entries(imported).forEach(function(entry) {
        var k = entry[0], v = entry[1];
        if (typeof k === 'string' && typeof v === 'string' && ALL_CATEGORIES.indexOf(v) !== -1) {
          window.learnedDB[k] = v;
          count++;
        }
      });
      localStorage.setItem('finapp_learnedDB', JSON.stringify(window.learnedDB));
      updateLearnedDBCounter();
      alert('יובאו ' + count + ' עסקים למאגר האישי');
    } catch(e) { alert('קובץ לא תקין'); }
    input.value = '';
  };
  reader.readAsText(file);
}

function resetLearnedDB() {
  if (!confirm('למחוק את כל המאגר האישי? לא ניתן לשחזר.')) return;
  window.learnedDB = {};
  try { localStorage.removeItem('finapp_learnedDB'); } catch(e) {}
  updateLearnedDBCounter();
}

/* ════════════════════════════════════════
   BUDGET TAB
════════════════════════════════════════ */

// ── Row templates ──
function budI(cls, ph, type) {
  type = type || 'text';
  return '<input class="' + cls + '" type="' + type + '" placeholder="' + ph + '" oninput="budLive()">';
}
function budIncomeRow()  { return '<div class="bud-row-2">' + budI('bud-name','שם מקור הכנסה') + budI('bud-amt','0','number') + '<button class="bud-del" onclick="budDel(this)">✕</button></div>'; }
function budFixedRow()   { return '<div class="bud-row-2">' + budI('bud-name','לדוג׳ שכירות, ארנונה...') + budI('bud-amt','0','number') + '<button class="bud-del" onclick="budDel(this)">✕</button></div>'; }
function budVarRow()     { return '<div class="bud-row-2">' + budI('bud-name','לדוג׳ מזון, בילויים...') + budI('bud-amt','0','number') + '<button class="bud-del" onclick="budDel(this)">✕</button></div>'; }
function budSubRow()     { return '<div class="bud-row-2">' + budI('bud-name','לדוג׳ נטפליקס...') + budI('bud-amt','0','number') + '<button class="bud-del" onclick="budDel(this)">✕</button></div>'; }
function budInsRow()     { return '<div class="bud-row-2">' + budI('bud-name','לדוג׳ ביטוח חיים...') + budI('bud-amt','0','number') + '<button class="bud-del" onclick="budDel(this)">✕</button></div>'; }
function budAnnualRow()  {
  return '<div class="bud-row-2">' +
    budI('bud-name','לדוג׳ ביטוח רכב שנתי...') +
    '<input class="bud-yearly" type="number" placeholder="0" oninput="budAnnualCalc(this);budLive()">' +
    '<div class="bud-mo-lbl">₪0 /חודש</div>' +
    '<button class="bud-del" onclick="budDel(this)">✕</button></div>';
}
function budInstRow() {
  return '<div class="bud-row-2">' +
    budI('bud-name','תיאור העסקה') +
    '<input class="bud-narrow" type="number" placeholder="סך" oninput="budLive()">' +
    '<input class="bud-amt" type="number" placeholder="חודשי" oninput="budLive()">' +
    '<input class="bud-narrow" type="number" placeholder="נוכחי" oninput="budInstCalc(this);budLive()" style="text-align:center">' +
    '<input class="bud-narrow" type="number" placeholder="מתוך" oninput="budInstCalc(this);budLive()" style="text-align:center">' +
    '<div class="bud-rem">—</div>' +
    '<button class="bud-del" onclick="budDel(this)">✕</button></div>';
}
function budDebtRow() {
  return '<div class="bud-row-2">' +
    budI('bud-name','שם / גוף מלווה') +
    '<input class="bud-narrow" type="number" placeholder="מקורי" oninput="budLive()">' +
    '<input class="bud-narrow" type="number" placeholder="נוכחי" oninput="budLive()">' +
    '<input class="bud-amt" type="number" placeholder="חודשי" oninput="budLive()">' +
    '<input class="bud-narrow" type="number" placeholder="נותרו" oninput="budLive()" style="text-align:center">' +
    '<input class="bud-date" type="date" oninput="budLive()">' +
    '<button class="bud-del" onclick="budDel(this)">✕</button></div>';
}
function budSavingRow() {
  return '<div class="bud-row-2">' +
    budI('bud-name','לדוג׳ קרן חירום, פנסיה...') +
    '<input class="bud-amt" type="number" placeholder="חודשי" oninput="budLive()">' +
    '<input class="bud-amt" type="number" placeholder="נצבר" oninput="budLive()">' +
    '<button class="bud-del" onclick="budDel(this)">✕</button></div>';
}

// ── Row management ──
function budAddRow(listId, templateFn) {
  var list = document.getElementById(listId);
  var d = document.createElement('div');
  d.innerHTML = templateFn();
  list.appendChild(d.firstChild);
  budLive();
}
function budDel(btn) { btn.closest('.bud-row-2').remove(); budLive(); }

function budAnnualCalc(input) {
  var row = input.closest('.bud-row-2');
  var y = parseFloat(input.value) || 0;
  var lbl = row.querySelector('.bud-mo-lbl');
  if (lbl) lbl.textContent = '₪' + budFmt(y / 12) + ' /חודש';
}
function budInstCalc(input) {
  var row = input.closest('.bud-row-2');
  var inputs = row.querySelectorAll('input');
  var mo = parseFloat(inputs[2] ? inputs[2].value : 0) || 0;
  var cur= parseFloat(inputs[3] ? inputs[3].value : 0) || 0;
  var tot= parseFloat(inputs[4] ? inputs[4].value : 0) || 0;
  var rem = Math.max(0, tot - cur);
  var el = row.querySelector('.bud-rem');
  if (el) el.textContent = rem > 0 ? 'נותרו ' + rem + '\n₪' + budFmt(rem * mo) : '—';
}

function budFmt(n) { return Math.round(n || 0).toLocaleString('he-IL'); }
function budFmtF(n) { return '₪' + budFmt(n); }
function budSet(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

// ── Read rows ──
function budGetSimple(listId) {
  var rows = []; var list = document.getElementById(listId);
  list.querySelectorAll('.bud-row-2').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var name = inputs[0] ? inputs[0].value.trim() : '';
    var amt  = parseFloat(inputs[1] ? inputs[1].value : 0) || 0;
    if (name || amt) rows.push({ name: name||'—', amt: amt });
  });
  return rows;
}
function budGetAnnual() {
  var rows = []; var list = document.getElementById('bud-annual-list');
  list.querySelectorAll('.bud-row-2').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var name = inputs[0] ? inputs[0].value.trim() : '';
    var y    = parseFloat(inputs[1] ? inputs[1].value : 0) || 0;
    if (name || y) rows.push({ name: name||'—', yearly: y, amt: y/12 });
  });
  return rows;
}
function budGetInst() {
  var rows = []; var list = document.getElementById('bud-inst-list');
  list.querySelectorAll('.bud-row-2').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var name = inputs[0] ? inputs[0].value.trim() : '';
    var mo   = parseFloat(inputs[2] ? inputs[2].value : 0) || 0;
    if (name || mo) rows.push({ name: name||'—', amt: mo });
  });
  return rows;
}
function budGetDebt() {
  var rows = []; var list = document.getElementById('bud-debt-list');
  list.querySelectorAll('.bud-row-2').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var name = inputs[0] ? inputs[0].value.trim() : '';
    var bal  = parseFloat(inputs[2] ? inputs[2].value : 0) || 0;
    var mo   = parseFloat(inputs[3] ? inputs[3].value : 0) || 0;
    if (name || bal || mo) rows.push({ name: name||'—', balance: bal, amt: mo });
  });
  return rows;
}
function budGetSaving() {
  var rows = []; var list = document.getElementById('bud-saving-list');
  list.querySelectorAll('.bud-row-2').forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var name = inputs[0] ? inputs[0].value.trim() : '';
    var mo   = parseFloat(inputs[1] ? inputs[1].value : 0) || 0;
    var acc  = parseFloat(inputs[2] ? inputs[2].value : 0) || 0;
    if (name || mo || acc) rows.push({ name: name||'—', amt: mo, accum: acc });
  });
  return rows;
}

// ── Live totals ──
function budLive() {
  var tIncome = budGetSimple('bud-income-list').reduce(function(s,r){return s+r.amt;},0);
  var tFixed  = budGetSimple('bud-fixed-list').reduce(function(s,r){return s+r.amt;},0);
  var tAnnM   = budGetAnnual().reduce(function(s,r){return s+r.amt;},0);
  var tVar    = budGetSimple('bud-var-list').reduce(function(s,r){return s+r.amt;},0);
  var tSub    = budGetSimple('bud-sub-list').reduce(function(s,r){return s+r.amt;},0);
  var tIns    = budGetSimple('bud-ins-list').reduce(function(s,r){return s+r.amt;},0);
  var tInst   = budGetInst().reduce(function(s,r){return s+r.amt;},0);
  var tDebtMo = budGetDebt().reduce(function(s,r){return s+r.amt;},0);
  var tSavMo  = budGetSaving().reduce(function(s,r){return s+r.amt;},0);

  budSet('bud-tot-income',  budFmtF(tIncome));
  budSet('bud-tot-fixed',   budFmtF(tFixed));
  budSet('bud-tot-annual',  budFmtF(tAnnM) + ' לחודש');
  budSet('bud-tot-var',     budFmtF(tVar));
  budSet('bud-tot-sub',     budFmtF(tSub));
  budSet('bud-tot-ins',     budFmtF(tIns));
  budSet('bud-tot-inst',    budFmtF(tInst) + ' /חודש');
  budSet('bud-tot-debt',    budFmtF(tDebtMo) + ' /חודש');
  budSet('bud-tot-saving',  budFmtF(tSavMo) + ' /חודש');
}

// ── Generate budget report ──
function budGenerate() {
  var income  = budGetSimple('bud-income-list');
  var fixed   = budGetSimple('bud-fixed-list');
  var annual  = budGetAnnual();
  var vars    = budGetSimple('bud-var-list');
  var subs    = budGetSimple('bud-sub-list');
  var ins     = budGetSimple('bud-ins-list');
  var inst    = budGetInst();
  var debts   = budGetDebt();
  var savings = budGetSaving();

  var tIncome  = income.reduce(function(s,r){return s+r.amt;},0);
  var tFixed   = fixed.reduce(function(s,r){return s+r.amt;},0);
  var tAnnM    = annual.reduce(function(s,r){return s+r.amt;},0);
  var tVar     = vars.reduce(function(s,r){return s+r.amt;},0);
  var tSub     = subs.reduce(function(s,r){return s+r.amt;},0);
  var tIns     = ins.reduce(function(s,r){return s+r.amt;},0);
  var tInst    = inst.reduce(function(s,r){return s+r.amt;},0);
  var tDebtMo  = debts.reduce(function(s,r){return s+r.amt;},0);
  var tDebtBal = debts.reduce(function(s,r){return s+r.balance;},0);
  var tSavMo   = savings.reduce(function(s,r){return s+r.amt;},0);
  var tSavAcc  = savings.reduce(function(s,r){return s+r.accum;},0);
  var totalExp = tFixed + tAnnM + tVar + tSub + tIns + tInst + tDebtMo + tSavMo;
  var balance  = tIncome - totalExp;
  var balNoSav = balance + tSavMo;
  var netWorth = tSavAcc - tDebtBal;

  // Client line
  var parts = [];
  var cn = document.getElementById('bud-client-name').value;
  var ad = document.getElementById('bud-advisor').value;
  var dt = document.getElementById('bud-date').value;
  if (cn) parts.push('לקוח: ' + cn);
  if (ad) parts.push('יועץ: ' + ad);
  if (dt) parts.push('תאריך: ' + dt);
  budSet('bud-client-line', parts.join('  •  '));

  // Income rows
  var incEl = document.getElementById('bud-r-income-rows');
  incEl.innerHTML = '';
  income.forEach(function(r) { incEl.innerHTML += budReportRow(r.name, r.amt); });
  budSet('bud-r-income-total', budFmtF(tIncome));
  budSet('bud-r-income-hdr',   budFmtF(tIncome));

  // Expense rows
  var expEl = document.getElementById('bud-r-exp-rows');
  expEl.innerHTML = '';
  function addSub(label, rows, total) {
    if (total <= 0 && rows.every(function(r){return r.amt===0;})) return;
    expEl.innerHTML += '<div class="report-sub-hdr"><span>' + label + '</span><span>' + budFmtF(total) + '</span></div>';
    rows.forEach(function(r) { expEl.innerHTML += budReportRow(r.name, r.amt, r.amt===0); });
  }
  addSub('📌 הוצאות קבועות', fixed, tFixed);
  addSub('📅 הוצאות שנתיות (÷12)', annual, tAnnM);
  addSub('🛒 הוצאות משתנות', vars, tVar);
  addSub('🔄 מנויים', subs, tSub);
  addSub('🛡️ ביטוחים', ins, tIns);
  addSub('🛍️ עסקאות בתשלומים', inst, tInst);
  addSub('💳 החזר חובות', debts.map(function(d){return{name:d.name,amt:d.amt};}), tDebtMo);
  addSub('🏦 הפרשה לחיסכון', savings.map(function(s){return{name:s.name,amt:s.amt};}), tSavMo);
  budSet('bud-r-exp-total', budFmtF(totalExp));
  budSet('bud-r-exp-hdr',   budFmtF(totalExp));

  // Bottom cards
  budSet('bud-r-debt-bal',   budFmtF(tDebtBal));
  budSet('bud-r-debt-mo',    budFmtF(tDebtMo));
  budSet('bud-r-inst-mo',    budFmtF(tInst));
  budSet('bud-r-sav-mo',     budFmtF(tSavMo));
  budSet('bud-r-sav-acc',    budFmtF(tSavAcc));
  budSet('bud-r-assets',     budFmtF(tSavAcc));
  budSet('bud-r-liabilities',budFmtF(tDebtBal));
  budSet('bud-r-net',        budFmtF(netWorth));

  // Cash flow banner
  var banner = document.getElementById('bud-cf-banner');
  banner.className = 'cashflow-banner ' + (balance >= 0 ? 'positive' : 'negative');
  budSet('bud-cf-value',  (balance >= 0 ? '+' : '') + budFmtF(balance));
  budSet('bud-cf-inc',    budFmtF(tIncome));
  budSet('bud-cf-exp',    budFmtF(totalExp));
  budSet('bud-cf-sav',    budFmtF(tSavMo));
  budSet('bud-cf-nosav',  (balNoSav >= 0 ? '+' : '') + budFmtF(balNoSav));

  document.getElementById('bud-dashboard').style.display = 'block';
  document.getElementById('bud-dashboard').scrollIntoView({ behavior: 'smooth' });
}

function budReportRow(name, amt, isZero) {
  var esc = function(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  return '<div class="report-row' + (isZero?' rr-zero':'') + '"><span class="rr-name">' + esc(name) + '</span><span class="rr-amt">' + budFmtF(amt) + '</span></div>';
}

function budBackToForm() {
  document.getElementById('bud-dashboard').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function budDuplicate() {
  // Snapshot all budget input values into the HTML and download as a new file
  var clone = document.documentElement.cloneNode(true);

  // Fill all bud- inputs with their current values
  document.querySelectorAll('[id^="bud-"]').forEach(function(el) {
    var mirror = clone.querySelector('#' + el.id);
    if (!mirror) return;
    if (el.type === 'checkbox') mirror.checked = el.checked;
    else mirror.value = el.value;
  });

  // Also snapshot dynamically generated rows
  var listIds = ['bud-income-list','bud-fixed-list','bud-annual-list','bud-var-list','bud-sub-list','bud-ins-list','bud-inst-list','bud-debt-list','bud-saving-list'];
  listIds.forEach(function(id) {
    var orig = document.getElementById(id);
    var dest = clone.querySelector('#' + id);
    if (orig && dest) dest.innerHTML = orig.innerHTML;
  });

  // Hide dashboard in the clone (start fresh)
  var dash = clone.querySelector('#bud-dashboard');
  if (dash) dash.style.display = 'none';

  // Build title for filename
  var title = document.getElementById('bud-title').value || 'תקציב';
  var dt    = document.getElementById('bud-title-date').value || document.getElementById('bud-date').value || '';
  var filename = (title + (dt ? ' ' + dt : '') + '.html').replace(/[\\/:*?"<>|]/g, '_');

  var html = '<!DOCTYPE html>\n' + clone.outerHTML;
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Default rows ──
(function budInit() {
  var defaults = {
    'bud-income-list': [['שכר עבודה (נטו)', budIncomeRow], ['קצבת ילדים', budIncomeRow], ['הכנסה נוספת', budIncomeRow]],
    'bud-fixed-list':  [['שכירות / משכנתא', budFixedRow], ['ארנונה', budFixedRow], ['ועד בית', budFixedRow], ['חשמל', budFixedRow], ['מים וגז', budFixedRow]],
    'bud-var-list':    [['מזון וסופר', budVarRow], ['דלק ורכב', budVarRow], ['בריאות ותרופות', budVarRow], ['ילדים וחינוך', budVarRow], ['פנאי ובילויים', budVarRow], ['הלבשה והנעלה', budVarRow], ['מסעדות ואוכל בחוץ', budVarRow]],
    'bud-sub-list':    [['טלפון', budSubRow], ['אינטרנט', budSubRow], ['טלוויזיה / סטרימינג', budSubRow]],
    'bud-ins-list':    [['ביטוח חיים', budInsRow], ['ביטוח בריאות', budInsRow], ['ביטוח רכב', budInsRow]]
  };
  Object.keys(defaults).forEach(function(listId) {
    var list = document.getElementById(listId);
    if (!list || list.children.length > 0) return;
    defaults[listId].forEach(function(pair) {
      var d = document.createElement('div');
      d.innerHTML = pair[1]();
      var row = d.firstChild;
      row.querySelectorAll('input')[0].value = pair[0];
      list.appendChild(row);
    });
  });
  // Blank rows for sections without defaults
  ['bud-annual-list','bud-inst-list','bud-debt-list','bud-saving-list'].forEach(function(id) {
    var list = document.getElementById(id);
    if (!list || list.children.length > 0) return;
    var fns = { 'bud-annual-list': budAnnualRow, 'bud-inst-list': budInstRow, 'bud-debt-list': budDebtRow, 'bud-saving-list': budSavingRow };
    var d = document.createElement('div');
    d.innerHTML = fns[id]();
    list.appendChild(d.firstChild);
  });
  var budDateEl = document.getElementById('bud-date');
  if (budDateEl && !budDateEl.value) budDateEl.valueAsDate = new Date();
})();

/* === LOAN CALCULATOR JS === */
(function() {

var loanChartInstance = null;
var loanMode    = 'amount';   // 'amount' | 'payment'
var loanMethod  = 'shpitzer'; // 'shpitzer' | 'equal-principal'
var loanIndexed = false;

/* ── helpers ── */
function loanFmt(n) {
  return Math.round(n).toLocaleString('he-IL') + ' ₪';
}
function loanFmtDec(n, d) {
  return n.toLocaleString('he-IL', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' ₪';
}

/* update slider gradient fill */
function loanUpdateSliderFill(slider) {
  var min = parseFloat(slider.min), max = parseFloat(slider.max), val = parseFloat(slider.value);
  var pct = ((val - min) / (max - min) * 100).toFixed(1) + '%';
  slider.style.setProperty('--pct', pct);
}

function loanSyncInput(sliderId, inputId) {
  var sl = document.getElementById(sliderId);
  document.getElementById(inputId).value = sl.value;
  loanUpdateSliderFill(sl);
}
window.loanSyncInput = loanSyncInput;

function loanSyncSlider(inputId, sliderId) {
  var inp = document.getElementById(inputId);
  var sl  = document.getElementById(sliderId);
  var v = Math.max(parseFloat(sl.min), Math.min(parseFloat(sl.max), parseFloat(inp.value) || 0));
  sl.value = v;
  loanUpdateSliderFill(sl);
}
window.loanSyncSlider = loanSyncSlider;

/* ── radio toggles ── */
function loanSetMode(mode) {
  loanMode = mode;
  document.querySelectorAll('#loan-mode-group .loan-radio-label').forEach(function(l) {
    l.classList.toggle('checked', l.querySelector('input').value === mode);
  });
  document.getElementById('row-principal').style.display = mode === 'amount'  ? '' : 'none';
  document.getElementById('row-payment').style.display   = mode === 'payment' ? '' : 'none';
  loanCalculate();
}
window.loanSetMode = loanSetMode;

function loanSetMethod(method) {
  loanMethod = method;
  document.querySelectorAll('#loan-method-group .loan-radio-label').forEach(function(l) {
    l.classList.toggle('checked', l.querySelector('input').value === method);
  });
  loanCalculate();
}
window.loanSetMethod = loanSetMethod;

function loanSetIndex(enabled) {
  loanIndexed = enabled;
  document.querySelectorAll('#loan-index-group .loan-radio-label').forEach(function(l) {
    l.classList.toggle('checked', l.querySelector('input').value === (enabled ? 'yes' : 'no'));
  });
  document.getElementById('row-index').style.display = enabled ? '' : 'none';
  loanCalculate();
}
window.loanSetIndex = loanSetIndex;

/* ── main calculation ── */
function loanCalculate() {
  var months      = parseInt(document.getElementById('loan-term').value) || 0;
  var annualRate  = parseFloat(document.getElementById('loan-rate').value) || 0;
  var monthlyRate = annualRate / 100 / 12;
  var monthlyIndex = loanIndexed ? (parseFloat(document.getElementById('loan-index').value) || 0) / 100 : 0;

  if (months <= 0) return;

  var principal, payments = [], principalParts = [], interestParts = [], balances = [];

  /* ── derive principal ── */
  if (loanMode === 'amount') {
    principal = parseFloat(document.getElementById('loan-principal').value) || 0;
    if (principal <= 0) return;
  } else {
    /* back-calculate principal from monthly payment */
    var desiredPayment = parseFloat(document.getElementById('loan-payment').value) || 0;
    if (desiredPayment <= 0) return;
    if (loanMethod === 'shpitzer') {
      if (monthlyRate === 0) {
        principal = desiredPayment * months;
      } else {
        var factor = Math.pow(1 + monthlyRate, months);
        principal = desiredPayment * (factor - 1) / (monthlyRate * factor);
      }
    } else {
      /* קרן שווה: first payment = P/n + P*r, solve for P */
      principal = desiredPayment / (1 / months + monthlyRate);
    }
  }

  /* ── build amortization ── */
  var balance = principal;
  balances.push(balance);
  var totalPaid = 0;

  /* Pre-calculate fixed Shpitzer payment (non-indexed) to avoid per-loop drift */
  var fixedShpitzerPayment = 0;
  if (loanMethod === 'shpitzer' && (!loanIndexed || monthlyIndex === 0)) {
    if (monthlyRate === 0) {
      fixedShpitzerPayment = principal / months;
    } else {
      var pFactor = Math.pow(1 + monthlyRate, months);
      fixedShpitzerPayment = principal * monthlyRate * pFactor / (pFactor - 1);
    }
  }

  for (var m = 1; m <= months; m++) {
    /* apply index to balance */
    if (loanIndexed && monthlyIndex > 0) balance *= (1 + monthlyIndex);

    var interestPart = balance * monthlyRate;
    var principalPart, payment;

    if (loanMethod === 'shpitzer') {
      if (!loanIndexed || monthlyIndex === 0) {
        /* non-indexed: use pre-calculated constant payment */
        payment = fixedShpitzerPayment;
      } else {
        /* indexed shpitzer: recalculate from remaining balance each period */
        var rem2 = months - m + 1;
        payment = (monthlyRate === 0)
          ? balance / rem2
          : balance * monthlyRate * Math.pow(1 + monthlyRate, rem2) / (Math.pow(1 + monthlyRate, rem2) - 1);
      }
      principalPart = payment - interestPart;
    } else {
      /* קרן שווה: equal principal portions */
      principalPart = principal / months;
      payment = principalPart + interestPart;
    }

    balance -= principalPart;
    if (balance < 0) balance = 0;

    payments.push(payment);
    principalParts.push(principalPart);
    interestParts.push(interestPart);
    balances.push(balance);
    totalPaid += payment;
  }

  var totalInterest = totalPaid - principal;
  var firstPayment  = payments[0];

  /* ── display ── */
  var resultLabel, resultValue, resultSub;
  if (loanMode === 'amount') {
    resultLabel = loanMethod === 'shpitzer' ? 'החזר חודשי קבוע' : 'החזר ראשון (קרן שווה)';
    resultValue = loanFmt(firstPayment);
    if (loanMethod === 'equal-principal') {
      resultSub = 'ההחזר יורד עד ' + loanFmt(payments[months - 1]) + ' בחודש האחרון';
    } else {
      resultSub = 'קבוע לאורך כל התקופה';
    }
  } else {
    resultLabel = 'סכום ההלוואה המחושב';
    resultValue = loanFmt(principal);
    resultSub   = 'עבור החזר חודשי של ' + loanFmt(parseFloat(document.getElementById('loan-payment').value));
  }

  document.getElementById('loan-result-label').textContent = resultLabel;
  document.getElementById('loan-result-value').textContent = resultValue;
  document.getElementById('loan-result-sub').textContent   = resultSub;
  document.getElementById('loan-stat-principal').textContent = loanFmt(principal);
  document.getElementById('loan-stat-total').textContent     = loanFmt(totalPaid);
  document.getElementById('loan-stat-interest').textContent  = loanFmt(totalInterest);

  /* ── chart ── */
  var labels = Array.from({length: months + 1}, function(_, i){ return 'ח׳ ' + i; });
  if (loanChartInstance) loanChartInstance.destroy();
  var ctx = document.getElementById('loan-myChart').getContext('2d');
  loanChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'יתרת קרן', data: balances, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.08)', tension: 0.3, pointRadius: 1, fill: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Segoe UI', size: 13 } } },
        tooltip: { rtl: true, callbacks: { label: function(c){ return ' ' + c.dataset.label + ': ' + Math.round(c.raw).toLocaleString('he-IL') + ' ₪'; } } }
      },
      scales: {
        x: { ticks: { color: '#475569', font: { size: 11 }, maxTicksLimit: 13, maxRotation: 0 }, grid: { color: 'rgba(71,85,105,0.2)' } },
        y: { ticks: { color: '#475569', font: { size: 11 }, callback: function(v){ return Math.round(v).toLocaleString('he-IL') + ' ₪'; } }, grid: { color: 'rgba(71,85,105,0.2)' } }
      }
    }
  });

  /* ── amortization table ── */
  var tbody = document.getElementById('loan-tableBody');
  tbody.innerHTML = '';
  var step = months <= 60 ? 1 : months <= 120 ? 3 : 6;
  for (var k = 1; k <= months; k += step) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + k + '</td>' +
      '<td>' + Math.round(payments[k-1]).toLocaleString('he-IL') + '</td>' +
      '<td style="color:#4ade80">' + Math.round(principalParts[k-1]).toLocaleString('he-IL') + '</td>' +
      '<td style="color:#f87171">' + Math.round(interestParts[k-1]).toLocaleString('he-IL') + '</td>' +
      '<td>' + Math.round(balances[k]).toLocaleString('he-IL') + '</td>';
    tbody.appendChild(tr);
  }

  document.getElementById('loan-results').style.display = 'block';
}
window.loanCalculate = loanCalculate;

/* init sliders on page load */
document.addEventListener('DOMContentLoaded', function() {
  ['sl-principal','sl-payment','sl-term','sl-rate','sl-index'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) loanUpdateSliderFill(el);
  });
  loanCalculate();
  updateLearnedDBCounter();
});

})();
/* === END LOAN CALCULATOR JS === */

/* === COMPOUND INTEREST CALCULATOR JS === */
(function() {

var ciGrowthChart  = null;
var ciDonutChart   = null;

function ciFmt(n) {
  return Math.round(n).toLocaleString('he-IL') + ' ₪';
}
function ciFmtPct(n) {
  return (n * 100).toFixed(1) + '%';
}

function ciUpdateFill(sl) {
  var pct = ((parseFloat(sl.value) - parseFloat(sl.min)) / (parseFloat(sl.max) - parseFloat(sl.min)) * 100).toFixed(1) + '%';
  sl.style.setProperty('--pct', pct);
}

function ciSyncInput(sliderId, inputId) {
  document.getElementById(inputId).value = document.getElementById(sliderId).value;
  ciUpdateFill(document.getElementById(sliderId));
}
window.ciSyncInput = ciSyncInput;

function ciSyncSlider(inputId, sliderId) {
  var sl  = document.getElementById(sliderId);
  var inp = document.getElementById(inputId);
  var v = Math.max(parseFloat(sl.min), Math.min(parseFloat(sl.max), parseFloat(inp.value) || 0));
  sl.value = v;
  ciUpdateFill(sl);
}
window.ciSyncSlider = ciSyncSlider;

function ciCalc() {
  var initial = parseFloat(document.getElementById('ci-initial').value) || 0;
  var monthly = parseFloat(document.getElementById('ci-monthly').value) || 0;
  var rate    = parseFloat(document.getElementById('ci-rate').value)    || 0;
  var years   = parseInt(document.getElementById('ci-years').value)     || 0;
  if (years <= 0) return;

  var monthlyRate  = rate / 100 / 12;
  var totalDeposits = monthly * 12 * years;

  // Build month-by-month, record yearly snapshots
  var balance = initial;
  var yearLabels     = [];
  var balanceByYear  = [];   // total portfolio value
  var initialLayer   = [];   // initial investment contribution
  var depositsLayer  = [];   // accumulated monthly deposits (excluding initial)
  var gainLayer      = [];   // interest gain

  var prevBalance = initial;
  var cumulativeDeposits = 0;

  yearLabels.push('עכשיו');
  balanceByYear.push(initial);
  initialLayer.push(initial);
  depositsLayer.push(0);
  gainLayer.push(0);

  for (var y = 1; y <= years; y++) {
    for (var m = 0; m < 12; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
      cumulativeDeposits += monthly;
    }
    var totalIn = initial + cumulativeDeposits;
    var gain    = balance - totalIn;

    yearLabels.push('שנה ' + y);
    balanceByYear.push(balance);
    initialLayer.push(initial);
    depositsLayer.push(cumulativeDeposits);
    gainLayer.push(gain);
    prevBalance = balance;
  }

  var finalBalance  = balance;
  var totalIn       = initial + totalDeposits;
  var totalGain     = finalBalance - totalIn;
  var gainFraction  = finalBalance > 0 ? totalGain / finalBalance : 0;

  // Update hero
  document.getElementById('ci-r-years').textContent    = years;
  document.getElementById('ci-r-total').textContent    = ciFmt(finalBalance);
  document.getElementById('ci-r-initial').textContent  = ciFmt(initial);
  document.getElementById('ci-r-deposits').textContent = ciFmt(totalDeposits);
  document.getElementById('ci-r-gain').textContent     = ciFmt(totalGain);

  // Donut legend
  document.getElementById('ci-donut-pct').textContent     = ciFmtPct(gainFraction);
  document.getElementById('ci-leg-initial').textContent   = ciFmt(initial);
  document.getElementById('ci-leg-deposits').textContent  = ciFmt(totalDeposits);
  document.getElementById('ci-leg-gain').textContent      = ciFmt(totalGain);

  // Growth chart (stacked area)
  if (ciGrowthChart) ciGrowthChart.destroy();
  var gCtx = document.getElementById('ci-growth-chart').getContext('2d');
  ciGrowthChart = new Chart(gCtx, {
    type: 'line',
    data: {
      labels: yearLabels,
      datasets: [
        {
          label: 'השקעה ראשונית',
          data: initialLayer,
          borderColor: '#6d28d9',
          backgroundColor: 'rgba(109,40,217,0.35)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 1.5
        },
        {
          label: 'הפקדות חודשיות',
          data: depositsLayer.map(function(d, i){ return initial + d; }),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.35)',
          fill: '-1',
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 1.5
        },
        {
          label: 'רווח מריבית',
          data: balanceByYear,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.3)',
          fill: '-1',
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Segoe UI', size: 12 } } },
        tooltip: {
          rtl: true,
          callbacks: {
            label: function(c) {
              var idx = c.dataIndex;
              if (c.datasetIndex === 1) {
                return ' הפקדות חודשיות: ' + Math.round(depositsLayer[idx]).toLocaleString('he-IL') + ' ₪';
              }
              if (c.datasetIndex === 2) {
                return ' רווח מריבית: ' + Math.round(gainLayer[idx]).toLocaleString('he-IL') + ' ₪';
              }
              return ' ' + c.dataset.label + ': ' + Math.round(c.raw).toLocaleString('he-IL') + ' ₪';
            },
            footer: function(items) {
              var idx = items[0].dataIndex;
              return 'שווי תיק: ' + Math.round(balanceByYear[idx]).toLocaleString('he-IL') + ' ₪';
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#475569', font: { size: 11 }, maxTicksLimit: 11, maxRotation: 0 },
          grid: { color: 'rgba(71,85,105,0.15)' }
        },
        y: {
          ticks: {
            color: '#475569', font: { size: 11 },
            callback: function(v) {
              if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M ₪';
              if (v >= 1000)    return (v / 1000).toFixed(0) + 'K ₪';
              return v + ' ₪';
            }
          },
          grid: { color: 'rgba(71,85,105,0.15)' }
        }
      }
    }
  });

  // Donut chart
  if (ciDonutChart) ciDonutChart.destroy();
  var dCtx = document.getElementById('ci-donut-chart').getContext('2d');
  ciDonutChart = new Chart(dCtx, {
    type: 'doughnut',
    data: {
      labels: ['השקעה ראשונית', 'הפקדות חודשיות', 'רווח מריבית'],
      datasets: [{
        data: [initial, totalDeposits, Math.max(0, totalGain)],
        backgroundColor: ['rgba(109,40,217,0.85)', 'rgba(59,130,246,0.85)', 'rgba(16,185,129,0.85)'],
        borderColor: ['#1e2a45', '#1e2a45', '#1e2a45'],
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true,
          callbacks: {
            label: function(c) {
              return ' ' + c.label + ': ' + Math.round(c.raw).toLocaleString('he-IL') + ' ₪';
            }
          }
        }
      }
    }
  });

  // Year-by-year table — reuse already-computed arrays (no second simulation)
  var tbody = document.getElementById('ci-table-body');
  tbody.innerHTML = '';
  for (var ty = 1; ty <= years; ty++) {
    var bal      = balanceByYear[ty];
    var cumDep   = depositsLayer[ty];
    var cumGain  = gainLayer[ty];
    var yearlyGain = bal - balanceByYear[ty - 1] - monthly * 12;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="year-col">' + ty + '</td>' +
      '<td class="total-col">' + Math.round(bal).toLocaleString('he-IL') + '</td>' +
      '<td>' + Math.round(initial + cumDep).toLocaleString('he-IL') + '</td>' +
      '<td class="gain-col">' + Math.round(cumGain).toLocaleString('he-IL') + '</td>' +
      '<td style="color:#fbbf24">' + Math.round(yearlyGain).toLocaleString('he-IL') + '</td>';
    tbody.appendChild(tr);
  }
}
window.ciCalc = ciCalc;

// init
document.addEventListener('DOMContentLoaded', function() {
  ['ci-sl-initial','ci-sl-monthly','ci-sl-rate','ci-sl-years'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) ciUpdateFill(el);
  });
  ciCalc();
});

})();
/* === END COMPOUND INTEREST CALCULATOR JS === */

/* ════════════════════════════════════════
   FINANCIAL GOALS TAB
════════════════════════════════════════ */
(function() {
  var GP_KEY = 'gpFinancialPlans';
  var GP_CATS = ['immediate', 'short', 'medium', 'long'];
  var gpPlans = {};
  var gpCurrentId = null;

  function gpGenId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,6); }
  function gpFmt(n) { return (n||0).toLocaleString('he-IL',{maximumFractionDigits:0}) + ' ₪'; }
  function gpEsc(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function gpEscAttr(s) { return (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
  function gpEmptyGoal() { return { description:'', currentAmount:0, requiredAmount:0, monthlySaving:0, product:'', targetDate:'' }; }

  function gpLoad() {
    try { var r=localStorage.getItem(GP_KEY); gpPlans = r ? JSON.parse(r) : {}; } catch(e) { gpPlans={}; }
  }
  function gpSave() { localStorage.setItem(GP_KEY, JSON.stringify(gpPlans)); }

  // Expose for Firebase save/restore via clientCollectData / clientRestoreData
  window.gpGetPlans = function() { return JSON.parse(JSON.stringify(gpPlans)); };
  window.gpSetPlans = function(p) {
    gpPlans = p || {};
    localStorage.setItem(GP_KEY, JSON.stringify(gpPlans));
    gpRenderList();
  };

  window.gpCreateNewPlan = function() {
    var id = gpGenId();
    var today = new Date().toISOString().split('T')[0];
    var goals = {};
    GP_CATS.forEach(function(c){ goals[c]=[gpEmptyGoal()]; });
    gpPlans[id] = { clientName:'', date:today, notes:'', goals:goals, createdAt:Date.now() };
    gpSave();
    gpOpenPlan(id);
  };

  window.gpDeletePlan = function(id) {
    if (!confirm('למחוק את התוכנית?')) return;
    delete gpPlans[id];
    gpSave();
    if (gpCurrentId === id) { gpCurrentId=null; gpCreateNewPlan(); }
  };

  window.gpDuplicatePlan = function() {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    var src = gpPlans[gpCurrentId];
    var id = gpGenId();
    gpPlans[id] = JSON.parse(JSON.stringify(src));
    gpPlans[id].clientName = (src.clientName||'תוכנית') + ' – העתק';
    gpPlans[id].createdAt = Date.now();
    gpSave();
    gpOpenPlan(id);
  };

  function gpShowEditor() {
    document.getElementById('gp-editor').style.display = '';
  }
  window.gpBackToList = function() {}; // no-op, no list screen

  window.gpOpenPlan = function(id) {
    if (!gpPlans[id]) return;
    gpCurrentId = id;
    gpShowEditor();
    gpLoadForm(gpPlans[id]);
    gpRenderAll();
    gpRecalc();
  };

  function gpRenderList() {
    return; // list screen removed — editor opens directly
    var el = document.getElementById('gp-plansList');
    if (!el) return;
    var ids = Object.keys(gpPlans).sort(function(a,b){ return (gpPlans[b].createdAt||0)-(gpPlans[a].createdAt||0); });
    if (ids.length === 0) {
      el.innerHTML = '<p style="color:var(--muted);font-size:.9rem">אין תוכניות שמורות. לחץ "+ תוכנית חדשה" כדי להתחיל.</p>';
      return;
    }
    el.innerHTML = ids.map(function(id) {
      var p = gpPlans[id];
      var isActive = id === gpCurrentId;
      return '<div class="gp-plan-card'+(isActive?' active':'')+'" onclick="gpOpenPlan(\''+id+'\')">' +
        '<div class="gp-plan-card-name">'+gpEsc(p.clientName||'ללא שם')+'</div>' +
        '<div class="gp-plan-card-date">'+(p.date||'')+'</div>' +
        '<div class="gp-plan-card-actions" onclick="event.stopPropagation()">' +
          '<button class="gp-plan-card-btn" onclick="gpOpenPlan(\''+id+'\')">פתח</button>' +
          '<button class="gp-plan-card-btn gp-del" onclick="gpDeletePlan(\''+id+'\')">מחק</button>' +
        '</div></div>';
    }).join('');
  }

  function gpLoadForm(plan) {
    document.getElementById('gp-clientName').value = plan.clientName||'';
    document.getElementById('gp-planDate').value = plan.date||'';
    document.getElementById('gp-planNotes').value = plan.notes||'';
  }

  function gpSaveForm() {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    var p = gpPlans[gpCurrentId];
    p.clientName = document.getElementById('gp-clientName').value.trim();
    p.date = document.getElementById('gp-planDate').value;
    p.notes = document.getElementById('gp-planNotes').value;
    gpSave();
  }

  window.gpOnFieldChange = function() { gpSaveForm(); gpRecalc(); };

  window.gpAddGoal = function(cat) {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    gpPlans[gpCurrentId].goals[cat].push(gpEmptyGoal());
    gpSave();
    gpRenderCat(cat);
    gpRecalc();
  };

  window.gpRemoveGoal = function(cat, idx) {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    gpPlans[gpCurrentId].goals[cat].splice(idx,1);
    gpSave();
    gpRenderCat(cat);
    gpRecalc();
  };

  window.gpOnGoalChange = function(cat, idx, field, value) {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    var g = gpPlans[gpCurrentId].goals[cat][idx];
    if (!g) return;
    var numF = ['currentAmount','requiredAmount','monthlySaving'];
    g[field] = numF.indexOf(field) >= 0 ? (parseFloat(value)||0) : value;
    gpSave();
    gpRecalc();
    gpUpdateFoot(cat);
  };

  function gpRenderAll() { GP_CATS.forEach(function(c){ gpRenderCat(c); }); }

  function gpGoalProgress(g) {
    var cur = g.currentAmount || 0;
    var req = g.requiredAmount || 0;
    var mon = g.monthlySaving || 0;
    if (!req) return '';
    var pct = Math.min(100, Math.round(cur / req * 100));
    var gap = Math.max(0, req - cur);
    // Forecast months to reach goal
    var forecast = '';
    if (mon > 0 && gap > 0) {
      var months = Math.ceil(gap / mon);
      var dt = new Date();
      dt.setMonth(dt.getMonth() + months);
      var moNames = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
      forecast = 'בקצב הנוכחי: ' + moNames[dt.getMonth()] + ' ' + dt.getFullYear();
    } else if (gap === 0) {
      forecast = '✅ הושג!';
    }
    var color = pct >= 100 ? 'var(--accent3)' : pct >= 60 ? 'var(--accent4)' : 'var(--accent)';
    return '<tr class="gp-progress-row"><td colspan="8" style="padding:2px 8px 10px">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="flex:1;background:rgba(255,255,255,.07);border-radius:99px;height:7px;overflow:hidden">' +
          '<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:99px;transition:width .4s"></div>' +
        '</div>' +
        '<span style="font-size:.75rem;font-weight:700;color:'+color+';white-space:nowrap">'+pct+'%</span>' +
        (forecast ? '<span style="font-size:.73rem;color:var(--muted);white-space:nowrap">'+forecast+'</span>' : '') +
      '</div>' +
    '</td></tr>';
  }

  function gpRenderCat(cat) {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    var tbody = document.getElementById('gp-body-'+cat);
    if (!tbody) return;
    var items = gpPlans[gpCurrentId].goals[cat] || [];
    tbody.innerHTML = items.map(function(g,i){
      var hasData = (g.requiredAmount || 0) > 0;
      return '<tr>'+
        '<td class="gp-col-num">'+(i+1)+'</td>'+
        '<td class="gp-col-desc"><input type="text" value="'+gpEscAttr(g.description)+'" placeholder="תיאור המטרה" oninput="gpOnGoalChange(\''+cat+'\','+i+',\'description\',this.value)"></td>'+
        '<td class="gp-col-amt"><input type="number" value="'+(g.currentAmount||'')+'" placeholder="0" min="0" step="100" oninput="gpOnGoalChange(\''+cat+'\','+i+',\'currentAmount\',this.value)"></td>'+
        '<td class="gp-col-amt"><input type="number" value="'+(g.requiredAmount||'')+'" placeholder="0" min="0" step="100" oninput="gpOnGoalChange(\''+cat+'\','+i+',\'requiredAmount\',this.value)"></td>'+
        '<td class="gp-col-amt"><input type="number" value="'+(g.monthlySaving||'')+'" placeholder="0" min="0" step="100" oninput="gpOnGoalChange(\''+cat+'\','+i+',\'monthlySaving\',this.value)"></td>'+
        '<td class="gp-col-prod"><input type="text" value="'+gpEscAttr(g.product)+'" placeholder="קרן כספית / מדד..." oninput="gpOnGoalChange(\''+cat+'\','+i+',\'product\',this.value)"></td>'+
        '<td class="gp-col-date"><input type="date" value="'+(g.targetDate||'')+'" oninput="gpOnGoalChange(\''+cat+'\','+i+',\'targetDate\',this.value)"></td>'+
        '<td class="gp-col-btns"><button class="gp-btn-danger" onclick="gpRemoveGoal(\''+cat+'\','+i+')" title="מחק שורה">✕</button></td>'+
      '</tr>' + (hasData ? gpGoalProgress(g) : '');
    }).join('');
    gpUpdateFoot(cat);
  }

  function gpUpdateFoot(cat) {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    var tfoot = document.getElementById('gp-foot-'+cat);
    if (!tfoot) return;
    var items = gpPlans[gpCurrentId].goals[cat] || [];
    if (items.length === 0) { tfoot.innerHTML=''; return; }
    var sumCur=0, sumReq=0, sumMon=0;
    items.forEach(function(g){ sumCur+=(g.currentAmount||0); sumReq+=(g.requiredAmount||0); sumMon+=(g.monthlySaving||0); });
    tfoot.innerHTML = '<tr><td></td><td style="text-align:right;font-weight:700">סה"כ</td>'+
      '<td style="font-weight:700">'+gpFmt(sumCur)+'</td>'+
      '<td style="font-weight:700">'+gpFmt(sumReq)+'</td>'+
      '<td style="font-weight:700">'+gpFmt(sumMon)+'</td>'+
      '<td></td><td></td><td></td></tr>';
  }

  function gpRecalc() {
    if (!gpCurrentId || !gpPlans[gpCurrentId]) return;
    var totalMon = 0, totalReq = 0, totalCur = 0, goalCount = 0;
    GP_CATS.forEach(function(c){
      (gpPlans[gpCurrentId].goals[c]||[]).forEach(function(g){
        totalMon += (g.monthlySaving||0);
        totalReq += (g.requiredAmount||0);
        totalCur += (g.currentAmount||0);
        if (g.description || g.requiredAmount) goalCount++;
      });
    });
    var el = document.getElementById('gp-sumMonthly');
    if (el) el.textContent = gpFmt(totalMon);

    // Update summary cards
    var elGoals = document.getElementById('gp-sum-goals');
    if (elGoals) elGoals.textContent = goalCount + ' מטרות';
    var elReq = document.getElementById('gp-sum-req');
    if (elReq) elReq.textContent = gpFmt(totalReq);
    var elCur = document.getElementById('gp-sum-cur');
    if (elCur) elCur.textContent = gpFmt(totalCur);
    var elPct = document.getElementById('gp-sum-pct');
    var pct = totalReq > 0 ? Math.round(totalCur / totalReq * 100) : 0;
    if (elPct) elPct.textContent = pct + '%';
    var bar = document.getElementById('gp-sum-bar');
    if (bar) bar.style.width = Math.min(100, pct) + '%';
  }

  gpLoad();
  // Open directly: most recent plan, or create new if none exists
  var ids = Object.keys(gpPlans).sort(function(a,b){ return (gpPlans[b].createdAt||0)-(gpPlans[a].createdAt||0); });
  if (ids.length > 0) {
    gpOpenPlan(ids[0]);
  } else {
    gpCreateNewPlan();
  }
})();

/* ════════════════════════════════════════
   PHASE BAR
════════════════════════════════════════ */
var PHASE_TABS = { 1: 'manual', 2: 'import', 3: 'control', 4: 'trends' };
function goToPhase(n) {
  document.querySelectorAll('.phase-step').forEach(function(s){ s.classList.remove('active'); });
  var el = document.getElementById('phase-' + n);
  if (el) el.classList.add('active');
  switchTab(PHASE_TABS[n]);
}
function setActivePhaseFromTab(tab) {
  var phase = 1;
  if (tab === 'import') phase = 2;
  else if (tab === 'control') phase = 3;
  else if (tab === 'trends' || tab === 'goals' || tab === 'annual') phase = 4;
  document.querySelectorAll('.phase-step').forEach(function(s){ s.classList.remove('active'); });
  var el = document.getElementById('phase-' + phase);
  if (el) el.classList.add('active');
}


/* ════════════════════════════════════════
   BUDGET vs ACTUAL (CONTROL TAB)
════════════════════════════════════════ */
function fmtC(n) { return (n||0).toLocaleString('he-IL',{maximumFractionDigits:0}) + ' ₪'; }

function buildControlTab() {
  var monthId = (document.getElementById('ctrl-month-select') || {}).value;
  var emptyState = document.getElementById('ctrl-empty-state');

  if (!monthId) {
    ['ctrl-income-group','ctrl-fixed-group','ctrl-var-group','ctrl-sub-group',
     'ctrl-ins-group','ctrl-inst-group','ctrl-debt-group','ctrl-sav-group'].forEach(function(id){
      var el = document.getElementById(id); if (el) el.innerHTML = '';
    });
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  // Read rows from a monthly section list
  // For simple sections (income/fixed/var/sub/ins): col0=name, col1=plan, col2=actual
  function getSimpleRows(listId) {
    var list = document.getElementById(listId);
    if (!list) return [];
    var rows = [];
    list.querySelectorAll('.bud-row-2').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var name   = (inputs[0] && inputs[0].value.trim()) || '';
      var plan   = parseFloat((inputs[1] || {}).value) || 0;
      var actual = parseFloat((inputs[2] || {}).value) || 0;
      if (name || plan || actual) rows.push({ name: name || '(ללא שם)', plan: plan, actual: actual });
    });
    return rows;
  }

  // Installments: col0=name, col1=total, col2=monthly payment (plan=actual=col2)
  function getInstRows(listId) {
    var list = document.getElementById(listId);
    if (!list) return [];
    var rows = [];
    list.querySelectorAll('.bud-row-2').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var name = (inputs[0] && inputs[0].value.trim()) || '';
      var amt  = parseFloat((inputs[2] || {}).value) || 0;
      if (name || amt) rows.push({ name: name || '(תשלום)', plan: amt, actual: amt });
    });
    return rows;
  }

  // Debts: col0=name, col1=balance, col2=monthly repayment
  function getDebtRows(listId) {
    var list = document.getElementById(listId);
    if (!list) return [];
    var rows = [];
    list.querySelectorAll('.bud-row-2').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var name = (inputs[0] && inputs[0].value.trim()) || '';
      var amt  = parseFloat((inputs[2] || {}).value) || 0;
      if (name || amt) rows.push({ name: name || '(חוב)', plan: amt, actual: amt });
    });
    return rows;
  }

  // Savings: col0=name, col1=monthly allocation, col2=accumulated
  function getSavingRows(listId) {
    var list = document.getElementById(listId);
    if (!list) return [];
    var rows = [];
    list.querySelectorAll('.bud-row-2').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var name = (inputs[0] && inputs[0].value.trim()) || '';
      var amt  = parseFloat((inputs[1] || {}).value) || 0;
      if (name || amt) rows.push({ name: name || '(חיסכון)', plan: amt, actual: amt });
    });
    return rows;
  }

  var mid = 'mo-' + monthId;
  var incomeRows = getSimpleRows(mid + '-income');
  var fixedRows  = getSimpleRows(mid + '-fixed');
  var varRows    = getSimpleRows(mid + '-variable');
  var subRows    = getSimpleRows(mid + '-sub');
  var insRows    = getSimpleRows(mid + '-ins');
  var instRows   = getInstRows(mid + '-inst');
  var debtRows   = getDebtRows(mid + '-debt');
  var savRows    = getSavingRows(mid + '-saving');

  function sumPlan(rows)   { return rows.reduce(function(s,r){return s+r.plan;},0); }
  function sumActual(rows) { return rows.reduce(function(s,r){return s+r.actual;},0); }

  var planIncome  = sumPlan(incomeRows);
  var actIncome   = sumActual(incomeRows);
  var planExp     = sumPlan(fixedRows) + sumPlan(varRows) + sumPlan(subRows) +
                    sumPlan(insRows) + sumPlan(instRows) + sumPlan(debtRows) + sumPlan(savRows);
  var actExp      = sumActual(fixedRows) + sumActual(varRows) + sumActual(subRows) +
                    sumActual(insRows) + sumActual(instRows) + sumActual(debtRows) + sumActual(savRows);
  var diff        = planExp - actExp;
  var pct         = planExp > 0 ? Math.round(actExp / planExp * 100) : 0;

  function setKpi(id, val) { var el=document.getElementById(id); if(el) el.textContent=val; }
  setKpi('ctrl-kpi-income-plan',   fmtC(planIncome));
  setKpi('ctrl-kpi-income-actual', fmtC(actIncome));
  setKpi('ctrl-kpi-budget',        fmtC(planExp));
  setKpi('ctrl-kpi-actual',        fmtC(actExp));
  setKpi('ctrl-kpi-diff',          (diff >= 0 ? '+' : '') + fmtC(diff));
  setKpi('ctrl-kpi-pct',           pct + '%');
  var diffCard = document.getElementById('ctrl-kpi-diff-card');
  if (diffCard) {
    diffCard.className = 'ctrl-kpi ' + (diff >= 0 ? 'kpi-ok' : 'kpi-over');
    diffCard.querySelector('.ctrl-kpi-label').textContent = diff >= 0 ? 'חיסכון' : 'חריגה';
  }

  // Summary chart
  var ctrlWrap = document.getElementById('ctrl-chart-wrap');
  if (ctrlWrap) {
    var catLabels = ['הכנסות','קבועות','משתנות','מנויים','ביטוחים','תשלומים','חובות','חיסכון'];
    var planData  = [planIncome, sumPlan(fixedRows), sumPlan(varRows), sumPlan(subRows),
                     sumPlan(insRows), sumPlan(instRows), sumPlan(debtRows), sumPlan(savRows)];
    var actData   = [actIncome, sumActual(fixedRows), sumActual(varRows), sumActual(subRows),
                     sumActual(insRows), sumActual(instRows), sumActual(debtRows), sumActual(savRows)];
    var hasAny = actData.some(function(v){ return v > 0; }) || planData.some(function(v){ return v > 0; });
    ctrlWrap.style.display = hasAny ? 'block' : 'none';
    if (hasAny) {
      if (window._ctrlChart) { window._ctrlChart.destroy(); window._ctrlChart = null; }
      var ctrlCtx = document.getElementById('ctrl-summary-chart');
      if (ctrlCtx) {
        window._ctrlChart = new Chart(ctrlCtx, {
          type: 'bar',
          data: {
            labels: catLabels,
            datasets: [
              { label: 'תכנון', data: planData, backgroundColor: 'rgba(108,99,255,.55)', borderRadius: 4 },
              { label: 'ביצוע', data: actData,
                backgroundColor: actData.map(function(a,i){
                  return a > planData[i] ? 'rgba(255,101,132,.75)' : 'rgba(67,233,123,.75)';
                }), borderRadius: 4 }
            ]
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: '#8892b0', font: { size: 11 }, boxWidth: 12 } },
              tooltip: { callbacks: { label: function(c){ return c.dataset.label + ': ₪' + Math.round(c.raw).toLocaleString('he-IL'); } } }
            },
            scales: {
              x: { ticks: { color: '#8892b0', callback: function(v){ return '₪' + v.toLocaleString(); } }, grid: { color: '#2a2d3e' } },
              y: { ticks: { color: '#e8eaf6', font: { size: 11 } }, grid: { display: false } }
            }
          }
        });
      }
    }
  }

  renderControlGroup('ctrl-income-group', '💰 הכנסות',          incomeRows, true);
  renderControlGroup('ctrl-fixed-group',  '📌 הוצאות קבועות',   fixedRows,  false);
  renderControlGroup('ctrl-var-group',    '🛒 הוצאות משתנות',   varRows,    false);
  renderControlGroup('ctrl-sub-group',    '🔄 מנויים',           subRows,    false);
  renderControlGroup('ctrl-ins-group',    '🛡️ ביטוחים',          insRows,    false);
  renderControlGroup('ctrl-inst-group',   '🛍️ תשלומים',          instRows,   false);
  renderControlGroup('ctrl-debt-group',   '💳 החזר חובות',       debtRows,   false);
  renderControlGroup('ctrl-sav-group',    '🏦 חיסכון',           savRows,    false);
}

function renderControlGroup(containerId, title, rows, isIncome) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var hasData = rows.some(function(r){ return r.plan > 0 || r.actual > 0; });
  if (!hasData) { container.innerHTML = ''; return; }

  var planTotal   = rows.reduce(function(s,r){return s+r.plan;},0);
  var actualTotal = rows.reduce(function(s,r){return s+r.actual;},0);
  var diff        = isIncome ? actualTotal - planTotal : planTotal - actualTotal;
  var pct         = planTotal > 0 ? Math.min(Math.round(actualTotal / planTotal * 100), 999) : 0;
  var barPct      = Math.min(pct, 100);
  var barColor    = isIncome
    ? (actualTotal >= planTotal ? 'var(--accent3)' : 'var(--accent4)')
    : (pct > 100 ? 'var(--accent2)' : pct > 80 ? 'var(--accent4)' : 'var(--accent3)');

  var html = '<div class="ctrl-group">';
  html += '<div class="ctrl-group-header">';
  html += '<div class="ctrl-group-title">' + title + '</div>';
  html += '<div class="ctrl-group-totals">';
  html += '<span>תכנון: <strong>' + fmtC(planTotal) + '</strong></span>';
  html += '<span>ביצוע: <strong>' + fmtC(actualTotal) + '</strong></span>';
  if (planTotal > 0) {
    var diffLabel = diff >= 0
      ? '<span class="ctrl-badge ok">+' + fmtC(diff) + '</span>'
      : '<span class="ctrl-badge over">' + fmtC(diff) + '</span>';
    html += '<span>' + diffLabel + '</span>';
  }
  html += '</div></div>';

  // Section progress bar
  if (planTotal > 0) {
    html += '<div style="margin:0 0 10px;padding:0 2px">';
    html += '<div class="ctrl-bar-wrap" style="height:8px"><div class="ctrl-bar-fill" style="width:' + barPct + '%;background:' + barColor + '"></div></div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--muted);margin-top:3px"><span>0</span><span>' + pct + '% ניצול</span><span>' + fmtC(planTotal) + '</span></div>';
    html += '</div>';
  }

  // Per-row table
  html += '<div style="overflow-x:auto"><table class="ctrl-table"><thead><tr>';
  html += '<th>פריט</th><th>תכנון</th><th>ביצוע</th><th>הפרש</th><th>%</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(function(r) {
    if (!r.plan && !r.actual) return;
    var rowDiff  = isIncome ? r.actual - r.plan : r.plan - r.actual;
    var rowPct   = r.plan > 0 ? Math.round(r.actual / r.plan * 100) : (r.actual > 0 ? 100 : 0);
    var rowBarW  = Math.min(rowPct, 100);
    var rowBarC  = isIncome
      ? (r.actual >= r.plan ? 'var(--accent3)' : 'var(--accent4)')
      : (rowPct > 100 ? 'var(--accent2)' : rowPct > 80 ? 'var(--accent4)' : 'var(--accent3)');
    var diffBadge = (r.plan > 0 || r.actual > 0)
      ? (rowDiff >= 0
          ? '<span class="ctrl-badge ok">+' + fmtC(rowDiff) + '</span>'
          : '<span class="ctrl-badge over">' + fmtC(rowDiff) + '</span>')
      : '<span style="color:var(--muted)">—</span>';

    html += '<tr>';
    html += '<td><strong>' + (r.name || '') + '</strong></td>';
    html += '<td>' + (r.plan ? fmtC(r.plan) : '<span style="color:var(--muted)">—</span>') + '</td>';
    html += '<td>' + (r.actual ? fmtC(r.actual) : '<span style="color:var(--muted)">—</span>') + '</td>';
    html += '<td>' + diffBadge + '</td>';
    html += '<td>';
    if (r.plan > 0) {
      html += '<div style="display:flex;align-items:center;gap:5px">';
      html += '<div class="ctrl-bar-wrap" style="width:60px"><div class="ctrl-bar-fill" style="width:' + rowBarW + '%;background:' + rowBarC + '"></div></div>';
      html += '<span style="font-size:.72rem;color:var(--muted)">' + rowPct + '%</span>';
      html += '</div>';
    } else { html += '<span style="color:var(--muted)">—</span>'; }
    html += '</td></tr>';
  });

  // Footer totals row
  if (rows.length > 1) {
    html += '<tr class="ctrl-total-row">';
    html += '<td>סה"כ</td>';
    html += '<td>' + fmtC(planTotal) + '</td>';
    html += '<td>' + fmtC(actualTotal) + '</td>';
    html += '<td>' + (diff >= 0 ? '<span style="color:var(--accent3)">+' + fmtC(diff) + '</span>' : '<span style="color:var(--accent2)">' + fmtC(diff) + '</span>') + '</td>';
    html += '<td>' + (planTotal > 0 ? pct + '%' : '—') + '</td>';
    html += '</tr>';
  }

  html += '</tbody></table></div>';
  html += '</div>';
  container.innerHTML = html;
}

/* ════════════════════════════════════════
   RECURRING SUBSCRIPTION DETECTION
════════════════════════════════════════ */
function detectRecurring() {
  var txs = (typeof creditTransactions !== 'undefined') ? creditTransactions : [];

  // Group transactions by normalized description
  var groups = {};
  txs.forEach(function(tx) {
    if (tx.isRefund) return;
    var key = tx.desc.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!groups[key]) groups[key] = { desc: tx.desc, txs: [], months: {}, category: tx.category };
    groups[key].txs.push(tx);
    // Use YYYY-MM from date, or source filename as month proxy if no date
    var month = (tx.date && tx.date.length >= 7) ? tx.date.substring(0, 7) : (tx.source || ('file_' + key.substring(0,8)));
    if (!groups[key].months[month]) groups[key].months[month] = [];
    groups[key].months[month].push(tx.amount);
  });

  var recurring = [];
  Object.values(groups).forEach(function(g) {
    var monthKeys = Object.keys(g.months);
    if (monthKeys.length < 2) return; // must appear in 2+ months

    // Average amount per occurrence
    var allAmounts = g.txs.map(function(t){ return t.amount; });
    var avgAmt = allAmounts.reduce(function(s,a){return s+a;},0) / allAmounts.length;

    // Consistency check: max/min ratio — skip wildly varying amounts (likely not subscriptions)
    var minAmt = Math.min.apply(null, allAmounts);
    var maxAmt = Math.max.apply(null, allAmounts);
    if (minAmt > 0 && maxAmt / minAmt > 2.0) return;

    recurring.push({
      desc:       g.desc,
      avgAmt:     avgAmt,
      monthCount: monthKeys.length,
      months:     monthKeys.sort(),
      category:   g.category
    });
  });

  // Sort by monthly cost descending
  recurring.sort(function(a,b){ return b.avgAmt - a.avgAmt; });
  return recurring;
}

function renderRecurringPanel() {
  var container = document.getElementById('ctrl-recurring-group');
  if (!container) return;

  var recurring = detectRecurring();
  if (recurring.length === 0) { container.innerHTML = ''; return; }

  var totalMonthly = recurring.reduce(function(s,r){return s+r.avgAmt;},0);
  var totalYearly  = totalMonthly * 12;

  var html = '<div class="ctrl-group">';

  // Summary banner
  html += '<div class="ctrl-recurring-summary">';
  html += '<span style="font-size:1.4rem">🔍</span>';
  html += '<span style="flex:1">זוהו <strong>' + recurring.length + ' חיובים חוזרים</strong> — ';
  html += 'עלות חודשית: <strong>' + fmtC(totalMonthly) + '</strong> · ';
  html += 'עלות שנתית: <strong style="color:var(--accent2)">' + fmtC(totalYearly) + '</strong></span>';
  html += '</div>';

  html += '<div class="ctrl-group-header" style="margin-top:0">';
  html += '<div class="ctrl-group-title">🔄 מנויים וחיובים חוזרים</div>';
  html += '<div class="ctrl-group-totals"><span style="font-size:.78rem;color:var(--muted)">מזוהים לפי חזרה בלפחות 2 חודשים</span></div>';
  html += '</div>';

  html += '<div style="overflow-x:auto"><table class="ctrl-table"><thead><tr>';
  html += '<th>עסק / שם חיוב</th><th>קטגוריה</th><th>ממוצע לחודש</th><th>הערכה שנתית</th><th>חודשים שזוהו</th>';
  html += '</tr></thead><tbody>';

  recurring.forEach(function(r) {
    var lastMonth = r.months[r.months.length - 1] || '';
    html += '<tr>';
    html += '<td><strong>' + escHtml(r.desc) + '</strong></td>';
    html += '<td><span class="recurring-cat-pill">' + escHtml(r.category) + '</span></td>';
    html += '<td>' + fmtC(r.avgAmt) + '</td>';
    html += '<td><span class="recurring-yearly">' + fmtC(r.avgAmt * 12) + '</span></td>';
    html += '<td><span class="ctrl-badge recurring">' + r.monthCount + ' חודשים</span></td>';
    html += '</tr>';
  });

  html += '</tbody><tfoot><tr class="ctrl-total-row">';
  html += '<td colspan="2">סה"כ</td>';
  html += '<td>' + fmtC(totalMonthly) + '</td>';
  html += '<td class="recurring-yearly">' + fmtC(totalYearly) + '</td>';
  html += '<td></td>';
  html += '</tr></tfoot></table></div>';
  html += '</div>';

  container.innerHTML = html;
}

