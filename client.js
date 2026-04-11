/* ════════════════════════════════════════
   CLIENT MANAGER
════════════════════════════════════════ */
var CM_INDEX_KEY  = 'finapp_clients';
var CM_ACTIVE_KEY = 'finapp_active';
var CM_DATA_KEY   = 'finapp_data_';
var cmActiveId    = null;
var cmAutoSaveTimer = null;

function cmGetIndex() { try { return JSON.parse(localStorage.getItem(CM_INDEX_KEY)||'{}'); } catch(e){ return {}; } }
function cmSaveIndex(idx) { localStorage.setItem(CM_INDEX_KEY, JSON.stringify(idx)); }
function cmGenId() { return Date.now().toString(36) + Math.random().toString(36).substr(2,5); }

// Collect all current DOM data into a serializable object
function clientCollectData() {
  var data = {
    meta: {
      name:    (document.getElementById('client-name-field')||{value:''}).value,
      advisor: (document.getElementById('advisor-field')||{value:''}).value,
      phone:   (document.getElementById('phone-field')||{value:''}).value,
      notes:   (document.getElementById('notes-field')||{value:''}).value
    },
    manual: {
      monthsInput: 3,
      varMonthsInput: parseInt((document.getElementById('var-months-input')||{value:'3'}).value)||3,
      income:    getRows('income-list'),
      fixed:     getRows('fixed-list'),
      annual:    getAnnualRows('annual-list'),
      subs:      getRows('sub-list'),
      insurance: getRows('insurance-list'),
      variable:  getVarRows(),
      debts:     getDebtRows('debt-list'),
      assets:    getSavingRows()
    },
    monthly: {},
    annual: (function() {
      if (typeof anReadSection !== 'function') return null;
      return {
        income: anReadSection('an-income'),
        fixed:  anReadSection('an-fixed'),
        var:    anReadSection('an-var'),
        sub:    anReadSection('an-sub'),
        debt:   (typeof anReadDebtSection === 'function') ? anReadDebtSection() : [],
        sav:    anReadSection('an-sav')
      };
    })(),
    credit: (function() {
      var autoRows = {};
      ['var-list','fixed-list','sub-list','insurance-list'].forEach(function(lid) {
        var el = document.getElementById(lid); if (!el) return;
        el.querySelectorAll('.cat-auto-wrap').forEach(function(w) {
          if (w.dataset.cat) { var inp = w.querySelector('input[type="number"]'); if (inp) autoRows[w.dataset.cat] = parseFloat(inp.value)||0; }
        });
      });
      var annEl = document.getElementById('annual-list');
      if (annEl) annEl.querySelectorAll('.input-row[data-auto]').forEach(function(r) {
        if (r.dataset.cat) { var inp = r.querySelector('input[type="number"]'); if (inp) autoRows[r.dataset.cat] = parseFloat(inp.value)||0; }
      });
      return { transactions: creditTransactions||[], deletedAutoCats: Object.keys(deletedAutoCats), autoRows: autoRows };
    })(),
    learnedDB: window.learnedDB || {},
    gpPlans: (typeof window.gpGetPlans === 'function') ? window.gpGetPlans() : null
  };

  MONTHS_LIST.forEach(function(mo) {
    var mid = mo.id;
    var md = {};

    // Simple sections: name / plan / actual
    ['income','fixed','variable','sub','ins'].forEach(function(sec) {
      var el = document.getElementById(mId(mid, sec));
      if (!el) return;
      md[sec] = [];
      el.querySelectorAll('.bud-row-2').forEach(function(row) {
        var inp = row.querySelectorAll('input');
        md[sec].push({
          name:   (inp[0]||{}).value||'',
          plan:   (inp[1]||{}).value||'',
          actual: (inp[2]||{}).value||'',
          auto:   row.classList.contains('mo-auto-row') || undefined
        });
      });
    });

    // Installments: name / total / monthly / current / totalPay
    var instEl = document.getElementById(mId(mid, 'inst'));
    if (instEl) {
      md.inst = [];
      instEl.querySelectorAll('.bud-row-2').forEach(function(row) {
        var inp = row.querySelectorAll('input');
        md.inst.push({
          name: (inp[0]||{}).value||'', total:    (inp[1]||{}).value||'',
          monthly: (inp[2]||{}).value||'', current: (inp[3]||{}).value||'',
          totalPay: (inp[4]||{}).value||''
        });
      });
    }

    // Debts: name / balance / monthly / months
    var debtEl = document.getElementById(mId(mid, 'debt'));
    if (debtEl) {
      md.debt = [];
      debtEl.querySelectorAll('.bud-row-2').forEach(function(row) {
        var inp = row.querySelectorAll('input');
        md.debt.push({
          name: (inp[0]||{}).value||'', balance: (inp[1]||{}).value||'',
          monthly: (inp[2]||{}).value||'', months: (inp[3]||{}).value||''
        });
      });
    }

    // Savings: name / monthly / accumulated
    var savEl = document.getElementById(mId(mid, 'saving'));
    if (savEl) {
      md.saving = [];
      savEl.querySelectorAll('.bud-row-2').forEach(function(row) {
        var inp = row.querySelectorAll('input');
        md.saving.push({
          name: (inp[0]||{}).value||'', monthly: (inp[1]||{}).value||'',
          accum: (inp[2]||{}).value||''
        });
      });
    }

    // Year
    var yearEl = document.getElementById(mId(mid, 'year'));
    if (yearEl) md.year = yearEl.value || '';

    data.monthly[mid] = md;
  });

  return data;
}

