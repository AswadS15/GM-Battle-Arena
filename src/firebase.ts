// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyALYRJwZyYUiOche7behLy-xfi4gHGAZDI",
  authDomain: "gm-battle-arena.firebaseapp.com",
  databaseURL: "https://gm-battle-arena-default-rtdb.firebaseio.com/",
  projectId: "gm-battle-arena",
  storageBucket: "gm-battle-arena.appspot.com",
  messagingSenderId: "445717094791",
  appId: "1:445717094791:web:4f58505f51226e865ef322",
  measurementId: "G-HEJW853DKK",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app); // ini benar

export { app, db, analytics };
