// js/dashboard.js
// 관리자 대시보드(홈 블록·로드맵 / 회원 / 명예의 전당 / 시스템) 탭 컨테이너
// - 홈 블록·로드맵: 이 파일에서 구현 (renderHomeBlocksAdmin export)
// - 회원 관리: 이 파일에서 구현 (renderMembersAdmin export)
// - 명예의 전당/시스템: 각 모듈(history.js/system.js)로 위임

import { state } from "./state.js";
import { saf, showAlert, formatKRW } from "./utils.js";
import { db } from "./firebase.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { unarchiveEvent, deleteEvent } from "./events.js";
import { renderSystemAdmin } from "./system.js";

/* ================= 엔트리(탭 컨테이너) ================= */
export function renderDashboardTab() {
  const c = document.getElementById("dashboard-tab");
  if (!c) return;

  c.innerHTML = `
    <div class="section">
      <h2 class="text-2xl font-bold text-gray-800 mb-4">관리자 대시보드</h2>
      <div class="flex flex-wrap gap-2 mb-4">
        <button class="subtab-btn px-3 py-1.5 rounded bg-gray-800 text-white" data-sub="homeblocks">
          <i class="fas fa-house-chimney mr-1"></i>홈 블록·로드맵
        </button>
        <button class="subtab-btn px-3 py-1.5 rounded bg-gray-200" data-sub="members">
          <i class="fas fa-users mr-1"></i>회원
        </button>
        <button class="subtab-btn px-3 py-1.5 rounded bg-gray-200" data-sub="hof">
          <i class="fas fa-trophy mr-1"></i>명예의 전당
        </button>
        <button class="subtab-btn px-3 py-1.5 rounded bg-gray-200" data-sub="system">
          <i class="fas fa-gear mr-1"></i>시스템
        </button>
      </div>
      <div id="subtab-container"></div>
    </div>
  `;

  const wrap = c.querySelector(".flex.flex-wrap");
  wrap.addEventListener("click", (e) => {
    const b = e.target.closest(".subtab-btn");
    if (!b) return;
    c.querySelectorAll(".subtab-btn").forEach((x) =>
      x.classList.remove("bg-gray-800", "text-white")
    );
    b.classList.add("bg-gray-800", "text-white");
    showSubtab(b.dataset.sub);
  });

  // 기본 탭
  showSubtab("homeblocks");
}

function showSubtab(name) {
  const cont = document.getElementById("subtab-container");
  if (!cont) return;
  if (name === "homeblocks") return renderHomeBlocksAdmin(cont);
  if (name === "members") {
    // renderMembersAdmin 내부에서 데이터 로드 처리
    return renderMembersAdmin(cont);
  }
  if (name === "hof") return renderHOFAdmin(cont);
  if (name === "system") return renderSystemAdmin(cont);
}

