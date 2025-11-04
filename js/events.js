import {
  db,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  runTransaction,
  getDoc,
  collection,
  sRef,
  storage,
  uploadBytesResumable,
  getDownloadURL,
} from "./firebase.js";
import { state } from "./state.js";
import {
  showAlert,
  isUserIn,
  typeLabel,
  typeBadgeClass,
  typeAccentClass,
  statusLabel,
  saf,
  formatKRW,
} from "./utils.js";

export function computeEventStats(ev) {
  const getAll = () => {
    if (ev.type === "tasting") {
      const arr = [];
      (ev.restaurants || []).forEach((r) => {
        arr.push(...(r.reservations || []), ...(r.waiting || []));
      });
      return arr;
    }
    return [...(ev.applicants || []), ...(ev.waiting || [])];
  };
  const all = getAll();
  const stats = all.map((p) => ({
    gender: p.gender || "미상",
    college: p.college || "미상",
  }));
  const total = stats.length;
  const genderCount = { 남: 0, 여: 0, 기타: 0, 미상: 0 };
  stats.forEach((s) => {
    if (genderCount[s.gender] == null) genderCount["미상"]++;
    else genderCount[s.gender]++;
  });
  const genderPct = Object.fromEntries(
    Object.entries(genderCount).map(([k, v]) => [
      k,
      total ? Math.round((v / total) * 1000) / 10 : 0,
    ])
  );
  const collegeMap = new Map();
  stats.forEach((s) => {
    const key = s.college || "미상";
    collegeMap.set(key, (collegeMap.get(key) || 0) + 1);
  });
  const colleges = [...collegeMap.entries()]
    .map(([name, cnt]) => ({
      name,
      cnt,
      pct: total ? Math.round((cnt / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.cnt - a.cnt);
  return { total, genderPct, genderCount, colleges };
}
function adminStatsHTML(ev) {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (!isAdmin) return "";
  const st = computeEventStats(ev);
  const gLine =
    st.total > 0
      ? `남 ${st.genderCount.남}명 · 여 ${st.genderCount.여}명${
          st.genderCount.기타 ? ` · 기타 ${st.genderCount.기타}명` : ""
        }`
      : "자료 없음";
  const colleges =
    st.colleges
      .slice(0, 5)
      .map((c) => `${saf(c.name)} ${c.cnt}명`)
      .join(" · ") || "자료 없음";
  return `<div class="mt-3 text-xs bg-gray-50 border rounded p-2">
           <div class="font-semibold text-gray-700">관리자용 신청자 통계 <span class="text-[11px] text-gray-500">(신청+대기 포함)</span></div>
           <div class="mt-1 text-gray-700">성별: ${gLine}</div>
           <div class="mt-1 text-gray-700">단과대 상위: ${colleges}</div>
         </div>`;
}
function adminInline(ev) {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (!isAdmin) return "";
  return `<div class="mt-3 flex gap-2">
            <button type="button" class="text-blue-600 hover:text-blue-800 text-sm" data-act="admin-edit" data-id="${ev.id}"><i class="fas fa-pen"></i> 수정</button>
            <button type="button" class="text-amber-600 hover:text-amber-800 text-sm" data-act="admin-archive" data-id="${ev.id}"><i class="fas fa-box-archive"></i> 보관</button>
            <button type="button" class="text-green-700 hover:text-green-900 text-sm" data-act="admin-unarchive" data-id="${ev.id}"><i class="fas fa-rotate-left"></i> 재게시</button>
            <button type="button" class="text-red-600 hover:text-red-800 text-sm" data-act="admin-delete" data-id="${ev.id}"><i class="fas fa-trash"></i> 삭제</button>
            <button type="button" class="text-green-700 hover:text-green-900 text-sm" data-act="export-xlsx" data-id="${ev.id}"><i class="fas fa-file-excel"></i> 명단 다운로드</button>
          </div>`;
}
function paymentInfoHTML(ev) {
  // 미식회 타입에서는 회비 정보를 표시하지 않음 (기본 회비 설정 사용)
  if (ev.type === "tasting") {
    const dues = state.duesSettings || {};
    if (!dues.enabled || (!dues.bank && !dues.number)) return "";
    const line = [dues.bank, dues.number].filter(Boolean).map(saf).join(" ");
    return `<div class="mt-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="font-bold text-orange-900 mb-1">💸 회비 입금 정보</div>
          <div class="text-sm text-orange-800">회비: ${dues.amount ? formatKRW(dues.amount) : "확인 필요"}</div>
          <div class="text-sm text-orange-700 mt-1">${line || ""}${
      dues.holder ? ` (예금주 ${saf(dues.holder)})` : ""
    }</div>
          ${dues.note ? `<div class="text-sm text-orange-700 mt-1">${saf(dues.note)}</div>` : ""}
        </div>
        <button type="button" onclick="navigator.clipboard.writeText('${saf(dues.bank || "")} ${saf(dues.number || "")}').then(() => alert('계좌번호가 복사되었습니다!'))" class="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
          <i class="fas fa-copy mr-2"></i>계좌 복사하기
        </button>
      </div>
      <div class="text-xs text-orange-700 bg-orange-100 p-2 rounded">
        <i class="fas fa-info-circle mr-1"></i>신청 후 바로 입금 해주세요!
      </div>
    </div>`;
  }
  
  // MT/총회인 경우 이벤트별 결제 정보 사용
  if (!(ev.type === "mt" || ev.type === "assembly")) return "";
  const p = ev.payment || {};
  if (!p.bank && !p.number && !p.holder && !p.note) return "";
  const line = [p.bank, p.number].filter(Boolean).map(saf).join(" ");
  return `<div class="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
      <div class="flex items-center justify-between mb-3">
        <div>
          <div class="font-bold text-amber-900 mb-1">💸 회비 입금 정보</div>
          <div class="text-sm text-amber-800">${line || ""}${
    p.holder ? ` (예금주 ${saf(p.holder)})` : ""
  }</div>
          ${p.note ? `<div class="text-sm text-amber-700 mt-1">${saf(p.note)}</div>` : ""}
        </div>
        <button type="button" onclick="navigator.clipboard.writeText('${saf(p.bank || "")} ${saf(p.number || "")}').then(() => alert('계좌번호가 복사되었습니다!'))" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
          <i class="fas fa-copy mr-2"></i>계좌 복사하기
        </button>
      </div>
      <div class="text-xs text-amber-700 bg-amber-100 p-2 rounded">
        <i class="fas fa-info-circle mr-1"></i>신청 후 바로 입금 해주세요!
      </div>
    </div>`;
}

function generalCardHTML(ev) {
  const count = (ev.applicants || []).length,
    lim = ev.limit || 0;
  const my = isUserIn(ev.applicants)
    ? "apply"
    : isUserIn(ev.waiting)
    ? "wait"
    : "none";
  const btn =
    my === "apply"
      ? `<button type="button" class="w-full mt-3 bg-gray-600 text-white font-bold py-2 rounded" data-act="cancel-general" data-id="${ev.id}">신청 취소</button>`
      : `<button type="button" class="w-full mt-3 ${
          count < lim ? "bg-green-600" : "bg-amber-500"
        } text-white font-bold py-2 rounded" data-act="reserve-general" data-id="${
          ev.id
        }">${count < lim ? "신청하기" : "대기 신청"}</button>`;
  const namesList = (ev.applicants || [])
    .slice()
    .reverse()
    .map(
      (a) =>
        `<div class="flex items-center gap-2"><span class="font-mono text-[11px] text-gray-500">${
          a.studentId ? `${a.studentId.slice(0, 4)}****` : ""
        }</span><span class="text-xs truncate">${saf(a.name)}</span></div>`
    )
    .join("");
  const waitingList = (ev.waiting || [])
    .slice()
    .reverse()
    .map(
      (a) =>
        `<div class="flex items-center gap-2"><span class="font-mono text-[11px] text-gray-500">${
          a.studentId ? `${a.studentId.slice(0, 4)}****` : ""
        }</span><span class="text-xs truncate">${saf(a.name)}</span></div>`
    )
    .join("");
  return `<div class="section card-hover ${typeAccentClass(ev.type)}">
            <h3 class="text-xl font-bold text-gray-800">${saf(ev.title)}</h3>
            <p class="text-gray-500">🗓️ ${
              ev.datetime ? new Date(ev.datetime).toLocaleString("ko-KR") : "-"
            }</p>
            ${paymentInfoHTML(ev)}
            <div class="mt-3">
              <div class="w-full bg-gray-200 rounded-full h-4"><div class="bg-green-500 h-4 rounded-full" style="width:${
                lim ? Math.min(100, Math.round((count / lim) * 100)) : 0
              }%"></div></div>
              <p class="text-right text-sm mt-1 text-gray-600">신청: ${count} / ${lim} 명</p>
            </div>
            ${adminStatsHTML(ev)}
            ${btn}
            ${
              state.currentUser &&
              state.adminList.includes(state.currentUser.studentId)
                ? `
            <div class="mt-3">
              <div class="text-xs font-semibold text-gray-600 mb-1">참가자</div>
              <div class="max-h-28 overflow-y-auto border rounded bg-gray-50 p-2">${
                namesList ||
                '<div class="text-xs text-gray-400">아직 없음</div>'
              }</div>
            </div>
            <div class="mt-2">
              <div class="text-xs font-semibold text-gray-600 mb-1">대기자</div>
              <div class="max-h-24 overflow-y-auto border rounded bg-amber-50 p-2">${
                waitingList ||
                '<div class="text-xs text-amber-400">대기자 없음</div>'
              }</div>
              <div class="text-[11px] text-amber-700 mt-1">※ 빈자리가 생기면 <b>신청 순서대로 자동 승급</b>돼요.</div>
            </div>
            `
                : ""
            }
            <div class="text-[11px] text-gray-400 mt-2">상태: ${statusLabel(
              ev.status || "open"
            )}</div>
            <div class="flex gap-2 mt-2 text-sm text-gray-600"><span class="px-2 py-0.5 rounded ${typeBadgeClass(
              ev.type
            )}">${typeLabel(ev.type)}</span></div>
            ${adminFullTableHTML(ev)}
            ${adminInline(ev)}
          </div>`;
}

function tastingCardHTML(ev) {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  const totalParticipants = (ev.restaurants || []).reduce(
    (sum, r) => sum + (r.reservations || []).length,
    0
  );
  const totalWaiting = (ev.restaurants || []).reduce(
    (sum, r) => sum + (r.waiting || []).length,
    0
  );

  // 회비 정보
  const paymentInfo = paymentInfoHTML(ev);

  // 취소 안내 (한 번만 표시)
  const cancelGuideHTML = `
    <div class="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
      <div class="text-sm font-semibold text-blue-800 mb-2">📋 취소 안내</div>
      <div class="text-sm text-blue-700 space-y-1">
        <p>• 신청 취소를 원하시면 마감 시간 전에 신청 취소 버튼을 눌러주세요.</p>
        <p>• 마감 이후 취소를 원하시면 운영진에게 문의해주세요.</p>
      </div>
    </div>
  `;

  // 식당 카드들 - 세로로 나열
  const restaurantCards = (ev.restaurants || []).map((r, index) => {
    const cap = r.capacity ?? ev.limit ?? 0;
    const cnt = (r.reservations || []).length;
    const waitCnt = (r.waiting || []).length;
    const mine = (r.reservations || [])
      .concat(r.waiting || [])
      .some((p) => p.studentId === state.currentUser?.studentId);
    
    const btn = mine
      ? `<button type="button" class="w-full mt-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg transition-colors" data-act="cancel-tasting" data-id="${ev.id}" data-rid="${r.id}">
          <i class="fas fa-times-circle mr-2"></i>신청 취소
        </button>`
      : `<button type="button" class="w-full mt-auto ${
          cnt < cap
            ? "bg-green-600 hover:bg-green-700"
            : "bg-amber-500 hover:bg-amber-600"
        } text-white font-bold py-2.5 rounded-lg transition-colors" data-act="reserve-tasting" data-id="${
          ev.id
        }" data-rid="${r.id}">
          <i class="fas fa-${cnt < cap ? "check" : "clock"} mr-2"></i>${
          cnt < cap ? "활동 신청" : "대기 신청"
        }
        </button>`;

    const namesList = (r.reservations || [])
      .slice()
      .reverse()
      .map(
        (a) =>
          `<div class="flex items-center justify-between py-1 px-2 hover:bg-gray-100 rounded">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="font-mono text-[11px] text-gray-500 whitespace-nowrap">${
                a.studentId ? `${a.studentId.slice(0, 4)}****` : ""
              }</span>
              <span class="text-xs truncate">${saf(a.name)}</span>
            </div>
            ${isAdmin ? `<button type="button" class="text-red-500 hover:text-red-700 text-xs" title="제거"><i class="fas fa-times"></i></button>` : ""}
          </div>`
      )
      .join("");
    
    const waitingList = (r.waiting || [])
      .slice()
      .reverse()
      .map(
        (a) =>
          `<div class="flex items-center justify-between py-1 px-2 hover:bg-amber-50 rounded">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="font-mono text-[11px] text-amber-600 whitespace-nowrap">${
                a.studentId ? `${a.studentId.slice(0, 4)}****` : ""
              }</span>
              <span class="text-xs truncate text-amber-700">${saf(a.name)}</span>
            </div>
            ${isAdmin ? `<button type="button" class="text-red-500 hover:text-red-700 text-xs" title="제거"><i class="fas fa-times"></i></button>` : ""}
          </div>`
      )
      .join("");

    const participantsSectionId = `participants-${ev.id}-${r.id}`;
    const showParticipantsBtnId = `show-participants-${ev.id}-${r.id}`;

    return `<div class="bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div class="flex flex-col md:flex-row gap-4 p-4">
        <!-- 식당 이미지 -->
        <div class="md:w-1/3 flex-shrink-0">
          ${
            r.imageUrl
              ? `<div class="relative w-full h-40 md:h-full min-h-[160px] overflow-hidden rounded-lg">
                  <img src="${saf(r.imageUrl)}" alt="${saf(
                r.name
              )}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                  <div class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-bold text-gray-800">
                    ${cnt}/${cap}명
                  </div>
                </div>`
              : `<div class="w-full h-40 md:h-full min-h-[160px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <i class="fas fa-utensils text-4xl text-gray-400"></i>
                </div>`
          }
        </div>
        
        <!-- 식당 정보 -->
        <div class="flex-1 flex flex-col">
          <div class="mb-3">
            <h4 class="text-xl font-bold text-gray-800 mb-1">${saf(r.name)}</h4>
            <p class="text-sm text-gray-600">${saf(r.info || "")}</p>
          </div>

          <!-- 진행률 바 -->
          <div class="mb-3">
            <div class="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>신청: ${cnt}/${cap}명</span>
              <span class="text-amber-600">${waitCnt > 0 ? `대기: ${waitCnt}명` : ""}</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div class="bg-green-500 h-3 rounded-full transition-all" style="width:${
                cap ? Math.min(100, Math.round((cnt / cap) * 100)) : 0
              }%"></div>
            </div>
          </div>

          <!-- 참가자 목록 (관리자 또는 토글 가능) -->
          ${cnt > 0 || waitCnt > 0 || isAdmin
            ? `
          <div class="mb-3">
            <button type="button" id="${showParticipantsBtnId}" class="w-full text-left text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg transition-colors border border-gray-200">
              <span><i class="fas fa-users mr-2"></i>참가자 ${cnt > 0 ? `(${cnt}명)` : ""} ${waitCnt > 0 ? `· 대기 ${waitCnt}명` : ""}</span>
              <i class="fas fa-chevron-down text-xs transition-transform" id="chevron-${participantsSectionId}"></i>
            </button>
            <div id="${participantsSectionId}" class="hidden mt-2 space-y-2">
              ${cnt > 0
                ? `<div class="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto border border-gray-200">
                    ${namesList || '<div class="text-xs text-gray-400 text-center py-2">참가자 없음</div>'}
                  </div>`
                : ""}
              ${waitCnt > 0
                ? `<div class="bg-amber-50 rounded-lg p-3 max-h-32 overflow-y-auto border border-amber-200">
                    <div class="text-xs text-amber-700 font-semibold mb-2">대기자</div>
                    ${waitingList}
                    <div class="text-xs text-amber-600 mt-2">※ 자리가 비면 자동으로 대기 → 참가로 전환됩니다</div>
                  </div>`
                : ""}
            </div>
          </div>
          `
            : ""}

          <!-- 신청/취소 버튼 -->
          <div class="mt-auto">
            ${btn}
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  return `<div class="section card-hover ${typeAccentClass(ev.type)}">
    <!-- 헤더 -->
    <div class="mb-4">
      <div class="flex items-start justify-between mb-2">
        <div class="flex-1">
          <h3 class="text-2xl font-bold text-gray-800 mb-1">${saf(ev.title)}</h3>
          <p class="text-gray-600 flex items-center gap-2">
            <i class="fas fa-calendar-alt"></i>
            <span>${ev.datetime ? new Date(ev.datetime).toLocaleString("ko-KR") : "-"}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-3 py-1 rounded-full text-xs font-semibold ${typeBadgeClass(
            ev.type
          )}">${typeLabel(ev.type)}</span>
          <span class="text-xs text-gray-400">${statusLabel(ev.status || "open")}</span>
        </div>
      </div>
    </div>

    <!-- 회비 정보 -->
    ${paymentInfo}

    <!-- 전체 통계 (관리자) -->
    ${adminStatsHTML(ev)}

    <!-- 식당 카드들 - 세로 나열 -->
    <div class="space-y-4 mt-4">
      ${restaurantCards}
    </div>

    <!-- 전체 참가자 통계 -->
    <div class="mt-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-700">
          <i class="fas fa-users mr-2"></i>전체 참가자: ${totalParticipants}명
          ${totalWaiting > 0 ? `· 대기: ${totalWaiting}명` : ""}
        </span>
      </div>
    </div>

    <!-- 취소 안내 (한 번만) -->
    ${cancelGuideHTML}

    <!-- 관리자 액션 버튼 -->
    ${adminInline(ev)}

    <!-- 관리자 전용 상세 테이블 (MT/총회인 경우) -->
    ${adminFullTableHTML(ev)}
  </div>`;
}

function adminFullTableHTML(ev) {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (!isAdmin || !(ev.type === "mt" || ev.type === "assembly")) return "";
  const header = `<thead class="text-gray-700 table-sticky"><tr>
      <th class="px-2 py-1 text-left">이름</th><th class="px-2 py-1 text-left">학번</th><th class="px-2 py-1 text-left">성별</th>
      <th class="px-2 py-1 text-left">학년</th><th class="px-2 py-1 text-left">단과대</th><th class="px-2 py-1 text-left">학과</th><th class="px-2 py-1 text-left">전화번호</th>
    </tr></thead>`;
  const rows = (ev.applicants || [])
    .map(
      (m) => `<tr class="border-t">
      <td class="px-2 py-1">${saf(m.name || "")}</td>
      <td class="px-2 py-1 font-mono">${saf(m.studentId || "")}</td>
      <td class="px-2 py-1">${saf(m.gender || "")}</td>
      <td class="px-2 py-1">${saf(m.year || "")}</td>
      <td class="px-2 py-1">${saf(m.college || "")}</td>
      <td class="px-2 py-1">${saf(m.department || "")}</td>
      <td class="px-2 py-1">${saf(m.phone || "")}</td>
    </tr>`
    )
    .join("");
  const body =
    rows ||
    `<tr><td class="px-2 py-6 text-center text-gray-400" colspan="7">신청자 없음</td></tr>`;
  const toolbar = `<div class="flex items-center justify-between mb-2">
      <div class="text-xs font-semibold text-gray-700">관리자 전용 • 참가자 상세</div>
      <button type="button" class="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded" data-act="export-xlsx" data-id="${ev.id}">
        <i class="fas fa-file-excel mr-1"></i>명단 다운로드
      </button>
    </div>`;
  return `<div class="mt-4 border-t pt-3">${toolbar}<div class="overflow-auto max-h-60 border rounded">
      <table class="min-w-full text-xs">${header}<tbody>${body}</tbody></table></div></div>`;
}

export function eventCardHTML(ev) {
  return ev.type === "tasting" ? tastingCardHTML(ev) : generalCardHTML(ev);
}

/* ===== 관리자 패널(신청하기 탭 상단) ===== */
export function adminEventsPanelHTML() {
  return `<div class="section">
    <h3 class="text-2xl font-bold text-gray-800 mb-1">이벤트·미식회 생성</h3>
    <p class="text-xs text-gray-500 mb-4">유형을 선택하고 제목/일시/정원 등을 입력한 후 저장하세요. 미식회는 식당(게이트)을 1개 이상 추가해야 합니다.</p>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
      <select id="event-type" class="px-3 py-2 border rounded-lg" title="이벤트 유형을 선택하세요">
        <option value="tasting">미식회</option>
        <option value="general">일반 이벤트</option>
        <option value="mt">MT</option>
        <option value="assembly">총회</option>
      </select>
      <input id="event-title" type="text" placeholder="제목" class="px-3 py-2 border rounded-lg md:col-span-2" title="이벤트 제목을 입력하세요">
      <input id="event-datetime" type="datetime-local" class="px-3 py-2 border rounded-lg" title="이벤트 일시를 입력하세요">
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-1">
      <input id="event-limit" type="number" min="1" placeholder="(기본) 정원" class="px-3 py-2 border rounded-lg">
      <select id="event-status" class="px-3 py-2 border rounded-lg" title="목록에서 숨기려면 숨김을 선택">
        <option value="open">공개</option>
        <option value="archived">숨김</option>
      </select>
      <div class="text-xs text-gray-600 flex items-center">* "숨김"은 사용자 목록에서 보이지 않습니다.</div>
    </div>

    <div id="payment-fields" class="hidden mt-2">
      <h4 class="font-semibold text-indigo-700 mb-1">회비 입금 정보 (MT/총회)</h4>
      <p class="text-xs text-gray-600 mb-2">관리자 설정의 회비/계좌 정보를 기본으로 불러옵니다. 필요 시 수정하세요.</p>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input id="pay-bank" type="text" class="px-3 py-2 border rounded" placeholder="은행명 (예: 국민)">
        <input id="pay-number" type="text" class="px-3 py-2 border rounded" placeholder="계좌번호">
        <input id="pay-holder" type="text" class="px-3 py-2 border rounded" placeholder="예금주">
        <input id="pay-note" type="text" class="px-3 py-2 border rounded" placeholder="안내 문구(선택)">
      </div>
    </div>

    <div id="tasting-fields" class="mt-3">
      <h4 class="font-semibold text-indigo-700 mb-1">식당(게이트) 관리</h4>
      <p class="text-xs text-gray-600 mb-2">각 식당에 대한 이름/정보/정원을 입력하고, 이미지는 파일 선택 또는 드래그&드롭으로 업로드하세요.</p>
      <div id="event-restaurants-wrap" class="space-y-2">${restaurantFieldHTML()}</div>
      <button id="add-restaurant-btn" type="button" class="mt-2 text-xs bg-white border border-indigo-300 text-indigo-700 px-3 py-1 rounded hover:bg-indigo-50">
        <i class="fas fa-plus mr-1"></i>식당 추가
      </button>
    </div>

    <div class="flex gap-2 mt-4">
      <button id="save-event-btn" type="button" class="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">생성/저장</button>
      <button id="reset-event-btn" type="button" class="flex-1 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700">폼 초기화</button>
    </div>

    <hr class="my-4">
    <h4 class="font-semibold text-gray-700 mb-1">현재 이벤트</h4>
    <p class="text-xs text-gray-600 mb-2">아래 목록에서 수정/보관/재게시/삭제가 가능합니다.</p>
    <div class="space-y-2">${adminEventsListHTML()}</div>
  </div>`;
}
export function bindAdminEventsPanel() {
  const wrap = document.getElementById("event-restaurants-wrap");
  document
    .getElementById("event-type")
    ?.addEventListener("change", (e) => onTypeChange(e.target.value));
  document
    .getElementById("add-restaurant-btn")
    ?.addEventListener("click", () => addRestaurantField());
  wrap?.addEventListener("click", (e) => {
    const row = e.target.closest(".restaurant-row");
    if (!row) return;
    if (e.target.closest(".remove-restaurant")) row.remove();
    if (e.target.closest(".select-image") || e.target.closest(".dz"))
      row.querySelector("[data-role='file']").click();
  });
  wrap?.addEventListener("change", (e) => {
    if (e.target.matches("input[type='file'][data-role='file']")) {
      const row = e.target.closest(".restaurant-row");
      const f = e.target.files?.[0];
      e.target.value = "";
      if (f) uploadRestaurantImage(row, f);
    }
  });
  ["dragenter", "dragover"].forEach((evt) => {
    wrap?.addEventListener(evt, (e) => {
      const dz = e.target.closest(".dz");
      if (dz) {
        e.preventDefault();
        dz.classList.add("drag");
      }
    });
  });
  ["dragleave", "drop"].forEach((evt) => {
    wrap?.addEventListener(evt, (e) => {
      const dz = e.target.closest(".dz");
      if (dz) {
        e.preventDefault();
        dz.classList.remove("drag");
      }
    });
  });
  wrap?.addEventListener("drop", (e) => {
    const dz = e.target.closest(".dz");
    if (!dz) return;
    const row = dz.closest(".restaurant-row");
    const f = e.dataTransfer.files?.[0];
    if (f) uploadRestaurantImage(row, f);
  });
  document
    .getElementById("save-event-btn")
    ?.addEventListener("click", () => createOrSaveEvent());
  document
    .getElementById("reset-event-btn")
    ?.addEventListener("click", () => resetEventForm());
  onTypeChange(document.getElementById("event-type")?.value || "tasting");
}
function restaurantFieldHTML(n = "", i = "", c = "", url = "", id = "") {
  const rid = id || `res_${Math.random().toString(36).slice(2, 9)}`;
  return `<div class="restaurant-row flex items-start gap-2 md:gap-3" data-id="${rid}">
    <div class="relative">
      <img src="${saf(url || "")}" class="thumb ${
    url ? "" : "hidden"
  }" data-role="preview" alt="preview">
      <div class="dz ${url ? "hidden" : ""}" data-role="dropzone">이미지</div>
      <div class="dz-overlay hidden" data-role="uploading">업로드중…</div>
    </div>
    <div class="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
      <input data-field="name" type="text" value="${saf(
        n
      )}" placeholder="식당 이름" class="px-3 py-2 border rounded">
      <input data-field="info" type="text" value="${saf(
        i
      )}" placeholder="식당 정보" class="px-3 py-2 border rounded md:col-span-2">
      <div class="flex items-center gap-2">
        <button type="button" class="select-image bg-white border px-2 py-2 rounded text-xs">파일 선택</button>
        <input type="file" accept="image/*" class="hidden" data-role="file">
        <input data-field="imageUrl" type="text" value="${saf(
          url
        )}" placeholder="이미지 URL(선택)" class="px-3 py-2 border rounded flex-1 md:hidden">
      </div>
      <input data-field="capacity" type="number" min="1" value="${saf(
        c
      )}" placeholder="정원" class="px-3 py-2 border rounded w-full md:w-24">
    </div>
    <button type="button" class="remove-restaurant text-red-600 hover:text-red-800"><i class="fas fa-trash"></i></button>
  </div>`;
}
function onTypeChange(type) {
  document
    .getElementById("tasting-fields")
    ?.classList.toggle("hidden", type !== "tasting");
  document
    .getElementById("payment-fields")
    ?.classList.toggle("hidden", !(type === "mt" || type === "assembly"));
  if (type === "mt" || type === "assembly") {
    const d = state.duesSettings || {};
    if (!document.getElementById("pay-bank").value)
      document.getElementById("pay-bank").value = d.bank || "";
    if (!document.getElementById("pay-number").value)
      document.getElementById("pay-number").value = d.number || "";
    if (!document.getElementById("pay-holder").value)
      document.getElementById("pay-holder").value = d.holder || "";
    if (!document.getElementById("pay-note").value)
      document.getElementById("pay-note").value =
        (d.amount ? `회비 ${formatKRW(d.amount)} ` : "") + (d.note || "");
  }
}
function adminEventsListHTML() {
  if (state.eventsData.length === 0) return `<p class="text-gray-500">없음</p>`;
  return state.eventsData
    .map((ev) => {
      const when = ev.datetime
        ? new Date(ev.datetime).toLocaleString("ko-KR")
        : "-";
      const badge = typeBadgeClass(ev.type);
      return `<div class="flex items-center justify-between bg-white p-3 rounded border">
      <div class="min-w-0">
        <span class="text-sm px-2 py-0.5 rounded ${badge}">${typeLabel(
        ev.type
      )}</span>
        <span class="font-semibold ml-2">${saf(
          ev.title || "(제목 없음)"
        )}</span>
        <span class="text-sm text-gray-500 ml-2">(${when})</span>
        <span class="text-xs ml-2 px-2 py-0.5 rounded ${
          ev.status === "open"
            ? "bg-green-100 text-green-700"
            : "bg-gray-200 text-gray-700"
        }">${statusLabel(ev.status || "open")}</span>
      </div>
      <div class="flex gap-2">
        <button type="button" class="text-blue-600 hover:text-blue-800" data-act="admin-edit" data-id="${
          ev.id
        }" title="수정"><i class="fas fa-pen"></i></button>
        <button type="button" class="text-amber-600 hover:text-amber-800" data-act="admin-archive" data-id="${
          ev.id
        }" title="보관(숨김)"><i class="fas fa-box-archive"></i></button>
        <button type="button" class="text-green-700 hover:text-green-900" data-act="admin-unarchive" data-id="${
          ev.id
        }" title="재게시"><i class="fas fa-rotate-left"></i></button>
        <button type="button" class="text-red-600 hover:text-red-800" data-act="admin-delete" data-id="${
          ev.id
        }" title="삭제"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
    })
    .join("");
}
export const addRestaurantField = () =>
  document
    .getElementById("event-restaurants-wrap")
    ?.insertAdjacentHTML("beforeend", restaurantFieldHTML());

