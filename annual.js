/* ════════════════════════════════════════
   ANNUAL TAB — planning + actuals from monthly
════════════════════════════════════════ */
var AN_MONTHS      = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
var AN_MONTH_SHORT = ['ינו','פבר','מרץ','אפר','מאי','יוני','יולי','אוג','ספט','אוק','נוב','דצמ'];
var AN_MONTH_NAMES = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
var anCurrentView  = 'plan';
var anActuals      = {};   // populated by anPullActuals()

function anFmt(n) { return '₪' + Math.round(n || 0).toLocaleString('he-IL'); }
function anSetEl(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; }

/* ── Year selector ── */
function anInitYears() {
  var sel = document.getElementById('an-year-sel');
  if (!sel || sel.options.length) return;
  var cur = new Date().getFullYear();
  for (var y = cur - 1; y <= cur + 4; y++) {
    var o = document.createElement('option');
    o.value = y; o.textContent = y;
    if (y === cur) o.selected = true;
    sel.appendChild(o);
  }
}
function anGetYear() {
  var s = document.getElementById('an-year-sel');
  return s ? parseInt(s.value) : new Date().getFullYear();
}
function anChangeYear() { anLoadPlan(); anPullActuals(); anLive(); }

/* ── LocalStorage persistence ── */
function anSaveKey() { return 'anPlan_' + anGetYear(); }
function anSavePlan() {
  var data = {
    income: anReadSection('an-income'),
    fixed:  anReadSection('an-fixed'),
    var:    anReadSection('an-var'),
    sub:    anReadSection('an-sub'),
    debt:   anReadDebtSection(),
    sav:    anReadSection('an-sav')
  };
  try { localStorage.setItem(anSaveKey(), JSON.stringify(data)); } catch(e) {}
  var st = document.getElementById('an-save-status');
  if (st) { st.textContent = '✓ נשמר'; setTimeout(function(){ st.textContent=''; }, 2000); }
}
function anLoadPlan() {
  var raw; try { raw = localStorage.getItem(anSaveKey()); } catch(e) {}
  var data = raw ? JSON.parse(raw) : null;
  ['an-income','an-fixed','an-var','an-sub','an-sav'].forEach(function(id) {
    var key = id.replace('an-','');
    document.getElementById(id).innerHTML = '';
    var items = (data && data[key]) ? data[key] : anPlanDefaults(key);
    items.forEach(function(item) { anAddRow(id, key, item.name, item.yr); });
  });
  document.getElementById('an-debt').innerHTML = '';
  var debtItems = (data && data.debt) ? data.debt : [{name:'', yr:0, balance:0}];
  debtItems.forEach(function(item) { anAddDebtRow(item.name, item.yr, item.balance); });
}
function anPlanDefaults(key) {
  var defs = {
    income: ['שכר עבודה (נטו)','הכנסה נוספת'],
    fixed:  ['שכירות / משכנתא','ארנונה','ועד בית','חשמל','מים וגז'],
    var:    ['מזון וסופר','דלק ורכב','בריאות','ילדים וחינוך','פנאי ובילויים','ביגוד ושונות'],
    sub:    ['טלפון','אינטרנט','סטרימינג','ביטוח חיים','ביטוח בריאות','ביטוח רכב'],
    sav:    ['קרן חירום','פנסיה / השקעות']
  };
  return (defs[key] || []).map(function(n){ return {name:n, yr:0}; });
}