// Restore all DOM from saved data
function clientRestoreData(data) {
  if (!data) return;
  // Meta
  if (data.meta) {
    var f = function(id, v) { var el=document.getElementById(id); if(el) el.value=v||''; };
    f('client-name-field', data.meta.name);
    f('advisor-field',     data.meta.advisor);
    f('phone-field',       data.meta.phone);
    f('notes-field',       data.meta.notes);
  }
  var m = data.manual;
  if (!m) return;
  var mi = document.getElementById('months-input');
  // monthsInput intentionally not restored — user sets this per session
  var vmi = document.getElementById('var-months-input');
  if (vmi && m.varMonthsInput) { vmi.value = m.varMonthsInput; varMonthsChange(0); }

  function restoreSimple(listId, rows, amtIdx) {
    var el = document.getElementById(listId); if (!el||!rows) return;
    el.innerHTML = '';
    rows.forEach(function(r) {
      addRow(listId, '...', false, r.name);
      var all = el.querySelectorAll('.input-row');
      var last = all[all.length-1];
      var inputs = last.querySelectorAll('input[type="number"]');
      if (inputs[amtIdx||0]) inputs[amtIdx||0].value = r.amt||'';
    });
    var cfg = typeof LIST_TOTAL_MAP !== 'undefined' && LIST_TOTAL_MAP[listId];
    if (cfg) updateSectionTotal(listId, cfg.id, cfg.div);
  }
  restoreSimple('income-list',    m.income);
  restoreSimple('fixed-list',     m.fixed);
  restoreSimple('sub-list',       m.subs);
  restoreSimple('insurance-list', m.insurance);

  // Annual — restore manual rows only (data-auto rows restored by populateVarExpensesFromCredit)
  var annEl = document.getElementById('annual-list');
  if (annEl && m.annual) {
    annEl.innerHTML = '';
    m.annual.forEach(function(r) {
      addAnnualRow('annual-list', r.name, false);
      var all = annEl.querySelectorAll('.annual-row');
      var last = all[all.length-1];
      var inputs = last.querySelectorAll('input[type="number"]');
      if (inputs[0]) inputs[0].value = r.yearly != null ? r.yearly : (r.amt ? Math.round(r.amt * 12) : '');
      updateAnnualTag(inputs[0]);
    });
  }

  // Variable — restore raw amount (not pre-divided amt) to avoid double-division
  var varEl = document.getElementById('var-list');
  if (varEl && m.variable) {
    varEl.innerHTML = '';
    m.variable.forEach(function(r) {
      addVarRow(r.name, false);
      var all = varEl.querySelectorAll('.input-row.var-row');
      var last = all[all.length-1];
      var inputs = last.querySelectorAll('input[type="number"]');
      if (inputs[0]) inputs[0].value = (r.raw != null ? r.raw : r.amt) || '';
    });
    updateVarTotals();
  }

  // Debts
  var debtEl = document.getElementById('debt-list');
  if (debtEl && m.debts) {
    debtEl.innerHTML = '';
    m.debts.forEach(function(r) {
      addDebtRow('debt-list', r.name, false);
      var all = debtEl.querySelectorAll('.debt-row');
      var last = all[all.length-1];
      var set = function(cls, v) { var x=last.querySelector(cls); if(x) x.value=v||''; };
      set('.debt-original', r.original); set('.debt-balance', r.balance);
      set('.debt-rate', r.rate); set('.debt-months', r.months);
      set('.debt-monthly', r.monthly != null ? r.monthly : r.amt); // fallback for old saves
    });
    if (typeof updateDebtTotals === 'function') updateDebtTotals();
  }

  // Assets
  var assetEl = document.getElementById('asset-list');
  if (assetEl && m.assets) {
    assetEl.innerHTML = '';
    m.assets.forEach(function(r) {
      addSavingRow(r.name, false);
      var all = assetEl.querySelectorAll('.saving-row');
      var last = all[all.length-1];
      var sm = last.querySelector('.saving-monthly'); if(sm) sm.value = r.monthly||'';
      var sa = last.querySelector('.saving-accum');   if(sa) sa.value = (r.accum != null ? r.accum : r.amt)||'';
    });
    if (typeof updateAssetTotals === 'function') updateAssetTotals();
  }

  // Monthly tabs
  if (data.monthly && typeof moSimpleRow === 'function') {
    MONTHS_LIST.forEach(function(mo) {
      var mid = mo.id;
      var md = data.monthly[mid];
      if (!md) return;

      // Year
      var yearEl = document.getElementById(mId(mid, 'year'));
      if (yearEl && md.year) yearEl.value = md.year;

      // Simple sections: name / plan / actual
      ['income','fixed','variable','sub','ins'].forEach(function(sec) {
        var el = document.getElementById(mId(mid, sec));
        if (!el || !md[sec]) return;
        el.innerHTML = '';
        md[sec].forEach(function(item) {
          var rowHtml = item.auto
            ? '<div class="bud-row-2 mo-auto-row">' +
                '<input class="bud-name" type="text" value="" oninput="moLive(this)">' +
                '<input class="bud-amt" type="number" placeholder="תכנון" min="0" oninput="moLive(this)">' +
                '<input class="bud-actual" type="number" placeholder="ביצוע" min="0" oninput="moLive(this)">' +
                '<button class="bud-del" onclick="budDel(this);moLiveFromDel(this)">✕</button>' +
              '</div>'
            : moSimpleRow(item.name||'');
          el.insertAdjacentHTML('beforeend', rowHtml);
          var rows = el.querySelectorAll('.bud-row-2');
          var last = rows[rows.length-1];
          var inp = last.querySelectorAll('input');
          if (inp[0]) inp[0].value = item.name||'';
          if (inp[1]) inp[1].value = item.plan||'';
          if (inp[2]) inp[2].value = item.actual||'';
        });
      });

      // Installments
      var instEl = document.getElementById(mId(mid, 'inst'));
      if (instEl && md.inst) {
        instEl.innerHTML = '';
        md.inst.forEach(function(item) {
          instEl.insertAdjacentHTML('beforeend', moInstRow());
          var rows = instEl.querySelectorAll('.bud-row-2');
          var last = rows[rows.length-1];
          var inp = last.querySelectorAll('input');
          if (inp[0]) inp[0].value = item.name||'';
          if (inp[1]) inp[1].value = item.total||'';
          if (inp[2]) inp[2].value = item.monthly||'';
          if (inp[3]) inp[3].value = item.current||'';
          if (inp[4]) inp[4].value = item.totalPay||'';
        });
      }

      // Debts
      var moDebtEl = document.getElementById(mId(mid, 'debt'));
      if (moDebtEl && md.debt) {
        moDebtEl.innerHTML = '';
        md.debt.forEach(function(item) {
          moDebtEl.insertAdjacentHTML('beforeend', moDebtRow());
          var rows = moDebtEl.querySelectorAll('.bud-row-2');
          var last = rows[rows.length-1];
          var inp = last.querySelectorAll('input');
          if (inp[0]) inp[0].value = item.name||'';
          if (inp[1]) inp[1].value = item.balance||'';
          if (inp[2]) inp[2].value = item.monthly||'';
          if (inp[3]) inp[3].value = item.months||'';
        });
      }

      // Savings
      var moSavEl = document.getElementById(mId(mid, 'saving'));
      if (moSavEl && md.saving) {
        moSavEl.innerHTML = '';
        md.saving.forEach(function(item) {
          moSavEl.insertAdjacentHTML('beforeend', moSavingRow());
          var rows = moSavEl.querySelectorAll('.bud-row-2');
          var last = rows[rows.length-1];
          var inp = last.querySelectorAll('input');
          if (inp[0]) inp[0].value = item.name||'';
          if (inp[1]) inp[1].value = item.monthly||'';
          if (inp[2]) inp[2].value = item.accum||'';
        });
      }

      moRecalc(mid);
    });
  }

  // Credit
  if (data.credit && data.credit.transactions) {
    creditTransactions = data.credit.transactions;
    // Restore which categories the user manually deleted
    deletedAutoCats = {};
    if (data.credit.deletedAutoCats) {
      data.credit.deletedAutoCats.forEach(function(c){ deletedAutoCats[c] = true; });
    }
    // מיזוג עם localStorage — גיבוי למקרה שהשמירה ל-Firebase לא הספיקה לפני רענון
    try {
      var _lsKey = typeof CM_DATA_KEY !== 'undefined' && typeof cmActiveId !== 'undefined' && cmActiveId
        ? CM_DATA_KEY + cmActiveId : null;
      if (_lsKey) {
        var _lsData = JSON.parse(localStorage.getItem(_lsKey) || '{}');
        if (_lsData.credit && _lsData.credit.deletedAutoCats) {
          _lsData.credit.deletedAutoCats.forEach(function(c){ deletedAutoCats[c] = true; });
        }
      }
    } catch(e) {}
    if (creditTransactions.length > 0) {
      _ccCtx = '';
      renderCreditSummary();
      populateVarExpensesFromCredit();
    }
  }

  // Annual tab
  if (data.annual && typeof anAddRow === 'function') {
    var an = data.annual;
    ['income','fixed','var','sub','sav'].forEach(function(key) {
      var listId = 'an-' + key;
      var el = document.getElementById(listId);
      if (!el || !an[key]) return;
      el.innerHTML = '';
      an[key].forEach(function(item) { anAddRow(listId, key, item.name, item.yr); });
    });
    var debtEl = document.getElementById('an-debt');
    if (debtEl && an.debt && typeof anAddDebtRow === 'function') {
      debtEl.innerHTML = '';
      an.debt.forEach(function(item) { anAddDebtRow(item.name, item.yr, item.balance); });
    }
    // Sync localStorage so anLoadPlan() finds correct data when tab is opened
    if (typeof anSavePlan === 'function') anSavePlan();
  }

  // learnedDB — learned category overrides
  if (data.learnedDB && typeof data.learnedDB === 'object') {
    window.learnedDB = data.learnedDB;
    try { localStorage.setItem('finapp_learnedDB', JSON.stringify(window.learnedDB)); } catch(e) {}
  }

  // gpPlans — financial goal plans
  if (data.gpPlans && typeof window.gpSetPlans === 'function') {
    window.gpSetPlans(data.gpPlans);
  }
}