/* 이미지 업로드 */
async function uploadRestaurantImage(row, file) {
  if (!state.currentUser) return showAlert("😥", "로그인이 필요합니다.");
  if (!file || !file.type.startsWith("image/"))
    return showAlert("ℹ️", "이미지 파일만 업로드 가능합니다.");
  const overlay = row.querySelector("[data-role='uploading']");
  overlay.classList.remove("hidden");
  try {
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `event-images/${
      state.currentUser.studentId
    }/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const ref = sRef(storage, path);
    const task = uploadBytesResumable(ref, file);
    await new Promise((resolve, reject) => {
      task.on("state_changed", null, reject, () => resolve());
    });
    const url = await getDownloadURL(task.snapshot.ref);
    row.querySelector("[data-field='imageUrl']").value = url;
    const img = row.querySelector("[data-role='preview']");
    img.src = url;
    img.classList.remove("hidden");
    row.querySelector("[data-role='dropzone']").classList.add("hidden");
    showAlert("✅", "이미지 업로드 완료!");
  } catch (err) {
    console.warn(err);
    showAlert("😥", "이미지 업로드 실패. 권한/네트워크를 확인해주세요.");
  } finally {
    overlay.classList.add("hidden");
  }
}

/* 회원 프로필 */
async function getCurrentMemberProfile() {
  try {
    if (!state.currentUser?.studentId) return {};
    const snap = await getDoc(doc(db, "members", state.currentUser.studentId));
    return snap.exists() ? snap.data() || {} : {};
  } catch {
    return {};
  }
}
const pickProfileFields = (p = {}) => ({
  gender: p.gender || "",
  year: p.year || "",
  college: p.college || "",
  department: p.department || "",
  phone: p.phone || "",
});

/* 신청 */
export async function reserveGeneral(id) {
  if (!state.currentUser) return showAlert("😥", "로그인이 필요합니다.");
  const prof = pickProfileFields(await getCurrentMemberProfile());
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "events", id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("not found");
      const ev = snap.data();
      ev.applicants ??= [];
      ev.waiting ??= [];
      if (isUserIn([...ev.applicants, ...ev.waiting])) return;
      const entry = {
        ...state.currentUser,
        ...prof,
        timestamp: new Date().toISOString(),
      };
      const lim = parseInt(ev.limit || 0, 10) || 0;
      if (lim === 0 || ev.applicants.length < lim) ev.applicants.push(entry);
      else ev.waiting.push(entry);
      tx.update(ref, { applicants: ev.applicants, waiting: ev.waiting });
    });
    showAlert("✅", "신청 완료!");
  } catch {
    showAlert("😥", "신청 실패");
  }
}
export async function cancelGeneral(id) {
  if (!state.currentUser) return;
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "events", id);
      const snap = await tx.get(ref);
      const ev = snap.data();
      ev.applicants ??= [];
      ev.waiting ??= [];
      const before = ev.applicants.length;
      ev.applicants = ev.applicants.filter(
        (p) => p.studentId !== state.currentUser.studentId
      );
      if (ev.applicants.length < before) {
        if (ev.waiting.length > 0) ev.applicants.push(ev.waiting.shift());
      } else
        ev.waiting = ev.waiting.filter(
          (p) => p.studentId !== state.currentUser.studentId
        );
      tx.update(ref, { applicants: ev.applicants, waiting: ev.waiting });
    });
    showAlert("🗑️", "신청 취소됨");
  } catch {
    showAlert("😥", "취소 실패");
  }
}
export async function reserveTasting(id, rid) {
  if (!state.currentUser) return showAlert("😥", "로그인이 필요합니다.");
  const prof = pickProfileFields(await getCurrentMemberProfile());
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "events", id);
      const snap = await tx.get(ref);
      const ev = snap.data();
      ev.restaurants ??= [];
      const already = ev.restaurants.some((r) =>
        (r.reservations || [])
          .concat(r.waiting || [])
          .some((p) => p.studentId === state.currentUser.studentId)
      );
      if (already) throw new Error("DUP");
      const idx = ev.restaurants.findIndex((r) => r.id === rid);
      if (idx === -1) throw new Error("restaurant not found");
      const r = ev.restaurants[idx];
      r.reservations ??= [];
      r.waiting ??= [];
      const cap = r.capacity ?? ev.limit ?? 0;
      const entry = {
        ...state.currentUser,
        ...prof,
        timestamp: new Date().toISOString(),
      };
      if (r.reservations.length < cap) r.reservations.push(entry);
      else r.waiting.push(entry);
      ev.restaurants[idx] = r;
      tx.update(ref, { restaurants: ev.restaurants });
    });
    showAlert("✅", "처리되었습니다.");
  } catch (e) {
    if (String(e?.message).includes("DUP"))
      showAlert(
        "🙂",
        "이미 다른 식당에 신청(또는 대기)되어 있어요.<br><b>한 번에 한 식당만</b> 선택할 수 있습니다."
      );
    else showAlert("😥", "신청 실패");
  }
}
export async function cancelTasting(id, rid) {
  if (!state.currentUser) return;
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "events", id);
      const snap = await tx.get(ref);
      const ev = snap.data();
      ev.restaurants ??= [];
      const idx = ev.restaurants.findIndex((r) => r.id === rid);
      if (idx === -1) throw new Error("restaurant not found");
      const r = ev.restaurants[idx];
      r.reservations ??= [];
      r.waiting ??= [];
      const before = r.reservations.length;
      r.reservations = r.reservations.filter(
        (p) => p.studentId !== state.currentUser.studentId
      );
      if (r.reservations.length < before) {
        if (r.waiting.length > 0) r.reservations.push(r.waiting.shift());
      } else
        r.waiting = r.waiting.filter(
          (p) => p.studentId !== state.currentUser.studentId
        );
      ev.restaurants[idx] = r;
      tx.update(ref, { restaurants: ev.restaurants });
    });
    showAlert("🗑️", "취소되었습니다.");
  } catch {
    showAlert("😥", "취소 실패");
  }
}

/* 저장/수정/보관/삭제/재게시 */
export async function createOrSaveEvent() {
  const type = document.getElementById("event-type").value;
  const title = document.getElementById("event-title").value.trim();
  const datetime = document.getElementById("event-datetime").value;
  const limit = parseInt(document.getElementById("event-limit").value, 10) || 0;
  const status = document.getElementById("event-status").value;
  if (!type || !title || !datetime || !limit)
    return showAlert("😥", "타입/제목/일시/정원을 모두 입력해주세요.");

  let payment = null;
  if (type === "mt" || type === "assembly") {
    const b = document.getElementById("pay-bank").value.trim();
    const n = document.getElementById("pay-number").value.trim();
    const h = document.getElementById("pay-holder").value.trim();
    const note = document.getElementById("pay-note").value.trim();
    const d = state.duesSettings || {};
    payment = {
      bank: b || d.bank || "",
      number: n || d.number || "",
      holder: h || d.holder || "",
      note:
        note ||
        (d.amount ? `회비 ${formatKRW(d.amount)} ` : "") + (d.note || ""),
    };
  }
  try {
    if (!state.editingEventId) {
      if (type === "tasting") {
        const rows = [
          ...document.querySelectorAll(
            "#event-restaurants-wrap .restaurant-row"
          ),
        ];
        const restaurants = rows
          .map((row) => ({
            id: row.getAttribute("data-id"),
            name: row.querySelector("[data-field='name']").value.trim(),
            info: row.querySelector("[data-field='info']").value.trim(),
            imageUrl:
              row.querySelector("[data-field='imageUrl']")?.value.trim() || "",
            capacity:
              parseInt(
                row.querySelector("[data-field='capacity']").value,
                10
              ) || limit,
            reservations: [],
            waiting: [],
          }))
          .filter((r) => r.name && r.capacity > 0);
        if (restaurants.length === 0)
          return showAlert("😥", "식당을 최소 1개 이상 추가해주세요.");
        await addDoc(collection(db, "events"), {
          type,
          title,
          datetime,
          limit,
          status,
          restaurants,
        });
      } else {
        const base = {
          type,
          title,
          datetime,
          limit,
          status,
          applicants: [],
          waiting: [],
        };
        if (payment) base.payment = payment;
        await addDoc(collection(db, "events"), base);
      }
      showAlert("🎉", "이벤트가 생성되었습니다.");
    } else {
      const ref = doc(db, "events", state.editingEventId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error("not found");
      const prev = snap.data();
      if (type === "tasting") {
        const map = new Map((prev.restaurants || []).map((r) => [r.id, r]));
        const rows = [
          ...document.querySelectorAll(
            "#event-restaurants-wrap .restaurant-row"
          ),
        ];
        const restaurants = rows
          .map((row) => {
            const idAttr = row.getAttribute("data-id");
            const old = map.get(idAttr);
            return {
              id: idAttr,
              name: row.querySelector("[data-field='name']").value.trim(),
              info: row.querySelector("[data-field='info']").value.trim(),
              imageUrl:
                row.querySelector("[data-field='imageUrl']")?.value.trim() ||
                "",
              capacity:
                parseInt(
                  row.querySelector("[data-field='capacity']").value,
                  10
                ) || limit,
              reservations: old?.reservations || [],
              waiting: old?.waiting || [],
            };
          })
          .filter((r) => r.name && r.capacity > 0);
        await updateDoc(ref, {
          type,
          title,
          datetime,
          limit,
          status,
          restaurants,
        });
      } else {
        const payload = { type, title, datetime, limit, status };
        if (payment) payload.payment = payment;
        await updateDoc(ref, payload);
      }
      showAlert("✅", "이벤트가 수정되었습니다.");
    }
    resetEventForm();
  } catch {
    showAlert("😥", "저장 중 오류가 발생했습니다.");
  }
}
export function resetEventForm() {
  state.editingEventId = null;
  const t = document.getElementById("event-type");
  if (t) t.value = "tasting";
  [
    "event-title",
    "event-datetime",
    "event-limit",
    "pay-bank",
    "pay-number",
    "pay-holder",
    "pay-note",
  ].forEach((i) => {
    const x = document.getElementById(i);
    if (x) x.value = "";
  });
  const st = document.getElementById("event-status");
  if (st) st.value = "open";
  document.getElementById("tasting-fields")?.classList.remove("hidden");
  document.getElementById("payment-fields")?.classList.add("hidden");
  const wrap = document.getElementById("event-restaurants-wrap");
  if (wrap) wrap.innerHTML = restaurantFieldHTML();
}
export function loadEventToForm(id) {
  const ev = state.eventsData.find((e) => e.id === id);
  if (!ev) return;
  state.editingEventId = id;
  document.getElementById("event-type").value = ev.type;
  document.getElementById("event-title").value = ev.title || "";
  document.getElementById("event-datetime").value = ev.datetime || "";
  document.getElementById("event-limit").value = ev.limit || "";
  document.getElementById("event-status").value = ev.status || "open";
  onTypeChange(ev.type);
  const p = ev.payment || {};
  document.getElementById("pay-bank").value = p.bank || "";
  document.getElementById("pay-number").value = p.number || "";
  document.getElementById("pay-holder").value = p.holder || "";
  document.getElementById("pay-note").value = p.note || "";
  const wrap = document.getElementById("event-restaurants-wrap");
  if (ev.type === "tasting") {
    wrap.innerHTML =
      (ev.restaurants || [])
        .map((r) =>
          restaurantFieldHTML(
            r.name || "",
            r.info || "",
            r.capacity || "",
            r.imageUrl || "",
            r.id || ""
          )
        )
        .join("") || restaurantFieldHTML();
  } else {
    wrap.innerHTML = restaurantFieldHTML();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
export async function archiveEvent(id) {
  try {
    await updateDoc(doc(db, "events", id), { status: "archived" });
    showAlert("📦", "보관(숨김) 처리되었습니다.");
  } catch {
    showAlert("😥", "보관 처리 실패");
  }
}
export async function unarchiveEvent(id) {
  try {
    await updateDoc(doc(db, "events", id), { status: "open" });
    showAlert("✅", "재게시되었습니다.");
  } catch {
    showAlert("😥", "재게시 실패");
  }
}
export async function deleteEvent(id) {
  if (!confirm("정말로 삭제하시겠어요? 이 작업은 되돌릴 수 없습니다.")) return;
  try {
    await deleteDoc(doc(db, "events", id));
    showAlert("🗑️", "삭제되었습니다.");
  } catch {
    showAlert("😥", "삭제 실패");
  }
}
export async function exportApplicantsXLSX(id) {
  try {
    const ev = state.eventsData.find((e) => e.id === id);
    if (!ev) return showAlert("😥", "이벤트를 찾을 수 없습니다.");
    let rows = [],
      header = [];
    if (ev.type === "tasting") {
      header = [
        "구분",
        "식당",
        "이름",
        "학번",
        "성별",
        "학년",
        "단과대",
        "학과",
        "전화번호",
        "비고",
      ];
      (ev.restaurants || []).forEach((r) => {
        (r.reservations || []).forEach((p) =>
          rows.push({
            구분: "참가",
            식당: r.name || "",
            이름: p.name || "",
            학번: p.studentId || "",
            성별: p.gender || "",
            학년: p.year || "",
            단과대: p.college || "",
            학과: p.department || "",
            전화번호: p.phone || "",
            비고: "",
          })
        );
        (r.waiting || []).forEach((p) =>
          rows.push({
            구분: "대기",
            식당: r.name || "",
            이름: p.name || "",
            학번: p.studentId || "",
            성별: p.gender || "",
            학년: p.year || "",
            단과대: p.college || "",
            학과: p.department || "",
            전화번호: p.phone || "",
            비고: "",
          })
        );
      });
    } else if (ev.type === "mt" || ev.type === "assembly") {
      header = [
        "구분",
        "이름",
        "학번",
        "성별",
        "학년",
        "단과대",
        "학과",
        "전화번호",
        "비고",
      ];
      (ev.applicants || []).forEach((p) =>
        rows.push({
          구분: "참가",
          이름: p.name || "",
          학번: p.studentId || "",
          성별: p.gender || "",
          학년: p.year || "",
          단과대: p.college || "",
          학과: p.department || "",
          전화번호: p.phone || "",
          비고: "",
        })
      );
      (ev.waiting || []).forEach((p) =>
        rows.push({
          구분: "대기",
          이름: p.name || "",
          학번: p.studentId || "",
          성별: p.gender || "",
          학년: p.year || "",
          단과대: p.college || "",
          학과: p.department || "",
          전화번호: p.phone || "",
          비고: "",
        })
      );
    } else {
      header = [
        "구분",
        "이름",
        "학번",
        "성별",
        "학년",
        "단과대",
        "학과",
        "전화번호",
        "비고",
      ];
      (ev.applicants || []).forEach((p) =>
        rows.push({
          구분: "참가",
          이름: p.name || "",
          학번: p.studentId || "",
          성별: p.gender || "",
          학년: p.year || "",
          단과대: p.college || "",
          학과: p.department || "",
          전화번호: p.phone || "",
          비고: "",
        })
      );
      (ev.waiting || []).forEach((p) =>
        rows.push({
          구분: "대기",
          이름: p.name || "",
          학번: p.studentId || "",
          성별: p.gender || "",
          학년: p.year || "",
          단과대: p.college || "",
          학과: p.department || "",
          전화번호: p.phone || "",
          비고: "",
        })
      );
    }
    if (rows.length === 0)
      rows = [
        {
          구분: "-",
          이름: "-",
          학번: "-",
          성별: "-",
          학년: "-",
          단과대: "-",
          학과: "-",
          전화번호: "-",
          비고: "",
        },
      ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { header });
    XLSX.utils.book_append_sheet(wb, ws, "명단");
    const fname = `${ev.title || "event"}_명단.xlsx`;
    XLSX.writeFile(wb, fname);
  } catch (e) {
    console.warn(e);
    showAlert("😥", "다운로드 실패");
  }
}
