// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtl2Eqn1apZdt2usKnK27LTu2PFt5ffNo",
  authDomain: "articlegame.firebaseapp.com",
  databaseURL: "https://articlegame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "articlegame",
  storageBucket: "articlegame.firebasestorage.app",
  messagingSenderId: "1073793185399",
  appId: "1:1073793185399:web:db30ade86a924878173872"
};

// Initialize Firebase (compat SDK loaded via <script> tags in HTML)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();