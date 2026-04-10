/* ════════════════════════════════════════
   IMPORT-TO-BUDGET TAB
════════════════════════════════════════ */
var importPendingFiles = [];
var importCreditTransactions = [];
var IMPORT_MONTH_NAMES = {
  jan:'ינואר',feb:'פברואר',mar:'מרץ',apr:'אפריל',may:'מאי',jun:'יוני',
  jul:'יולי',aug:'אוגוסט',sep:'ספטמבר',oct:'אוקטובר',nov:'נובמבר',dec:'דצמבר'
};

function importHandleFileUpload(files) {
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!importPendingFiles.find(function(p){ return p.name === f.name; })) {
      importPendingFiles.push(f);
    }
  }
  importRenderFileList();
}

function importRenderFileList() {
  var fl = document.getElementById('import-file-list');
  fl.innerHTML = '';
  importPendingFiles.forEach(function(f, i) {
    var chip = document.createElement('div');
    chip.className = 'file-chip';
    chip.innerHTML = '<span><span class="chip-name">📄 ' + f.name + '</span></span>' +
      '<button class="btn-del" onclick="importRemoveFile(' + i + ')">×</button>';
    fl.appendChild(chip);
  });
  var btn = document.getElementById('import-parse-btn');
  if (btn) btn.style.display = importPendingFiles.length ? 'block' : 'none';
  var countBar2 = document.getElementById('import-file-count-bar');
  if (countBar2) {
    if (importPendingFiles.length > 0) {
      countBar2.style.display = 'block';
      countBar2.textContent = '📁 ' + importPendingFiles.length + ' כרטיסים נבחרו';
    } else {
      countBar2.style.display = 'none';
    }
  }
}

function importRemoveFile(idx) {
  importPendingFiles.splice(idx, 1);
  importRenderFileList();
}

function importDrop(e) {
  e.preventDefault();
  document.getElementById('import-upload-zone').classList.remove('drag-over');
  if (e.dataTransfer && e.dataTransfer.files) importHandleFileUpload(e.dataTransfer.files);
}

async function importParseFiles() {
  if (!importPendingFiles.length) return;
  _ccCtx = 'import-';
  showLoading('מנתח קבצים...');
  try {
    importCreditTransactions = [];
    for (var i = 0; i < importPendingFiles.length; i++) {
      var f = importPendingFiles[i];
      var rows = await parseExcelFile(f);
      var txs = extractTransactions(rows, f.name);
      importCreditTransactions.push.apply(importCreditTransactions, txs);
      uploadedFiles.push({ name: f.name, rowCount: txs.length });
    }
    hideLoading();
    renderSmartAnalysis();
    renderCreditSummary();
    document.getElementById('import-credit-results').style.display = 'block';
    importAutoDetectMonth();
    updateImportSendBtn();
    var unmatchedCount = importCreditTransactions.filter(function(t){ return t.category === 'שונות'; }).length;
    if (unmatchedCount > 0) analyzeWithAI();
  } catch(e) {
    hideLoading();
    alert('שגיאה בפענוח הקובץ: ' + e.message);
  }
}

function importAutoDetectMonth() {
  var counts = {};
  importCreditTransactions.forEach(function(tx) {
    if (tx.date) { var m = tx.date.substring(0,7); counts[m] = (counts[m]||0)+1; }
  });
  var best = Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; })[0];
  if (!best) return;
  var parts = best.split('-');
  var moIds = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  var moId  = moIds[parseInt(parts[1])-1];
  var sel = document.getElementById('import-target-month');
  var yr  = document.getElementById('import-target-year');
  if (sel && moId && !sel.value) sel.value = moId;
  if (yr  && parts[0] && !yr.value) yr.value = parts[0];
}

function importFilterTransactions(q) {
  _ccCtx = 'import-';
  filterTransactions(q);
}

function importAnalyzeWithAI() {
  _ccCtx = 'import-';
  analyzeWithAI();
}

function updateImportSendBtn() {
  var sel   = document.getElementById('import-target-month');
  var year  = (document.getElementById('import-target-year') || {}).value;
  var label = document.getElementById('import-send-label');
  if (!label || !sel) return;
  var mo = sel.value ? (IMPORT_MONTH_NAMES[sel.value] || sel.value) : '...';
  label.textContent = 'שלח ביצוע לתקציב ' + mo + (year ? ' ' + year : '');
}

