import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmrrk-OyHQef9mdjSRxo6zUwqvXQA9yYw",
  authDomain: "ntctf-1b330.firebaseapp.com",
  databaseURL: "https://ntctf-1b330-default-rtdb.firebaseio.com",
  projectId: "ntctf-1b330",
  storageBucket: "ntctf-1b330.appspot.com",
  messagingSenderId: "125413562736",
  appId: "1:125413562736:web:a56a877a95b07d3bb717b5",
  measurementId: "G-MNB0MH99M7",
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db }
