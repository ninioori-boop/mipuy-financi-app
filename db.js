// Firestore save/load wrappers

function saveUserData(uid, data) {
  return db.collection('users').doc(uid).set({
    data: data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { mergeFields: ['data', 'updatedAt'] });
}

function loadUserData(uid) {
  return db.collection('users').doc(uid).get().then(function(doc) {
    if (doc.exists && doc.data().data) {
      return doc.data().data;
    }
    return null;
  });
}

function saveUserMeta(uid, meta) {
  return db.collection('users').doc(uid).set({
    meta: meta,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

/* ── Multi-user: User profile ─────────────────────────────────── */

function getUserProfile(uid) {
  return db.collection('users').doc(uid).get().then(function(doc) {
    return doc.exists ? doc.data() : null;
  });
}

function setUserProfile(uid, data) {
  return db.collection('users').doc(uid).set(data, { merge: true });
}

/* ── Multi-user: Financial maps ───────────────────────────────── */

function saveMap(clientUid, advisorUid, mapData) {
  return db.collection('maps').doc(clientUid).set({
    clientUid: clientUid,
    advisorUid: advisorUid,
    data: mapData,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

function loadMap(clientUid) {
  return db.collection('maps').doc(clientUid).get().then(function(doc) {
    return doc.exists ? doc.data() : null;
  });
}

function onMapSnapshot(clientUid, callback) {
  return db.collection('maps').doc(clientUid).onSnapshot(function(snap) {
    if (snap.exists) callback(snap.data());
  });
}

/* ── Multi-user: Invite codes ─────────────────────────────────── */

function generateInviteCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createInvite(advisorUid, clientName) {
  var code = generateInviteCode();
  return db.collection('invites').doc(code).set({
    advisorUid: advisorUid,
    clientName: clientName,
    used: false,
    usedBy: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function() { return code; });
}

function claimInvite(code, clientUid) {
  var inviteRef = db.collection('invites').doc(code);
  return inviteRef.get().then(function(snap) {
    if (!snap.exists) throw new Error('קוד הזמנה לא קיים');
    var invite = snap.data();
    if (invite.used) throw new Error('קוד הזמנה כבר נוצל');

    var batch = db.batch();
    batch.update(inviteRef, { used: true, usedBy: clientUid });
    batch.set(db.collection('maps').doc(clientUid), {
      clientUid: clientUid,
      advisorUid: invite.advisorUid,
      clientName: invite.clientName,
      data: {},
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    batch.set(db.collection('users').doc(clientUid), {
      role: 'client',
      advisorId: invite.advisorUid,
      name: invite.clientName
    }, { merge: true });
    return batch.commit().then(function() { return invite; });
  });
}

/* ── Multi-user: Advisor client list ──────────────────────────── */

function getAdvisorClients(advisorUid) {
  return db.collection('maps').where('advisorUid', '==', advisorUid).get()
    .then(function(snap) {
      return snap.docs.map(function(d) { return d.data(); });
    });
}
