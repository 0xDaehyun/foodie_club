// /js/auth.js
import { state } from "./state.js";
import { showAlert, scheduleRender } from "./utils.js";
import { startPresence, stopPresence } from "./presence.js";
import { db, auth } from "./firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * 관리자 목록 1회 로드 (onSnapshot로 지속 구독 필요하면 바꿔도 됨)
 */
async function loadAdminListOnce() {
  try {
    const snap = await getDoc(doc(db, "admins", "list"));
    state.adminList = snap.exists() ? snap.data().studentIds || [] : [];
  } catch (e) {
    console.warn("[auth] admins/list load failed:", e?.message || e);
    state.adminList = [];
  }
}

/**
 * 로그인 (학번/이름)
 * - members/{sid} 문서가 있어야 하며 이름 일치
 * - status가 rejected/blocked면 차단
 * - pending은 로그인 허용(안내 배너), 운영에선 active만 허용하고 싶으면 아래 if문 바꾸면 됨
 */
export async function loginWithStudent(sidRaw, nameRaw) {
  const sid = (sidRaw || "").trim();
  const nm = (nameRaw || "").trim();

  if (!sid || !nm) {
    showAlert("😥", "학번과 이름을 모두 입력해주세요.");
    return false;
  }

  try {
    const mref = doc(db, "members", sid);
    const ms = await getDoc(mref);
    if (!ms.exists()) {
      showAlert(
        "⛔",
        "등록된 회원이 아닙니다. 회원가입 기간에 <b>회원가입</b> 버튼으로 가입해주세요."
      );
      return false;
    }
    const data = ms.data() || {};

    if ((data.name || "").trim() !== nm) {
      showAlert(
        "🙅‍♂️",
        "입력한 이름이 회원 정보와 일치하지 않습니다. 운영진에게 수정 요청해주세요."
      );
      return false;
    }

    const status = data.status || "active";
    if (status === "rejected" || status === "blocked") {
      showAlert(
        "⛔",
        status === "rejected"
          ? "가입이 거절되었습니다."
          : "접근이 제한된 회원입니다."
      );
      return false;
    }
    if (status === "pending") {
      // 개발/테스트 편의상 로그인 허용 + 안내 (운영에서 막으려면 여기서 return false)
      showAlert(
        "⏳",
        "<b>관리자 승인 대기중</b>입니다. 일부 기능이 제한될 수 있어요."
      );
    }

    // 세션 저장 + 전역 상태 갱신
    localStorage.setItem(
      "foodieUser",
      JSON.stringify({ studentId: sid, name: nm })
    );
    state.currentUser = { studentId: sid, name: nm };

    // Presence 시작
    startPresence();

    // 관리자 목록 1회 로드(버튼/탭 노출 판정에 사용)
    await loadAdminListOnce();

    // ✅ 화면 갱신
    scheduleRender();
    return true;
  } catch (e) {
    console.warn("[auth] login error:", e?.message || e);
    showAlert("😥", "로그인 중 오류가 발생했습니다.");
    return false;
  }
}

/**
 * 자동 로그인 검증(앱 부팅 시)
 */
export async function verifyAutoLogin(saved) {
  try {
    if (!saved?.studentId || !saved?.name) return false;

    const mref = doc(db, "members", saved.studentId);
    const ms = await getDoc(mref);
    if (!ms.exists()) return false;
    const d = ms.data() || {};
    if ((d.name || "").trim() !== saved.name) return false;

    // 운영에서 'active'만 통과시키려면 아래 조건 주석 해제
    // if ((d.status || "active") !== "active") return false;

    state.currentUser = { studentId: saved.studentId, name: saved.name };
    startPresence();
    await loadAdminListOnce();

    scheduleRender();
    return true;
  } catch (e) {
    console.warn("[auth] auto login check failed:", e?.message || e);
    return false;
  }
}

/**
 * 로그아웃
 */
export async function logoutUser() {
  try {
    stopPresence();
    localStorage.removeItem("foodieUser");
    state.currentUser = null;
    state.adminList = [];
  } catch (e) {
    console.warn("[auth] logout error:", e?.message || e);
  }
  // ✅ 화면 갱신
  scheduleRender();
}