// Save active client
function clientSave() {
  if (!cmActiveId) return;
  var data = clientCollectData();
  localStorage.setItem(CM_DATA_KEY + cmActiveId, JSON.stringify(data));
  var idx = cmGetIndex();
  if (idx[cmActiveId]) { idx[cmActiveId].updatedAt = Date.now(); cmSaveIndex(idx); }
  // Advisor mode: flash save button
  var btn = document.querySelector('[onclick="clientSave()"]');
  if (btn) { var o = btn.textContent; btn.textContent = '✓ נשמר'; setTimeout(function(){ btn.textContent = o; }, 1400); }
  // Client mode: update auto-save status indicator
  var statusEl = document.getElementById('client-save-status');
  if (statusEl) {
    var now = new Date();
    statusEl.textContent = '✓ נשמר ' + now.toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'});
  }
}

// Auto-save debounced (called from oninput on client fields)
function clientAutoSave() {
  clearTimeout(cmAutoSaveTimer);
  cmAutoSaveTimer = setTimeout(function() {
    if (cmActiveId) {
      // update name in index from field
      var nameEl = document.getElementById('client-name-field');
      if (nameEl && nameEl.value.trim()) {
        var idx = cmGetIndex();
        if (idx[cmActiveId]) { idx[cmActiveId].name = nameEl.value.trim(); cmSaveIndex(idx); }
        clientRenderBar();
      }
      clientSave();
    }
  }, 800);
}

