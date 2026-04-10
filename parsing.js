/* ════════════════════════════════════════
   PARSING HELPERS
════════════════════════════════════════ */
function detectColumns(headerRow) {
  let descCol = -1, chargeAmountCol = -1, transactionAmountCol = -1, amountCol = -1, notesCol = -1, dateCol = -1;
  const descKeywords = ['שם בית עסק','שם בית העסק','בית עסק','שם העסק','תיאור','פרטים','תיאור עסקה'];
  const notesKeywords = ['פירוט נוסף','הערות','הערה','פרטים נוספים','תשלומים','מידע נוסף'];
  const dateKeywords  = ['תאריך רכישה','תאריך עסקה','תאריך','date'];
  headerRow.forEach(function(cell, i) {
    const t = String(cell || '').trim();
    // Description
    if (descCol === -1 && descKeywords.some(function(k){ return t.includes(k); })) descCol = i;
    // Charge amount (what is actually billed this month — preferred for installments)
    if (chargeAmountCol === -1 && (
      t === 'סכום חיוב' || t.includes('סכום חיוב') ||
      t.includes('סה"כ לחיוב') || t.includes('לחיוב בש') ||
      t.includes('סכום בש"ח') || t.includes('סכום לחיוב')
    )) chargeAmountCol = i;
    // Transaction amount (total original purchase — for installments this is the full price)
    if (transactionAmountCol === -1 && (
      t.includes('סכום עסקה') || t.includes('סכום העסקה')
    )) transactionAmountCol = i;
    // Generic amount fallback
    if (amountCol === -1 && (t.includes('סכום') || t.includes('חיוב')) &&
        !t.includes('עסקה') && !t.includes('מטבע') && !t.includes('תאריך')) amountCol = i;
    // Notes / installment info
    if (notesCol === -1 && notesKeywords.some(function(k){ return t.includes(k); })) notesCol = i;
    // Date
    if (dateCol === -1 && dateKeywords.some(function(k){ return t.includes(k); })) dateCol = i;
  });
  // Primary amount column: prefer chargeAmountCol (actual monthly billing), fallback to amountCol
  const primaryAmountCol = chargeAmountCol !== -1 ? chargeAmountCol : amountCol;
  return {
    descCol: descCol,
    amountCol: primaryAmountCol,
    chargeAmountCol: chargeAmountCol,
    transactionAmountCol: transactionAmountCol,
    notesCol: notesCol,
    dateCol: dateCol
  };
}

