/* ════════════════════════════════════════
   CHARTS
════════════════════════════════════════ */
const CHART_COLORS = [
  '#6c63ff','#ff6584','#43e97b','#f7971e','#00c6ff','#f093fb',
  '#4facfe','#fa709a','#fee140','#30cfd0','#a18cd1','#fda085',
  '#89f7fe','#66a6ff','#fddb92','#d4fc79','#96fbc4','#f6d365',
  '#84fab0','#667eea','#ff9a9e'
];

function destroyChart(id) {
  if (charts[id]) { try { charts[id].destroy(); } catch(e){} delete charts[id]; }
}

function buildDoughnut(catMap) {
  destroyChart('doughnut');
  const entries = Object.entries(catMap).filter(function(e){ return e[1] > 0; })
    .sort(function(a,b){ return b[1]-a[1]; });
  const labels = entries.map(function(e){ return e[0]; });
  const data   = entries.map(function(e){ return e[1]; });
  const ctx = document.getElementById('doughnut-chart').getContext('2d');
  charts['doughnut'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#1a1d27'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#8892b0', font: { size: 11 }, boxWidth: 12, padding: 8 }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const total = data.reduce(function(s,v){ return s+v; }, 0);
              return ' ' + ctx.label + ': ' + fmt(ctx.raw) + ' (' + pct(ctx.raw, total) + ')';
            }
          }
        }
      }
    }
  });
}

function buildHealthScore(income, expenses, subs, balance) {
  let score = 100;
  const ratio = income > 0 ? expenses / income : 1;
  if (ratio > 1)        score -= 40;
  else if (ratio > .9)  score -= 25;
  else if (ratio > .7)  score -= 10;

  const subRatio = income > 0 ? subs / income : 0;
  if (subRatio > .15)   score -= 15;
  else if (subRatio > .1) score -= 8;

  if (balance < 0)             score -= 20;
  else if (balance < income * .1) score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const color = score >= 75 ? '#43e97b' : score >= 50 ? '#f7971e' : '#ff6584';
  const label = score >= 75 ? 'מצוין' : score >= 50 ? 'בינוני' : 'דורש שיפור';

  const tips = [];
  if (ratio > .9) tips.push({ icon: '⚠️', text: 'ההוצאות גבוהות מאוד ביחס להכנסה' });
  if (subRatio > .1) tips.push({ icon: '📡', text: 'שקול לצמצם מינויים — מעל 10% מההכנסה' });
  if (balance < 0) tips.push({ icon: '🔴', text: 'ההוצאות חורגות מההכנסות — יש לאזן' });
  if (balance >= 0 && ratio <= .7) tips.push({ icon: '✅', text: 'חיסכון טוב — שקול להשקיע את העודף' });
  if (tips.length === 0) tips.push({ icon: '💚', text: 'מצב פיננסי תקין — המשך כך!' });

  const circumference = 2 * Math.PI * 50;
  const dashArr = (score / 100) * circumference;

  document.getElementById('health-wrap').innerHTML =
    '<div class="health-ring">' +
      '<svg width="130" height="130" viewBox="0 0 120 120">' +
        '<circle cx="60" cy="60" r="50" fill="none" stroke="#2a2d3e" stroke-width="10"/>' +
        '<circle cx="60" cy="60" r="50" fill="none" stroke="' + color + '" stroke-width="10"' +
          ' stroke-dasharray="' + dashArr.toFixed(2) + ' ' + circumference.toFixed(2) + '"' +
          ' stroke-linecap="round"/>' +
      '</svg>' +
      '<div class="score-text">' +
        '<span class="score-num" style="color:' + color + '">' + score + '</span>' +
        '<span class="score-lbl">' + label + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="health-tips">' +
    tips.map(function(t) {
      return '<div class="tip-item"><span class="tip-icon">' + t.icon + '</span><span>' + t.text + '</span></div>';
    }).join('') +
    '</div>';
}

