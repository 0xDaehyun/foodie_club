import { state } from "./state.js";
import { saf } from "./utils.js";

function attachAccordionHandlers(root) {
  root.querySelectorAll(".accordion-header").forEach((h) => {
    h.addEventListener("click", () => {
      const item = h.closest(".accordion-item");
      item.classList.toggle("active");
    });
  });
}

export function renderBlocks() {
  const wrap = document.getElementById("dynamic-blocks");
  if (!wrap) return;
  const visible = (state.blocksData || []).filter((b) => b.visible !== false);
  const snippets = visible.map((b) => {
    if (b.type === "scores") {
      const teams = (b.payload?.teams || []).sort(
        (a, b) => Number(b.score || 0) - Number(a.score || 0)
      );
      const list = teams.length
        ? teams
            .map((t, i) => {
              const idx = i + 1;
              const icon =
                idx <= 3
                  ? `<i class="fas fa-trophy mr-2 ${
                      ["text-yellow-400", "text-gray-400", "text-yellow-600"][
                        i
                      ] || "text-gray-300"
                    }"></i>`
                  : `<span class="font-bold mr-2 text-gray-500">${idx}</span>`;
              return `<div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg"><span class="font-semibold text-lg flex items-center">${icon}${saf(
                t.name || "-"
              )}</span><span class="font-bold text-lg text-indigo-600">${Number(
                t.score || 0
              )} 점</span></div>`;
            })
            .join("")
        : `<p class="text-gray-400 text-center">팀이 없습니다.</p>`;
      return `<div class="accordion-item section" data-block="${b.id}">
                <div class="accordion-header cursor-pointer p-4 md:p-6">
                  <h3 class="text-lg md:text-xl font-bold text-gray-700"><i class="fas fa-chart-bar mr-2 text-indigo-500"></i>${saf(
                    b.title || "점수판"
                  )}</h3>
                  <i class="fas fa-chevron-down text-gray-500"></i>
                </div>
                <div class="accordion-content"><div class="space-y-2">${list}</div></div>
              </div>`;
    } else if (b.type === "qa") {
      const items = b.payload?.items || [];
      const html = items.length
        ? items
            .map(
              (it) =>
                `<div class="border rounded p-3"><div class="font-semibold text-gray-800">Q. ${saf(
                  it.q || "-"
                )}</div><div class="text-gray-600 mt-1 whitespace-pre-wrap">A. ${saf(
                  it.a || "-"
                )}</div></div>`
            )
            .join("")
        : `<div class="text-gray-400">질문이 없습니다.</div>`;
      return `<div class="accordion-item section" data-block="${b.id}">
                <div class="accordion-header cursor-pointer p-4 md:p-6">
                  <h3 class="text-lg md:text-xl font-bold text-gray-700"><i class="fas fa-question-circle mr-2 text-indigo-500"></i>${saf(
                    b.title || "Q&A"
                  )}</h3>
                  <i class="fas fa-chevron-down text-gray-500"></i>
                </div>
                <div class="accordion-content"><div class="space-y-2">${html}</div></div>
              </div>`;
    } else {
      const content = saf(b.payload?.html || b.payload?.text || "");
      return `<div class="section" data-block="${b.id}">
                <h3 class="text-lg md:text-xl font-bold text-gray-700 mb-2"><i class="fas fa-bullhorn mr-2 text-indigo-500"></i>${saf(
                  b.title || "공지"
                )}</h3>
                <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">${
                  content || "내용이 없습니다."
                }</div>
              </div>`;
    }
  });
  wrap.innerHTML = snippets.length
    ? snippets.join("")
    : `<div class="section text-center text-gray-400">표시할 블록이 없습니다.</div>`;
  attachAccordionHandlers(wrap);
}

export function renderRoadmap() {
  const c = document.getElementById("roadmap-container");
  const btn = document.getElementById("roadmap-toggle-btn");
  if (!c) return;
  const total = state.roadmapData.length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...state.roadmapData].sort((a, b) => {
    const ao = a.order ?? 999999,
      bo = b.order ?? 999999;
    if (ao !== bo) return ao - bo;
    return (a.activityDate || "").localeCompare(b.activityDate || "");
  });

  const enriched = sorted.map((item) => {
    const d = new Date(item.activityDate);
    let status = "upcoming";
    if (d < today) status = "completed";
    else if (d.toDateString() === today.toDateString()) status = "today";
    return { ...item, _date: d, _status: status };
  });

  let itemsToShow = enriched;
  if (!state.roadmapShowAll) {
    const completed = enriched.filter((x) => x._status === "completed");
    const upcoming = enriched.filter((x) => x._status !== "completed");
    let keptCompleted = completed;
    if (completed.length >= 3) keptCompleted = completed.slice(-2);
    itemsToShow = [...keptCompleted, ...upcoming].slice(0, 4);
  }

  c.innerHTML =
    total === 0
      ? `<p class="text-gray-400 text-center py-4">예정된 활동이 없습니다. 회장님이 곧 일정을 추가할 거예요!</p>`
      : itemsToShow
          .map(
            (item) => `<div class="roadmap-item ${item._status}">
          <div class="font-bold text-gray-800">${saf(item.activityName)}</div>
          <div class="text-sm text-gray-500">${item._date.toLocaleDateString(
            "ko-KR"
          )}</div>
        </div>`
          )
          .join("");

  if (btn) {
    if (total > 4) {
      btn.classList.remove("hidden");
      btn.textContent = state.roadmapShowAll ? "간단히 보기" : "전체 일정 보기";
      btn.onclick = () => {
        state.roadmapShowAll = !state.roadmapShowAll;
        renderRoadmap();
      };
    } else btn.classList.add("hidden");
  }
}
