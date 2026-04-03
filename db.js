// Firestore save/load wrappers

function saveUserData(uid, data) {
  return db.collection('users').doc(uid).set({
    data: data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
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