function importSendToBudget() {
  var monthId = (document.getElementById('import-target-month') || {}).value;
  var year    = parseInt((document.getElementById('import-target-year') || {}).value);
  if (!monthId) { alert('יש לבחור חודש יעד לפני השליחה.'); return; }
  if (!importCreditTransactions.length) {
    alert('אין עסקאות לשליחה — אנא העלה קובץ בטאב זה.');
    return;
  }

  var moIdx    = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthId);
  var monthStr = year ? (year + '-' + String(moIdx + 1).padStart(2, '0')) : null;

  var txs = importCreditTransactions.filter(function(tx) {
    if (tx.isRefund) return false;
    if (!monthStr)   return true;
    return tx.date && tx.date.substring(0, 7) === monthStr;
  });

  if (txs.length === 0) {
    alert(monthStr
      ? 'לא נמצאו עסקאות לחודש ' + (IMPORT_MONTH_NAMES[monthId]||monthId) + ' ' + year + '.\nנסה ללא שנה, או בדוק שתאריכי העסקאות תואמים.'
      : 'לא נמצאו עסקאות לשליחה.');
    return;
  }

  if (year) {
    var yearEl = document.getElementById('mo-' + monthId + '-year');
    if (yearEl && !yearEl.value) yearEl.value = year;
  }

  var lbl = (IMPORT_MONTH_NAMES[monthId]||monthId) + (year ? ' ' + year : '');
  // Switch tab FIRST so syncManualToMonth populates plan values, then apply credit actuals on top
  switchTab('mo-' + monthId);
  moApplyCreditData(monthId, txs, lbl);

  var btn = document.getElementById('import-send-btn');
  var lblEl = document.getElementById('import-send-label');
  if (btn && lblEl) {
    var orig = lblEl.textContent;
    lblEl.textContent = 'נשלח בהצלחה! ✅';
    btn.style.background = 'rgba(67,233,123,.6)';
    setTimeout(function() {
      lblEl.textContent = orig;
      btn.style.background = '';
    }, 3000);
  }
}

