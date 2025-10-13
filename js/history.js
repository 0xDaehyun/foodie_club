// js/history.js — 명예의 전당(사용자 탭 + 관리자 UI)

import { state } from "./state.js";
import { saf, showAlert } from "./utils.js";
import { db } from "./firebase.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ===== 사용자 탭 렌더 ===== */
export function renderHistoryTab() {
  const c = document.getElementById("history-tab");
  if (!c) return;

  if (!(state.historyData || []).length) {
    c.innerHTML = `<div class="section text-center text-gray-500">
      <i class="fas fa-trophy text-3xl text-amber-400"></i>
      <p class="mt-2">아직 등록된 보관 기록이 없습니다.</p>
    </div>`;
    return;
  }

  const cards = state.historyData
    .map((item) => {
      const when = item.date
        ? new Date(item.date).toLocaleDateString("ko-KR")
        : "-";
      const img = item.imageUrl
        ? `<img src="${saf(
            item.imageUrl
          )}" class="w-full h-40 object-cover rounded mb-2" onerror="this.style.display='none'">`
        : "";
      return `<div class="section card-hover">
        ${img}
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-800 truncate">${saf(
            item.title || "(제목 없음)"
          )}</h3>
          <span class="text-sm text-gray-500">${when}</span>
        </div>
        ${
          item.subtitle
            ? `<div class="text-sm text-indigo-700 mt-0.5">${saf(
                item.subtitle
              )}</div>`
            : ""
        }
        ${
          item.description
            ? `<p class="text-gray-700 mt-2 whitespace-pre-wrap">${saf(
                item.description
              )}</p>`
            : ""
        }
      </div>`;
    })
    .join("");

  c.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>`;
}

/* ===== 관리자 UI ===== */
export function renderHOFAdmin(container) {
  container.innerHTML = `
    <div class="section">
      <h3 class="text-xl font-bold text-gray-800 mb-2">명예의 전당</h3>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input id="hof-title" class="px-3 py-2 border rounded md:col-span-2" placeholder="제목">
        <input id="hof-subtitle" class="px-3 py-2 border rounded md:col-span-3" placeholder="부제목(선택)">
        <input id="hof-date" type="date" class="px-3 py-2 border rounded">
        <input id="hof-image" class="px-3 py-2 border rounded md:col-span-2" placeholder="이미지 URL(선택)">
        <textarea id="hof-desc" rows="3" class="px-3 py-2 border rounded md:col-span-5" placeholder="설명(선택)"></textarea>
      </div>
      <div class="mt-2 flex gap-2">
        <button id="hof-add" class="px-3 py-2 bg-indigo-600 text-white rounded"><i class="fas fa-plus mr-1"></i>추가</button>
        <button id="hof-reset" class="px-3 py-2 bg-gray-200 rounded">초기화</button>
      </div>

      <hr class="my-4">
      <div id="hof-list" class="grid grid-cols-1 gap-3">${renderHOFList()}</div>
    </div>
  `;

  container.querySelector("#hof-add").onclick = addHOFItem;
  container.querySelector("#hof-reset").onclick = () => {
    container.querySelector("#hof-title").value = "";
    container.querySelector("#hof-subtitle").value = "";
    container.querySelector("#hof-date").value = "";
    container.querySelector("#hof-image").value = "";
    container.querySelector("#hof-desc").value = "";
  };

  container.addEventListener("click", (e) => {
    const id = e.target.closest("[data-id]")?.dataset?.id;
    if (!id) return;
    if (e.target.closest("[data-act='edit']")) return openEditHOF(id);
    if (e.target.closest("[data-act='delete']")) return deleteHOF(id);
  });
}

function renderHOFList() {
  if (!(state.historyData || []).length)
    return `<div class="text-gray-400">등록된 항목이 없습니다.</div>`;
  return state.historyData
    .map(
      (h) => `
    <div class="border rounded p-3 bg-white flex items-start gap-3" data-id="${
      h.id
    }">
      ${
        h.imageUrl
          ? `<img src="${saf(
              h.imageUrl
            )}" class="w-24 h-24 object-cover rounded" onerror="this.style.display='none'">`
          : ""
      }
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <div class="truncate font-semibold">${saf(
            h.title || "(제목 없음)"
          )}</div>
          <div class="text-sm text-gray-500">${h.date ? saf(h.date) : "-"}</div>
        </div>
        ${
          h.subtitle
            ? `<div class="text-sm text-indigo-700">${saf(h.subtitle)}</div>`
            : ""
        }
        ${
          h.description
            ? `<div class="text-sm text-gray-700 mt-1 line-clamp-2">${saf(
                h.description
              )}</div>`
            : ""
        }
        <div class="mt-2 space-x-2">
          <button class="text-blue-600 text-sm" data-act="edit"><i class="fas fa-pen mr-1"></i>수정</button>
          <button class="text-red-600 text-sm" data-act="delete"><i class="fas fa-trash mr-1"></i>삭제</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

