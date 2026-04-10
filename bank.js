/* ════════════════════════════════════════
   BANK STATEMENT (דוח עו"ש) MODULE
════════════════════════════════════════ */
var bankTransactions = [];
var bankActiveFilter = 'all';
var bankPendingFiles = [];

// Keywords for classifying bank transactions
var BANK_SALARY_KW   = ['משכורת','שכר','שכר עבודה','מעסיק','salary','גמלה','קצבה','ביטוח לאומי','עמית','פנסיה','קרן פנסיה'];
var BANK_CC_KW       = ['מקס איט','מקס פיננ','ישראכרט','כאל ','cal ','max ','ויזה','כרטיס אשראי','mastercard','visa','לאומי קארד','הפועלים אמריקן','אמריקן אקספרס','diners','דיינרס','pepper','פיפר','bit credit','ביט אשראי'];
var BANK_ATM_KW      = ['מזומן','כספומט','atm'];
var BANK_TRANSFER_KW = ['העברה','הפקדה','העברת כספים','העברה בנקאית','bit','ביט','פייבוקס','paybox','העברה ל','העברה מ','קניה/','ב.הפועלים-ביט'];
var BANK_STANDING_KW = ['הוראת קבע','הו"ק','הוק','direct debit','חיוב קבוע','תשלום קבוע','קניה/','מגדל ','מנורה ','הפניקס','כלל ביטוח','מכבי ','מאוחדת','לאומית','הכשרה'];
var BANK_FEE_KW      = ['עמלה','דמי ניהול','ריבית','עמלת','קיזוז מטח','עמלות','המרת מטבע','ריבית חובה'];

function bankDrop(e) {
  e.preventDefault();
  document.getElementById('bank-upload-zone').classList.remove('drag-over');
  var files = e.dataTransfer.files;
  if (files.length) bankHandleFileUpload(files);
}

function bankHandleFileUpload(files) {
  if (!files || !files.length) return;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (!bankPendingFiles.find(function(p){ return p.name === f.name; })) {
      bankPendingFiles.push(f);
    }
  }
  bankRenderFileList();
}

function bankRenderFileList() {
  var fl = document.getElementById('bank-file-list');
  if (!fl) return;
  fl.innerHTML = '';
  bankPendingFiles.forEach(function(f, i) {
    var chip = document.createElement('div');
    chip.className = 'file-chip';
    chip.innerHTML = '<span><span class="chip-name">🏦 ' + f.name + '</span></span>' +
      '<button class="btn-del" onclick="bankRemoveFile(' + i + ')">×</button>';
    fl.appendChild(chip);
  });
  var btn = document.getElementById('bank-parse-btn');
  if (btn) btn.style.display = bankPendingFiles.length ? 'block' : 'none';
  var countBar = document.getElementById('bank-file-count-bar');
  if (countBar) {
    if (bankPendingFiles.length > 0) {
      countBar.style.display = 'block';
      countBar.textContent = '🏦 ' + bankPendingFiles.length + ' חשבונות נבחרו';
    } else {
      countBar.style.display = 'none';
    }
  }
}

function bankRemoveFile(idx) {
  bankPendingFiles.splice(idx, 1);
  bankRenderFileList();
}

function bankParseFiles() {
  if (!bankPendingFiles.length) return;
  var allTxs = [];
  var pending = bankPendingFiles.slice();
  var idx = 0;

  function processNext() {
    if (idx >= pending.length) {
      bankTransactions = allTxs;
      bankPendingFiles = [];
      bankRenderFileList();
      // Show/hide source column
      var thSource = document.getElementById('bank-th-source');
      if (thSource) thSource.style.display = pending.length > 1 ? '' : 'none';
      if (!bankTransactions.length) {
        document.getElementById('bank-empty-state').style.display = '';
        document.getElementById('bank-insights-section').style.display = 'none';
      } else {
        document.getElementById('bank-empty-state').style.display = 'none';
        document.getElementById('bank-insights-section').style.display = '';
        renderBankInsights();
        bankFilter('all');
      }
      return;
    }
    var file = pending[idx];
    var sourceName = file.name.replace(/\.[^.]+$/, '');
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = new Uint8Array(e.target.result);
        var wb = XLSX.read(data, { type: 'array', cellDates: true });
        var ws = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        var txs = extractBankTransactions(rows, sourceName);
        allTxs = allTxs.concat(txs);
      } catch(err) {
        alert('שגיאה בקריאת ' + file.name + ':\n' + err.message);
      }
      idx++;
      processNext();
    };
    reader.readAsArrayBuffer(file);
  }
  processNext();
}