/* ================= 관리자용 명예의 전당(보관) ================= */
function renderHOFAdmin(container) {
  // archived 상태이면서 deleted가 아닌 이벤트만
  const archived = (state.eventsData || []).filter(
    (e) => e.status === "archived"
  );
  container.innerHTML = `
    <div class="section">
      <h3 class="text-xl font-bold text-gray-800 mb-2">명예의 전당(보관됨)</h3>
      ${
        archived.length === 0
          ? `<div class="text-gray-400">보관된 항목이 없습니다.</div>`
          : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${archived.map((a) => hofAdminCardHTML(a)).join("")}
          </div>`
      }
    </div>
  `;

  container.addEventListener(
    "click",
    async (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === "unarchive") {
        await unarchiveEvent(id);
      } else if (btn.dataset.act === "delete") {
        // 삭제하려는 이벤트 찾기
        const event = (state.eventsData || []).find(ev => ev.id === id);
        
        // 미식회이고 리뷰가 있는 경우 삭제 방지
        if (event && event.type === "tasting" && event.reviews && event.reviews.length > 0) {
          showAlert(
            "⛔", 
            `<div class="text-left">
              <p class="font-bold mb-2">미식회 후기가 있어 삭제할 수 없습니다</p>
              <p class="text-sm">• 현재 <strong>${event.reviews.length}개의 후기</strong>가 작성되어 있습니다</p>
              <p class="text-sm">• 미식회 후기는 회원들의 소중한 기록입니다</p>
              <p class="text-sm mt-2 text-gray-600">💡 Tip: 후기를 모두 삭제한 후 이벤트를 삭제할 수 있습니다</p>
            </div>`
          );
          return;
        }
        
        if (!confirm(
          `정말로 삭제하시겠어요?\n\n⚠️ 주의:\n• 이벤트가 완전히 삭제됩니다\n• 내 활동 탭에서도 보이지 않게 됩니다\n• 이 작업은 되돌릴 수 없습니다\n\n계속하시겠습니까?`
        )) return;
        
        await deleteEvent(id);
      }
    },
    { once: true }
  );
}
function hofAdminCardHTML(e) {
  const title = e.title || e.name || "(제목 없음)";
  const typ = e.type || e.kind || "general";
  const when = e.date || e.when || e.startDate || e.activityDate || "";
  const where = e.place || e.location || "";
  const line = [when, where].filter(Boolean).join(" · ");
  return `<div class="border rounded bg-white p-4 shadow-sm">
    <div class="font-semibold text-gray-800 truncate">${saf(title)}</div>
    ${line ? `<div class="text-sm text-gray-500 mt-1">${saf(line)}</div>` : ""}
    <div class="mt-3 flex gap-2">
      <button class="px-2 py-1 text-xs bg-emerald-600 text-white rounded" data-act="unarchive" data-id="${
        e.id
      }">
        보관 해제
      </button>
      <button class="px-2 py-1 text-xs bg-red-600 text-white rounded" data-act="delete" data-id="${
        e.id
      }">
        삭제
      </button>
    </div>
  </div>`;
}

/* ================= 홈 블록·로드맵 관리 ================= */
// 편집 상태 id
let editingBlockId_notice = null;
let editingBlockId_qa = null;
let editingBlockId_scores = null;

export function renderHomeBlocksAdmin(container) {
  container.innerHTML = `
    <div class="grid grid-cols-1 gap-4">
      <!-- 블록 순서/노출 -->
      <div class="section">
        <h3 class="text-xl font-bold text-gray-800 mb-2">블록 순서/노출 관리</h3>
        <p class="text-xs text-gray-600 mb-2">드래그로 순서를 바꾸고, 눈 아이콘으로 노출을 토글한 뒤 <b>저장</b>을 눌러 반영하세요.</p>
        <ul id="blocks-sortable" class="sortable divide-y rounded border bg-white">
          ${state.blocksData
            .map(
              (b) => `<li draggable="true" data-id="${
                b.id
              }" class="flex items-center justify-between px-3 py-2">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas fa-grip-vertical text-gray-400"></i>
                  <span class="text-xs px-2 py-0.5 rounded ${
                    b.type === "scores"
                      ? "bg-emerald-100 text-emerald-700"
                      : b.type === "qa"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-indigo-100 text-indigo-700"
                  }">${saf(b.type)}</span>
                  <span class="truncate">${saf(b.title || "(제목 없음)")}</span>
                </div>
                <div class="flex items-center gap-2">
                  <button class="toggle-visible text-sm ${
                    b.visible !== false ? "text-green-600" : "text-gray-400"
                  }" title="노출 토글">
                    <i class="fas ${
                      b.visible !== false ? "fa-eye" : "fa-eye-slash"
                    }"></i>
                  </button>
                  <button class="edit-block text-blue-600" data-id="${
                    b.id
                  }" data-type="${
                b.type
              }" title="수정"><i class="fas fa-pen"></i></button>
                  <button class="delete-block text-red-600" data-id="${
                    b.id
                  }" title="삭제"><i class="fas fa-trash"></i></button>
                </div>
              </li>`
            )
            .join("")}
        </ul>
        <div class="mt-3 flex gap-2">
          <button id="save-block-order" class="px-3 py-2 bg-gray-800 text-white rounded">순서/노출 저장</button>
        </div>
      </div>

      <!-- 공지 -->
      <div class="section">
        <h3 class="text-xl font-bold text-gray-800 mb-2">공지 블록</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input id="notice-title" class="px-3 py-2 border rounded" placeholder="제목">
          <select id="notice-visible" class="px-3 py-2 border rounded"><option value="true">노출</option><option value="false">숨김</option></select>
        </div>
        <textarea id="notice-html" rows="6" class="mt-2 w-full px-3 py-2 border rounded" placeholder="내용(HTML/텍스트)"></textarea>
        <div class="mt-2 flex gap-2">
          <button id="notice-save" class="px-3 py-2 bg-indigo-600 text-white rounded">${
            editingBlockId_notice ? "수정" : "추가"
          }</button>
          <button id="notice-reset" class="px-3 py-2 bg-gray-200 rounded">초기화</button>
        </div>
      </div>

      <!-- Q&A -->
      <div class="section">
        <h3 class="text-xl font-bold text-gray-800 mb-2">Q&A 블록</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input id="qa-title" class="px-3 py-2 border rounded" placeholder="제목 (예: 자주 묻는 질문)">
          <select id="qa-visible" class="px-3 py-2 border rounded"><option value="true">노출</option><option value="false">숨김</option></select>
        </div>
        <div id="qa-items" class="mt-2 space-y-2"></div>
        <button id="qa-add" class="mt-1 text-xs bg-white border px-3 py-1 rounded">질문 추가</button>
        <div class="mt-2 flex gap-2">
          <button id="qa-save" class="px-3 py-2 bg-indigo-600 text-white rounded">${
            editingBlockId_qa ? "수정" : "추가"
          }</button>
          <button id="qa-reset" class="px-3 py-2 bg-gray-200 rounded">초기화</button>
        </div>
      </div>

      <!-- 점수판 -->
      <div class="section">
        <h3 class="text-xl font-bold text-gray-800 mb-2">커스텀 점수판 블록</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input id="scores-title" class="px-3 py-2 border rounded" placeholder="블록 이름(제목)">
          <select id="scores-visible" class="px-3 py-2 border rounded"><option value="true">노출</option><option value="false">숨김</option></select>
        </div>
        <div id="scores-rows" class="mt-2 space-y-2"></div>
        <button id="scores-add" class="mt-1 text-xs bg-white border px-3 py-1 rounded">조 추가</button>
        <div class="mt-2 flex gap-2">
          <button id="scores-save" class="px-3 py-2 bg-indigo-600 text-white rounded">${
            editingBlockId_scores ? "수정" : "추가"
          }</button>
          <button id="scores-reset" class="px-3 py-2 bg-gray-200 rounded">초기화</button>
        </div>
      </div>

      <!-- 로드맵 -->
      <div class="section">
        <h3 class="text-xl font-bold text-gray-800 mb-2">푸디 로드맵 관리</h3>
        <p class="text-xs text-gray-600 mb-2">드래그로 순서를 바꾼 뒤 저장하세요. 항목 추가/수정/삭제도 가능합니다.</p>
        <ul id="roadmap-sortable" class="sortable divide-y rounded border bg-white">
          ${renderRoadmapAdminList()}
        </ul>
        <div class="mt-3 flex gap-2">
          <button id="save-roadmap-order" class="px-3 py-2 bg-gray-800 text-white rounded">로드맵 순서 저장</button>
        </div>
        <hr class="my-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input id="rm-name" class="px-3 py-2 border rounded" placeholder="활동 이름">
          <input id="rm-date" type="date" class="px-3 py-2 border rounded">
          <button id="rm-add" class="px-3 py-2 bg-indigo-600 text-white rounded"><i class="fas fa-plus mr-1"></i>로드맵 추가</button>
        </div>
      </div>
    </div>
  `;

  // 블록 정렬 DnD
  const sortable = container.querySelector("#blocks-sortable");
  enableSimpleDnd(sortable);

  // 토글/삭제/편집
  sortable.addEventListener("click", async (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    if (e.target.closest(".toggle-visible")) {
      const icon = li.querySelector(".toggle-visible i");
      const btn = li.querySelector(".toggle-visible");
      const isVisible = icon.classList.contains("fa-eye");
      icon.classList.toggle("fa-eye", !isVisible);
      icon.classList.toggle("fa-eye-slash", isVisible);
      btn.classList.toggle("text-green-600", !isVisible);
      btn.classList.toggle("text-gray-400", isVisible);
      return;
    }
    if (e.target.closest(".delete-block")) {
      const id = li.dataset.id;
      if (!confirm("블록을 삭제할까요?")) return;
      await deleteDoc(doc(db, "homepageBlocks", id));
      return;
    }
    if (e.target.closest(".edit-block")) {
      const id = li.dataset.id;
      const b = (state.blocksData || []).find((x) => x.id === id);
      if (!b) return;
      if (b.type === "qa") {
        editingBlockId_qa = b.id;
        container.querySelector("#qa-title").value = b.title || "";
        container.querySelector("#qa-visible").value =
          b.visible !== false ? "true" : "false";
        const box = container.querySelector("#qa-items");
        box.innerHTML = "";
        (b.payload?.items || []).forEach((it) =>
          addQAItem(box, it.q || "", it.a || "")
        );
        if ((b.payload?.items || []).length === 0) addQAItem(box, "", "");
        showAlert("ℹ️", "Q&A 블록을 편집 모드로 불러왔습니다.");
      } else if (b.type === "scores") {
        editingBlockId_scores = b.id;
        container.querySelector("#scores-title").value = b.title || "";
        container.querySelector("#scores-visible").value =
          b.visible !== false ? "true" : "false";
        const box = container.querySelector("#scores-rows");
        box.innerHTML = "";
        (b.payload?.teams || []).forEach((t) =>
          addScoreRow(box, t.name || "", t.score || 0)
        );
        if ((b.payload?.teams || []).length === 0) addScoreRow(box, "", 0);
        showAlert("ℹ️", "점수판 블록을 편집 모드로 불러왔습니다.");
      } else {
        editingBlockId_notice = b.id;
        container.querySelector("#notice-title").value = b.title || "";
        container.querySelector("#notice-visible").value =
          b.visible !== false ? "true" : "false";
        container.querySelector("#notice-html").value =
          b.payload?.html || b.payload?.text || "";
        showAlert("ℹ️", "공지 블록을 편집 모드로 불러왔습니다.");
      }
      return;
    }
  });

  // 블록 저장
  container
    .querySelector("#save-block-order")
    .addEventListener("click", async () => {
      const lis = [
        ...container.querySelectorAll("#blocks-sortable li[data-id]"),
      ];
      const batch = writeBatch(db);
      lis.forEach((li, idx) => {
        const id = li.dataset.id;
        const visible = li
          .querySelector(".toggle-visible i")
          .classList.contains("fa-eye");
        batch.update(doc(db, "homepageBlocks", id), { order: idx, visible });
      });
      await batch.commit();
      showAlert("✅", "블록 순서/노출이 저장되었습니다.");
    });

  // 공지 저장/리셋
  container
    .querySelector("#notice-save")
    .addEventListener("click", async () => {
      const title = container.querySelector("#notice-title").value.trim();
      const visible =
        container.querySelector("#notice-visible").value === "true";
      const html = container.querySelector("#notice-html").value;
      if (!title) return showAlert("😥", "제목을 입력하세요.");
      if (editingBlockId_notice) {
        await updateDoc(doc(db, "homepageBlocks", editingBlockId_notice), {
          type: "notice",
          title,
          visible,
          payload: { html },
        });
        showAlert("✅", "공지 블록이 수정되었습니다.");
        editingBlockId_notice = null;
        renderHomeBlocksAdmin(container);
      } else {
        const ord = state.blocksData?.length || 0;
        await addDoc(collection(db, "homepageBlocks"), {
          type: "notice",
          title,
          visible,
          payload: { html },
          order: ord,
        });
        showAlert("🎉", "공지 블록이 추가되었습니다.");
        renderHomeBlocksAdmin(container);
      }
    });
  container.querySelector("#notice-reset").addEventListener("click", () => {
    editingBlockId_notice = null;
    container.querySelector("#notice-title").value = "";
    container.querySelector("#notice-visible").value = "true";
    container.querySelector("#notice-html").value = "";
  });

  // Q&A
  const qaBox = container.querySelector("#qa-items");
  qaBox.innerHTML = "";
  addQAItem(qaBox, "", "");
  container
    .querySelector("#qa-add")
    .addEventListener("click", () => addQAItem(qaBox, "", ""));
  container.addEventListener("click", (e) => {
    if (e.target.closest(".remove-qa")) e.target.closest(".qa-row").remove();
  });
  container.querySelector("#qa-save").addEventListener("click", async () => {
    const title = container.querySelector("#qa-title").value.trim();
    const visible = container.querySelector("#qa-visible").value === "true";
    const items = [...container.querySelectorAll(".qa-row")]
      .map((r) => ({
        q: r.querySelector("[data-q]").value.trim(),
        a: r.querySelector("[data-a]").value.trim(),
      }))
      .filter((x) => x.q || x.a);
    if (!title) return showAlert("😥", "제목을 입력하세요.");
    const payload = { items };
    if (editingBlockId_qa) {
      await updateDoc(doc(db, "homepageBlocks", editingBlockId_qa), {
        type: "qa",
        title,
        visible,
        payload,
      });
      showAlert("✅", "Q&A 블록이 수정되었습니다.");
      editingBlockId_qa = null;
      renderHomeBlocksAdmin(container);
    } else {
      const ord = state.blocksData?.length || 0;
      await addDoc(collection(db, "homepageBlocks"), {
        type: "qa",
        title,
        visible,
        payload,
        order: ord,
      });
      showAlert("🎉", "Q&A 블록이 추가되었습니다.");
      renderHomeBlocksAdmin(container);
    }
  });
  container.querySelector("#qa-reset").addEventListener("click", () => {
    editingBlockId_qa = null;
    container.querySelector("#qa-title").value = "";
    container.querySelector("#qa-visible").value = "true";
    qaBox.innerHTML = "";
    addQAItem(qaBox, "", "");
  });

  // 점수판
  const scBox = container.querySelector("#scores-rows");
  scBox.innerHTML = "";
  addScoreRow(scBox, "", 0);
  container
    .querySelector("#scores-add")
    .addEventListener("click", () => addScoreRow(scBox, "", 0));
  container.addEventListener("click", (e) => {
    if (e.target.closest(".remove-score-row"))
      e.target.closest(".score-row").remove();
  });
  container
    .querySelector("#scores-save")
    .addEventListener("click", async () => {
      const title = container.querySelector("#scores-title").value.trim();
      const visible =
        container.querySelector("#scores-visible").value === "true";
      const teams = [...container.querySelectorAll(".score-row")]
        .map((r) => ({
          name: r.querySelector("[data-name]").value.trim(),
          score: Number(r.querySelector("[data-score]").value || 0),
        }))
        .filter((x) => x.name);
      if (!title) return showAlert("😥", "블록 이름을 입력하세요.");
      if (teams.length === 0)
        return showAlert("😥", "최소 1개 이상의 조를 추가하세요.");
      const payload = { teams };
      if (editingBlockId_scores) {
        await updateDoc(doc(db, "homepageBlocks", editingBlockId_scores), {
          type: "scores",
          title,
          visible,
          payload,
        });
        showAlert("✅", "점수판 블록이 수정되었습니다.");
        editingBlockId_scores = null;
        renderHomeBlocksAdmin(container);
      } else {
        const ord = state.blocksData?.length || 0;
        await addDoc(collection(db, "homepageBlocks"), {
          type: "scores",
          title,
          visible,
          payload,
          order: ord,
        });
        showAlert("🎉", "점수판 블록이 추가되었습니다.");
        renderHomeBlocksAdmin(container);
      }
    });
  container.querySelector("#scores-reset").addEventListener("click", () => {
    editingBlockId_scores = null;
    container.querySelector("#scores-title").value = "";
    container.querySelector("#scores-visible").value = "true";
    scBox.innerHTML = "";
    addScoreRow(scBox, "", 0);
  });

  // 로드맵
  const rmUl = container.querySelector("#roadmap-sortable");
  enableSimpleDnd(rmUl);
  container
    .querySelector("#save-roadmap-order")
    .addEventListener("click", async () => {
      const lis = [
        ...container.querySelectorAll("#roadmap-sortable li[data-id]"),
      ];
      const batch = writeBatch(db);
      lis.forEach((li, idx) =>
        batch.update(doc(db, "roadmap", li.dataset.id), { order: idx })
      );
      await batch.commit();
      showAlert("✅", "로드맵 순서가 저장되었습니다.");
    });
  container.querySelector("#rm-add").addEventListener("click", async () => {
    const name = container.querySelector("#rm-name").value.trim();
    const date = container.querySelector("#rm-date").value;
    if (!name || !date) return showAlert("😥", "이름/날짜를 입력하세요.");
    const ord = state.roadmapData?.length || 0;
    await addDoc(collection(db, "roadmap"), {
      activityName: name,
      activityDate: date,
      order: ord,
    });
    container.querySelector("#rm-name").value = "";
    container.querySelector("#rm-date").value = "";
    showAlert("🎉", "로드맵 항목이 추가되었습니다.");
  });
  rmUl.addEventListener("click", async (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.closest(".rm-edit")) {
      const item = (state.roadmapData || []).find((x) => x.id === id) || {};
      const modal = document.getElementById("block-editor");
      const title = document.getElementById("block-editor-title");
      const body = document.getElementById("block-editor-body");
      const save = document.getElementById("block-editor-save");
      const cancel = document.getElementById("block-editor-cancel");
      title.textContent = "로드맵 수정";
      body.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input id="rm-e-name" class="px-3 py-2 border rounded" placeholder="활동 이름" value="${saf(
            item.activityName || ""
          )}">
          <input id="rm-e-date" type="date" class="px-3 py-2 border rounded" value="${saf(
            item.activityDate || ""
          )}">
        </div>`;
      modal.classList.remove("hidden");
      save.onclick = async () => {
        await updateDoc(doc(db, "roadmap", id), {
          activityName: document.getElementById("rm-e-name").value.trim(),
          activityDate: document.getElementById("rm-e-date").value,
        });
        modal.classList.add("hidden");
        showAlert("✅", "로드맵이 수정되었습니다.");
      };
      cancel.onclick = () => modal.classList.add("hidden");
      return;
    }
    if (e.target.closest(".rm-delete")) {
      if (!confirm("해당 로드맵 항목을 삭제할까요?")) return;
      await deleteDoc(doc(db, "roadmap", id));
      showAlert("🗑️", "삭제되었습니다.");
    }
  });
}