// Load client
function clientLoad(id) {
  var idx = cmGetIndex();
  if (!idx[id]) return;
  if (cmActiveId && cmActiveId !== id) clientSave();
  cmActiveId = id;
  localStorage.setItem(CM_ACTIVE_KEY, id);
  var raw = localStorage.getItem(CM_DATA_KEY + id);
  if (raw) { try { clientRestoreData(JSON.parse(raw)); } catch(e) { console.warn('clientLoad error', e); } }
  clientRenderBar();
  clientCloseModal();
}

// Create new client
function clientCreate() {
  var name = (document.getElementById('cm-new-name')||{value:''}).value.trim();
  if (!name) { alert('נא להזין שם לקוח'); return; }
  var advisor = (document.getElementById('cm-new-advisor')||{value:''}).value.trim();
  var phone   = (document.getElementById('cm-new-phone')||{value:''}).value.trim();
  if (cmActiveId) clientSave();
  var id = cmGenId();
  var idx = cmGetIndex();
  idx[id] = { name: name, advisor: advisor, phone: phone, createdAt: Date.now(), updatedAt: Date.now() };
  cmSaveIndex(idx);
  cmActiveId = id;
  localStorage.setItem(CM_ACTIVE_KEY, id);
  // Clear forms
  clientClearAll();
  // Pre-fill advisor field
  var af = document.getElementById('advisor-field'); if (af) af.value = advisor;
  var nf = document.getElementById('client-name-field'); if (nf) nf.value = name;
  var pf = document.getElementById('phone-field'); if (pf) pf.value = phone;
  // Save empty state
  localStorage.setItem(CM_DATA_KEY + id, JSON.stringify(clientCollectData()));
  clientRenderBar();
  clientRenderModal();
  ['cm-new-name','cm-new-advisor','cm-new-phone'].forEach(function(x){ var el=document.getElementById(x); if(el) el.value=''; });
  clientCloseModal();
}