function buildCCBarChart() {
  destroyChart('cc-bar');
  const catMap = {};
  creditTransactions.forEach(function(t) {
    catMap[t.category] = (catMap[t.category] || 0) + (t.isRefund ? -t.amount : t.amount);
  });
  const sorted = Object.entries(catMap).sort(function(a,b){ return b[1]-a[1]; }).slice(0, 8);
  const labels = sorted.map(function(e){ return (CATEGORY_ICONS[e[0]] || '📦') + ' ' + e[0]; });
  const data   = sorted.map(function(e){ return e[1]; });

  const ctx = document.getElementById('cc-bar-chart').getContext('2d');
  charts['cc-bar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'סכום (₪)',
        data: data,
        backgroundColor: CHART_COLORS.slice(0, data.length),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(ctx){ return ' ' + fmt(ctx.raw); } } }
      },
      scales: {
        x: {
          ticks: { color: '#8892b0', callback: function(v){ return '₪' + v.toLocaleString(); } },
          grid: { color: '#2a2d3e' }
        },
        y: {
          ticks: { color: '#e8eaf6', font: { size: 12 } },
          grid: { display: false }
        }
      }
    }
  });
}

function buildDashCatSection() {
  const catMap = {};
  const catTxs = {};
  creditTransactions.forEach(function(t) {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    if (!catTxs[t.category]) catTxs[t.category] = [];
    catTxs[t.category].push(t);
  });

  const sorted = Object.entries(catMap).sort(function(a,b){ return b[1]-a[1]; });
  const container = document.getElementById('dash-cat-section');
  container.innerHTML = '';

  sorted.forEach(function(entry) {
    const cat = entry[0], total = entry[1];
    const icon = CATEGORY_ICONS[cat] || '📦';
    const bodyId = 'dcb-' + cat.replace(/[\s/]/g, '_');
    const block = document.createElement('div');
    block.className = 'dash-cat-block';

    let rowsHtml = catTxs[cat].map(function(t) {
      return '<tr>' +
        '<td>' + escHtml(t.desc) + '</td>' +
        '<td class="amount-cell">' + fmt(t.amount) + '</td>' +
        '<td class="source-cell">' + escHtml(t.source) + '</td>' +
        '</tr>';
    }).join('');

    block.innerHTML =
      '<div class="dash-cat-header" onclick="toggleDashCat(\'' + bodyId + '\')">' +
        '<div class="dash-cat-label">' + icon + ' ' + cat + '</div>' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<span style="color:var(--muted);font-size:.82rem">' + catTxs[cat].length + ' עסקאות</span>' +
          '<span class="dash-cat-amt">' + fmt(total) + '</span>' +
          '<span style="color:var(--muted);font-size:.8rem">▼</span>' +
        '</div>' +
      '</div>' +
      '<div class="dash-cat-body" id="' + bodyId + '">' +
        '<div class="trans-table-wrap">' +
          '<table class="trans-table">' +
            '<thead><tr><th>תיאור</th><th>סכום</th><th>קובץ</th></tr></thead>' +
            '<tbody>' + rowsHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
    container.appendChild(block);
  });
}