// 홈블록 보조 함수들
function addQAItem(host, q = "", a = "") {
  host.insertAdjacentHTML(
    "beforeend",
    `<div class="qa-row grid grid-cols-1 md:grid-cols-5 gap-2">
      <input data-q class="px-3 py-2 border rounded md:col-span-2" placeholder="질문" value="${saf(
        q
      )}">
      <input data-a class="px-3 py-2 border rounded md:col-span-3" placeholder="답변" value="${saf(
        a
      )}">
      <button type="button" class="remove-qa text-red-600 text-sm"><i class="fas fa-trash"></i></button>
    </div>`
  );
}
function addScoreRow(host, name = "", score = 0) {
  host.insertAdjacentHTML(
    "beforeend",
    `<div class="score-row grid grid-cols-12 gap-2">
      <input data-name class="px-3 py-2 border rounded col-span-7" placeholder="조 이름" value="${saf(
        name
      )}">
      <input data-score type="number" class="px-3 py-2 border rounded col-span-4" placeholder="점수" value="${saf(
        score
      )}">
      <button type="button" class="remove-score-row text-red-600 col-span-1"><i class="fas fa-trash"></i></button>
    </div>`
  );
}
function renderRoadmapAdminList() {
  if (!state.roadmapData?.length)
    return `<li class="px-3 py-2 text-gray-400">항목이 없습니다.</li>`;
  const sorted = [...state.roadmapData].sort((a, b) => {
    const ao = a.order ?? 999999,
      bo = b.order ?? 999999;
    if (ao !== bo) return ao - bo;
    return (a.activityDate || "").localeCompare(b.activityDate || "");
  });
  return sorted
    .map(
      (r) => `<li draggable="true" data-id="${
        r.id
      }" class="flex items-center justify-between px-3 py-2">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fas fa-grip-vertical text-gray-400"></i>
          <span class="truncate"><b>${saf(
            r.activityName || ""
          )}</b> <span class="text-sm text-gray-500 ml-1">${saf(
        r.activityDate || "-"
      )}</span></span>
        </div>
        <div class="flex items-center gap-2">
          <button class="rm-edit text-blue-600" title="수정"><i class="fas fa-pen"></i></button>
          <button class="rm-delete text-red-600" title="삭제"><i class="fas fa-trash"></i></button>
        </div>
      </li>`
    )
    .join("");
}
function enableSimpleDnd(ul) {
  if (!ul) return;
  let dragging = null;
  ul.addEventListener("dragstart", (e) => {
    dragging = e.target.closest("li");
    if (dragging) dragging.classList.add("dragging");
  });
  ul.addEventListener("dragend", () => {
    if (dragging) dragging.classList.remove("dragging");
    dragging = null;
  });
  ul.addEventListener("dragover", (e) => {
    e.preventDefault();
    const after = [...ul.querySelectorAll("li:not(.dragging)")].find((li) => {
      const rect = li.getBoundingClientRect();
      return e.clientY <= rect.top + rect.height / 2;
    });
    if (!dragging) return;
    if (after) ul.insertBefore(dragging, after);
    else ul.appendChild(dragging);
  });
}

