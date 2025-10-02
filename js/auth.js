import {
  auth,
  signInAnonymously,
  signOut,
  db,
  doc,
  getDoc,
} from "./firebase.js";
import { state } from "./state.js";
import { showAlert } from "./utils.js";
import { startPresence, stopPresence } from "./presence.js";
import { ensureAdminOptionals } from "./listeners.js";

export async function login() {
  const sid = document.getElementById("studentId").value.trim();
  const nm = document.getElementById("studentName").value.trim();
  if (sid === state.MASTER_CODE && nm === "") {
    document.getElementById("emergency-modal")?.classList.remove("hidden");
    return;
  }
  if (!sid || !nm) return showAlert("😥", "학번과 이름을 모두 입력해주세요.");
  try {
    const mref = doc(db, "members", sid);
    const ms = await getDoc(mref);
    if (!ms.exists())
      return showAlert(
        "⛔",
        "등록된 회원이 아닙니다. 회원가입 기간에 <b>회원가입</b> 버튼으로 가입해주세요."
      );
    const data = ms.data() || {};
    if ((data.name || "").trim() !== nm)
      return showAlert(
        "🙅‍♂️",
        "입력한 이름이 회원 정보와 일치하지 않습니다. 운영진에게 수정 요청해주세요."
      );
    const status = data.status || "active";
    if (status === "pending")
      return showAlert("⏳", "<b>관리자 승인 대기중</b>입니다.");
    if (status === "rejected")
      return showAlert("⛔", "가입이 거절되었습니다. 운영진에 문의해주세요.");
    if (status === "blocked")
      return showAlert(
        "⛔",
        "접근이 제한된 회원입니다. 운영진에 문의해주세요."
      );

    localStorage.setItem(
      "foodieUser",
      JSON.stringify({ studentId: sid, name: nm })
    );
    state.currentUser = { studentId: sid, name: nm };
    startPresence();
    try {
      const a = await getDoc(doc(db, "admins", "list"));
      state.adminList = a.exists() ? a.data().studentIds || [] : [];
    } catch {}
    ensureAdminOptionals();
  } catch (e) {
    console.warn(e);
    showAlert("😥", "로그인 중 오류가 발생했습니다.");
  }
}

export async function logout() {
  try {
    stopPresence();
    localStorage.removeItem("foodieUser");
    state.currentUser = null;
    await signOut(auth);
  } catch (e) {
    console.warn(e);
  }
  location.reload();
}

export async function verifyAutoLogin(saved) {
  try {
    const mref = doc(db, "members", saved.studentId);
    const ms = await getDoc(mref);
    if (!ms.exists()) return logout();
    const d = ms.data() || {};
    if ((d.name || "").trim() !== saved.name) return logout();
    if ((d.status || "active") !== "active") return logout();
    try {
      const a = await getDoc(doc(db, "admins", "list"));
      state.adminList = a.exists() ? a.data().studentIds || [] : [];
    } catch {}
    ensureAdminOptionals();
  } catch {}
}

export async function initAuthAndStart() {
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn("auth fail:", e?.message || e);
  }
}
