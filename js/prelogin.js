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
  
  // 데이터가 아직 로드되지 않았으면 로딩 표시
  if (state.blocksData === null || state.blocksData === undefined) {
    wrap.innerHTML = `<div class="section text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3"></div>
      <p class="text-gray-500">블록을 불러오는 중...</p>
    </div>`;
    return;
  }
  
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
  // 데이터가 비어있고 로드 완료된 경우에만 빈 메시지 표시
  // 그 전에는 로딩 상태를 유지하거나 재로딩 시도
  if (snippets.length === 0) {
    // 데이터가 방금 로드되었는데 비어있으면 재로딩 시도
    const checkRetry = () => {
      if (state.blocksData && state.blocksData.length === 0) {
        // 잠시 후 다시 확인 (재로딩 로직이 실행될 시간을 줌)
        setTimeout(() => {
          if (state.blocksData && state.blocksData.length === 0) {
            wrap.innerHTML = `<div class="section text-center py-8">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3"></div>
              <p class="text-gray-500">데이터를 다시 불러오는 중...</p>
            </div>`;
          }
        }, 200);
      } else {
        wrap.innerHTML = `<div class="section text-center text-gray-400">표시할 블록이 없습니다.</div>`;
      }
    };
    checkRetry();
  } else {
    wrap.innerHTML = snippets.join("");
  }
  attachAccordionHandlers(wrap);
}

export function renderRoadmap() {
  const c = document.getElementById("roadmap-container");
  const btn = document.getElementById("roadmap-toggle-btn");
  if (!c) return;
  
  // 데이터가 아직 로드되지 않았으면 로딩 표시
  if (state.roadmapData === null || state.roadmapData === undefined) {
    c.innerHTML = `<div class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3"></div>
      <p class="text-gray-500">일정을 불러오는 중...</p>
    </div>`;
    if (btn) btn.classList.add("hidden");
    return;
  }
  
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

  // 데이터가 비어있고 로드 완료된 경우에만 빈 메시지 표시
  if (total === 0) {
    // 데이터가 방금 로드되었는데 비어있으면 재로딩 시도 중 표시
    const checkRetry = () => {
      if (state.roadmapData && state.roadmapData.length === 0) {
        setTimeout(() => {
          if (state.roadmapData && state.roadmapData.length === 0) {
            c.innerHTML = `<div class="text-center py-8">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3"></div>
              <p class="text-gray-500">일정을 다시 불러오는 중...</p>
            </div>`;
          }
        }, 200);
      } else {
        c.innerHTML = `<p class="text-gray-400 text-center py-4">예정된 활동이 없습니다. 회장님이 곧 일정을 추가할 거예요!</p>`;
      }
    };
    checkRetry();
  } else {
    c.innerHTML = itemsToShow
      .map(
        (item) => `<div class="roadmap-item ${item._status}">
      <div class="font-bold text-gray-800">${saf(item.activityName)}</div>
      <div class="text-sm text-gray-500">${item._date.toLocaleDateString(
        "ko-KR"
      )}</div>
    </div>`
      )
      .join("");
  }

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