/* ================= 회원 관리 ================= */
let memberSearchTerm = "";

export function renderMembersAdmin(container) {
  console.log("[renderMembersAdmin] 시작, container:", container);
  console.log("[renderMembersAdmin] state.membersData:", state.membersData?.length || 0, state.membersData);
  
  if (!container) {
    console.error("[renderMembersAdmin] container가 없습니다!");
    return;
  }
  
  // 회원 데이터가 없으면 리스너 시작 시도
  if (!state.membersData || state.membersData.length === 0) {
    console.log("[renderMembersAdmin] 회원 데이터가 없음, startAdminListeners 호출 시도");
    console.log("[renderMembersAdmin] currentUser:", state.currentUser?.studentId);
    console.log("[renderMembersAdmin] adminList:", state.adminList);
    console.log("[renderMembersAdmin] adminList includes:", state.adminList?.includes(state.currentUser?.studentId));
    
    // 관리자 체크를 더 유연하게 - adminList가 아직 로드되지 않았을 수도 있음
    const isAdmin = state.currentUser && (
      state.adminList?.includes(state.currentUser.studentId) || 
      state.currentUser.studentId === "202327942" // 임시로 회장 학번 체크
    );
    
    // adminList가 비어있거나 관리자면 리스너 시작
    if (isAdmin || !state.adminList || state.adminList.length === 0) {
      console.log("[renderMembersAdmin] members 리스너 직접 설정 시도");
      // members 리스너만 직접 설정 (관리자 체크 우회)
      Promise.all([
        import("./firebase.js"),
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")
      ]).then(async ([firebaseModule, firestoreModule]) => {
        const { db } = firebaseModule;
        const { collection, query, orderBy, onSnapshot } = firestoreModule;
        const unsubAdmin = (window.unsubAdmin = window.unsubAdmin || {});
        
        if (!unsubAdmin.members) {
          console.log("[renderMembersAdmin] members 리스너 직접 설정");
          unsubAdmin.members = onSnapshot(
            query(collection(db, "members"), orderBy("name", "asc")),
            (snap) => {
              state.membersData = snap.docs.map((d) => {
                const data = d.data();
                if (data.kakaoUserId !== undefined && data.kakaoUserId !== null) {
                  data._kakaoUserIdString = String(data.kakaoUserId);
                }
                return { id: d.id, ...data };
              });
              console.log("[renderMembersAdmin] membersData 로드됨:", state.membersData.length, "개");
              // 회원 관리 탭이 열려있으면 다시 렌더링
              const subtabContainer = document.getElementById("subtab-container");
              if (subtabContainer && subtabContainer.innerHTML.includes("회원 관리")) {
                renderMembersAdmin(subtabContainer);
              }
            },
            (err) => {
              console.warn("members:", err?.message);
            }
          );
        } else {
          console.log("[renderMembersAdmin] members 리스너가 이미 설정되어 있음");
        }
      }).catch((err) => {
        console.error("[renderMembersAdmin] 리스너 설정 실패:", err);
      });
      
      // startAdminListeners도 시도
      import("./listeners.js").then(({ startAdminListeners }) => {
        console.log("[renderMembersAdmin] startAdminListeners도 호출");
        startAdminListeners();
        // 데이터 로드 후 다시 렌더링 (최대 3초 대기)
        let retryCount = 0;
        const maxRetries = 30; // 3초 (100ms * 30)
        const checkInterval = setInterval(() => {
          retryCount++;
          if (state.membersData && state.membersData.length > 0) {
            console.log("[renderMembersAdmin] 데이터 로드됨, 다시 렌더링");
            clearInterval(checkInterval);
            renderMembersAdmin(container);
          } else if (retryCount >= maxRetries) {
            console.warn("[renderMembersAdmin] 데이터 로드 타임아웃");
            clearInterval(checkInterval);
          }
        }, 100);
      }).catch((err) => {
        console.error("[renderMembersAdmin] startAdminListeners import 실패:", err);
      });
    } else {
      console.warn("[renderMembersAdmin] 관리자가 아님");
    }
  }
  
  const pendingSet = (state.membersData || []).filter(
    (m) => (m.status || "pending") !== "active"
  );
  const activeSet = (state.membersData || []).filter(
    (m) => (m.status || "pending") === "active"
  );
  console.log("[renderMembersAdmin] pendingSet:", pendingSet.length, "activeSet:", activeSet.length);
  console.log("[renderMembersAdmin] membersCardHTML 함수 존재:", typeof membersCardHTML);
  
  // membersCardHTML 함수를 미리 호출하여 HTML 생성
  const pendingHTML = membersCardHTML(pendingSet, true, memberSearchTerm);
  const activeHTML = membersCardHTML(activeSet, false, memberSearchTerm);
  console.log("[renderMembersAdmin] pendingHTML 길이:", pendingHTML.length, "activeHTML 길이:", activeHTML.length);

  container.innerHTML = `
    <div class="section">
      <h3 class="text-xl font-bold text-gray-800 mb-2">회원 관리</h3>

      <div class="flex flex-wrap items-center gap-2 mb-3">
        <input id="member-search" class="px-3 py-2 border rounded flex-1 min-w-[200px]" placeholder="이름/학번/학과 검색">
        <button id="members-export" class="px-3 py-2 bg-blue-600 text-white rounded"><i class="fas fa-file-csv mr-1"></i>CSV 다운로드(한글)</button>
        <button id="members-delete-all" class="px-3 py-2 bg-red-600 text-white rounded"><i class="fas fa-trash mr-1"></i>회원 전체 삭제</button>
      </div>

      <!-- 회원 목록 (카드 형태) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 class="font-semibold text-amber-700 mb-3">승인 필요(대기/거절/차단)</h4>
          <div id="members-list-pending" class="space-y-2">
            ${pendingHTML}
          </div>
        </div>

        <div>
          <h4 class="font-semibold text-emerald-700 mb-3">활동중(승인됨)</h4>
          <div id="members-list-active" class="space-y-2">
            ${activeHTML}
          </div>
        </div>
      </div>

      <!-- 회원 상세 정보 모달 -->
      <div id="member-detail-modal" class="fixed inset-0 bg-black/60 z-50 hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h3 class="text-lg font-bold text-gray-800">회원 상세 정보</h3>
            <button id="member-detail-close" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          <div id="member-detail-content" class="p-6">
            <!-- 동적으로 채워짐 -->
          </div>
        </div>
      </div>


      <p class="text-xs text-gray-500 mt-2">* CSV는 UTF-8(BOM) 저장으로 엑셀에서 한글이 깨지지 않습니다.</p>
    </div>
  `;

  const searchInput = container.querySelector("#member-search");
  searchInput.value = memberSearchTerm;
  searchInput.addEventListener("input", (e) => {
    memberSearchTerm = e.target.value;
    const pendingNow = (state.membersData || []).filter(
      (m) => (m.status || "pending") !== "active"
    );
    const activeNow = (state.membersData || []).filter(
      (m) => (m.status || "pending") === "active"
    );
    
    // 카드 목록 업데이트
    const pendingList = container.querySelector("#members-list-pending");
    const activeList = container.querySelector("#members-list-active");
    if (pendingList) {
      pendingList.innerHTML = membersCardHTML(pendingNow, true, memberSearchTerm);
    }
    if (activeList) {
      activeList.innerHTML = membersCardHTML(activeNow, false, memberSearchTerm);
    }
  });

  container
    .querySelector("#members-export")
    .addEventListener("click", exportMembersCSV);
  container
    .querySelector("#members-delete-all")
    .addEventListener("click", deleteAllMembers);
  
  // 회원 카드 클릭 이벤트
  container.addEventListener("click", (e) => {
    // 모달이 열려있거나 모달 내부 요소를 클릭한 경우 무시
    const modal = document.getElementById("member-detail-modal");
    if (modal && !modal.classList.contains("hidden") && modal.style.display !== "none") {
      // 모달이 열려있으면 회원 카드 클릭 무시
      if (modal.contains(e.target)) {
        return;
      }
    }
    
    // 모달 내부 요소 클릭 무시
    if (e.target.closest("#member-detail-modal")) {
      return;
    }
    
    console.log("[회원 카드] 클릭 이벤트:", e.target);
    const memberCard = e.target.closest(".member-card");
    console.log("[회원 카드] memberCard:", memberCard);
    if (memberCard) {
      const studentId = memberCard.dataset.studentId || memberCard.dataset.studentid;
      console.log("[회원 카드] studentId:", studentId);
      if (studentId) {
        console.log("[회원 카드] openMemberDetailModal 호출");
        openMemberDetailModal(studentId);
      } else {
        console.warn("[회원 카드] studentId를 찾을 수 없음");
      }
    }
    // 관리 버튼 클릭은 기존 핸들러 사용
    const btn = e.target.closest("button[data-act]");
    if (btn) {
      e.stopPropagation();
      onMembersTableClick(e);
    }
  });
  
  // 모달 닫기 버튼 (초기 로드 시, 나중에 openMemberDetailModal에서 재등록됨)
  const closeBtn = container.querySelector("#member-detail-close");
  const modal = container.querySelector("#member-detail-modal");
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      modal.classList.add("hidden");
      modal.style.display = "none";
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    });
  }
}

