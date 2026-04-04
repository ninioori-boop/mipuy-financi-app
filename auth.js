// Firebase Auth — multi-user advisor/client system
// Handles: login, role routing, advisor dashboard, client invite flow, real-time sync

/* ── Globals ──────────────────────────────────────────────────── */
var _mapClientUid   = null;
var _mapAdvisorUid  = null;
var _unsubSnapshot  = null;
var _isSyncingFromRemote = false;
var _saveTimer      = null;
var _fbAutoSaveTimer = null; // kept for compatibility

/* ── Overlay helpers ──────────────────────────────────────────── */
(function injectOverlayContainer() {
  var el = document.createElement('div');
  el.id = 'fb-auth-overlay';
  document.body.appendChild(el);

  var style = document.createElement('style');
  style.textContent = [
    '#fb-auth-overlay {',
    '  position:fixed;inset:0;background:rgba(10,11,16,.97);',
    '  display:none;align-items:center;justify-content:center;',
    '  z-index:9999;direction:rtl;overflow-y:auto;',
    '}',
    '#fb-auth-overlay.visible { display:flex; }',
    /* ── Login card ── */
    '#fb-auth-box {',
    '  background:#1a1d27;border:1px solid #2a2d3e;border-radius:20px;',
    '  padding:40px 36px;width:100%;max-width:400px;text-align:center;',
    '  box-shadow:0 20px 60px rgba(0,0,0,.6);',
    '}',
    '#fb-auth-logo { font-size:2.6rem;margin-bottom:12px; }',
    '#fb-auth-title { color:#e8eaf6;font-size:1.4rem;margin-bottom:8px; }',
    '#fb-auth-sub { color:#8892b0;font-size:.9rem;margin-bottom:28px; }',
    '#fb-auth-error {',
    '  background:rgba(255,101,132,.15);border:1px solid rgba(255,101,132,.35);',
    '  color:#ff6584;border-radius:8px;padding:10px 14px;',
    '  font-size:.85rem;margin-bottom:16px;display:none;',
    '}',
    '#fb-auth-box input {',
    '  width:100%;background:#0f1117;border:1px solid #2a2d3e;',
    '  border-radius:10px;padding:12px 14px;color:#e8eaf6;',
    '  font-size:.95rem;margin-bottom:12px;outline:none;box-sizing:border-box;',
    '  transition:border-color .2s;',
    '}',
    '#fb-auth-box input:focus { border-color:#6c63ff; }',
    '#fb-auth-box button {',
    '  width:100%;border:none;border-radius:10px;padding:13px;',
    '  font-size:.95rem;font-weight:600;cursor:pointer;',
    '  margin-bottom:10px;transition:opacity .2s;',
    '}',
    '#fb-auth-box button:hover { opacity:.88; }',
    '#fb-signin-btn { background:#6c63ff;color:#fff; }',
    '#fb-signup-btn { background:#1e2130;color:#a0a8c8;border:1px solid #2a2d3e !important; }',
    '#fb-google-btn { background:#fff;color:#333;display:flex;align-items:center;justify-content:center; }',
    '#fb-divider {',
    '  display:flex;align-items:center;gap:10px;',
    '  color:#4a5270;font-size:.8rem;margin:6px 0 10px;',
    '}',
    '#fb-divider::before,#fb-divider::after { content:"";flex:1;height:1px;background:#2a2d3e; }',
    /* ── Role select / Invite claim card ── */
    '.fb-card {',
    '  background:#1a1d27;border:1px solid #2a2d3e;border-radius:20px;',
    '  padding:40px 36px;width:100%;max-width:420px;text-align:center;',
    '  box-shadow:0 20px 60px rgba(0,0,0,.6);',
    '}',
    '.fb-card h2 { color:#e8eaf6;font-size:1.35rem;margin:0 0 10px; }',
    '.fb-card p { color:#8892b0;font-size:.9rem;margin:0 0 26px; }',
    '.fb-card .fb-btn-primary {',
    '  width:100%;background:#6c63ff;color:#fff;border:none;',
    '  border-radius:10px;padding:13px;font-size:.95rem;font-weight:600;',
    '  cursor:pointer;margin-bottom:10px;transition:opacity .2s;',
    '}',
    '.fb-card .fb-btn-secondary {',
    '  width:100%;background:#1e2130;color:#a0a8c8;',
    '  border:1px solid #2a2d3e;border-radius:10px;padding:13px;',
    '  font-size:.95rem;font-weight:600;cursor:pointer;margin-bottom:10px;',
    '  transition:opacity .2s;',
    '}',
    '.fb-card button:hover { opacity:.88; }',
    '.fb-card input {',
    '  width:100%;background:#0f1117;border:1px solid #2a2d3e;',
    '  border-radius:10px;padding:12px 14px;color:#e8eaf6;',
    '  font-size:1.1rem;letter-spacing:.15em;text-align:center;',
    '  margin-bottom:14px;outline:none;box-sizing:border-box;',
    '  transition:border-color .2s;',
    '}',
    '.fb-card input:focus { border-color:#6c63ff; }',
    '.fb-card .fb-error {',
    '  background:rgba(255,101,132,.15);border:1px solid rgba(255,101,132,.35);',
    '  color:#ff6584;border-radius:8px;padding:10px 14px;',
    '  font-size:.85rem;margin-bottom:14px;display:none;',
    '}',
    /* ── Advisor dashboard ── */
    '#adv-dashboard {',
    '  width:100%;max-width:860px;margin:0 auto;padding:28px 20px;',
    '  box-sizing:border-box;',
    '}',
    '#adv-dashboard h1 { color:#e8eaf6;font-size:1.6rem;margin:0; }',
    '.adv-header {',
    '  display:flex;align-items:center;justify-content:space-between;',
    '  margin-bottom:28px;flex-wrap:wrap;gap:12px;',
    '}',
    '.adv-header-actions { display:flex;gap:10px;align-items:center; }',
    '.adv-btn {',
    '  background:#6c63ff;color:#fff;border:none;border-radius:10px;',
    '  padding:10px 18px;font-size:.9rem;font-weight:600;cursor:pointer;',
    '  transition:opacity .2s;',
    '}',
    '.adv-btn:hover { opacity:.88; }',
    '.adv-btn-outline {',
    '  background:transparent;color:#a0a8c8;border:1px solid #2a2d3e;',
    '  border-radius:10px;padding:10px 18px;font-size:.9rem;',
    '  cursor:pointer;transition:opacity .2s;',
    '}',
    '.adv-btn-outline:hover { opacity:.7; }',
    '.adv-client-grid {',
    '  display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));',
    '  gap:14px;',
    '}',
    '.adv-client-card {',
    '  background:#1a1d27;border:1px solid #2a2d3e;border-radius:14px;',
    '  padding:20px;cursor:pointer;transition:border-color .2s,transform .15s;',
    '}',
    '.adv-client-card:hover { border-color:#6c63ff;transform:translateY(-2px); }',
    '.adv-client-name { color:#e8eaf6;font-weight:700;font-size:1rem;margin-bottom:6px; }',
    '.adv-client-meta { color:#8892b0;font-size:.78rem; }',
    '.adv-empty {',
    '  color:#4a5270;text-align:center;padding:48px 20px;font-size:.95rem;',
    '}',
    '.adv-invite-box {',
    '  background:#0f1117;border:1px solid #2a2d3e;border-radius:12px;',
    '  padding:16px 20px;margin-top:20px;',
    '}',
    '.adv-invite-box p { color:#8892b0;font-size:.85rem;margin:0 0 10px; }',
    '.adv-invite-code {',
    '  font-size:1.8rem;letter-spacing:.2em;color:#6c63ff;font-weight:700;',
    '  text-align:center;padding:12px;background:#1a1d27;',
    '  border-radius:8px;margin-bottom:10px;',
    '}',
    '.adv-invite-name { color:#e8eaf6;font-size:.85rem;text-align:center;margin-bottom:12px; }',
    '.adv-spinner { color:#8892b0;font-size:1rem;padding:20px;text-align:center; }',
    /* ── Back button (advisor viewing client map) ── */
    '#btn-back-to-dashboard {',
    '  position:fixed;top:12px;left:16px;z-index:9998;',
    '  background:#1a1d27;color:#a0a8c8;border:1px solid #2a2d3e;',
    '  border-radius:10px;padding:8px 16px;font-size:.85rem;',
    '  cursor:pointer;transition:opacity .2s;',
    '}',
    '#btn-back-to-dashboard:hover { opacity:.8; }',
    /* ── Spinner ── */
    '#fb-spinner {',
    '  color:#8892b0;font-size:1.1rem;',
    '}',
  ].join('\n');
  document.head.appendChild(style);
})();

