import { db, doc, getDoc, setDoc, serverTimestamp } from "./firebase.js";
import { state } from "./state.js";
import { isSignupOpen, showAlert, formatKRW, saf } from "./utils.js";
import { el } from "./elements.js";

export function updateSignupUI() {
  const openNow = isSignupOpen();
  if (el.signupBanner) el.signupBanner.classList.toggle("hidden", !openNow);
  if (el.signupBtn) {
    el.signupBtn.disabled = !openNow;
    el.signupBtn.title = openNow
      ? "회원가입 가능"
      : "현재는 회원가입 기간이 아닙니다.";
  }
  renderDuesInfoBox();
}

export function renderDuesInfoBox() {
  const d = state.duesSettings || {};
  const enabled = !!d.enabled;
  el.duesBox.classList.toggle("hidden", !enabled);
  if (!enabled) {
    el.duesBoxContent.innerHTML = "";
    return;
  }
  const lines = [];
  if (d.bank || d.number)
    lines.push(
      `<b>${saf(d.bank || "")} ${saf(d.number || "")}</b>${
        d.holder ? ` (예금주 ${saf(d.holder)})` : ""
      }`
    );
  if (d.amount) lines.push(`회비: <b>${formatKRW(d.amount)}</b>`);
  if (d.note)
    lines.push(`<span class="text-amber-700">${saf(d.note || "")}</span>`);
  el.duesBoxContent.innerHTML = lines.join("<br/>");
}

export function openSignupModal() {
  if (!isSignupOpen())
    return showAlert("⛔", "현재는 회원가입 기간이 아닙니다.");
  el.signupModal.classList.remove("hidden");
  document.getElementById("signupId").value = document
    .getElementById("studentId")
    .value.trim();
  document.getElementById("signupName").value = document
    .getElementById("studentName")
    .value.trim();
  renderDuesInfoBox();
}

export function openDuesModal() {
  const d = state.duesSettings || {};
  const body = [];
  if (d.amount)
    body.push(`<div>회비 금액: <b>${formatKRW(d.amount)}</b></div>`);
  if (d.bank || d.number)
    body.push(
      `<div>입금 계좌: <b>${saf(d.bank || "")} ${saf(d.number || "")}</b>${
        d.holder ? ` (예금주 ${saf(d.holder)})` : ""
      }</div>`
    );
  if (d.note) body.push(`<div class="text-gray-600">${saf(d.note)}</div>`);
  if (body.length === 0)
    body.push(
      `<div class="text-red-600">관리자가 회비 정보를 아직 설정하지 않았습니다.</div>`
    );
  el.duesModalBody.innerHTML = body.join("");
  el.duesModal.classList.remove("hidden");
}

// 회원 가입 시 카카오 연동 정보 저장
let signupKakaoInfo = null;

export function setSignupKakaoInfo(info) {
  signupKakaoInfo = info;
  const statusDiv = document.getElementById("signup-kakao-status");
  const statusText = document.getElementById("signup-kakao-status-text");
  if (statusDiv && statusText) {
    statusDiv.classList.remove("hidden");
    statusText.textContent = `카카오 계정이 연동되었습니다. (${info.nickname || "연동됨"})`;
  }
}

export async function confirmSignup(skipConfirm) {
  const sid = document.getElementById("signupId").value.trim();
  const nm = document.getElementById("signupName").value.trim();
  const gender = document.getElementById("signupGender").value.trim();
  const year = document.getElementById("signupYear").value.trim();
  const college = document.getElementById("signupCollege").value.trim();
  const dept = document.getElementById("signupDept").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  if (!sid || !nm || !gender || !year || !college || !dept || !phone)
    return showAlert("😥", "모든 필드를 입력하세요.");
  if (!skipConfirm && state.duesSettings?.enabled) {
    openDuesModal();
    return;
  }
  if (!isSignupOpen())
    return showAlert("⛔", "현재는 회원가입 기간이 아닙니다.");
  try {
    const mref = doc(db, "members", sid);
    const ms = await getDoc(mref);
    if (ms.exists()) {
      showAlert("ℹ️", "이미 가입된 학번입니다. 로그인 해주세요.");
      el.signupModal.classList.add("hidden");
      document.getElementById("studentId").value = sid;
      document.getElementById("studentName").value = ms.data().name || nm;
      return;
    }
    
    // 회원 정보 생성 (카카오 연동 정보 포함)
    const memberData = {
      studentId: sid,
      name: nm,
      gender,
      year,
      college,
      department: dept,
      phone,
      status: "pending",
      requestedAt: serverTimestamp(),
    };
    
    // 카카오 연동 정보가 있으면 추가 (숫자로 저장)
    if (signupKakaoInfo) {
      // 카카오 ID는 숫자로 저장 (문자열이면 숫자로 변환)
      const kakaoId = typeof signupKakaoInfo.id === "string" 
        ? Number(signupKakaoInfo.id) 
        : Number(signupKakaoInfo.id);
      memberData.kakaoUserId = kakaoId;
      memberData.kakaoNickname = signupKakaoInfo.nickname;
      memberData.kakaoProfileImage = signupKakaoInfo.profileImage;
    }
    
    await setDoc(mref, memberData);
    
    // 카카오 연동 정보 초기화
    signupKakaoInfo = null;
    const statusDiv = document.getElementById("signup-kakao-status");
    if (statusDiv) {
      statusDiv.classList.add("hidden");
    }
    
    el.signupModal.classList.add("hidden");
    showAlert(
      "⏳",
      "가입 신청이 접수되었습니다! <b>관리자 승인 대기중</b>입니다."
    );
    document.getElementById("studentId").value = sid;
    document.getElementById("studentName").value = nm;
  } catch (e) {
    console.warn(e);
    showAlert("😥", "회원가입 중 오류가 발생했습니다.");
  }
}