// Keep legacy single-file handler for compatibility
function handleBankFiles(files) {
  if (!files || !files.length) return;
  bankHandleFileUpload(files);
}

function detectBankColumns(headerRow) {
  var dateCol = -1, descCol = -1, creditCol = -1, debitCol = -1, balanceCol = -1;
  var dateKW    = ['תאריך','date','ת.ערך','ת. ערך','תאריך פעולה','תאריך ערך'];
  var descKW    = ['תיאור פעולה','תיאור הפעולה','פרטי הפעולה','תיאור','פרטים','הערה','שם'];
  var creditKW  = ['זכות','הכנסה','credit','זיכוי','סכום זיכוי','כניסה'];
  var debitKW   = ['חובה','הוצאה','debit','חיוב','סכום חיוב','יציאה'];
  var balanceKW = ['יתרה','balance','יתרה לאחר פעולה','יתרה בחשבון'];

  headerRow.forEach(function(cell, i) {
    var t = String(cell || '').trim();
    if (dateCol   === -1 && dateKW.some(function(k){ return t.includes(k); }))    dateCol   = i;
    if (descCol   === -1 && descKW.some(function(k){ return t.includes(k); }))    descCol   = i;
    if (creditCol === -1 && creditKW.some(function(k){ return t.includes(k); }))  creditCol = i;
    if (debitCol  === -1 && debitKW.some(function(k){ return t.includes(k); }))   debitCol  = i;
    if (balanceCol=== -1 && balanceKW.some(function(k){ return t.includes(k); })) balanceCol= i;
  });
  // Some banks use a single amount column with sign
  return { dateCol: dateCol, descCol: descCol, creditCol: creditCol, debitCol: debitCol, balanceCol: balanceCol };
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  // Excel serial number (e.g. 46107)
  if (typeof val === 'number') {
    // Excel epoch: Jan 1 1900 = day 1 (with bug: 1900 treated as leap year)
    var d = new Date(Date.UTC(1899, 11, 30) + val * 86400000);
    return isNaN(d) ? null : d;
  }
  var s = String(val).trim();
  // ISO string from cellDates:true  e.g. "2026-03-25T22:00:00.000Z"
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
    var d2 = new Date(s);
    return isNaN(d2) ? null : d2;
  }
  // dd/mm/yyyy or dd.mm.yyyy or dd-mm-yyyy
  var m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
  if (m) {
    var y = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    return new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
  }
  var d3 = new Date(s);
  return isNaN(d3) ? null : d3;
}

function parseBankAmount(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.abs(val);
  var s = String(val).replace(/[₪,\s]/g, '').replace(/\(([^)]+)\)/, '-$1');
  return Math.abs(parseFloat(s) || 0);
}

function extractBankTransactions(rows, sourceName) {
  var txs = [];
  var cols = null;
  var headerRowIdx = -1;

  // Find header row
  for (var i = 0; i < Math.min(rows.length, 20); i++) {
    var row = rows[i];
    var detected = detectBankColumns(row);
    if (detected.descCol !== -1 && (detected.creditCol !== -1 || detected.debitCol !== -1)) {
      cols = detected;
      headerRowIdx = i;
      break;
    }
  }
  if (!cols || headerRowIdx === -1) return [];

  for (var j = headerRowIdx + 1; j < rows.length; j++) {
    var r = rows[j];
    if (!r || r.every(function(c){ return c === '' || c === null || c === undefined; })) continue;

    var dateVal = cols.dateCol >= 0 ? r[cols.dateCol] : null;
    // Strip RTL/LTR embedding marks and normalize spaces
    var desc = cols.descCol >= 0 ? String(r[cols.descCol] || '').replace(/[\u202a\u202b\u202c\u200f\u200e]/g, '').trim() : '';
    var credit  = cols.creditCol >= 0 ? parseBankAmount(r[cols.creditCol]) : 0;
    var debit   = cols.debitCol  >= 0 ? parseBankAmount(r[cols.debitCol])  : 0;
    var balance = cols.balanceCol >= 0 ? r[cols.balanceCol] : null;

    // Skip empty rows
    if (!desc && !credit && !debit) continue;

    // Handle single amount column: positive = credit, negative = debit
    if (cols.creditCol === -1 || cols.debitCol === -1) {
      var raw = cols.creditCol !== -1 ? r[cols.creditCol] : r[cols.debitCol];
      var n = typeof raw === 'number' ? raw : parseFloat(String(raw||'').replace(/[₪,\s]/g,''));
      if (!isNaN(n)) {
        if (n >= 0) { credit = n; debit = 0; }
        else        { credit = 0; debit = Math.abs(n); }
      }
    }

    var balanceNum = null;
    if (balance !== null && balance !== '') {
      balanceNum = typeof balance === 'number' ? balance : parseFloat(String(balance).replace(/[₪,\s,]/g,''));
      if (isNaN(balanceNum)) balanceNum = null;
    }

    var parsedDate = parseDate(dateVal);
    var type = classifyBankTx(desc, credit, debit);

    txs.push({
      date: parsedDate,
      dateStr: parsedDate ? (parsedDate.getUTCDate() + '/' + (parsedDate.getUTCMonth()+1) + '/' + parsedDate.getUTCFullYear()) : String(dateVal||''),
      desc: desc,
      credit: credit,
      debit: debit,
      balance: balanceNum,
      type: type,
      source: sourceName || ''
    });
  }
  return txs;
}

