// Firebase configuration (compat SDK — loaded via <script> tags in index.html)
const firebaseConfig = {
  apiKey: "AIzaSyBtl2Eqn1apZdt2usKnK27LTu2PFt5ffNo",
  authDomain: "articlegame.firebaseapp.com",
  databaseURL: "https://articlegame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "articlegame",
  storageBucket: "articlegame.firebasestorage.app",
  messagingSenderId: "1073793185399",
  appId: "1:1073793185399:web:74ec25dbe28e51e2173872"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
