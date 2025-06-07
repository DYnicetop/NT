import { initializeApp } from "firebase/app"
import { getFirestore, setDoc, collection, getDocs } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAuth } from "firebase/auth"

// Firebase 설정
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
const storage = getStorage(app)
const auth = getAuth(app)

// Firestore 연결 테스트 함수
export const testFirestoreConnection = async () => {
  try {
    const testCollection = collection(db, "test_connection")
    const snapshot = await getDocs(testCollection)
    console.log("Firestore connection successful. Documents count:", snapshot.size)
    return true
  } catch (error) {
    console.error("Firestore connection error:", error)
    return false
  }
}

export { app, db, storage, auth, setDoc }
