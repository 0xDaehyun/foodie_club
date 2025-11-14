// Firebase 설정 및 초기화
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  collection,
  addDoc,
  runTransaction,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getStorage,
  ref as sRef,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyDdrnlSQZa-GD006G9fvgYDL0V_ib3_pcE",
  authDomain: "foodie-club-694ba.firebaseapp.com",
  projectId: "foodie-club-694ba",
  storageBucket: "foodie-club-694ba.appspot.com",
  messagingSenderId: "563737208880",
  appId: "1:563737208880:web:d82b4ea6dd06754eb7e5f5",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// 환경 설정
const IS_FILE = location.protocol === "file:";
const USE_DEMO_OFFLINE = false;
const DEBUG_MODE = localStorage.getItem("foodie_debug") === "true";

// 개발 모드 로그 헬퍼
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log("[DEBUG]", ...args);
  }
};

// Firestore 함수들 export
export {
  // Firebase 인스턴스
  app,
  db,
  auth,
  storage,
  
  // Auth 함수
  signInAnonymously,
  signOut,
  
  // Firestore 함수
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  onSnapshot,
  collection,
  addDoc,
  runTransaction,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  
  // Storage 함수
  sRef,
  uploadBytesResumable,
  getDownloadURL,
  
  // 환경 설정
  IS_FILE,
  USE_DEMO_OFFLINE,
  DEBUG_MODE,
  debugLog,
};




