// Delete client
function clientDelete(id) {
  if (!confirm('למחוק את הלקוח לצמיתות? לא ניתן לשחזר.')) return;
  var idx = cmGetIndex();
  delete idx[id];
  cmSaveIndex(idx);
  localStorage.removeItem(CM_DATA_KEY + id);
  if (cmActiveId === id) {
    cmActiveId = null;
    localStorage.removeItem(CM_ACTIVE_KEY);
    var ids = Object.keys(idx);
    if (ids.length) { clientLoad(ids[0]); return; }
    else clientClearAll();
  }
  clientRenderModal();
  clientRenderBar();
}

// Clear all form data
function clientClearAll() {
  ['income-list','fixed-list','annual-list','sub-list','insurance-list','var-list','debt-list','asset-list'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.innerHTML = '';
  });
  ['client-name-field','advisor-field','phone-field','notes-field'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  // Clear monthly tabs
  if (typeof MONTHS_LIST !== 'undefined' && typeof mId === 'function') {
    MONTHS_LIST.forEach(function(mo) {
      var mid = mo.id;
      ['income','fixed','variable','sub','ins','inst','debt','saving'].forEach(function(sec) {
        var el = document.getElementById(mId(mid, sec));
        if (el) el.innerHTML = '';
      });
      var yearEl = document.getElementById(mId(mid, 'year'));
      if (yearEl) yearEl.value = '';
      if (typeof moRecalc === 'function') moRecalc(mid);
    });
  }
  creditTransactions = [];
  var mi = document.getElementById('months-input'); if (mi) mi.value = '3';
}