// Sync fixed categories from manual mapping tab into a month panel
function syncManualToMonth(mid) {
  function readSimple(sourceId) {
    var list = document.getElementById(sourceId);
    if (!list) return [];
    var items = [];
    list.querySelectorAll('.input-row').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var name = inputs[0] ? inputs[0].value.trim() : '';
      var amt  = parseFloat(inputs[1] ? inputs[1].value : 0) || 0;
      if (name || amt) items.push({ name: name, amt: amt });
    });
    return items;
  }
  function readVar() {
    var list = document.getElementById('var-list');
    if (!list) return [];
    var months = Math.max(1, parseInt((document.getElementById('var-months-input')||{value:'3'}).value)||3);
    var items = [];
    list.querySelectorAll('.input-row').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      var name  = inputs[0] ? inputs[0].value.trim() : '';
      var total = parseFloat(inputs[1] ? inputs[1].value : 0) || 0;
      // inst rows are already monthly; var rows divide by months
      var monthly = row.hasAttribute('data-inst') ? total : Math.round(total / months);
      if (name || total) items.push({ name: name, amt: monthly });
    });
    return items;
  }
  function readAssets() {
    var list = document.getElementById('asset-list');
    if (!list) return [];
    var items = [];
    list.querySelectorAll('.saving-row').forEach(function(row) {
      var nameEl = row.querySelector('input[type="text"]');
      var name = nameEl ? nameEl.value.trim() : '';
      var mo   = parseFloat((row.querySelector('.saving-monthly')||{value:''}).value) || 0;
      var acc  = parseFloat((row.querySelector('.saving-accum')||{value:''}).value) || 0;
      if (name || mo || acc) items.push({ name: name, mo: mo, acc: acc });
    });
    return items;
  }
  function populateSimple(section, items) {
    var list = document.getElementById(mId(mid, section));
    if (!list) return;
    // Preserve existing actual values before wiping (keyed by row name)
    var savedActuals = {};
    var savedAutoRows = []; // mo-auto-rows to re-add after sync
    list.querySelectorAll('.bud-row-2').forEach(function(row) {
      var inp = row.querySelectorAll('input');
      var name = (inp[0] || {}).value.trim();
      var actual = (inp[2] || {}).value;
      if (name && actual !== '') savedActuals[name] = actual;
      if (row.classList.contains('mo-auto-row') && name && actual !== '') {
        savedAutoRows.push({ name: name, actual: actual });
      }
    });
    list.innerHTML = '';
    var manualNames = items.map(function(i){ return i.name; });
    items.forEach(function(item) {
      var d = document.createElement('div');
      d.innerHTML = moSimpleRow('');
      var row = d.firstChild;
      var inputs = row.querySelectorAll('input');
      if (inputs[0]) inputs[0].value = item.name;
      if (inputs[1]) inputs[1].value = item.amt || '';
      if (inputs[2] && savedActuals[item.name] != null) inputs[2].value = savedActuals[item.name];
      list.appendChild(row);
    });
    // Re-add auto-rows whose category was not in the manual list
    savedAutoRows.forEach(function(r) {
      if (manualNames.indexOf(r.name) === -1) {
        var d = document.createElement('div');
        d.innerHTML = '<div class="bud-row-2 mo-auto-row">' +
          '<input class="bud-name" type="text" value="' + r.name + '" oninput="moLive(this)">' +
          '<input class="bud-amt" type="number" placeholder="תכנון" min="0" oninput="moLive(this)">' +
          '<input class="bud-actual" type="number" value="' + r.actual + '" min="0" oninput="moLive(this)">' +
          '<button class="bud-del" onclick="budDel(this);moLiveFromDel(this)">✕</button>' +
          '</div>';
        list.appendChild(d.firstChild);
      }
    });
    if (items.length === 0) {
      var d = document.createElement('div'); d.innerHTML = moSimpleRow(''); list.appendChild(d.firstChild);
    }
  }
  function populateSaving(items) {
    var list = document.getElementById(mId(mid, 'saving'));
    if (!list) return;
    list.innerHTML = '';
    items.forEach(function(item) {
      var d = document.createElement('div');
      d.innerHTML = moSavingRow();
      var row = d.firstChild;
      var inputs = row.querySelectorAll('input');
      if (inputs[0]) inputs[0].value = item.name;
      if (inputs[1]) inputs[1].value = item.mo || '';
      if (inputs[2]) inputs[2].value = item.acc || '';
      list.appendChild(row);
    });
    if (items.length === 0) { moAddSaving(mid); }
  }
  populateSimple('fixed',    readSimple('fixed-list'));
  populateSimple('sub',      readSimple('sub-list'));
  populateSimple('ins',      readSimple('insurance-list'));
  populateSimple('variable', readVar());
  populateSaving(readAssets());

  // Sync installments
  (function() {
    var list = document.getElementById(mId(mid, 'inst'));
    if (!list) return;
    list.innerHTML = '';
    var srcList = document.getElementById('installment-list');
    if (!srcList) return;
    var rows = srcList.querySelectorAll('.inst-row');
    rows.forEach(function(row) {
      var name    = row.querySelector('input[type="text"]').value.trim();
      var total   = (row.querySelector('.inst-total')   || {value:''}).value;
      var monthly = (row.querySelector('.inst-monthly') || {value:''}).value;
      var cur     = (row.querySelector('.inst-cur')     || {value:''}).value;
      var max     = (row.querySelector('.inst-max')     || {value:''}).value;
      if (!name && !monthly) return;
      var d = document.createElement('div');
      d.innerHTML = moInstRow();
      var r = d.firstChild;
      var inputs = r.querySelectorAll('input');
      if (inputs[0]) inputs[0].value = name;
      if (inputs[1]) inputs[1].value = total;
      if (inputs[2]) inputs[2].value = monthly;
      if (inputs[3]) inputs[3].value = cur;
      if (inputs[4]) inputs[4].value = max;
      list.appendChild(r);
    });
    if (rows.length === 0) {
      var d = document.createElement('div'); d.innerHTML = moInstRow(); list.appendChild(d.firstChild);
    }
  })();

  // Sync debts / loans
  (function() {
    var list = document.getElementById(mId(mid, 'debt'));
    if (!list) return;
    list.innerHTML = '';
    var srcList = document.getElementById('debt-list');
    if (!srcList) return;
    var rows = srcList.querySelectorAll('.debt-row');
    rows.forEach(function(row) {
      var name    = (row.querySelector('.debt-name')    || {value:''}).value.trim();
      var balance = (row.querySelector('.debt-balance') || {value:''}).value;
      var monthly = (row.querySelector('.debt-monthly') || {value:''}).value;
      var months  = (row.querySelector('.debt-months')  || {value:''}).value;
      if (!name && !monthly) return;
      var d = document.createElement('div');
      d.innerHTML = moDebtRow();
      var r = d.firstChild;
      var inputs = r.querySelectorAll('input');
      if (inputs[0]) inputs[0].value = name;
      if (inputs[1]) inputs[1].value = balance || '';
      if (inputs[2]) inputs[2].value = monthly;
      if (inputs[3]) inputs[3].value = months;
      list.appendChild(r);
    });
    if (rows.length === 0) {
      var d = document.createElement('div'); d.innerHTML = moDebtRow(); list.appendChild(d.firstChild);
    }
  })();

  moRecalc(mid);
}

// Update switchTab to handle month panels too
var _origSwitchTab = switchTab;
switchTab = function(tab) {
  _origSwitchTab(tab);
  if (tab === 'mo-feb') syncManualToMonth('feb');
  if (tab === 'mo-jan') syncManualToMonth('jan');
  if (tab === 'mo-mar') syncManualToMonth('mar');
  if (tab === 'mo-apr') syncManualToMonth('apr');
  if (tab === 'mo-may') syncManualToMonth('may');
  if (tab === 'mo-jun') syncManualToMonth('jun');
  if (tab === 'mo-jul') syncManualToMonth('jul');
  if (tab === 'mo-aug') syncManualToMonth('aug');
  if (tab === 'mo-sep') syncManualToMonth('sep');
  if (tab === 'mo-oct') syncManualToMonth('oct');
  if (tab === 'mo-nov') syncManualToMonth('nov');
  if (tab === 'mo-dec') syncManualToMonth('dec');
  if (tab === 'annual') annualRender();
  if (tab === 'trends') buildTrendsTab();
};