function classifyBankTx(desc, credit, debit) {
  var d = desc.toLowerCase();
  // Salary FIRST — "משכורת/לאומי" would also match transfer keywords
  if (BANK_SALARY_KW.some(function(k){ return d.includes(k.toLowerCase()); }))   return 'salary';
  // CC charges (debit only — if it's a credit refund, treat as transfer)
  if (debit > 0 && credit === 0 && BANK_CC_KW.some(function(k){ return d.includes(k.toLowerCase()); })) return 'cc';
  if (BANK_ATM_KW.some(function(k){ return d.includes(k.toLowerCase()); }))      return 'atm';
  if (BANK_FEE_KW.some(function(k){ return d.includes(k.toLowerCase()); }))      return 'fee';
  if (BANK_STANDING_KW.some(function(k){ return d.includes(k.toLowerCase()); })) return 'standing';
  if (BANK_TRANSFER_KW.some(function(k){ return d.includes(k.toLowerCase()); })) return 'transfer';
  // Heuristics: large credit with no debit → likely transfer/salary
  if (credit > 3000 && debit === 0) return 'transfer';
  return 'other';
}

var BANK_TYPE_LABELS = {
  salary: 'משכורת', cc: 'חיוב אשראי', atm: 'מזומן',
  transfer: 'העברה', standing: 'הוראת קבע', fee: 'עמלה', other: 'אחר'
};

function bankTypeHTML(type) {
  return '<span class="bank-type-badge btb-' + type + '">' + (BANK_TYPE_LABELS[type] || type) + '</span>';
}

function buildBankInsights() {
  var txs = bankTransactions;
  if (!txs.length) return {};

  // Latest balance
  var latestBalance = null;
  for (var i = txs.length - 1; i >= 0; i--) {
    if (txs[i].balance !== null) { latestBalance = txs[i].balance; break; }
  }
  if (latestBalance === null) {
    for (var i = 0; i < txs.length; i++) {
      if (txs[i].balance !== null) { latestBalance = txs[i].balance; break; }
    }
  }

  // Salary transactions & typical date
  var salaries = txs.filter(function(t){ return t.type === 'salary' && t.date; });
  var salaryDates = salaries.map(function(t){ return t.date.getUTCDate(); });
  var avgSalaryDay = salaryDates.length ? Math.round(salaryDates.reduce(function(a,b){return a+b;},0)/salaryDates.length) : null;
  var totalSalaryCredit = salaries.reduce(function(s,t){ return s + t.credit; }, 0);

  // CC charge transactions & typical date
  var ccTxs = txs.filter(function(t){ return t.type === 'cc' && t.date && t.debit > 0; });
  var ccDates = ccTxs.map(function(t){ return t.date.getUTCDate(); });
  var avgCcDay = ccDates.length ? Math.round(ccDates.reduce(function(a,b){return a+b;},0)/ccDates.length) : null;
  var totalCcDebit = ccTxs.reduce(function(s,t){ return s + t.debit; }, 0);

  // Non-CC monthly debit average
  var nonCcDebit = txs.filter(function(t){ return t.type !== 'cc' && t.type !== 'salary'; })
                      .reduce(function(s,t){ return s + t.debit; }, 0);
  var months = 1;
  if (txs.length > 1) {
    var dates = txs.filter(function(t){ return t.date; }).map(function(t){ return t.date; });
    if (dates.length > 1) {
      var minD = new Date(Math.min.apply(null, dates));
      var maxD = new Date(Math.max.apply(null, dates));
      months = Math.max(1, (maxD - minD) / (1000*60*60*24*30));
    }
  }
  var avgMonthlyDebit = nonCcDebit / months;

  return {
    latestBalance: latestBalance,
    avgSalaryDay: avgSalaryDay,
    avgCcDay: avgCcDay,
    totalSalaryCredit: totalSalaryCredit,
    totalCcDebit: totalCcDebit,
    avgMonthlyDebit: avgMonthlyDebit,
    months: months
  };
}

