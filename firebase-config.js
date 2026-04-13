// Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyAo-hB-m-6HX_Rlz9SnQ8uPu5A_AZsMymk",
  authDomain: "finance-machine-a36e9.firebaseapp.com", // אל תשנה את זה
  projectId: "finance-machine-a36e9",
  storageBucket: "finance-machine-a36e9.firebasestorage.app",
  messagingSenderId: "816545871242",
  appId: "1:816545871242:web:f99f76f610ca6226ad0473"
};

firebase.initializeApp(firebaseConfig);

var auth = firebase.auth();
var db = firebase.firestore();