// 회원 카드 HTML 생성
function membersCardHTML(list, isPendingGroup, keyword) {
  const kw = (keyword || "").toLowerCase();
  const filtered = (list || []).filter((m) => {
    const s = [m.name, m.studentId, m.department, m.college, m.phone].map((x) =>
      String(x || "").toLowerCase()
    );
    return kw ? s.some((v) => v.includes(kw)) : true;
  });
  
  if (filtered.length === 0) {
    return `<div class="text-center py-8 text-gray-400">해당 항목이 없습니다.</div>`;
  }

  return filtered
    .map((m) => {
      // kakaoUserId가 문자열, 숫자, 또는 빈 문자열일 수 있으므로 명확하게 확인
      // 숫자 0은 falsy이므로 명시적으로 확인
      // _kakaoUserIdString도 확인 (listeners.js에서 추가한 속성)
      const hasKakaoUserId = m.kakaoUserId !== undefined && m.kakaoUserId !== null && m.kakaoUserId !== "";
      const hasKakaoUserIdString = m._kakaoUserIdString !== undefined && m._kakaoUserIdString !== null && m._kakaoUserIdString !== "";
      const isKakaoLinked = !!(hasKakaoUserId || hasKakaoUserIdString);
      
      // 디버깅: 특정 회원의 kakaoUserId 값 확인
      if (m.studentId && (hasKakaoUserId || hasKakaoUserIdString)) {
        console.log("[회원 목록] 카카오 연동 확인:", {
          studentId: m.studentId,
          name: m.name,
          kakaoUserId: m.kakaoUserId,
          kakaoUserId_타입: typeof m.kakaoUserId,
          _kakaoUserIdString: m._kakaoUserIdString,
          isKakaoLinked
        });
      }
      
      const profileImage = m.kakaoProfileImage || null;
      
      return `
        <div class="member-card bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-all shadow-sm hover:shadow-md" data-studentId="${m.studentId}">
          <div class="flex items-center gap-3">
            <div class="relative flex-shrink-0">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                ${profileImage 
                  ? `<img src="${profileImage}" alt="프로필" class="w-full h-full object-cover" />`
                  : (m.name?.charAt(0) || "U")
                }
              </div>
              ${isKakaoLinked 
                ? `<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                     <i class="fas fa-comment-dots text-[10px] text-gray-900"></i>
                   </div>`
                : `<div class="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
                     <i class="fas fa-user text-[10px] text-gray-600"></i>
                   </div>`
              }
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-gray-800 text-base">${saf(m.name || "")}</span>
                ${isKakaoLinked 
                  ? `<span class="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">카카오 연동</span>`
                  : `<span class="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">미연동</span>`
                }
              </div>
              <div class="text-sm text-gray-500 font-mono">${saf(m.studentId || "")}</div>
            </div>
            <i class="fas fa-chevron-right text-gray-400 flex-shrink-0"></i>
          </div>
        </div>
      `;
    })
    .join("");
}