function renderBankInsights() {
  var ins = buildBankInsights();
  var grid = document.getElementById('bank-insights-grid');
  var html = '';

  if (ins.latestBalance !== null) {
    var balClass = ins.latestBalance >= 0 ? 'bic-balance' : 'bic-balance negative';
    html += '<div class="bank-insight-chip ' + balClass + '">' +
      '<div class="bic-label">יתרה נוכחית</div>' +
      '<div class="bic-value">' + fmtC(ins.latestBalance) + '</div>' +
    '</div>';
  }
  if (ins.avgSalaryDay) {
    html += '<div class="bank-insight-chip bic-salary">' +
      '<div class="bic-label">תאריך משכורת</div>' +
      '<div class="bic-value">~' + ins.avgSalaryDay + ' לחודש</div>' +
      '<div class="bic-sub">' + (ins.totalSalaryCredit ? 'סה"כ זוכה: ' + fmtC(ins.totalSalaryCredit) : '') + '</div>' +
    '</div>';
  }
  if (ins.avgCcDay) {
    html += '<div class="bank-insight-chip bic-cc">' +
      '<div class="bic-label">תאריך חיוב אשראי</div>' +
      '<div class="bic-value">~' + ins.avgCcDay + ' לחודש</div>' +
      '<div class="bic-sub">סה"כ חויב: ' + fmtC(ins.totalCcDebit) + '</div>' +
    '</div>';
  }
  html += '<div class="bank-insight-chip bic-avg">' +
    '<div class="bic-label">ממוצע הוצאות לחודש</div>' +
    '<div class="bic-value">' + fmtC(Math.round(ins.avgMonthlyDebit)) + '</div>' +
    '<div class="bic-sub">ללא חיובי אשראי</div>' +
  '</div>';

  // Show account count chip if multiple sources
  var sources = {};
  bankTransactions.forEach(function(t){ if (t.source) sources[t.source] = 1; });
  var sourceCount = Object.keys(sources).length;
  if (sourceCount > 1) {
    html += '<div class="bank-insight-chip" style="border-color:rgba(108,99,255,.4);background:rgba(108,99,255,.08)">' +
      '<div class="bic-label">חשבונות בנק</div>' +
      '<div class="bic-value">' + sourceCount + '</div>' +
      '<div class="bic-sub">דוחות משולבים</div>' +
    '</div>';
  }

  grid.innerHTML = html;

  // Stats row
  var counts = {};
  bankTransactions.forEach(function(t){ counts[t.type] = (counts[t.type]||0) + 1; });
  var statsHtml = '<div class="bank-stat"><span class="bank-stat-n">' + bankTransactions.length + '</span><span class="bank-stat-l">סה"כ תנועות</span></div>';
  var typeOrder = ['salary','transfer','atm','standing','cc','fee','other'];
  typeOrder.forEach(function(tp) {
    if (counts[tp]) {
      statsHtml += '<div class="bank-stat"><span class="bank-stat-n">' + counts[tp] + '</span><span class="bank-stat-l">' + (BANK_TYPE_LABELS[tp]||tp) + '</span></div>';
    }
  });
  document.getElementById('bank-stats-row').innerHTML = statsHtml;
}

