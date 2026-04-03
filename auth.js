// Firebase Auth — login overlay + data sync
// Loaded after the main app script. Overrides clientSave / clientAutoSave.

/* ── Login overlay HTML ────────────────────────────────────────── */
(function injectLoginOverlay() {
  var overlay = document.createElement('div');
  overlay.id = 'fb-auth-overlay';
  overlay.innerHTML = [
    '<div id="fb-auth-box">',
    '  <div id="fb-auth-logo">💰</div>',
    '  <h2 id="fb-auth-title">מיפוי פיננסי חכם</h2>',
    '  <p id="fb-auth-sub">התחבר כדי לגשת לנתונים שלך</p>',
    '  <div id="fb-auth-error" style="display:none"></div>',
    '  <input id="fb-email" type="email" placeholder="אימייל" autocomplete="email" dir="ltr">',
    '  <input id="fb-password" type="password" placeholder="סיסמה (לפחות 6 תווים)" autocomplete="current-password" dir="ltr">',
    '  <button id="fb-signin-btn" onclick="fbSignIn()">התחבר</button>',
    '  <button id="fb-signup-btn" onclick="fbSignUp()">הרשמה — משתמש חדש</button>',
    '  <div id="fb-divider"><span>או</span></div>',
    '  <button id="fb-google-btn" onclick="fbGoogleSignIn()">',
    '    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width:18px;vertical-align:middle;margin-left:8px">',
    '    כניסה עם Google',
    '  </button>',
    '</div>'
  ].join('');
  document.body.appendChild(overlay);

  // Styles
  var style = document.createElement('style');
  style.textContent = [
    '#fb-auth-overlay {',
    '  position:fixed;inset:0;background:rgba(10,11,16,.97);',
    '  display:flex;align-items:center;justify-content:center;',
    '  z-index:9999;direction:rtl;',
    '}',
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
    '  font-size:.85rem;margin-bottom:16px;',
    '}',
    '#fb-auth-box input {',
    '  width:100%;background:#0f1117;border:1px solid #2a2d3e;',
    '  border-radius:10px;padding:12px 14px;color:#e8eaf6;',
    '  font-size:.95rem;margin-bottom:12px;outline:none;',
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
  ].join('\n');
  document.head.appendChild(style);
})();

