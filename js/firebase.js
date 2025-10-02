// Firebase 초기화 및 공용 내보내기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyDdrnlSQZa-GD006G9fvgYDL0V_ib3_pcE",
  authDomain: "foodie-club-694ba.firebaseapp.com",
  projectId: "foodie-club-694ba",
  storageBucket: "foodie-club-694ba.appspot.com",
  messagingSenderId: "563737208880",
  appId: "1:563737208880:web:d82b4ea6dd06754eb7e5f5",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 파일 스킴 감지 (로컬 파일 테스트)
export const IS_FILE = location.protocol === "file:";
export const USE_DEMO_OFFLINE = IS_FILE;

// 필요한 파이어베이스 API 재수출 (다른 모듈에서 import 편의)
export {
  // auth
  signInAnonymously,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export {
  // firestore
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export {
  // storage
  ref as sRef,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