// 회원 상세 정보 모달 열기
function openMemberDetailModal(studentId) {
  console.log("[openMemberDetailModal] 시작, studentId:", studentId);
  console.log("[openMemberDetailModal] state.membersData:", state.membersData?.length || 0);
  const m = (state.membersData || []).find((x) => (x.studentId || x.id) === studentId) || {};
  console.log("[openMemberDetailModal] 찾은 회원:", m);
  
  // 모달을 여러 곳에서 찾기 시도
  let modal = document.getElementById("member-detail-modal");
  let content = document.getElementById("member-detail-content");
  
  // container 내부에서도 찾기 시도
  if (!modal) {
    const subtabContainer = document.getElementById("subtab-container");
    if (subtabContainer) {
      modal = subtabContainer.querySelector("#member-detail-modal");
      content = subtabContainer.querySelector("#member-detail-content");
    }
  }
  
  console.log("[openMemberDetailModal] modal:", modal, "content:", content);
  
  if (!modal || !content) {
    console.error("[openMemberDetailModal] modal 또는 content를 찾을 수 없음");
    // 모달이 없으면 동적으로 생성
    console.log("[openMemberDetailModal] 모달을 동적으로 생성");
    const newModal = document.createElement("div");
    newModal.id = "member-detail-modal";
    newModal.className = "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4";
    newModal.innerHTML = `
      <div class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 class="text-lg font-bold text-gray-800">회원 상세 정보</h3>
          <button id="member-detail-close" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div id="member-detail-content" class="p-6">
          <!-- 동적으로 채워짐 -->
        </div>
      </div>
    `;
    document.body.appendChild(newModal);
    modal = newModal;
    content = newModal.querySelector("#member-detail-content");
    
    // 닫기 버튼 이벤트
    const closeBtn = newModal.querySelector("#member-detail-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        newModal.classList.add("hidden");
        newModal.style.display = "none";
      });
    }
    newModal.addEventListener("click", (e) => {
      if (e.target === newModal) {
        newModal.classList.add("hidden");
        newModal.style.display = "none";
      }
    });
  }
  
  const mapStatus = (s) =>
    ({
      active: "활동중",
      pending: "승인대기",
      rejected: "거절",
      blocked: "차단",
    }[s] ||
    s ||
    "-");
  
  // kakaoUserId가 문자열, 숫자, 또는 빈 문자열일 수 있으므로 명확하게 확인
  // 숫자 0은 falsy이므로 명시적으로 확인
  const isKakaoLinked = !!(m.kakaoUserId !== undefined && m.kakaoUserId !== null && m.kakaoUserId !== "");
  const profileImage = m.kakaoProfileImage || null;
  const actionBtns = (m.status || "pending") !== "active"
    ? `
      <button class="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold mb-2" data-act="approve" data-id="${m.studentId}">
        <i class="fas fa-check mr-2"></i>승인
      </button>
      <button class="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold mb-2" data-act="reject" data-id="${m.studentId}">
        <i class="fas fa-xmark mr-2"></i>거절
      </button>
      <button class="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold mb-2" data-act="block" data-id="${m.studentId}">
        <i class="fas fa-ban mr-2"></i>차단
      </button>
      <button class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold mb-2" data-act="edit" data-id="${m.studentId}">
        <i class="fas fa-pen mr-2"></i>수정
      </button>
      <button class="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold" data-act="delete" data-id="${m.studentId}">
        <i class="fas fa-trash mr-2"></i>삭제
      </button>
    `
    : `
      <button class="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold mb-2" data-act="block" data-id="${m.studentId}">
        <i class="fas fa-ban mr-2"></i>차단
      </button>
      <button class="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold mb-2" data-act="edit" data-id="${m.studentId}">
        <i class="fas fa-pen mr-2"></i>수정
      </button>
      <button class="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold" data-act="delete" data-id="${m.studentId}">
        <i class="fas fa-trash mr-2"></i>삭제
      </button>
    `;
  
  content.innerHTML = `
    <div class="space-y-6">
      <!-- 프로필 헤더 -->
      <div class="text-center">
        <div class="relative inline-block">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3 overflow-hidden">
            ${profileImage 
              ? `<img src="${profileImage}" alt="프로필" class="w-full h-full object-cover" />`
              : (m.name?.charAt(0) || "U")
            }
          </div>
          ${isKakaoLinked 
            ? `<div class="absolute bottom-0 right-0 w-6 h-6 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                 <i class="fas fa-comment-dots text-xs text-gray-900"></i>
               </div>`
            : `<div class="absolute bottom-0 right-0 w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
                 <i class="fas fa-user text-xs text-gray-600"></i>
               </div>`
          }
        </div>
        <h4 class="text-xl font-bold text-gray-800 mb-1">${saf(m.name || "")}</h4>
        <p class="text-sm text-gray-500 font-mono">${saf(m.studentId || "")}</p>
        ${isKakaoLinked 
          ? `<span class="inline-block mt-2 text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">카카오 계정 연동됨</span>`
          : `<span class="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">카카오 계정 미연동</span>`
        }
      </div>
      
      <!-- 기본 정보 -->
      <div>
        <h5 class="text-sm font-semibold text-gray-700 mb-3">기본 정보</h5>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">이름</span>
            <span class="text-sm font-medium text-gray-800">${saf(m.name || "")}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">학번</span>
            <span class="text-sm font-medium text-gray-800 font-mono">${saf(m.studentId || "")}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">성별</span>
            <span class="text-sm font-medium text-gray-800">${saf(m.gender || "-")}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">학년</span>
            <span class="text-sm font-medium text-gray-800">${saf(m.year || "-")}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">단과대</span>
            <span class="text-sm font-medium text-gray-800">${saf(m.college || "-")}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">학과</span>
            <span class="text-sm font-medium text-gray-800">${saf(m.department || "-")}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">전화번호</span>
            <span class="text-sm font-medium text-gray-800">${saf(m.phone || "-")}</span>
          </div>
          ${(m.status || "pending") !== "active" ? `
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">상태</span>
            <span class="text-sm font-medium text-gray-800">${mapStatus(m.status)}</span>
          </div>
          ` : ""}
        </div>
      </div>
      
      <!-- 관리 기능 -->
      <div>
        <h5 class="text-sm font-semibold text-gray-700 mb-3">관리 기능</h5>
        <div class="space-y-2">
          ${actionBtns}
        </div>
      </div>
    </div>
  `;
  
  // 모달 표시
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
  }
  modal.style.display = "flex";
  console.log("[openMemberDetailModal] 모달 표시 완료");
  
  // 닫기 버튼 이벤트 재등록 (기존 모달이 있을 때)
  const existingCloseBtn = modal.querySelector("#member-detail-close");
  if (existingCloseBtn) {
    // 기존 이벤트 리스너 제거 후 재등록
    const newCloseBtn = existingCloseBtn.cloneNode(true);
    existingCloseBtn.parentNode.replaceChild(newCloseBtn, existingCloseBtn);
    newCloseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      modal.classList.add("hidden");
      modal.style.display = "none";
    });
  }
  
  // 모달 배경 클릭 시 닫기
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
    }
  });
  
  // 모달 내부 버튼 클릭 이벤트
  const newContent = document.getElementById("member-detail-content");
  if (newContent) {
    newContent.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      const sid = btn.dataset.id;
      
      // 모달 닫기
      modal.classList.add("hidden");
      
      // 액션 실행
      if (act === "approve") return approveMember(sid);
      if (act === "reject") return updateMemberStatus(sid, "rejected");
      if (act === "block") return updateMemberStatus(sid, "blocked");
      if (act === "delete") return deleteMember(sid);
      if (act === "edit") return openMemberEditModal(sid);
    });
  }
}

