import { db, doc, updateDoc, getDoc, setDoc } from "./firebase.js";
import { state } from "./state.js";
import { showAlert } from "./utils.js";

export async function addEmergencyAdmin() {
  const sid = document.getElementById("new-admin-id").value.trim();
  if (!sid) return showAlert("😥", "학번을 입력하세요.");
  try {
    const aref = doc(db, "admins", "list");
    const snap = await getDoc(aref);
    const list = snap.exists() ? snap.data().studentIds || [] : [];
    if (!list.includes(sid)) list.push(sid);
    await setDoc(aref, { studentIds: list }, { merge: true });
    showAlert("✅", "관리자가 임명되었습니다.");
    document.getElementById("emergency-modal").classList.add("hidden");
  } catch (e) {
    console.warn(e);
    showAlert("😥", "임명 실패");
  }
}