function toggleDashCat(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

function buildSubsTable(subs) {
  const wrap = document.getElementById('dash-subs-wrap');
  if (!subs.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="es-icon">🔄</div><p>לא הוזנו מינויים</p></div>';
    return;
  }
  const total = subs.reduce(function(s,r){ return s+r.amt; }, 0);
  let rows = subs.map(function(r) {
    return '<tr><td>' + escHtml(r.name) + '</td><td>' + fmt(r.amt) + '</td><td style="color:var(--accent4)">' + fmt(r.amt * 12) + '</td></tr>';
  }).join('');
  wrap.innerHTML =
    '<table class="sub-dash-table">' +
    '<thead><tr><th>שם</th><th>עלות חודשית</th><th>עלות שנתית</th></tr></thead>' +
    '<tbody>' + rows +
    '<tr style="font-weight:700;border-top:2px solid var(--border)">' +
      '<td>סה"כ</td>' +
      '<td style="color:var(--accent2)">' + fmt(total) + '</td>' +
      '<td style="color:var(--accent4)">' + fmt(total * 12) + '</td>' +
    '</tr></tbody></table>';
}

function buildAssetBars(assets, totalAssets) {
  const wrap = document.getElementById('dash-assets-wrap');
  if (!assets.length || totalAssets === 0) {
    wrap.innerHTML = '<div class="empty-state"><div class="es-icon">🏦</div><p>לא הוזנו נכסים</p></div>';
    return;
  }
  const maxAmt = Math.max.apply(null, assets.map(function(a){ return a.amt; }));
  let html = '<div class="asset-bar-wrap">';
  assets.forEach(function(a) {
    const w = maxAmt > 0 ? ((a.amt / maxAmt) * 100).toFixed(1) : 0;
    html +=
      '<div class="asset-item">' +
        '<div class="asset-label">' +
          '<span>' + escHtml(a.name) + '</span>' +
          '<span>' + fmt(a.amt) + ' <small style="color:var(--muted)">(' + pct(a.amt, totalAssets) + ')</small></span>' +
        '</div>' +
        '<div class="asset-bar-bg"><div class="asset-bar-fill" style="width:' + w + '%"></div></div>' +
      '</div>';
  });
  html += '<div style="margin-top:14px;font-weight:700;color:var(--accent)">סך נכסים: ' + fmt(totalAssets) + '</div>';
  html += '</div>';
  wrap.innerHTML = html;
}

function buildSavingsChart(monthlyBalance) {
  destroyChart('savings');
  const months = ['ינו\'','פבר\'','מרץ','אפר\'','מאי','יוני','יולי','אוג\'','ספט\'','אוק\'','נוב\'','דצמ\''];
  const data = months.map(function(_, i){ return Math.round(monthlyBalance * (i + 1)); });
  const colors = data.map(function(v){ return v >= 0 ? 'rgba(67,233,123,.75)' : 'rgba(255,101,132,.75)'; });
  const ctx = document.getElementById('savings-chart').getContext('2d');
  charts['savings'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [{
        label: 'חיסכון מצטבר',
        data: data,
        backgroundColor: colors,
        borderRadius: 7,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function(ctx){ return ' ' + fmt(ctx.raw); } } }
      },
      scales: {
        x: { ticks: { color: '#8892b0', font: { size: 11 } }, grid: { color: '#2a2d3e' } },
        y: {
          ticks: { color: '#8892b0', callback: function(v){ return '₪' + v.toLocaleString(); } },
          grid: { color: '#2a2d3e' }
        }
      }
    }
  });
}

/* ════════════════════════════════════════
   PDF EXPORT
════════════════════════════════════════ */
function exportPDF() {
  window.print();
}

/* ════════════════════════════════════════
   RESET
════════════════════════════════════════ */
function resetAll() {
  if (!confirm('לאפס את כל הנתונים ולהתחיל מחדש?')) return;
  Object.values(charts).forEach(function(c){ try { c.destroy(); } catch(e){} });
  charts = {};
  creditTransactions = [];
  uploadedFiles = [];
  pendingFiles = [];
  ['income-list','fixed-list','annual-list','sub-list','insurance-list','var-list','debt-list','installment-list','asset-list'].forEach(function(id) {
    document.getElementById(id).innerHTML = '';
  });

  document.getElementById('credit-results').style.display = 'none';
  document.getElementById('smart-analysis').style.display = 'none';
  document.getElementById('ai-btn-wrap').style.display = 'none';
  document.getElementById('file-list').innerHTML = '';
  document.getElementById('parse-btn').style.display = 'none';
  document.getElementById('stats-bar').innerHTML = '';
  document.getElementById('accordion-list').innerHTML = '';
  var srch = document.getElementById('tx-search'); if (srch) srch.value = '';

  init();
  switchTab('manual');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ════════════════════════════════════════
   UTILITIES
════════════════════════════════════════ */
function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '₪0';
  const abs = Math.round(Math.abs(n));
  return (n < 0 ? '-' : '') + '₪' + abs.toLocaleString('he-IL');
}