function membersRowsHTMLGrouped(list, isPendingGroup, keyword) {
  const kw = (keyword || "").toLowerCase();
  const filtered = (list || []).filter((m) => {
    const s = [m.name, m.studentId, m.department, m.college, m.phone].map((x) =>
      String(x || "").toLowerCase()
    );
    return kw ? s.some((v) => v.includes(kw)) : true;
  });
  if (filtered.length === 0)
    return `<tr><td colspan="${
      isPendingGroup ? 9 : 8
    }" class="px-3 py-4 text-center text-gray-400">해당 항목이 없습니다.</td></tr>`;

  const mapStatus = (s) =>
    ({
      active: "활동중",
      pending: "승인대기",
      rejected: "거절",
      blocked: "차단",
    }[s] ||
    s ||
    "-");

  return filtered
    .map((m) => {
      const actionBtns = isPendingGroup
        ? `<button class="text-emerald-700 hover:text-emerald-900 text-xs px-1 py-0.5" data-act="approve" data-id="${m.studentId}"><i class="fas fa-check"></i>승인</button>
           <button class="text-amber-700 hover:text-amber-900 text-xs px-1 py-0.5" data-act="reject" data-id="${m.studentId}"><i class="fas fa-xmark"></i>거절</button>
           <button class="text-gray-700 hover:text-black text-xs px-1 py-0.5" data-act="block" data-id="${m.studentId}"><i class="fas fa-ban"></i>차단</button>
           <button class="text-blue-700 hover:text-blue-900 text-xs px-1 py-0.5" data-act="edit" data-id="${m.studentId}"><i class="fas fa-pen"></i>수정</button>
           <button class="text-red-700 hover:text-red-900 text-xs px-1 py-0.5" data-act="delete" data-id="${m.studentId}"><i class="fas fa-trash"></i>삭제</button>`
        : `<button class="text-gray-700 hover:text-black text-xs px-1 py-0.5" data-act="block" data-id="${m.studentId}"><i class="fas fa-ban"></i>차단</button>
           <button class="text-blue-700 hover:text-blue-900 text-xs px-1 py-0.5" data-act="edit" data-id="${m.studentId}"><i class="fas fa-pen"></i>수정</button>
           <button class="text-red-700 hover:text-red-900 text-xs px-1 py-0.5" data-act="delete" data-id="${m.studentId}"><i class="fas fa-trash"></i>삭제</button>`;

      return `<tr class="border-t">
        <td class="px-2 py-2 text-sm">${saf(m.name || "")}</td>
        <td class="px-2 py-2 text-sm font-mono">${saf(m.studentId || "")}</td>
        <td class="px-2 py-2 text-sm">${saf(m.gender || "")}</td>
        <td class="px-2 py-2 text-sm">${saf(m.year || "")}</td>
        <td class="px-2 py-2 text-sm">${saf(m.college || "")}</td>
        <td class="px-2 py-2 text-sm">${saf(m.department || "")}</td>
        <td class="px-2 py-2 text-sm">${saf(m.phone || "")}</td>
        ${
          isPendingGroup
            ? `<td class="px-2 py-2 text-sm">${mapStatus(m.status)}</td>`
            : ""
        }
        <td class="px-2 py-2 text-xs space-x-1 whitespace-nowrap">${actionBtns}</td>
      </tr>`;
    })
    .join("");
}