/* ── Auth helpers ──────────────────────────────────────────────── */
function fbShowError(msg) {
  var el = document.getElementById('fb-auth-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}
function fbClearError() {
  var el = document.getElementById('fb-auth-error');
  if (el) el.style.display = 'none';
}
function fbSetLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.style.opacity = loading ? '.5' : '';
}

function fbSignIn() {
  var email = (document.getElementById('fb-email') || {}).value || '';
  var pass  = (document.getElementById('fb-password') || {}).value || '';
  var btn   = document.getElementById('fb-signin-btn');
  if (!email || !pass) { fbShowError('נא למלא אימייל וסיסמה'); return; }
  fbClearError();
  fbSetLoading(btn, true);
  auth.signInWithEmailAndPassword(email, pass)
    .catch(function(err) {
      fbSetLoading(btn, false);
      fbShowError(fbErrMsg(err.code));
    });
}

function fbSignUp() {
  var email = (document.getElementById('fb-email') || {}).value || '';
  var pass  = (document.getElementById('fb-password') || {}).value || '';
  var btn   = document.getElementById('fb-signup-btn');
  if (!email || !pass) { fbShowError('נא למלא אימייל וסיסמה'); return; }
  if (pass.length < 6) { fbShowError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
  fbClearError();
  fbSetLoading(btn, true);
  auth.createUserWithEmailAndPassword(email, pass)
    .catch(function(err) {
      fbSetLoading(btn, false);
      fbShowError(fbErrMsg(err.code));
    });
}

function fbGoogleSignIn() {
  var provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(function(err) {
    fbShowError(fbErrMsg(err.code));
  });
}

function fbSignOut() {
  if (!confirm('להתנתק מהמערכת?')) return;
  auth.signOut();
}

function fbErrMsg(code) {
  var map = {
    'auth/user-not-found':     'משתמש לא נמצא — נסה להירשם',
    'auth/wrong-password':     'סיסמה שגויה',
    'auth/invalid-email':      'כתובת אימייל לא תקינה',
    'auth/email-already-in-use': 'אימייל כבר רשום — נסה להתחבר',
    'auth/weak-password':      'הסיסמה חלשה מדי',
    'auth/too-many-requests':  'יותר מדי ניסיונות — נסה שוב מאוחר יותר',
    'auth/network-request-failed': 'בעיית רשת — בדוק חיבור לאינטרנט',
    'auth/popup-closed-by-user': 'חלון ההתחברות נסגר',
    'auth/invalid-credential': 'פרטי התחברות שגויים',
  };
  return map[code] || ('שגיאה: ' + code);
}

/* ── Auth state listener ───────────────────────────────────────── */
var _fbUid = null;
var _fbSaveTimer = null;

auth.onAuthStateChanged(function(user) {
  var overlay = document.getElementById('fb-auth-overlay');

  if (!user) {
    _fbUid = null;
    if (overlay) overlay.style.display = 'flex';
    return;
  }

  // User is logged in
  _fbUid = user.uid;
  if (overlay) overlay.style.display = 'none';

  // Update header bar
  fbUpdateBar(user);

  // Load data from Firestore
  loadUserData(user.uid).then(function(data) {
    if (data && typeof clientRestoreData === 'function') {
      clientRestoreData(data);
    }
    fbUpdateSaveStatus('✓ נטען');
  }).catch(function(err) {
    console.error('שגיאה בטעינת נתונים:', err);
    fbUpdateSaveStatus('שגיאה בטעינה');
  });
});

/* ── Header bar ────────────────────────────────────────────────── */
function fbUpdateBar(user) {
  // Find the client-bar actions area (already rendered by clientInit)
  var bar = document.getElementById('client-bar');
  if (!bar) {
    // Create minimal bar if it doesn't exist
    bar = document.createElement('div');
    bar.id = 'client-bar';
    bar.style.cssText = 'position:sticky;top:0;z-index:200;background:#12141f;border-bottom:1px solid #2a2d3e;display:flex;align-items:center;justify-content:space-between;padding:8px 20px;gap:12px;';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  var displayName = user.displayName || user.email || 'משתמש';
  var shortName = displayName.length > 22 ? displayName.slice(0, 20) + '…' : displayName;

  bar.innerHTML = [
    '<div style="display:flex;align-items:center;gap:10px;">',
    '  <span style="font-size:.8rem;color:#8892b0;">מחובר כ:</span>',
    '  <span style="font-size:.85rem;color:#e8eaf6;font-weight:600;">' + fbEscape(shortName) + '</span>',
    '</div>',
    '<div style="display:flex;align-items:center;gap:10px;">',
    '  <span id="fb-save-status" style="font-size:.76rem;color:#8892b0;white-space:nowrap;"></span>',
    '  <button onclick="fbSignOut()" style="background:#1e2130;border:1px solid #2a2d3e;color:#a0a8c8;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.82rem;">התנתק</button>',
    '</div>'
  ].join('');
}

function fbEscape(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fbUpdateSaveStatus(text) {
  var el = document.getElementById('fb-save-status');
  if (el) el.textContent = text;
}

/* ── Override clientSave to write to Firestore ─────────────────── */
// Wait for DOMContentLoaded to make sure original function is defined
document.addEventListener('DOMContentLoaded', function() {
  fbPatchClientSave();
});
// Also try immediately (in case DOMContentLoaded already fired)
fbPatchClientSave();

function fbPatchClientSave() {
  if (typeof clientSave !== 'function') return; // not ready yet
  if (clientSave._fbPatched) return; // already patched

  var _originalClientSave = clientSave;

  clientSave = function fbClientSave() {
    // Run original (saves to localStorage as fallback)
    _originalClientSave();

    // Also save to Firestore
    if (!_fbUid) return;
    if (typeof clientCollectData !== 'function') return;
    var data = clientCollectData();
    fbUpdateSaveStatus('שומר…');
    saveUserData(_fbUid, data).then(function() {
      var now = new Date();
      var time = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      fbUpdateSaveStatus('✓ נשמר ' + time);
    }).catch(function(err) {
      console.error('שגיאה בשמירה:', err);
      fbUpdateSaveStatus('שגיאה בשמירה');
    });
  };

  clientSave._fbPatched = true;

  // Also patch the debounced auto-save
  if (typeof clientAutoSave === 'function' && !clientAutoSave._fbPatched) {
    var autoSaveTimer = null;
    clientAutoSave = function fbAutoSave() {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(clientSave, 800);
    };
    clientAutoSave._fbPatched = true;
  }
}

// Retry patch after scripts finish loading
window.addEventListener('load', function() {
  fbPatchClientSave();
});
