/* ════════════════════════════════════════
   TRENDS TAB
════════════════════════════════════════ */
var _trCharts = {};

function _trDestroy(key) {
  if (_trCharts[key]) { _trCharts[key].destroy(); delete _trCharts[key]; }
}

function _trCollect() {
  return MONTHS_LIST.map(function(mo) {
    var mid = mo.id;
    var bIncome = moGetAmt(mId(mid, 'income'), 1);
    var aIncome = moGetAmt(mId(mid, 'income'), 2);
    var bFixed  = moGetAmt(mId(mid, 'fixed'),   1); var aFixed = moGetAmt(mId(mid, 'fixed'),   2);
    var bVar    = moGetAmt(mId(mid, 'variable'), 1); var aVar   = moGetAmt(mId(mid, 'variable'), 2);
    var bSub    = moGetAmt(mId(mid, 'sub'),      1); var aSub   = moGetAmt(mId(mid, 'sub'),      2);
    var bIns    = moGetAmt(mId(mid, 'ins'),      1); var aIns   = moGetAmt(mId(mid, 'ins'),      2);
    var bExp    = bFixed + bVar + bSub + bIns;
    var aExp    = aFixed + aVar + aSub + aIns;
    return {
      id: mid, name: mo.name,
      bIncome: bIncome, aIncome: aIncome,
      bFixed: bFixed, aFixed: aFixed,
      bVar: bVar,     aVar: aVar,
      bSub: bSub,     aSub: aSub,
      bIns: bIns,     aIns: aIns,
      bExp: bExp,     aExp: aExp,
      hasActual: aIncome > 0 || aExp > 0
    };
  });
}