/* ── Row factories ── */
function anMakeRow(listId, secKey, name, yr) {
  var d = document.createElement('div');
  d.innerHTML =
    '<div class="an-plan-row">' +
      '<input type="text" placeholder="פריט" value="' + (name||'') + '" oninput="anLive();anSavePlan()">' +
      '<input type="number" class="an-yr-input" placeholder="0" value="' + (yr||'') + '" oninput="anLive();anSavePlan()">' +
      '<div class="an-mo-disp">—</div>' +
      '<div class="an-act-disp zero">—</div>' +
      '<button class="bud-del" onclick="this.closest(\'.an-plan-row\').remove();anLive();anSavePlan()">✕</button>' +
    '</div>';
  return d.firstChild;
}
function anAddRow(listId, secKey, name, yr) {
  document.getElementById(listId).appendChild(anMakeRow(listId, secKey, name, yr));
  anLive();
}
function anAddDebtRow(name, yr, balance) {
  var d = document.createElement('div');
  d.innerHTML =
    '<div class="an-debt-plan-row">' +
      '<input type="text" placeholder="שם הלוואה" value="' + (name||'') + '" oninput="anLive();anSavePlan()">' +
      '<input type="number" class="an-yr-input" placeholder="תכנון שנתי" value="' + (yr||'') + '" oninput="anLive();anSavePlan()">' +
      '<div class="an-mo-disp">—</div>' +
      '<div class="an-act-disp zero">—</div>' +
      '<input type="number" class="an-balance" placeholder="יתרה לסגירה" value="' + (balance||'') + '" oninput="anLive();anSavePlan()">' +
      '<button class="bud-del" onclick="this.closest(\'.an-debt-plan-row\').remove();anLive();anSavePlan()">✕</button>' +
    '</div>';
  document.getElementById('an-debt').appendChild(d.firstChild);
  anLive();
}

/* ── Read plan data ── */
function anReadSection(listId) {
  var rows = [];
  document.getElementById(listId).querySelectorAll('.an-plan-row').forEach(function(row) {
    var inp = row.querySelectorAll('input');
    var name = inp[0] ? inp[0].value.trim() : '';
    var yr   = parseFloat(inp[1] ? inp[1].value : 0) || 0;
    if (name || yr) rows.push({name: name||'—', yr: yr});
  });
  return rows;
}
function anReadDebtSection() {
  var rows = [];
  document.getElementById('an-debt').querySelectorAll('.an-debt-plan-row').forEach(function(row) {
    var inp = row.querySelectorAll('input');
    var name    = inp[0] ? inp[0].value.trim() : '';
    var yr      = parseFloat(inp[1] ? inp[1].value : 0) || 0;
    var balance = parseFloat(inp[2] ? inp[2].value : 0) || 0;
    if (name || yr || balance) rows.push({name: name||'—', yr: yr, balance: balance});
  });
  return rows;
}
function anSectionTotal(listId) {
  return anReadSection(listId).reduce(function(s,r){ return s+r.yr; }, 0);
}
function anDebtTotal() {
  return anReadDebtSection().reduce(function(s,r){ return s+r.yr; }, 0);
}

/* ── Pull actuals from monthly tabs ── */
function anPullActuals() {
  var act = { income:0, fixed:0, var:0, sub:0, ins:0, inst:0, debt:0, sav:0, activeMonths:0 };
  AN_MONTHS.forEach(function(mid) {
    var p = 'mo-' + mid + '-';
    var aInc = moGetAmt(p+'income',   2);
    var aFix = moGetAmt(p+'fixed',    2);
    var aVar = moGetAmt(p+'variable', 2);
    var aSub = moGetAmt(p+'sub',      2);
    var aIns = moGetAmt(p+'ins',      2);
    var tInst= moGetAmt(p+'inst',     2);
    var tDebt= moGetAmt(p+'debt',     2);
    var bSav = moGetAmt(p+'saving',   1);
    act.income += aInc; act.fixed += aFix; act.var += aVar;
    act.sub    += aSub; act.ins   += aIns; act.inst += tInst;
    act.debt   += tDebt; act.sav  += bSav;
    if (aInc > 0 || aFix > 0 || aVar > 0) act.activeMonths++;
  });
  anActuals = act;
  anUpdateActualDisplays();
}