function fbShowOverlay(html) {
  var el = document.getElementById('fb-auth-overlay');
  if (!el) return;
  el.innerHTML = html;
  el.classList.add('visible');
}

function fbHideOverlay() {
  var el = document.getElementById('fb-auth-overlay');
  if (!el) return;
  el.classList.remove('visible');
  el.innerHTML = '';
}

function fbEscape(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fbFormatDate(ts) {
  if (!ts || !ts.toDate) return '—';
  var d = ts.toDate();
  return d.toLocaleDateString('he-IL', { day:'numeric', month:'short', year:'numeric' });
}

/* ── Auth state machine ───────────────────────────────────────── */
auth.onAuthStateChanged(function(user) {
  if (!user) {
    stopClientSync();
    fbRemoveBackButton();
    document.body.classList.remove('client-view-mode');
    renderLoginScreen();
    return;
  }

  fbShowOverlay('<div id="fb-spinner">טוען...</div>');

  getUserProfile(user.uid).then(function(profile) {
    routeUser(user, profile);
  }).catch(function(err) {
    console.error('Error loading profile:', err);
    renderLoginScreen();
  });
});

function routeUser(user, profile) {
  if (!profile || !profile.role) {
    renderRoleSelect(user);
    return;
  }
  if (profile.role === 'advisor') {
    renderAdvisorDashboard(user);
    return;
  }
  if (profile.role === 'client') {
    loadMap(user.uid).then(function(map) {
      if (!map || !map.advisorUid) {
        renderClaimInvite(user);
        return;
      }
      fbHideOverlay();
      document.body.classList.add('client-view-mode');
      fbUpdateBar(user, map.clientName || user.displayName || user.email);
      startClientSync(user.uid, map.advisorUid);
    });
  }
}

/* ── Login screen ─────────────────────────────────────────────── */
function renderLoginScreen() {
  fbShowOverlay([
    '<div id="fb-auth-box">',
    '  <div id="fb-auth-logo">💰</div>',
    '  <h2 id="fb-auth-title">מיפוי פיננסי חכם</h2>',
    '  <p id="fb-auth-sub">התחבר כדי לגשת לנתונים שלך</p>',
    '  <div id="fb-auth-error"></div>',
    '  <input id="fb-email" type="email" placeholder="אימייל" autocomplete="email" dir="ltr">',
    '  <input id="fb-password" type="password" placeholder="סיסמה (לפחות 6 תווים)" autocomplete="current-password" dir="ltr">',
    '  <button id="fb-signin-btn">התחבר</button>',
    '  <button id="fb-signup-btn">הרשמה — משתמש חדש</button>',
    '  <div id="fb-divider"><span>או</span></div>',
    '  <button id="fb-google-btn">',
    '    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width:18px;vertical-align:middle;margin-left:8px">',
    '    כניסה עם Google',
    '  </button>',
    '</div>'
  ].join(''));

  document.getElementById('fb-signin-btn').onclick = function() {
    var email = (document.getElementById('fb-email')||{}).value||'';
    var pass  = (document.getElementById('fb-password')||{}).value||'';
    if (!email||!pass) { fbShowLoginError('נא למלא אימייל וסיסמה'); return; }
    auth.signInWithEmailAndPassword(email, pass).catch(function(err) {
      fbShowLoginError(fbErrMsg(err.code));
    });
  };

  document.getElementById('fb-signup-btn').onclick = function() {
    var email = (document.getElementById('fb-email')||{}).value||'';
    var pass  = (document.getElementById('fb-password')||{}).value||'';
    if (!email||!pass) { fbShowLoginError('נא למלא אימייל וסיסמה'); return; }
    if (pass.length < 6) { fbShowLoginError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    auth.createUserWithEmailAndPassword(email, pass).catch(function(err) {
      fbShowLoginError(fbErrMsg(err.code));
    });
  };

  document.getElementById('fb-google-btn').onclick = function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(function(err) {
      fbShowLoginError(fbErrMsg(err.code));
    });
  };
}

function fbShowLoginError(msg) {
  var el = document.getElementById('fb-auth-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function fbErrMsg(code) {
  var map = {
    'auth/user-not-found':       'משתמש לא נמצא — נסה להירשם',
    'auth/wrong-password':       'סיסמה שגויה',
    'auth/invalid-email':        'כתובת אימייל לא תקינה',
    'auth/email-already-in-use': 'אימייל כבר רשום — נסה להתחבר',
    'auth/weak-password':        'הסיסמה חלשה מדי',
    'auth/too-many-requests':    'יותר מדי ניסיונות — נסה שוב מאוחר יותר',
    'auth/network-request-failed': 'בעיית רשת — בדוק חיבור לאינטרנט',
    'auth/popup-closed-by-user': 'חלון ההתחברות נסגר',
    'auth/invalid-credential':   'פרטי התחברות שגויים',
  };
  return map[code] || ('שגיאה: ' + code);
}

/* ── Role selection ───────────────────────────────────────────── */
function renderRoleSelect(user) {
  fbShowOverlay([
    '<div class="fb-card">',
    '  <div style="font-size:2rem;margin-bottom:12px">👋</div>',
    '  <h2>ברוכים הבאים!</h2>',
    '  <p>כיצד תרצו להשתמש במערכת?</p>',
    '  <button class="fb-btn-primary" id="btn-role-advisor">אני יועץ פיננסי</button>',
    '  <button class="fb-btn-secondary" id="btn-role-client">אני לקוח — יש לי קוד הזמנה</button>',
    '</div>'
  ].join(''));

  document.getElementById('btn-role-advisor').onclick = function() {
    setUserProfile(user.uid, {
      role: 'advisor',
      email: user.email,
      name: user.displayName || user.email
    }).then(function() {
      renderAdvisorDashboard(user);
    });
  };

  document.getElementById('btn-role-client').onclick = function() {
    renderClaimInvite(user);
  };
}

/* ── Claim invite (client) ────────────────────────────────────── */
function renderClaimInvite(user) {
  fbShowOverlay([
    '<div class="fb-card">',
    '  <div style="font-size:2rem;margin-bottom:12px">🔑</div>',
    '  <h2>הזן קוד הזמנה</h2>',
    '  <p>קבל את הקוד מהיועץ הפיננסי שלך</p>',
    '  <div class="fb-error" id="invite-error"></div>',
    '  <input id="invite-code-input" type="text" placeholder="למשל: A3F8K2X9" maxlength="8" autocomplete="off">',
    '  <button class="fb-btn-primary" id="btn-claim-invite">כניסה למערכת</button>',
    '</div>'
  ].join(''));

  var input = document.getElementById('invite-code-input');
  input.oninput = function() {
    this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  };

  document.getElementById('btn-claim-invite').onclick = function() {
    var code = input.value.trim().toUpperCase();
    var errEl = document.getElementById('invite-error');
    errEl.style.display = 'none';
    if (code.length < 6) {
      errEl.textContent = 'נא להזין קוד תקין';
      errEl.style.display = 'block';
      return;
    }
    claimInvite(code, user.uid).then(function(invite) {
      fbHideOverlay();
      document.body.classList.add('client-view-mode');
      fbUpdateBar(user, invite.clientName || user.email);
      startClientSync(user.uid, invite.advisorUid);
    }).catch(function(err) {
      errEl.textContent = err.message || 'שגיאה בהזנת הקוד';
      errEl.style.display = 'block';
    });
  };
}

/* ── Advisor dashboard ────────────────────────────────────────── */
function renderAdvisorDashboard(user) {
  fbShowOverlay('<div id="adv-dashboard"><div class="adv-spinner">טוען לקוחות...</div></div>');

  getAdvisorClients(user.uid).then(function(clients) {
    var cardsHTML = '';
    if (clients.length === 0) {
      cardsHTML = '<div class="adv-empty">אין עדיין לקוחות.<br>לחץ "+ הזמן לקוח" כדי להתחיל.</div>';
    } else {
      clients.forEach(function(c) {
        cardsHTML += [
          '<div class="adv-client-card" data-uid="' + fbEscape(c.clientUid) + '">',
          '  <div class="adv-client-name">' + fbEscape(c.clientName) + '</div>',
          '  <div class="adv-client-meta">עודכן: ' + fbFormatDate(c.updatedAt) + '</div>',
          '</div>'
        ].join('');
      });
    }

    var dashHTML = [
      '<div id="adv-dashboard">',
      '  <div class="adv-header">',
      '    <h1>הלקוחות שלי</h1>',
      '    <div class="adv-header-actions">',
      '      <button class="adv-btn" id="btn-add-client">+ הזמן לקוח</button>',
      '      <button class="adv-btn-outline" id="btn-adv-logout">התנתק</button>',
      '    </div>',
      '  </div>',
      '  <div class="adv-client-grid" id="adv-client-grid">' + cardsHTML + '</div>',
      '  <div id="adv-invite-area"></div>',
      '</div>'
    ].join('');

    fbShowOverlay(dashHTML);

    // Wire client cards
    document.querySelectorAll('.adv-client-card').forEach(function(card) {
      card.onclick = function() {
        openClientMap(card.dataset.uid, user.uid, user);
      };
    });

    document.getElementById('btn-add-client').onclick = function() {
      handleCreateInvite(user.uid);
    };

    document.getElementById('btn-adv-logout').onclick = function() {
      if (confirm('להתנתק מהמערכת?')) auth.signOut();
    };
  }).catch(function(err) {
    console.error('Error loading clients:', err);
    document.getElementById('adv-dashboard').innerHTML =
      '<div class="adv-empty">שגיאה בטעינת לקוחות</div>';
  });
}

function handleCreateInvite(advisorUid) {
  var area = document.getElementById('adv-invite-area');
  if (!area) return;

  // Inline mini-form
  area.innerHTML = [
    '<div class="adv-invite-box" id="invite-form-box">',
    '  <p>שם הלקוח החדש:</p>',
    '  <input id="adv-new-client-name" type="text" placeholder="שם מלא" ',
    '    style="width:100%;background:#1a1d27;border:1px solid #2a2d3e;border-radius:8px;',
    '    padding:10px 14px;color:#e8eaf6;font-size:.9rem;outline:none;box-sizing:border-box;margin-bottom:10px;">',
    '  <button class="adv-btn" id="btn-gen-invite">צור קוד הזמנה</button>',
    '</div>'
  ].join('');

  document.getElementById('btn-gen-invite').onclick = function() {
    var name = (document.getElementById('adv-new-client-name')||{}).value||'';
    name = name.trim();
    if (!name) {
      alert('נא להזין שם לקוח');
      return;
    }
    createInvite(advisorUid, name).then(function(code) {
      area.innerHTML = [
        '<div class="adv-invite-box">',
        '  <div class="adv-invite-name">קוד הזמנה עבור: <strong>' + fbEscape(name) + '</strong></div>',
        '  <div class="adv-invite-code">' + fbEscape(code) + '</div>',
        '  <p>שלח קוד זה ללקוח. הלקוח יזין אותו בכניסה הראשונה.</p>',
        '  <button class="adv-btn" id="btn-new-invite-again">+ הזמן לקוח נוסף</button>',
        '</div>'
      ].join('');
      document.getElementById('btn-new-invite-again').onclick = function() {
        handleCreateInvite(advisorUid);
      };
    }).catch(function(err) {
      alert('שגיאה ביצירת הזמנה: ' + err.message);
    });
  };
}

/* ── Open client map (advisor) ────────────────────────────────── */
function openClientMap(clientUid, advisorUid, advisorUser) {
  fbHideOverlay();
  fbAddBackButton(advisorUser);
  startClientSync(clientUid, advisorUid);
  fbUpdateBar(advisorUser, '← צופה בלקוח');
}

function fbAddBackButton(advisorUser) {
  fbRemoveBackButton();
  var btn = document.createElement('button');
  btn.id = 'btn-back-to-dashboard';
  btn.textContent = '← חזרה ללקוחות';
  btn.onclick = function() {
    stopClientSync();
    fbRemoveBackButton();
    renderAdvisorDashboard(advisorUser);
  };
  document.body.appendChild(btn);
}

function fbRemoveBackButton() {
  var btn = document.getElementById('btn-back-to-dashboard');
  if (btn) btn.remove();
}

/* ── Header bar ───────────────────────────────────────────────── */
function fbUpdateBar(user, displayLabel) {
  var bar = document.getElementById('client-bar');
  if (!bar) return;

  var label = displayLabel || user.displayName || user.email || 'משתמש';
  var shortLabel = label.length > 22 ? label.slice(0, 20) + '…' : label;

  // Inject user info + save status + logout into bar's right side
  var existingInfo = document.getElementById('fb-bar-info');
  if (existingInfo) existingInfo.remove();

  var infoDiv = document.createElement('div');
  infoDiv.id = 'fb-bar-info';
  infoDiv.style.cssText = 'display:flex;align-items:center;gap:10px;margin-right:auto;';
  infoDiv.innerHTML = [
    '<span style="font-size:.76rem;color:#8892b0;white-space:nowrap;" id="fb-save-status"></span>',
    '<span style="font-size:.8rem;color:#8892b0;">|</span>',
    '<span style="font-size:.82rem;color:#e8eaf6;font-weight:600;">' + fbEscape(shortLabel) + '</span>',
    '<button onclick="fbSignOut()" style="background:#1e2130;border:1px solid #2a2d3e;color:#a0a8c8;',
    'border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.82rem;">התנתק</button>',
  ].join('');
  bar.appendChild(infoDiv);
}

function fbUpdateSaveStatus(text) {
  var el = document.getElementById('fb-save-status');
  if (el) el.textContent = text;
}

function fbSignOut() {
  if (!confirm('להתנתק מהמערכת?')) return;
  stopClientSync();
  fbRemoveBackButton();
  document.body.classList.remove('client-view-mode');
  auth.signOut();
}

/* ── Real-time sync ───────────────────────────────────────────── */
function startClientSync(clientUid, advisorUid) {
  stopClientSync();
  _mapClientUid  = clientUid;
  _mapAdvisorUid = advisorUid;

  // Load initial data from Firestore (bypasses localStorage)
  loadMap(clientUid).then(function(map) {
    if (map && map.data && Object.keys(map.data).length > 0) {
      if (typeof clientRestoreData === 'function') {
        _isSyncingFromRemote = true;
        clientRestoreData(map.data);
        _isSyncingFromRemote = false;
      }
      fbUpdateSaveStatus('✓ נטען');
    }

    // Subscribe to live updates
    _unsubSnapshot = onMapSnapshot(clientUid, function(mapDoc) {
      if (_isSyncingFromRemote) return;
      if (!mapDoc.data || Object.keys(mapDoc.data).length === 0) return;
      if (typeof clientRestoreData === 'function') {
        _isSyncingFromRemote = true;
        clientRestoreData(mapDoc.data);
        _isSyncingFromRemote = false;
        fbUpdateSaveStatus('✓ מסונכרן');
      }
    });
  }).catch(function(err) {
    console.error('Error loading map:', err);
    fbUpdateSaveStatus('שגיאה בטעינה');
  });
}

function stopClientSync() {
  if (_unsubSnapshot) {
    _unsubSnapshot();
    _unsubSnapshot = null;
  }
  _mapClientUid  = null;
  _mapAdvisorUid = null;
}

/* ── Auto-save ────────────────────────────────────────────────── */
function fbDebouncedSave() {
  if (_isSyncingFromRemote) return;
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(fbSaveNow, 1000);
}

function fbSaveNow() {
  if (!_mapClientUid || _isSyncingFromRemote) return;
  if (typeof clientCollectData !== 'function') return;
  var data = clientCollectData();
  fbUpdateSaveStatus('שומר…');
  saveMap(_mapClientUid, _mapAdvisorUid, data).then(function() {
    var now = new Date();
    var time = now.toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' });
    fbUpdateSaveStatus('✓ נשמר ' + time);
  }).catch(function(err) {
    console.error('Save error:', err);
    fbUpdateSaveStatus('שגיאה בשמירה');
  });
}

// Listen to input events for auto-save
document.addEventListener('input', fbDebouncedSave);

// Patch populateVarExpensesFromCredit to save after credit data is processed
window.addEventListener('load', function() {
  if (typeof populateVarExpensesFromCredit === 'function' && !populateVarExpensesFromCredit._fbPatched) {
    var _orig = populateVarExpensesFromCredit;
    populateVarExpensesFromCredit = function() {
      _orig.apply(this, arguments);
      fbDebouncedSave();
    };
    populateVarExpensesFromCredit._fbPatched = true;
  }
});