function pct(val, total) {
  if (!total || isNaN(total) || total === 0) return '0%';
  return ((val / total) * 100).toFixed(1) + '%';
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showLoading(text) {
  document.getElementById('loading-text').textContent = text || 'טוען...';
  document.getElementById('loading').classList.add('active');
}

function hideLoading() {
  document.getElementById('loading').classList.remove('active');
}

/* ════════════════════════════════════════
   UNDO DELETE TOAST
════════════════════════════════════════ */
(function() {
  // Inject toast CSS once
  var style = document.createElement('style');
  style.textContent = [
    '.undo-toast {',
    '  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);',
    '  background: #23263a; border: 1px solid #3a3d55; border-radius: 10px;',
    '  padding: 12px 18px; display: flex; align-items: center; gap: 14px;',
    '  font-size: .88rem; color: #e6e7ee; z-index: 9999;',
    '  box-shadow: 0 4px 24px rgba(0,0,0,.5);',
    '  animation: toastIn .18s ease;',
    '}',
    '@keyframes toastIn { from { opacity:0; transform: translateX(-50%) translateY(12px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }',
    '.undo-toast button {',
    '  background: #6c63ff; color: #fff; border: none; border-radius: 6px;',
    '  padding: 5px 12px; font-size: .85rem; cursor: pointer; font-family: inherit;',
    '}',
    '.undo-toast button:hover { background: #5a52e0; }',
  ].join('\n');
  document.head.appendChild(style);

  var _toast = null;
  var _toastTimer = null;

  function showUndoToast(label, onCommit, onUndo) {
    // Commit previous pending deletion before showing new toast
    if (_toastTimer) {
      clearTimeout(_toastTimer);
      if (_toast && _toast._commit) _toast._commit();
      if (_toast && _toast.parentNode) _toast.remove();
    }

    var t = document.createElement('div');
    t.className = 'undo-toast';
    t.innerHTML = '<span>נמחק: <strong>' + escHtml(label) + '</strong></span><button onclick="window._undoLastDelete()">↩ בטל</button>';
    t._commit = onCommit;
    t._undo = onUndo;
    document.body.appendChild(t);
    _toast = t;

    _toastTimer = setTimeout(function() {
      if (_toast === t) {
        onCommit();
        if (t.parentNode) { t.style.opacity = '0'; t.style.transition = 'opacity .2s'; setTimeout(function(){ if (t.parentNode) t.remove(); }, 220); }
        _toast = null;
        _toastTimer = null;
      }
    }, 5000);
  }

  window._undoLastDelete = function() {
    if (!_toast) return;
    clearTimeout(_toastTimer);
    _toastTimer = null;
    _toast._undo();
    if (_toast.parentNode) _toast.remove();
    _toast = null;
  };

  // Intercept btn-del clicks on mapping rows (capture phase fires before inline onclick)
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('.btn-del');
    if (!btn) return;

    // Only intercept rows that are inside a known mapping list
    var row = btn.closest('.cat-auto-wrap') || btn.closest('.annual-row') || btn.closest('.input-row');
    if (!row) return;
    var inList = row.closest('#var-list, #fixed-list, #sub-list, #insurance-list, #annual-list, #inst-list, #asset-list, #debt-list, #saving-list, #an-income, #an-fixed, #an-var, #an-sub, #an-debt, #an-sav');
    if (!inList) return;

    // Prevent the inline onclick from firing now
    e.stopImmediatePropagation();
    e.preventDefault();

    var nameInput = row.querySelector('input[type="text"]');
    var label = (nameInput && nameInput.value) ? nameInput.value.replace(/^[\s\S]*?([^\s].*)$/, '$1').trim() : 'שורה';

    // Save state for undo (auto rows only)
    var isAutoWrap = row.classList.contains('cat-auto-wrap');
    var isAnnualAuto = row.classList.contains('annual-row') && row.hasAttribute('data-auto');
    var savedState = null;
    if (isAutoWrap || isAnnualAuto) {
      var amtInp = row.querySelector('input[type="number"]');
      savedState = { cat: row.dataset.cat, amount: amtInp ? (parseFloat(amtInp.value) || 0) : 0 };
    }

    // Immediately commit the delete — removes from DOM before any fbSaveNow fires
    var originalOnclick = btn.onclick;
    if (originalOnclick) originalOnclick.call(btn);
    else if (row.parentNode) row.parentNode.removeChild(row);

    // Save AFTER row is removed — both localStorage and Firestore now exclude the deleted row
    if (typeof clientSave === 'function') clientSave();
    if (typeof fbSaveNow === 'function') fbSaveNow();

    showUndoToast(label,
      function() { /* already committed */ },
      function() {
        // Undo: recreate auto row
        if (savedState && savedState.cat) {
          if (typeof deletedAutoCats !== 'undefined') delete deletedAutoCats[savedState.cat];
          if (typeof rebuildMappingFromAutoRows === 'function') {
            var rows = {}; rows[savedState.cat] = savedState.amount;
            rebuildMappingFromAutoRows(rows);
          }
        }
        if (typeof clientSave === 'function') clientSave();
        if (typeof fbSaveNow === 'function') fbSaveNow();
      }
    );
  }, true); // capture = true
})();

/* ════════════════════════════════════════
   START
════════════════════════════════════════ */
init();