function buildTrendsTab() {
  var data   = _trCollect();
  var labels = data.map(function(d) { return d.name; });
  var fmt    = function(n) { return '₪' + Math.round(n || 0).toLocaleString('he-IL'); };
  var kEl    = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };

  // ── KPIs ──
  var withActual = data.filter(function(d) { return d.hasActual; }).length;
  var ytdIP = 0, ytdIA = 0, ytdEP = 0, ytdEA = 0;
  data.forEach(function(d) {
    ytdIP += d.bIncome; ytdEP += d.bExp;
    if (d.hasActual) { ytdIA += d.aIncome; ytdEA += d.aExp; }
  });
  kEl('tr-k-months',         withActual + ' / 12');
  kEl('tr-k-income-plan',    fmt(ytdIP));
  kEl('tr-k-income-actual',  withActual ? fmt(ytdIA) : '—');
  kEl('tr-k-exp-plan',       fmt(ytdEP));
  kEl('tr-k-exp-actual',     withActual ? fmt(ytdEA) : '—');
  var bal = ytdIA - ytdEA;
  kEl('tr-k-balance', withActual ? fmt(bal) : '—');
  var balEl = document.getElementById('tr-k-balance');
  if (balEl && withActual) balEl.style.color = bal >= 0 ? 'var(--accent3)' : 'var(--accent2)';

  var chartDefaults = {
    tickColor: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#aaa',
    gridColor: 'rgba(255,255,255,0.06)',
    font: { family: 'Rubik, sans-serif', size: 11 }
  };

  // ── Chart 1: Line — הכנסות והוצאות לאורך השנה ──
  _trDestroy('line');
  var lineEl = document.getElementById('tr-line-chart');
  if (lineEl) {
    _trCharts['line'] = new Chart(lineEl.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'הכנסה מתוכננת',
            data: data.map(function(d){ return d.bIncome || null; }),
            borderColor: 'rgba(108,99,255,0.45)', borderDash: [6,4],
            tension: 0.35, fill: false, pointRadius: 3, borderWidth: 1.5 },
          { label: 'הכנסה בפועל',
            data: data.map(function(d){ return d.hasActual ? d.aIncome : null; }),
            borderColor: 'rgba(108,99,255,1)', backgroundColor: 'rgba(108,99,255,0.08)',
            tension: 0.35, fill: true, pointRadius: 5, borderWidth: 2.5 },
          { label: 'הוצאות מתוכננות',
            data: data.map(function(d){ return d.bExp || null; }),
            borderColor: 'rgba(255,101,132,0.45)', borderDash: [6,4],
            tension: 0.35, fill: false, pointRadius: 3, borderWidth: 1.5 },
          { label: 'הוצאות בפועל',
            data: data.map(function(d){ return d.hasActual ? d.aExp : null; }),
            borderColor: 'rgba(255,101,132,1)', backgroundColor: 'rgba(255,101,132,0.07)',
            tension: 0.35, fill: true, pointRadius: 5, borderWidth: 2.5 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: chartDefaults.tickColor, font: chartDefaults.font, boxWidth: 14, padding: 14 } },
          tooltip: { callbacks: { label: function(c){ return c.dataset.label + ': ' + fmt(c.raw); } } }
        },
        scales: {
          x: { ticks: { color: chartDefaults.tickColor, font: chartDefaults.font },
               grid:  { color: chartDefaults.gridColor } },
          y: { ticks: { color: chartDefaults.tickColor, font: chartDefaults.font,
                         callback: function(v){ return '₪' + v.toLocaleString('he-IL'); } },
               grid: { color: chartDefaults.gridColor } }
        }
      }
    });
  }

  // ── Chart 2: Stacked Bar — הוצאות לפי סוג חודש ──
  _trDestroy('bar');
  var barEl = document.getElementById('tr-bar-chart');
  if (barEl) {
    _trCharts['bar'] = new Chart(barEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'קבועות',  data: data.map(function(d){ return d.hasActual ? d.aFixed : null; }),
            backgroundColor: 'rgba(108,99,255,0.82)' },
          { label: 'משתנות', data: data.map(function(d){ return d.hasActual ? d.aVar   : null; }),
            backgroundColor: 'rgba(247,151,30,0.82)' },
          { label: 'מנויים', data: data.map(function(d){ return d.hasActual ? d.aSub   : null; }),
            backgroundColor: 'rgba(67,233,123,0.82)' },
          { label: 'ביטוח',  data: data.map(function(d){ return d.hasActual ? d.aIns   : null; }),
            backgroundColor: 'rgba(255,101,132,0.82)' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: chartDefaults.tickColor, font: chartDefaults.font, boxWidth: 14, padding: 12 } },
          tooltip: { callbacks: { label: function(c){ return c.dataset.label + ': ' + fmt(c.raw); } } }
        },
        scales: {
          x: { stacked: true, ticks: { color: chartDefaults.tickColor, font: chartDefaults.font },
               grid: { color: chartDefaults.gridColor } },
          y: { stacked: true,
               ticks: { color: chartDefaults.tickColor, font: chartDefaults.font,
                         callback: function(v){ return '₪' + v.toLocaleString('he-IL'); } },
               grid: { color: chartDefaults.gridColor } }
        }
      }
    });
  }

  // ── Chart 3: Donut — חלוקת הוצאות שנתית ──
  _trDestroy('donut');
  var donutEl = document.getElementById('tr-donut-chart');
  if (donutEl) {
    var tF = 0, tV = 0, tS = 0, tI = 0;
    data.forEach(function(d) {
      if (!d.hasActual) return;
      tF += d.aFixed; tV += d.aVar; tS += d.aSub; tI += d.aIns;
    });
    var total = tF + tV + tS + tI;
    if (total === 0) {
      var noData = donutEl.parentElement;
      noData.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:.9rem">אין נתוני ביצוע עדיין</div>';
    } else {
      _trCharts['donut'] = new Chart(donutEl.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['קבועות', 'משתנות', 'מנויים', 'ביטוח'],
          datasets: [{ data: [tF, tV, tS, tI],
            backgroundColor: ['rgba(108,99,255,0.85)','rgba(247,151,30,0.85)','rgba(67,233,123,0.85)','rgba(255,101,132,0.85)'],
            borderColor: 'transparent', borderWidth: 2 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { color: chartDefaults.tickColor, font: chartDefaults.font, padding: 16, boxWidth: 14 } },
            tooltip: { callbacks: { label: function(c){
              var pct = total > 0 ? Math.round(c.raw / total * 100) : 0;
              return c.label + ': ' + fmt(c.raw) + ' (' + pct + '%)';
            }}}
          }
        }
      });
    }
  }
}

/* ════════════════════════════════════════
   ONBOARDING
════════════════════════════════════════ */
function onboardCheck() {
  // Only show if no client data exists and not dismissed before
  var dismissed = localStorage.getItem('finapp_onboard_done');
  if (dismissed) return;
  var idx = cmGetIndex ? cmGetIndex() : {};
  var hasData = Object.keys(idx).length > 0;
  if (hasData) return;
  var overlay = document.getElementById('onboard-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function onboardClose(tab) {
  var overlay = document.getElementById('onboard-overlay');
  if (overlay) overlay.style.display = 'none';
  localStorage.setItem('finapp_onboard_done', '1');
  if (tab) switchTab(tab);
}

// Run after clientInit
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(onboardCheck, 600);
});
