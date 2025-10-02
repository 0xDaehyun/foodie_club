import { state } from "./state.js";
import { saf, showAlert } from "./utils.js";
import {
  db,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
} from "./firebase.js";

/* UI 서브탭 라우팅 */
export function renderDashboardTab() {
  const c = document.getElementById("dashboard-tab");
  c.innerHTML = `<div class="section">
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
  </div>`;
  const bWrap = c.querySelector(".flex.flex-wrap");
  bWrap.addEventListener("click", (e) => {
    const b = e.target.closest(".subtab-btn");
    if (!b) return;
    c.querySelectorAll(".subtab-btn").forEach((x) =>
      x.classList.remove("bg-gray-800", "text-white")
    );
    b.classList.add("bg-gray-800", "text-white");
    showSubtab(b.dataset.sub);
  });
  showSubtab("homeblocks");
}

function showSubtab(name) {
  const cont = document.getElementById("subtab-container");
  if (name === "homeblocks") return renderHomeBlocksAdmin(cont);
  if (name === "members")
    return (cont.innerHTML = `<div class="text-gray-500">멤버 관리 UI는 (제공된 코드 범위 밖) — 필요 시 이어서 추가하세요.</div>`);
  if (name === "hof")
    return (cont.innerHTML = `<div class="text-gray-500">명예의 전당 UI는 (제공된 코드 범위 밖) — 필요 시 이어서 추가하세요.</div>`);
  if (name === "system")
    return (cont.innerHTML = `<div class="text-gray-500">시스템 설정 UI는 (제공된 코드 범위 밖) — 필요 시 이어서 추가하세요.</div>`);
}