function parseAmount(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  const hasParens = str.includes('(');
  const cleaned = str.replace(/[(),\s₪]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return NaN;
  return hasParens ? -Math.abs(num) : num;
}

function parseExcelFile(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        resolve(rows);
      } catch(err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/* ════════════════════════════════════════
   NAME NORMALIZATION — strips noise before lookup
════════════════════════════════════════ */
function normalizeForLookup(desc) {
  if (!desc) return '';
  var s = desc.toLowerCase().trim();
  // 1. Strip legal entity suffixes
  s = s.replace(/\s+בע["\u05f4'.]?מ\.?/g, '');
  s = s.replace(/\s+ב\.מ\./g, '');
  s = s.replace(/\s+בעמ\b/g, '');
  s = s.replace(/\s+בע\s+מ\b/g, '');
  s = s.replace(/\s+\bltd\.?\b/gi, '');
  s = s.replace(/\s+\bllc\.?\b/gi, '');
  s = s.replace(/\s+\binc\.?\b/gi, '');
  // 2. Strip Israeli city names
  var cities = ['ראשון לציון','ראשל"צ','פתח תקווה','פ"ת','רמת השרון',
    'תל אביב','ת"א','רמת גן','ר"ג','באר שבע','ב"ש','נתניה','חיפה',
    'ירושלים','אשדוד','אשקלון','רחובות','הרצליה','כפר סבא','רעננה',
    'הוד השרון','רמלה','לוד','נהריה','עכו','טבריה','אילת','מודיעין',
    'בית שמש','קריית גת','חולון','בת ים','גבעתיים','נס ציונה',
    'קרית שמונה','זכרון יעקב','כפר יונה'];
  cities.forEach(function(city) {
    var re = new RegExp('[\\s\\-–]*' + city.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '[\\s\\-–]*', 'g');
    s = s.replace(re, ' ');
  });
  // 3. Strip branch indicators and trailing codes
  s = s.replace(/\s*[-–]\s*סניף\s*[\u05d0-\u05fa\w]*/g, '');
  s = s.replace(/\s*סניף\s+\d+/g, '');
  s = s.replace(/\s*[-–]\s*branch\s*\w*/gi, '');
  s = s.replace(/\s*[-–]\s*\d+\s*$/g, '');
  return s.replace(/\s{2,}/g, ' ').trim();
}

function categorize(desc) {
  if (!desc) return 'שונות';
  const lower = desc.toLowerCase().trim();
  const normalized = normalizeForLookup(desc);

  function search(entries, q) {
    for (var i = 0; i < entries.length; i++) {
      if (q.includes(entries[i][0].toLowerCase())) return entries[i][1];
    }
    return null;
  }

  // 1. Check learnedDB first (user corrections + AI auto-learning)
  const learnedEntries = Object.entries(window.learnedDB || {})
    .sort(function(a,b){ return b[0].length - a[0].length; });
  var r = search(learnedEntries, lower);
  if (!r && normalized !== lower) r = search(learnedEntries, normalized);
  if (r) return r;

  // 2. Then check built-in BUSINESS_DB
  const builtinEntries = Object.entries(BUSINESS_DB)
    .sort(function(a,b){ return b[0].length - a[0].length; });
  r = search(builtinEntries, lower);
  if (!r && normalized !== lower) r = search(builtinEntries, normalized);
  if (r) return r;

  return 'שונות';
}

function extractInstallmentInfo(notes) {
  if (!notes) return null;
  const s = String(notes).trim();
  let m = s.match(/תשלום\s+(\d+)\s+מתוך\s+(\d+)/);
  if (m) return { current: parseInt(m[1]), total: parseInt(m[2]) };
  m = s.match(/(\d+)\s*מתוך\s*(\d+)/);
  if (m) { const c = parseInt(m[1]), t = parseInt(m[2]); if (c>0&&t>1&&t<=60&&c<=t) return { current:c, total:t }; }
  m = s.match(/(\d+)\s*[\/\-]\s*(\d+)/);
  if (m) { const c = parseInt(m[1]), t = parseInt(m[2]); if (c>0&&t>1&&t<=60&&c<=t) return { current:c, total:t }; }
  return null;
}

function isStandingOrderDesc(desc) {
  const d = desc.toLowerCase();
  return d.includes('הוראת קבע') || d.includes('הוראות קבע') ||
         d.includes('הו"ק') || d.includes("הו'ק") || d.includes('הו ק') ||
         d.includes('standing order') || d.includes('direct debit');
}

function extractTransactions(rows, fileName) {
  let headerRowIdx = -1, descCol = -1, amountCol = -1, transactionAmountCol = -1, notesCol = -1, dateCol = -1;

  for (let r = 0; r < Math.min(15, rows.length); r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const detected = detectColumns(row);
    if (detected.descCol !== -1 && detected.amountCol !== -1) {
      headerRowIdx = r;
      descCol              = detected.descCol;
      amountCol            = detected.amountCol;          // chargeAmount (monthly billing)
      transactionAmountCol = detected.transactionAmountCol; // original purchase total
      notesCol             = detected.notesCol;
      dateCol              = detected.dateCol;
      break;
    }
  }

  if (headerRowIdx === -1) {
    for (let r = 0; r < Math.min(20, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      let dCol = -1;
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || '');
        if (/[\u0590-\u05FF]/.test(cell) && cell.length > 3) { dCol = c; break; }
      }
      if (dCol !== -1) {
        let aCol = -1;
        for (let c = 0; c < row.length; c++) {
          if (c === dCol) continue;
          const num = parseAmount(row[c]);
          if (!isNaN(num) && Math.abs(num) > 0 && Math.abs(num) < 50000) { aCol = c; break; }
        }
        if (aCol !== -1) { headerRowIdx = r - 1; descCol = dCol; amountCol = aCol; break; }
      }
    }
  }

  if (descCol === -1 || amountCol === -1) return [];

  const transactions = [];
  for (let r = Math.max(0, headerRowIdx + 1); r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.length) continue;
    const desc   = String(row[descCol] || '').trim();
    const amount = parseAmount(row[amountCol]);
    if (!desc || isNaN(amount) || amount === 0) continue;
    if (desc.includes('סה"כ') || desc.includes('סהכ') || desc.includes('לחיוב') || desc.includes('===') || desc.includes('TOTAL FOR')) continue;

    const notes = notesCol !== -1 ? String(row[notesCol] || '').trim() : '';
    const dateRaw = dateCol !== -1 ? row[dateCol] : null;
    const dateStr = dateRaw ? String(dateRaw).substring(0, 10) : '';
    const installment = extractInstallmentInfo(notes);
    const standingOrder = isStandingOrderDesc(desc) || isStandingOrderDesc(notes);
    const isRefund = amount < 0;

    // For installment transactions: originalAmount = total purchase price (סכום עסקה)
    const originalAmount = (installment && transactionAmountCol !== -1)
      ? Math.abs(parseAmount(row[transactionAmountCol]) || 0)
      : null;

    transactions.push({
      desc:           desc,
      amount:         Math.abs(amount),   // monthly charge (סכום חיוב)
      originalAmount: originalAmount,     // total purchase (סכום עסקה) — set only for installments
      category:       categorize(desc),
      source:         fileName,
      notes:          notes,
      date:           dateStr,
      installment:    installment,
      isStandingOrder: standingOrder,
      isRefund:       isRefund
    });
  }
  return transactions;
}