async function addHOFItem() {
  const root = document.getElementById("subtab-container");
  const title = root.querySelector("#hof-title").value.trim();
  const subtitle = root.querySelector("#hof-subtitle").value.trim();
  const date = root.querySelector("#hof-date").value;
  const imageUrl = root.querySelector("#hof-image").value.trim();
  const description = root.querySelector("#hof-desc").value.trim();
  if (!title || !date) return showAlert("😥", "제목/날짜를 입력하세요.");
  try {
    await addDoc(collection(db, "history"), {
      title,
      subtitle,
      date,
      imageUrl,
      description,
      createdAt: serverTimestamp(),
    });
    showAlert("🎉", "등록되었습니다.");
  } catch (e) {
    console.warn(e);
    showAlert("😥", "등록 실패");
  }
}

function openEditHOF(id) {
  const h = (state.historyData || []).find((x) => x.id === id) || {};
  const modal = document.getElementById("block-editor");
  const title = document.getElementById("block-editor-title");
  const body = document.getElementById("block-editor-body");
  const save = document.getElementById("block-editor-save");
  const cancel = document.getElementById("block-editor-cancel");

  title.textContent = "명예의 전당 수정";
  body.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-5 gap-2">
      <input id="eh-title" class="px-3 py-2 border rounded md:col-span-2" placeholder="제목" value="${saf(
        h.title || ""
      )}">
      <input id="eh-subtitle" class="px-3 py-2 border rounded md:col-span-3" placeholder="부제목(선택)" value="${saf(
        h.subtitle || ""
      )}">
      <input id="eh-date" type="date" class="px-3 py-2 border rounded" value="${saf(
        h.date || ""
      )}">
      <input id="eh-image" class="px-3 py-2 border rounded md:col-span-2" placeholder="이미지 URL(선택)" value="${saf(
        h.imageUrl || ""
      )}">
      <textarea id="eh-desc" rows="3" class="px-3 py-2 border rounded md:col-span-5" placeholder="설명(선택)">${saf(
        h.description || ""
      )}</textarea>
    </div>
  `;
  modal.classList.remove("hidden");

  save.onclick = async () => {
    try {
      await updateDoc(doc(db, "history", id), {
        title: document.getElementById("eh-title").value.trim(),
        subtitle: document.getElementById("eh-subtitle").value.trim(),
        date: document.getElementById("eh-date").value,
        imageUrl: document.getElementById("eh-image").value.trim(),
        description: document.getElementById("eh-desc").value.trim(),
      });
      modal.classList.add("hidden");
      showAlert("✅", "수정되었습니다.");
    } catch (e) {
      console.warn(e);
      showAlert("😥", "수정 실패");
    }
  };
  cancel.onclick = () => modal.classList.add("hidden");
}

async function deleteHOF(id) {
  if (!confirm("해당 항목을 삭제하시겠어요?")) return;
  try {
    await deleteDoc(doc(db, "history", id));
    showAlert("🗑️", "삭제되었습니다.");
  } catch (e) {
    console.warn(e);
    showAlert("😥", "삭제 실패");
  }
}