/* 홈 블록 + 로드맵 관리 (제공된 코드 기반) */
export function renderHomeBlocksAdmin(container) {
  container.innerHTML = `
    <div class="grid grid-cols-1 gap-4">
      <div class="section">
        <h3 class="text-xl font-bold text-gray-800 mb-2">블록 순서/노출 관리</h3>
        <p class="text-xs text-gray-600 mb-2">드래그하여 순서를 변경하고, 눈 아이콘으로 노출을 토글하세요. <b>순서/노출 저장</b>을 눌러야 반영됩니다.</p>
        <ul id="blocks-sortable" class="sortable divide-y rounded border bg-white">
          ${state.blocksData
            .map(
              (b) =>
                `<li draggable="true" data-id="${b.id}" data-visible="${
                  b.visible !== false
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
          <button id="notice-save" class="px-3 py-2 bg-indigo-600 text-white rounded">추가/수정</button>
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
          <button id="qa-save" class="px-3 py-2 bg-indigo-600 text-white rounded">추가/수정</button>
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
          <button id="scores-save" class="px-3 py-2 bg-indigo-600 text-white rounded">추가/수정</button>
          <button id="scores-reset" class="px-3 py-2 bg-gray-200 rounded">초기화</button>
        </div>
      </div>

      <!-- 로드맵 관리 -->
      <div class="section">
        <h3 class="text-xl font-bold text-gray-800 mb-2">푸디 로드맵 관리</h3>
        <p class="text-xs text-gray-600 mb-2">드래그로 순서를 바꾸고 저장하세요. 항목 추가/수정/삭제도 가능합니다.</p>
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
    </div>`;

  // 간단 DnD
  const enableSimpleDnd = (ul) => {
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
  };

  // 블록 정렬 DnD
  const sortable = container.querySelector("#blocks-sortable");
  enableSimpleDnd(sortable);

  // 노출 토글/삭제/수정(폼 채우기) — 저장 버튼에서 일괄 반영
  sortable.addEventListener("click", async (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    if (e.target.closest(".toggle-visible")) {
      const icon = li.querySelector(".toggle-visible i");
      const btn = li.querySelector(".toggle-visible");
      const isVisible = (li.dataset.visible ?? "true") === "true";
      const next = !isVisible;
      icon.classList.toggle("fa-eye", next);
      icon.classList.toggle("fa-eye-slash", !next);
      btn.classList.toggle("text-green-600", next);
      btn.classList.toggle("text-gray-400", !next);
      li.dataset.visible = String(next);
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
      const b = state.blocksData.find((x) => x.id === id);
      if (!b) return;
      if (b.type === "qa") {
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

  // 블록 순서/노출 저장
  container
    .querySelector("#save-block-order")
    .addEventListener("click", async () => {
      const lis = [
        ...container.querySelectorAll("#blocks-sortable li[data-id]"),
      ];
      if (!lis.length) return showAlert("ℹ️", "저장할 블록이 없습니다.");
      try {
        const batch = writeBatch(db);
        lis.forEach((li, idx) => {
          const id = li.dataset.id;
          const visible = (li.dataset.visible ?? "true") === "true";
          batch.set(
            doc(db, "homepageBlocks", id),
            { order: idx, visible },
            { merge: true }
          );
        });
        await batch.commit();
        showAlert("✅", "블록 순서/노출이 저장되었습니다.");
      } catch (err) {
        console.warn(err);
        showAlert(
          "😥",
          `저장 중 오류가 발생했습니다.${
            err?.message ? `<br><small>${saf(err.message)}</small>` : ""
          }`
        );
      }
    });

  // 공지
  container
    .querySelector("#notice-save")
    .addEventListener("click", async () => {
      const title = container.querySelector("#notice-title").value.trim();
      const visible =
        container.querySelector("#notice-visible").value === "true";
      const html = container.querySelector("#notice-html").value;
      if (!title) return showAlert("😥", "제목을 입력해주세요.");
      const ord = state.blocksData?.length || 0;
      await addDoc(collection(db, "homepageBlocks"), {
        type: "notice",
        title,
        visible,
        payload: { html },
        order: ord,
      });
      showAlert("🎉", "공지 블록이 추가/수정되었습니다.");
    });
  container.querySelector("#notice-reset").addEventListener("click", () => {
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
    if (!title) return showAlert("😥", "제목을 입력해주세요.");
    const ord = state.blocksData?.length || 0;
    await addDoc(collection(db, "homepageBlocks"), {
      type: "qa",
      title,
      visible,
      payload: { items },
      order: ord,
    });
    showAlert("🎉", "Q&A 블록이 추가/수정되었습니다.");
  });
  container.querySelector("#qa-reset").addEventListener("click", () => {
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
      if (!title) return showAlert("😥", "블록 이름을 입력해주세요.");
      if (teams.length === 0)
        return showAlert("😥", "최소 1개 이상의 조를 추가해주세요.");
      const ord = state.blocksData?.length || 0;
      await addDoc(collection(db, "homepageBlocks"), {
        type: "scores",
        title,
        visible,
        payload: { teams },
        order: ord,
      });
      showAlert("🎉", "점수판 블록이 추가/수정되었습니다.");
    });
  container.querySelector("#scores-reset").addEventListener("click", () => {
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
    if (!name || !date) return showAlert("😥", "이름과 날짜를 입력하세요.");
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
      const item = state.roadmapData.find((x) => x.id === id) || {};
      const editor = document.getElementById("block-editor");
      document.getElementById("block-editor-title").textContent = "로드맵 수정";
      document.getElementById("block-editor-body").innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input id="rm-e-name" class="px-3 py-2 border rounded" placeholder="활동 이름" value="${saf(
            item.activityName || ""
          )}">
          <input id="rm-e-date" type="date" class="px-3 py-2 border rounded" value="${saf(
            item.activityDate || ""
          )}">
        </div>`;
      editor.classList.remove("hidden");
      document.getElementById("block-editor-save").onclick = async () => {
        await updateDoc(doc(db, "roadmap", id), {
          activityName: document.getElementById("rm-e-name").value.trim(),
          activityDate: document.getElementById("rm-e-date").value,
        });
        editor.classList.add("hidden");
        showAlert("✅", "로드맵이 수정되었습니다.");
      };
      document.getElementById("block-editor-cancel").onclick = () =>
        editor.classList.add("hidden");
      return;
    }
    if (e.target.closest(".rm-delete")) {
      if (!confirm("해당 로드맵 항목을 삭제할까요?")) return;
      await deleteDoc(doc(db, "roadmap", id));
      showAlert("🗑️", "삭제되었습니다.");
    }
  });
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