function onMembersTableClick(e) {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  const sid = btn.dataset.id;
  if (act === "approve") return approveMember(sid);
  if (act === "reject") return updateMemberStatus(sid, "rejected");
  if (act === "block") return updateMemberStatus(sid, "blocked");
  if (act === "delete") return deleteMember(sid);
  if (act === "edit") return openMemberEditModal(sid);
}
async function approveMember(sid) {
  try {
    await updateDoc(doc(db, "members", sid), { status: "active" });
    showAlert("✅", "승인되었습니다.");
  } catch {
    showAlert("😥", "처리 실패");
  }
}
async function updateMemberStatus(sid, status) {
  try {
    await updateDoc(doc(db, "members", sid), { status });
    showAlert("✅", "상태가 변경되었습니다.");
  } catch {
    showAlert("😥", "처리 실패");
  }
}
async function deleteMember(sid) {
  if (!confirm("해당 회원을 삭제하시겠어요?")) return;
  try {
    await deleteDoc(doc(db, "members", sid));
    showAlert("🗑️", "삭제되었습니다.");
  } catch {
    showAlert("😥", "삭제 실패");
  }
}
function openMemberEditModal(sid) {
  const m =
    (state.membersData || []).find((x) => (x.studentId || x.id) === sid) || {};
  const modal = document.getElementById("block-editor");
  const title = document.getElementById("block-editor-title");
  const body = document.getElementById("block-editor-body");
  const save = document.getElementById("block-editor-save");
  const cancel = document.getElementById("block-editor-cancel");
  if (!modal || !title || !body) return;

  title.textContent = `회원 정보 수정 — ${saf(m.name || "")}`;
  body.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <input id="mem-name" class="px-3 py-2 border rounded" placeholder="이름" value="${saf(
        m.name || ""
      )}">
      <input id="mem-id" class="px-3 py-2 border rounded bg-gray-50" disabled placeholder="학번" value="${saf(
        m.studentId || ""
      )}">
      <select id="mem-gender" class="px-3 py-2 border rounded">
        <option value="남" ${m.gender === "남" ? "selected" : ""}>남</option>
        <option value="여" ${m.gender === "여" ? "selected" : ""}>여</option>
        <option value="기타" ${
          m.gender === "기타" ? "selected" : ""
        }>기타</option>
      </select>
      <select id="mem-year" class="px-3 py-2 border rounded">
        <option value="1학년" ${
          m.year === "1학년" ? "selected" : ""
        }>1학년</option>
        <option value="2학년" ${
          m.year === "2학년" ? "selected" : ""
        }>2학년</option>
        <option value="3학년" ${
          m.year === "3학년" ? "selected" : ""
        }>3학년</option>
        <option value="4학년" ${
          m.year === "4학년" ? "selected" : ""
        }>4학년</option>
        <option value="기타" ${
          m.year === "기타" ? "selected" : ""
        }>기타</option>
      </select>
      <input id="mem-college" class="px-3 py-2 border rounded" placeholder="단과대" value="${saf(
        m.college || ""
      )}">
      <input id="mem-dept" class="px-3 py-2 border rounded" placeholder="학과" value="${saf(
        m.department || ""
      )}">
      <input id="mem-phone" class="px-3 py-2 border rounded" placeholder="전화번호" value="${saf(
        m.phone || ""
      )}">
      <select id="mem-status" class="px-3 py-2 border rounded">
        <option value="active" ${
          m.status === "active" ? "selected" : ""
        }>활동중</option>
        <option value="pending" ${
          m.status === "pending" ? "selected" : ""
        }>승인대기</option>
        <option value="rejected" ${
          m.status === "rejected" ? "selected" : ""
        }>거절</option>
        <option value="blocked" ${
          m.status === "blocked" ? "selected" : ""
        }>차단</option>
      </select>
    </div>
  `;
  modal.classList.remove("hidden");
  save.onclick = async () => {
    try {
      await updateDoc(doc(db, "members", sid), {
        name: document.getElementById("mem-name").value.trim(),
        gender: document.getElementById("mem-gender").value,
        year: document.getElementById("mem-year").value,
        college: document.getElementById("mem-college").value.trim(),
        department: document.getElementById("mem-dept").value.trim(),
        phone: document.getElementById("mem-phone").value.trim(),
        status: document.getElementById("mem-status").value,
      });
      modal.classList.add("hidden");
      showAlert("✅", "수정되었습니다.");
    } catch {
      showAlert("😥", "수정 실패");
    }
  };
  cancel.onclick = () => modal.classList.add("hidden");
}
function exportMembersCSV() {
  const mapStatus = (s) =>
    ({
      active: "활동중",
      pending: "승인대기",
      rejected: "거절",
      blocked: "차단",
    }[s] ||
    s ||
    "-");
  const rows = (state.membersData || []).map((m) => [
    m.name || "",
    m.studentId || "",
    m.gender || "",
    m.year || "",
    m.college || "",
    m.department || "",
    m.phone || "",
    mapStatus(m.status),
  ]);
  const header = [
    "이름",
    "학번",
    "성별",
    "학년",
    "단과대",
    "학과",
    "전화번호",
    "상태",
  ];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\r\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `members_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
async function deleteAllMembers() {
  if (
    !confirm("정말로 모든 회원을 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.")
  )
    return;
  try {
    const snap = await getDocs(collection(db, "members"));
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(doc(db, "members", d.id)));
    await batch.commit();
    showAlert("🗑️", "전체 삭제가 완료되었습니다.");
  } catch {
    showAlert("😥", "전체 삭제 중 오류가 발생했습니다.");
  }
}