function anUpdateActualDisplays() {
  var act = anActuals;
  var totalActExp = (act.fixed||0) + (act.var||0) + (act.sub||0) + (act.ins||0);
  var totalActDebt= (act.inst||0) + (act.debt||0);

  // Update section compare badges
  function setCompare(id, plan, actual, isIncome) {
    var el = document.getElementById(id); if (!el) return;
    var pv = el.querySelector('.bsc-plan .bsc-val');
    var av = el.querySelector('.bsc-actual .bsc-val');
    if (pv) pv.textContent = anFmt(plan);
    if (av) av.textContent = actual > 0 ? anFmt(actual) : '—';
    var old = el.querySelector('.bsc-diff'); if (old) old.remove();
    if (actual > 0 && plan > 0) {
      var diff = isIncome ? actual - plan : plan - actual;
      var badge = document.createElement('span');
      badge.className = 'bsc-diff ' + (diff >= 0 ? 'ok' : 'over');
      badge.textContent = (diff >= 0 ? '+' : '') + anFmt(diff);
      el.appendChild(badge);
    }
  }

  var pInc  = anSectionTotal('an-income');
  var pFix  = anSectionTotal('an-fixed');
  var pVar  = anSectionTotal('an-var');
  var pSub  = anSectionTotal('an-sub');
  var pDebt = anDebtTotal();
  var pSav  = anSectionTotal('an-sav');

  setCompare('an-tot-income', pInc,  act.income,              true);
  setCompare('an-tot-fixed',  pFix,  act.fixed,               false);
  setCompare('an-tot-var',    pVar,  act.var,                  false);
  setCompare('an-tot-sub',    pSub,  (act.sub||0)+(act.ins||0),false);
  setCompare('an-tot-debt',   pDebt, totalActDebt,             false);
  setCompare('an-tot-sav',    pSav,  act.sav,                  false);

  // Update actual display cells — show section total in first row, empty in rest
  function setActCell(listId, actualTotal) {
    var rows = document.getElementById(listId).querySelectorAll('.an-plan-row, .an-debt-plan-row');
    if (!rows.length) return;
    var cell0 = rows[0].querySelector('.an-act-disp');
    if (cell0) {
      if (actualTotal > 0) {
        cell0.textContent = anFmt(actualTotal) + ' סה"כ';
        cell0.className = 'an-act-disp';
        cell0.title = 'ביצוע YTD מתקציבים חודשיים';
      } else {
        cell0.textContent = '—'; cell0.className = 'an-act-disp zero';
      }
    }
    for (var i = 1; i < rows.length; i++) {
      var c = rows[i].querySelector('.an-act-disp');
      if (c) { c.textContent = '↑'; c.className = 'an-act-disp zero'; c.title = 'ראה שורה ראשונה'; }
    }
  }
  setActCell('an-income', act.income);
  setActCell('an-fixed',  act.fixed);
  setActCell('an-var',    act.var);
  setActCell('an-sub',    (act.sub||0)+(act.ins||0));
  setActCell('an-debt',   totalActDebt);
  setActCell('an-sav',    act.sav);

  anSetEl('an-k-inc-act', act.income > 0 ? anFmt(act.income) : '—');
  anSetEl('an-k-inc-act-sub', 'חודשים עם נתוני ביצוע: ' + (act.activeMonths||0));
}