// Save updated file for client — embeds current data into a new HTML download
function clientSaveFile() {
  clientSave(); // persist to localStorage too
  var idx = cmGetIndex();
  var meta = (cmActiveId && idx[cmActiveId]) ? idx[cmActiveId] : {};
  if (cmActiveId && idx[cmActiveId]) { idx[cmActiveId].updatedAt = Date.now(); cmSaveIndex(idx); }
  var data = clientCollectData();

  var clone = document.documentElement.cloneNode(true);

  // Remove any previously-injected preload scripts
  clone.querySelectorAll('script').forEach(function(sc) {
    if (sc.textContent.indexOf('__PRELOADED_CLIENT__') !== -1 ||
        sc.textContent.indexOf('__CLIENT_MODE__') !== -1) { sc.remove(); }
  });

  // Remove advisor modal (not present in client copies, but just in case)
  var modal = clone.querySelector('#cm-overlay'); if (modal) modal.remove();

  // Inject fresh preloaded data
  var sc = document.createElement('script');
  sc.textContent =
    'window.__CLIENT_MODE__=true;\n' +
    'window.__PRELOADED_CLIENT__=' + JSON.stringify({ id: cmActiveId, meta: meta, data: data }) + ';';
  var head = clone.querySelector('head');
  if (head) head.insertBefore(sc, head.firstChild);

  var filename = (meta.name||'לקוח').replace(/[\\/:*?"<>|]/g,'_') + ' — כלכלת הבית.html';
  var blob = new Blob(['<!DOCTYPE html>\n' + clone.outerHTML], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);

  // Visual feedback
  var btn = document.querySelector('[onclick="clientSaveFile()"]');
  if (btn) { var orig = btn.textContent; btn.textContent = '✓ הקובץ נשמר!'; setTimeout(function(){ btn.textContent = orig; }, 2000); }
}

// Export personal app copy for client (no advisor management UI)
function clientExport() {
  if (!cmActiveId) { alert('אנא בחר לקוח קודם'); return; }
  clientSave();
  var idx = cmGetIndex();
  var meta = idx[cmActiveId] || {};
  var raw = localStorage.getItem(CM_DATA_KEY + cmActiveId);
  var data = raw ? JSON.parse(raw) : {};

  var clone = document.documentElement.cloneNode(true);

  // Remove advisor-only modal (client bar stays and is adapted by clientInit)
  var modal = clone.querySelector('#cm-overlay'); if (modal) modal.remove();

  // Inject preloaded client data as first script in <head>
  var sc = clone.ownerDocument ? clone.ownerDocument.createElement('script') : document.createElement('script');
  sc.textContent =
    'window.__CLIENT_MODE__=true;\n' +
    'window.__PRELOADED_CLIENT__=' + JSON.stringify({ id: cmActiveId, meta: meta, data: data }) + ';';
  var head = clone.querySelector('head');
  if (head) head.insertBefore(sc, head.firstChild);

  var filename = (meta.name||'לקוח').replace(/[\\/:*?"<>|]/g,'_') + ' — כלכלת הבית.html';
  var blob = new Blob(['<!DOCTYPE html>\n' + clone.outerHTML], { type: 'text/html;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  URL.revokeObjectURL(a.href);
}

// Render client bar
function clientRenderBar() {
  var idx = cmGetIndex();
  var meta = cmActiveId && idx[cmActiveId];
  var nd = document.getElementById('client-name-display');
  var av = document.getElementById('client-avatar');
  if (nd) nd.textContent = meta ? meta.name : 'אין לקוח פעיל';
  if (av) av.textContent = meta && meta.name ? meta.name[0].toUpperCase() : '?';
}

// Modal
function clientOpenModal() { clientRenderModal(); var el=document.getElementById('cm-overlay'); if(el) el.classList.add('open'); }
function clientCloseModal() { var el=document.getElementById('cm-overlay'); if(el) el.classList.remove('open'); }
function clientRenderModal() {
  var idx = cmGetIndex();
  var ids = Object.keys(idx).sort(function(a,b){ return (idx[b].createdAt||0)-(idx[a].createdAt||0); });
  var el = document.getElementById('cm-client-list'); if (!el) return;
  if (!ids.length) { el.innerHTML = '<p style="color:var(--muted);font-size:.83rem;text-align:center;padding:12px">אין לקוחות עדיין. צור לקוח חדש למעלה.</p>'; return; }
  el.innerHTML = ids.map(function(id) {
    var m = idx[id]; var isActive = id === cmActiveId;
    return '<div class="cm-client-item' + (isActive?' active':'') + '">' +
      '<div class="client-avatar" style="flex-shrink:0">' + (m.name||'?')[0].toUpperCase() + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="cm-client-name">' + (m.name||'ללא שם') + '</div>' +
        '<div class="cm-client-meta">' + (m.phone ? m.phone + ' ' : '') + (m.advisor ? '• יועץ: '+m.advisor : '') + '</div>' +
      '</div>' +
      (isActive
        ? '<span style="font-size:.75rem;color:var(--accent);font-weight:700;padding:4px 10px">✓ פעיל</span>'
        : '<button class="client-btn" onclick="clientLoad(\''+id+'\')" style="flex-shrink:0">טען</button>') +
      '<button class="client-btn" onclick="clientDelete(\''+id+'\')" style="flex-shrink:0;color:#fb7185;border-color:rgba(251,113,133,.4)">מחק</button>' +
    '</div>';
  }).join('');

  // Render archive list
  var arcEl = document.getElementById('cm-archive-list');
  if (!arcEl) return;
  var archives = cmGetArchives();
  if (!archives.length) {
    arcEl.innerHTML = '<p style="color:var(--muted);font-size:.8rem;text-align:center;padding:8px">אין ארכיונים שמורים עדיין.</p>';
    return;
  }
  arcEl.innerHTML = archives.map(function(arc) {
    var date = new Date(arc.savedAt).toLocaleDateString('he-IL');
    return '<div class="cm-client-item">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="cm-client-name">📅 ' + arc.label + '</div>' +
        '<div class="cm-client-meta">' + date + '</div>' +
      '</div>' +
      '<button class="client-btn" onclick="cmRestoreArchive(\'' + arc.id + '\')" style="flex-shrink:0">שחזר</button>' +
      '<button class="client-btn" onclick="cmExportArchive(\'' + arc.id + '\')" style="flex-shrink:0">הורד</button>' +
      '<button class="client-btn" onclick="cmDeleteArchive(\'' + arc.id + '\')" style="flex-shrink:0;color:#fb7185;border-color:rgba(251,113,133,.4)">מחק</button>' +
    '</div>';
  }).join('');
}

// Init on page load
function clientInit() {
  var skipRestore = false;

  if (window.__PRELOADED_CLIENT__) {
    var pc = window.__PRELOADED_CLIENT__;
    var idx = cmGetIndex();
    idx[pc.id] = pc.meta;
    cmSaveIndex(idx);
    var hasExisting = !!localStorage.getItem(CM_DATA_KEY + pc.id);
    if (!hasExisting && pc.data) {
      // First ever open — no saved edits yet. Write preloaded data and skip DOM restore
      // (DOM already has the data from the cloned HTML export)
      localStorage.setItem(CM_DATA_KEY + pc.id, JSON.stringify(pc.data));
      if (window.__CLIENT_MODE__) skipRestore = true;
    }
    // Subsequent opens: localStorage has the client's saved edits — use those, not the preloaded original
    localStorage.setItem(CM_ACTIVE_KEY, pc.id);
  }

  var activeId = localStorage.getItem(CM_ACTIVE_KEY);
  var allIdx = cmGetIndex();
  if (activeId && allIdx[activeId]) {
    cmActiveId = activeId;
    if (!skipRestore) {
      var raw = localStorage.getItem(CM_DATA_KEY + activeId);
      if (raw) { try { clientRestoreData(JSON.parse(raw)); } catch(e) { console.warn('clientInit error', e); } }
    }
  } else if (!activeId) {
    // No client yet — auto-create a default one so data always gets saved
    var autoId = cmGenId();
    var autoIdx = cmGetIndex();
    autoIdx[autoId] = { name: 'ברירת מחדל', advisor: '', phone: '', createdAt: Date.now(), updatedAt: Date.now() };
    cmSaveIndex(autoIdx);
    localStorage.setItem(CM_ACTIVE_KEY, autoId);
    cmActiveId = autoId;
  }
  clientRenderBar();

  if (window.__CLIENT_MODE__) {
    var actions = document.querySelector('#client-bar .client-actions');
    if (actions) {
      actions.innerHTML =
        '<span id="client-save-status" style="font-size:.76rem;color:var(--muted);padding:0 10px;align-self:center;white-space:nowrap">✓ נשמר אוטומטית</span>' +
        '<button class="client-btn" onclick="clientSaveFile()" title="ייצא קובץ גיבוי">📥 גיבוי</button>' +
        '<button class="client-btn" onclick="window.print()">🖨️ הדפס</button>';
    }
  }
  // Auto-save on page unload (both modes)
  window.addEventListener('beforeunload', function() { if (cmActiveId) clientSave(); });
}
/* ── Year Archive ──────────────────────────────────────────────── */
var CM_ARCHIVE_KEY = 'finapp_archive_';

function cmGetArchives(clientId) {
  try { return JSON.parse(localStorage.getItem(CM_ARCHIVE_KEY + (clientId || cmActiveId)) || '[]'); }
  catch(e) { return []; }
}

function cmSaveArchives(archives, clientId) {
  localStorage.setItem(CM_ARCHIVE_KEY + (clientId || cmActiveId), JSON.stringify(archives));
}

function cmArchiveYear() {
  if (!cmActiveId) { alert('אין לקוח פעיל'); return; }
  var year = new Date().getFullYear();
  var label = prompt('שם הארכיון:', 'שנת ' + year);
  if (!label) return;
  clientSave();
  var data = clientCollectData();
  var archives = cmGetArchives();
  archives.unshift({ id: Date.now().toString(36), label: label, savedAt: new Date().toISOString(), data: data });
  cmSaveArchives(archives);
  clientRenderModal();
  alert('ארכיון נשמר: ' + label);
}

function cmRestoreArchive(archiveId) {
  var archives = cmGetArchives();
  var arc = archives.find(function(a){ return a.id === archiveId; });
  if (!arc) return;
  if (!confirm('לשחזר את הארכיון "' + arc.label + '"?\nהנתונים הנוכחיים יוחלפו.')) return;
  clientRestoreData(arc.data);
  clientSave();
  clientCloseModal();
}

function cmDeleteArchive(archiveId) {
  if (!confirm('למחוק ארכיון זה לצמיתות?')) return;
  var archives = cmGetArchives().filter(function(a){ return a.id !== archiveId; });
  cmSaveArchives(archives);
  clientRenderModal();
}

function cmExportArchive(archiveId) {
  var archives = cmGetArchives();
  var arc = archives.find(function(a){ return a.id === archiveId; });
  if (!arc) return;
  var blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), label: arc.label, data: arc.data }, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'archive-' + arc.label.replace(/[^a-zA-Z0-9א-ת]/g, '-') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* ════════ END CLIENT MANAGER ════════ */

// Init client manager after page load
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(clientInit, 100);
});

