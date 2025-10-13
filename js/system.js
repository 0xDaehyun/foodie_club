// js/system.js — 시스템 설정 UI (가입 기간, 회비/계좌, 관리자 목록 + 긴급관리자 추가)

import { state } from "./state.js";
import { saf, showAlert, formatKRW } from "./utils.js";
import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc, // ← 추가: 긴급관리자 로직에서 읽기 필요
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function renderSystemAdmin(container) {
  const s = state.signupSettings || { open: false, start: "", end: "" };
  const d = state.duesSettings || {
    enabled: false,
    bank: "",
    number: "",
    holder: "",
    amount: "",
    note: "",
  };
  const admins = state.adminList || [];

  container.innerHTML = `
    <div class="section">
      <h3 class="text-xl font-bold text-gray-800 mb-2">시스템 설정</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="border rounded p-3 bg-white">
          <div class="font-semibold text-gray-800 mb-2">회원가입 기간</div>
          <div class="space-y-2">
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" id="sys-signup-open" ${
                s.open ? "checked" : ""
              }>
              <span>지금 바로 가입 가능(기간 무시)</span>
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input id="sys-signup-start" type="date" class="px-3 py-2 border rounded" value="${saf(
                s.start || ""
              )}">
              <input id="sys-signup-end" type="date" class="px-3 py-2 border rounded" value="${saf(
                s.end || ""
              )}">
            </div>
            <button id="sys-save-signup" class="px-3 py-2 bg-gray-800 text-white rounded">저장</button>
          </div>
        </div>

        <div class="border rounded p-3 bg-white md:col-span-2">
          <div class="font-semibold text-gray-800 mb-2">회비/계좌</div>
          <label class="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" id="dues-enabled" ${
              d.enabled ? "checked" : ""
            }>
            <span>가입 모달에서 회비 안내 표시</span>
          </label>
          <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input id="dues-bank" class="px-3 py-2 border rounded" placeholder="은행" value="${saf(
              d.bank || ""
            )}">
            <input id="dues-number" class="px-3 py-2 border rounded" placeholder="계좌번호" value="${saf(
              d.number || ""
            )}">
            <input id="dues-holder" class="px-3 py-2 border rounded" placeholder="예금주" value="${saf(
              d.holder || ""
            )}">
            <input id="dues-amount" type="number" class="px-3 py-2 border rounded" placeholder="회비(숫자)" value="${saf(
              d.amount || ""
            )}">
            <input id="dues-note" class="px-3 py-2 border rounded" placeholder="추가 안내문(선택)" value="${saf(
              d.note || ""
            )}">
          </div>
          <div class="text-xs text-gray-500 mt-1">금액 예: 20000 → ${formatKRW(
            20000
          )}</div>
          <div class="mt-2"><button id="sys-save-dues" class="px-3 py-2 bg-indigo-600 text-white rounded">회비 저장</button></div>
        </div>

        <div class="border rounded p-3 bg-white md:col-span-3">
          <div class="font-semibold text-gray-800 mb-2">운영진(관리자) 목록</div>
          <p class="text-xs text-gray-600 mb-2">학번을 줄바꿈/쉼표/공백으로 구분하여 입력하세요.</p>
          <textarea id="admins-text" rows="4" class="w-full px-3 py-2 border rounded" placeholder="예) 20231234, 20241111">${saf(
            admins.join("\n")
          )}</textarea>
          <div class="mt-2"><button id="sys-save-admins" class="px-3 py-2 bg-emerald-600 text-white rounded">관리자 저장</button></div>
        </div>
      </div>
    </div>
  `;

  container.querySelector("#sys-save-signup").onclick = saveSignup;
  container.querySelector("#sys-save-dues").onclick = saveDues;
  container.querySelector("#sys-save-admins").onclick = saveAdmins;
}

/* ===== 저장 액션들 ===== */
async function saveSignup() {
  try {
    const open = document.getElementById("sys-signup-open").checked;
    const start = document.getElementById("sys-signup-start").value;
    const end = document.getElementById("sys-signup-end").value;
    await setDoc(
      doc(db, "settings", "signup"),
      { open, start, end },
      { merge: true }
    );
    showAlert("✅", "회원가입 기간이 저장되었습니다.");
  } catch (e) {
    console.warn(e);
    showAlert("😥", "저장 실패");
  }
}
async function saveDues() {
  try {
    const enabled = document.getElementById("dues-enabled").checked;
    const bank = document.getElementById("dues-bank").value.trim();
    const number = document.getElementById("dues-number").value.trim();
    const holder = document.getElementById("dues-holder").value.trim();
    const amount = document.getElementById("dues-amount").value.trim();
    const note = document.getElementById("dues-note").value.trim();
    await setDoc(
      doc(db, "settings", "dues"),
      { enabled, bank, number, holder, amount, note },
      { merge: true }
    );
    showAlert("✅", "회비/계좌가 저장되었습니다.");
  } catch (e) {
    console.warn(e);
    showAlert("😥", "저장 실패");
  }
}
async function saveAdmins() {
  try {
    const raw = document.getElementById("admins-text").value || "";
    const ids = raw
      .split(/[\s,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    await setDoc(
      doc(db, "admins", "list"),
      { studentIds: ids },
      { merge: true }
    );
    showAlert("✅", "관리자 명단이 저장되었습니다.");
  } catch (e) {
    console.warn(e);
    showAlert("😥", "저장 실패.");
  }
}

/* ===== 메인에서 import 하는 긴급 관리자 추가 =====
   main.js에서 import { addEmergencyAdmin } from './system.js' 를 기대하므로
   이름과 시그니처를 맞춰 제공합니다.
   - 인자 studentId가 없으면 현재 로그인 사용자의 학번(state.currentUser.studentId)을 사용
*/
export async function addEmergencyAdmin(studentId) {
  try {
    const id = String(studentId || state.currentUser?.studentId || "").trim();
    if (!id) {
      showAlert("😥", "학번을 알 수 없습니다. 로그인 후 다시 시도하세요.");
      return false;
    }

    const ref = doc(db, "admins", "list");
    const snap = await getDoc(ref);
    const current = Array.isArray(snap.data()?.studentIds)
      ? [...snap.data().studentIds]
      : [];

    if (!current.includes(id)) current.push(id);

    await setDoc(ref, { studentIds: current }, { merge: true });
    showAlert("✅", `긴급 관리자 권한이 부여되었습니다. (${id})`);
    return true;
  } catch (e) {
    console.warn(e);
    showAlert("😥", "긴급 관리자 추가 실패");
    return false;
  }
}