/* ── Live recalc ── */
function anLive() {
  var pInc  = anSectionTotal('an-income');
  var pFix  = anSectionTotal('an-fixed');
  var pVar  = anSectionTotal('an-var');
  var pSub  = anSectionTotal('an-sub');
  var pDebt = anDebtTotal();
  var pSav  = anSectionTotal('an-sav');
  var pExpTotal = pFix + pVar + pSub + pDebt + pSav;
  var pCF       = pInc - pExpTotal;

  // Update ÷12 labels in each row
  function updateMoLabels(listId, isDebt) {
    var cls = isDebt ? '.an-debt-plan-row' : '.an-plan-row';
    document.getElementById(listId).querySelectorAll(cls).forEach(function(row) {
      var inp = row.querySelectorAll('input');
      var yrIdx = isDebt ? 1 : 1;
      var yr  = parseFloat(inp[yrIdx] ? inp[yrIdx].value : 0) || 0;
      var lbl = row.querySelector('.an-mo-disp');
      if (lbl) lbl.textContent = yr ? anFmt(yr/12) + '/חודש' : '—';
    });
  }
  updateMoLabels('an-income');
  updateMoLabels('an-fixed');
  updateMoLabels('an-var');
  updateMoLabels('an-sub');
  updateMoLabels('an-debt', true);
  updateMoLabels('an-sav');

  // Section total values
  anSetEl('an-tot-income-val', anFmt(pInc));
  anSetEl('an-tot-fixed-val',  anFmt(pFix));
  anSetEl('an-tot-var-val',    anFmt(pVar));
  anSetEl('an-tot-sub-val',    anFmt(pSub));
  anSetEl('an-tot-debt-val',   anFmt(pDebt));
  anSetEl('an-tot-sav-val',    anFmt(pSav));

  // KPIs
  anSetEl('an-k-inc-plan',    anFmt(pInc));
  anSetEl('an-k-inc-plan-mo', anFmt(pInc/12) + ' ממוצע לחודש');
  anSetEl('an-k-exp-plan',    anFmt(pExpTotal));
  anSetEl('an-k-exp-plan-mo', anFmt(pExpTotal/12) + ' ממוצע לחודש');
  var cfEl = document.getElementById('an-k-cf');
  if (cfEl) { cfEl.textContent = (pCF>=0?'+':'')+anFmt(pCF); cfEl.style.color = pCF>=0?'var(--accent3)':'var(--accent2)'; }

  // Cashflow banner
  var banner = document.getElementById('an-cf-banner');
  if (banner) banner.className = 'an-cf-banner ' + (pCF >= 0 ? 'pos' : 'neg');
  anSetEl('an-cf-val',  (pCF>=0?'+':'')+anFmt(pCF));
  anSetEl('an-cf-mo',   (pCF>=0?'+':'')+anFmt(pCF/12));
  anSetEl('an-cf-inc',  anFmt(pInc));
  anSetEl('an-cf-exp',  anFmt(pFix+pVar+pSub));
  anSetEl('an-cf-debt', anFmt(pDebt));
  anSetEl('an-cf-sav',  anFmt(pSav));

  // Actual CF
  var act = anActuals;
  if (act && act.income > 0) {
    var actExp = (act.fixed||0)+(act.var||0)+(act.sub||0)+(act.ins||0)+(act.inst||0)+(act.debt||0)+(act.sav||0);
    var actCF  = (act.income||0) - actExp;
    anSetEl('an-cf-act', (actCF>=0?'+':'')+anFmt(actCF));
    anSetEl('an-k-cf-sub', 'תזרים בפועל YTD: '+(actCF>=0?'+':'')+anFmt(actCF));
  }

  // Update compare badges
  anUpdateActualDisplays();

  // Rebuild monthly table
  anBuildMoTable(pInc, pFix, pVar, pSub, pDebt, pSav);
}

