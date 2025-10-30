const firebaseConfig = {
  apiKey: "AIzaSyCuZ3I6XyBVrzBmS5buyCHrb8iKMw3Gj4Y",
  authDomain: "articlegame.firebaseapp.com",
  databaseURL: "https://articlegame-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "articlegame",
  storageBucket: "articlegame.firebasestorage.app",
  messagingSenderId: "1073793185399",
  appId: "1:1073793185399:web:ede394dbf6fcc455173872"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();