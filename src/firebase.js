// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ↓↓↓ ここをステップ1で取得した自分の内容に書き換えてください ↓↓↓
const firebaseConfig = {
  apiKey: "AIzaSyBtXЗExRJOCBkHrvewa2ISdXKTyiKFjDJ4",
  authDomain: "booking-calendar-app-18388.firebaseapp.com",
  projectId: "booking-calendar-app-18388",
  storageBucket: "booking-calendar-app-18388.firebasestorage.app",
  messagingSenderId: "411276943571",
  appId: "1:411276943571:web:537dc9fea54cf2f4507426"
};
// ↑↑↑↑↑↑

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);