/* ── Monthly breakdown table ── */
function anBuildMoTable(pInc, pFix, pVar, pSub, pDebt, pSav) {
  var table = document.getElementById('an-mo-table');
  if (!table) return;
  var view = anCurrentView;

  // Per-month plan (evenly distributed)
  var moInc  = pInc  / 12;
  var moFix  = pFix  / 12;
  var moVar  = pVar  / 12;
  var moSub  = pSub  / 12;
  var moDebt = pDebt / 12;
  var moSav  = pSav  / 12;
  var moExp  = moFix + moVar + moSub;
  var moCF   = moInc - moFix - moVar - moSub - moDebt - moSav;

  // Collect actuals per month
  var moActs = AN_MONTHS.map(function(mid) {
    var p = 'mo-' + mid + '-';
    var aInc = moGetAmt(p+'income',   2);
    var aFix = moGetAmt(p+'fixed',    2);
    var aVar = moGetAmt(p+'variable', 2);
    var aSub = (moGetAmt(p+'sub',2) + moGetAmt(p+'ins',2));
    var aDbt = (moGetAmt(p+'inst',2) + moGetAmt(p+'debt',2));
    var aSav = moGetAmt(p+'saving',1);
    return { aInc:aInc, aFix:aFix, aVar:aVar, aSub:aSub, aDbt:aDbt, aSav:aSav,
             hasAct: aInc>0||aFix>0||aVar>0 };
  });

  function fv(v) { return v ? anFmt(v) : '—'; }
  function cls(v, isInc) {
    if (!v) return 'an-cell-zero';
    return isInc ? 'an-cell-plan' : 'an-cell-plan';
  }

  var html = '<thead><tr><th>קטגוריה</th>';
  AN_MONTH_SHORT.forEach(function(m){ html += '<th>' + m + '</th>'; });
  html += '<th style="color:var(--accent)">שנתי</th></tr></thead><tbody>';

  function makeRow(label, planVal, getAct, total, totalAct) {
    var tr = '<tr><td>' + label + '</td>';
    moActs.forEach(function(m, i) {
      var act = getAct(m);
      if (view === 'both' && m.hasAct) {
        tr += '<td style="font-size:.68rem;line-height:1.4">' +
          '<span style="color:var(--accent)">' + (planVal?anFmt(planVal):'—') + '</span><br>' +
          '<span style="color:' + (act?'var(--accent3)':'var(--muted)') + '">' + (act?anFmt(act):'—') + '</span>' +
          '</td>';
      } else if (view === 'actual') {
        tr += '<td class="' + (act?'an-cell-pos':'an-cell-zero') + '">' + (act?anFmt(act):'—') + '</td>';
      } else {
        tr += '<td class="an-cell-plan">' + (planVal?anFmt(planVal):'—') + '</td>';
      }
    });
    var tVal = view === 'actual' ? (totalAct||0) : total;
    tr += '<td class="an-cell-total">' + anFmt(tVal) + '</td></tr>';
    return tr;
  }

  var totActInc  = moActs.reduce(function(s,m){return s+m.aInc;},0);
  var totActFix  = moActs.reduce(function(s,m){return s+m.aFix;},0);
  var totActVar  = moActs.reduce(function(s,m){return s+m.aVar;},0);
  var totActSub  = moActs.reduce(function(s,m){return s+m.aSub;},0);
  var totActDbt  = moActs.reduce(function(s,m){return s+m.aDbt;},0);
  var totActSav  = moActs.reduce(function(s,m){return s+m.aSav;},0);

  html += makeRow('💰 הכנסות',      moInc,  function(m){return m.aInc;}, pInc,  totActInc);
  html += makeRow('📌 הוצ׳ קבועות', moFix,  function(m){return m.aFix;}, pFix,  totActFix);
  html += makeRow('🛒 הוצ׳ משתנות', moVar,  function(m){return m.aVar;}, pVar,  totActVar);
  html += makeRow('🔄 מנויים+ביטוח',moSub,  function(m){return m.aSub;}, pSub,  totActSub);
  html += makeRow('💳 הלוואות',      moDebt, function(m){return m.aDbt;}, pDebt, totActDbt);
  html += makeRow('🏦 חיסכון',       moSav,  function(m){return m.aSav;}, pSav,  totActSav);

  // Net cashflow row
  html += '<tr class="tr-sep"><td>📊 תזרים נטו</td>';
  moActs.forEach(function(m, i) {
    var pNet = moCF;
    var aNet = m.aInc - m.aFix - m.aVar - m.aSub - m.aDbt - m.aSav;
    var val = (view === 'actual' && m.hasAct) ? aNet : pNet;
    if (!val && val !== 0) { html += '<td class="an-cell-zero">—</td>'; return; }
    html += '<td class="' + (val>=0?'an-cell-pos':'an-cell-neg') + '">' + (val>=0?'+':'') + anFmt(val) + '</td>';
  });
  var annCF = view === 'actual'
    ? totActInc - totActFix - totActVar - totActSub - totActDbt - totActSav
    : pInc - pFix - pVar - pSub - pDebt - pSav;
  html += '<td class="' + (annCF>=0?'an-cell-pos':'an-cell-neg') + '">' + (annCF>=0?'+':'') + anFmt(annCF) + '</td></tr>';

  html += '</tbody>';
  table.innerHTML = html;
}

/* ── View toggle ── */
function anSetView(view) {
  anCurrentView = view;
  ['plan','actual','both'].forEach(function(v) {
    var btn = document.getElementById('an-btn-' + v);
    if (btn) btn.classList.toggle('active', v === view);
  });
  anLive();
}

/* ── Entry point ── */
function annualRender() {
  anInitYears();
  anLoadPlan();
  anPullActuals();
  anLive();
}

initMonths();