function bankFilter(filterType) {
  bankActiveFilter = filterType;
  // Update button states
  document.querySelectorAll('.bank-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  var btn = document.getElementById('bfilt-' + filterType);
  if (btn) btn.classList.add('active');

  var txs = filterType === 'all' ? bankTransactions : bankTransactions.filter(function(t){ return t.type === filterType; });
  renderBankTable(txs);
}

function renderBankTable(txs) {
  var tbody = document.getElementById('bank-tx-body');
  var multiSource = bankTransactions.some(function(t){ return t.source; }) &&
                    (new Set(bankTransactions.map(function(t){ return t.source; }))).size > 1;
  var thSource = document.getElementById('bank-th-source');
  if (thSource) thSource.style.display = multiSource ? '' : 'none';
  var colspan = multiSource ? 8 : 7;
  if (!txs.length) {
    tbody.innerHTML = '<tr><td colspan="' + colspan + '" style="text-align:center;padding:24px;color:var(--muted)">אין תנועות בסינון זה</td></tr>';
    return;
  }

  var html = '';
  txs.forEach(function(tx, i) {
    var isCC = tx.type === 'cc';
    var rowStyle = isCC ? 'opacity:0.6' : '';
    var addBtn = (tx.type === 'transfer' || tx.type === 'atm' || tx.type === 'standing' || tx.type === 'salary')
      ? '<button class="bank-add-btn" onclick="bankAddToMapping(' + bankTransactions.indexOf(tx) + ')">+ למיפוי</button>'
      : '';
    if (isCC) addBtn = '<span style="font-size:.75rem;color:var(--muted)">חיוב אשראי</span>';

    var balanceCell = tx.balance !== null ? fmtC(tx.balance) : '—';
    var balClass = tx.balance !== null ? (tx.balance >= 0 ? 'bank-balance-val positive' : 'bank-balance-val negative') : '';
    var sourceCell = multiSource ? '<td style="font-size:.75rem;color:var(--muted);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + (tx.source||'') + '">' + (tx.source||'—') + '</td>' : '';

    html += '<tr style="' + rowStyle + '">' +
      '<td>' + tx.dateStr + '</td>' +
      '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + tx.desc + '">' + tx.desc + '</td>' +
      '<td>' + bankTypeHTML(tx.type) + '</td>' +
      sourceCell +
      '<td class="bank-amount-in">' + (tx.credit ? fmtC(tx.credit) : '—') + '</td>' +
      '<td class="bank-amount-out">' + (tx.debit ? fmtC(tx.debit) : '—') + '</td>' +
      '<td class="' + balClass + '">' + balanceCell + '</td>' +
      '<td>' + addBtn + '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

function bankAddToMapping(txIdx) {
  var tx = bankTransactions[txIdx];
  if (!tx) return;

  // Determine where to add: income or expense
  var listId, isIncome;
  if (tx.type === 'salary' || (tx.credit > 0 && tx.debit === 0 && tx.type === 'transfer')) {
    listId = 'income-list';
    isIncome = true;
  } else {
    // ATM, standing, other transfers = fixed or variable expense
    listId = tx.type === 'standing' ? 'fixed-list' : 'var-list';
    isIncome = false;
  }

  // Switch to manual tab
  switchTab('manual');

  setTimeout(function() {
    if (listId === 'var-list') {
      addVarRow(false);
      var rows = document.getElementById('var-list').querySelectorAll('.input-row');
      var last = rows[rows.length - 1];
      if (last) {
        var inputs = last.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = tx.desc;
        if (inputs[1]) inputs[1].value = isIncome ? tx.credit : tx.debit;
      }
      updateVarTotals();
    } else {
      addRow(listId, false, false);
      var rows = document.getElementById(listId).querySelectorAll('.input-row');
      var last = rows[rows.length - 1];
      if (last) {
        var inputs = last.querySelectorAll('input');
        if (inputs[0]) inputs[0].value = tx.desc;
        if (inputs[1]) inputs[1].value = isIncome ? tx.credit : tx.debit;
      }
      var totalMap = { 'income-list':'total-income', 'fixed-list':'total-fixed' };
      if (totalMap[listId]) updateSectionTotal(listId, totalMap[listId], 1);
    }
    // Visual feedback
    var rows2 = document.getElementById(listId) ? document.getElementById(listId).querySelectorAll('.input-row') : [];
    var last2 = rows2[rows2.length - 1];
    if (last2) {
      last2.style.transition = 'background 0.5s';
      last2.style.background = 'rgba(0,200,100,0.18)';
      setTimeout(function(){ last2.style.background = ''; }, 1200);
    }
  }, 150);
}

/* ── Input validation for numeric fields ───────────────────────── */
document.addEventListener('input', function(e) {
  var inp = e.target;
  if (inp.tagName !== 'INPUT') return;
  // רק שדות מספריים שאינם type=number (שהם כבר מוגנים ע"י הדפדפן)
  if (inp.type === 'number') return;
  // בדוק רק שדות שנראים פיננסיים (שם class מכיל amt/actual/saving/monthly/balance)
  var cls = inp.className || '';
  var isFinancial = /bud-amt|bud-actual|saving-monthly|saving-accum|debt-balance|debt-monthly|an-inp/.test(cls);
  if (!isFinancial) return;

  var val = inp.value.trim();
  if (val === '' || val === '-') { inp.classList.remove('input-invalid'); return; }
  var num = Number(val.replace(/,/g, ''));
  if (isNaN(num)) {
    inp.classList.add('input-invalid');
    inp.title = 'יש להזין מספר בלבד';
  } else {
    inp.classList.remove('input-invalid');
    inp.title = '';
  }
});

