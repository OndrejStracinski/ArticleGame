// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtl2Eqn1apZdt2usKnK27LTu2PFt5ffNo",
  authDomain: "articlegame.firebaseapp.com",
  databaseURL: "https://articlegame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "articlegame",
  storageBucket: "articlegame.firebasestorage.app",
  messagingSenderId: "1073793185399",
  appId: "1:1073793185399:web:db30ade86a924878173872"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);