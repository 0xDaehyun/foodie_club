// 이벤트 상세 모달 모듈
// 버전: 2025-01-27

import { state } from "../../state.js";
import { showAlert, saf } from "../../utils.js";
import { db, doc, getDoc, updateDoc, deleteDoc } from "../../firebase.js";

// 유틸리티 함수들
const formatKRW = (n) => {
  const v = Number(n || 0);
  return isNaN(v) ? "" : v.toLocaleString("ko-KR") + "원";
};

const formatDateTimeLocal = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 달력 이벤트 상세 정보 표시 함수 (roadmapData용)
export function showEventDetails(eventId) {
  const { roadmapData, currentUser, adminList } = state;

  // 기존 모달이 있으면 먼저 제거
  const existingModal = document.getElementById("event-detail-modal");
  if (existingModal) {
    existingModal.remove();
  }

  const event = roadmapData.find((item) => item.id === eventId);
  if (!event) return;

  // parseDate와 getTodayString은 전역 함수로 접근
  const activityDate =
    event.activityDate ||
    (typeof window.getTodayString === "function"
      ? window.getTodayString()
      : new Date().toISOString().slice(0, 10));
  const d =
    typeof window.parseDate === "function"
      ? window.parseDate(activityDate)
      : new Date(activityDate);

  const formattedDate = d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const title = event.activityName || event.title || "일정 없음";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let statusText = "";
  let statusClass = "";
  if (d < today) {
    statusText = "완료된 일정";
    statusClass = "text-red-600";
  } else if (d.getTime() === today.getTime()) {
    statusText = "오늘의 일정";
    statusClass = "text-green-600";
  } else {
    statusText = "예정된 일정";
    statusClass = "text-orange-600";
  }

  const modalHTML = `
          <div id="event-detail-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                  <h3 class="text-xl font-bold text-gray-800">일정 상세 정보</h3>
                  <button onclick="if(typeof window.closeEventDetailModal === 'function') window.closeEventDetailModal();" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                  </button>
                </div>

                <div class="space-y-4">
                  <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-800 mb-2">${saf(title)}</h4>
                    <div class="flex items-center gap-2 text-sm">
                      <i class="fas fa-calendar text-orange-500"></i>
                      <span class="text-gray-600">${formattedDate}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm mt-2">
                      <i class="fas fa-info-circle text-blue-500"></i>
                      <span class="${statusClass} font-medium">${statusText}</span>
                    </div>
                  </div>

                  ${
                    event.description
                      ? `
                    <div class="bg-gray-50 rounded-lg p-4">
                      <h5 class="font-medium text-gray-700 mb-2">상세 설명</h5>
                      <p class="text-gray-600 text-sm whitespace-pre-wrap">${saf(
                        event.description
                      )}</p>
                    </div>
                  `
                      : ""
                  }

                  <div class="flex gap-2">
                    ${
                      currentUser &&
                      adminList.includes(currentUser.studentId)
                        ? `
                      <button onclick="if(typeof window.openRoadmapEventEditModal === 'function') window.openRoadmapEventEditModal('${eventId}', 0); if(typeof window.closeEventDetailModal === 'function') window.closeEventDetailModal();"
                              class="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-edit mr-2"></i>수정
                      </button>
                      <button onclick="if(typeof window.deleteRoadmapEvent === 'function') window.deleteRoadmapEvent('${eventId}'); if(typeof window.closeEventDetailModal === 'function') window.closeEventDetailModal();"
                              class="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
                        <i class="fas fa-trash mr-2"></i>삭제
                      </button>
                    `
                        : ""
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// 이벤트 상세 정보 표시 함수 (eventsData용)
export function showEventDetailModal(eventId) {
  const { eventsData, currentUser, membersData, adminList } = state;

  const ev = eventsData.find((e) => e.id === eventId);
  if (!ev) {
    showAlert("😥", "이벤트를 찾을 수 없습니다.");
    return;
  }

  // 기존 모달이 있으면 먼저 제거
  const existingModal = document.getElementById("event-detail-modal-main");
  if (existingModal) {
    existingModal.remove();
  }

  const eventDate = ev.datetime
    ? new Date(ev.datetime).toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "미정";

  const deadlineDate = ev.deadline
    ? new Date(ev.deadline).toLocaleString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "미설정";

  const typeLabel =
    ev.type === "tasting"
      ? "🍽️ 미식회"
      : ev.type === "mt"
      ? "🏕️ MT"
      : ev.type === "assembly"
      ? "🎤 총회"
      : "📅 이벤트";

  const sid = currentUser?.studentId;
  let myApplicationHTML = "";

  if (sid) {
    const defaultBadgeClass =
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold";
    const getDisplayName = (entry) => {
      if (!entry) return "익명";
      return (
        entry.name ||
        entry.displayName ||
        (entry.studentId && typeof window.maskStudentIdGlobal === "function"
          ? window.maskStudentIdGlobal(entry.studentId)
          : entry.studentId
          ? `${entry.studentId.slice(0, 4)}****`
          : "익명")
      );
    };

    const makeRow = (icon, label, content) => `
            <div class="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
              <i class="fas ${icon} text-blue-500 mt-0.5"></i>
              <div>
                <div class="text-[11px] text-blue-600">${label}</div>
                <div class="text-sm font-semibold text-gray-800 leading-snug">${content}</div>
              </div>
            </div>
          `;

    let myEntry = null;
    let myStatus = "";
    let myStatusClass = `${defaultBadgeClass} bg-blue-100 text-blue-700`;
    let myRestaurant = null;
    let waitPosition = null;
    let companions = [];

    if (ev.type === "tasting") {
      (ev.restaurants || []).some((restaurant) => {
        const reservations = restaurant.reservations || [];
        const waiting = restaurant.waiting || [];
        const reservationIdx = reservations.findIndex(
          (r) => r.studentId === sid
        );
        if (reservationIdx >= 0) {
          myEntry = reservations[reservationIdx];
          myStatus = "신청 확정";
          myRestaurant = restaurant;
          companions = reservations
            .filter((r) => r.studentId !== sid)
            .map((r) => getDisplayName(r));
          return true;
        }
        const waitingIdx = waiting.findIndex((r) => r.studentId === sid);
        if (waitingIdx >= 0) {
          myEntry = waiting[waitingIdx];
          myStatus = "대기중";
          myStatusClass = `${defaultBadgeClass} bg-yellow-100 text-yellow-700`;
          waitPosition = waitingIdx + 1;
          myRestaurant = restaurant;
          companions = waiting
            .filter((r) => r.studentId !== sid)
            .map((r) => getDisplayName(r));
          return true;
        }
        return false;
      });
    } else {
      const applicants = ev.applicants || [];
      const waiting = ev.waiting || [];
      const applicantIdx = applicants.findIndex((a) => a.studentId === sid);
      if (applicantIdx >= 0) {
        myEntry = applicants[applicantIdx];
        myStatus = "신청 확정";
        companions = applicants
          .filter((a) => a.studentId !== sid)
          .map((a) => getDisplayName(a));
      } else {
        const waitingIdx = waiting.findIndex((a) => a.studentId === sid);
        if (waitingIdx >= 0) {
          myEntry = waiting[waitingIdx];
          myStatus = "대기중";
          myStatusClass = `${defaultBadgeClass} bg-yellow-100 text-yellow-700`;
          waitPosition = waitingIdx + 1;
          companions = waiting
            .filter((a) => a.studentId !== sid)
            .map((a) => getDisplayName(a));
        }
      }
    }

    if (myEntry || myStatus) {
      companions = [...new Set(companions.filter((name) => !!name))];
      const applicantName =
        getDisplayName(myEntry) || currentUser?.name || "익명";
      const appliedAt =
        myEntry?.appliedAt ||
        myEntry?.applied_at ||
        myEntry?.timestamp ||
        myEntry?.createdAt;

      const infoRows = [];

      infoRows.push(
        makeRow(
          "fa-id-card",
          "신청자",
          `${saf(applicantName)} (${saf(sid)})`
        )
      );

      if (myStatus) {
        const statusBadge = `<span class="${myStatusClass}">${saf(
          myStatus
        )}${waitPosition ? ` (${waitPosition}번)` : ""}</span>`;
        infoRows.push(makeRow("fa-flag", "신청 상태", statusBadge));
      }

      if (appliedAt) {
        infoRows.push(
          makeRow(
            "fa-clock",
            "신청 일시",
            saf(formatDateTimeLocal(appliedAt))
          )
        );
      }

      if (myRestaurant) {
        const capacity =
          myRestaurant.capacity ??
          ev.limit ??
          myRestaurant.reservations?.length ??
          0;
        const reservedCount = myRestaurant.reservations?.length ?? 0;
        infoRows.push(
          makeRow(
            "fa-utensils",
            "신청 식당",
            `${saf(
              myRestaurant.name || "식당 미정"
            )} (${reservedCount}/${capacity}명)`
          )
        );
      }

      if (waitPosition && myStatus === "대기중") {
        infoRows.push(
          makeRow("fa-list-ol", "대기 순번", `${waitPosition}번`)
        );
      }

      if (companions.length > 0) {
        const companionChips = companions
          .slice(0, 6)
          .map(
            (name) => `
                    <span class="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      ${saf(name)}
                    </span>
                  `
          )
          .join("");
        const extraCompanions =
          companions.length > 6
            ? `<span class="px-2 py-1 rounded-full bg-blue-50 text-blue-500 text-xs font-medium">
                      +${companions.length - 6}
                    </span>`
            : "";

        infoRows.push(`
                <div class="flex flex-col gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
                  <div class="flex items-center gap-2 text-[11px] text-blue-600">
                    <i class="fas fa-users"></i>
                    함께 신청한 인원
                  </div>
                  <div class="flex flex-wrap gap-1">
                    ${companionChips}${extraCompanions}
                  </div>
                </div>
              `);
      }

      myApplicationHTML = `
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h5 class="font-semibold text-blue-900 flex items-center gap-2">
                  <i class="fas fa-user-check text-blue-600"></i>내 신청 정보
                </h5>
                <div class="grid grid-cols-1 gap-2">
                  ${infoRows.join("")}
                </div>
              </div>
            `;
    } else {
      myApplicationHTML = `
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                현재 계정으로 신청한 내역을 찾을 수 없습니다.
              </div>
            `;
    }
  }

  const modalHTML = `
          <div id="event-detail-modal-main" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                  <h3 class="text-xl font-bold text-gray-800">이벤트 상세 정보</h3>
                  <button onclick="if(typeof window.closeEventDetailModalMain === 'function') window.closeEventDetailModalMain();" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                  </button>
                </div>

                <div class="space-y-4">
                  <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-800 mb-3">${saf(
                      ev.title
                    )}</h4>
                    <div class="space-y-2">
                      <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-tag text-orange-500"></i>
                        <span class="text-gray-700">${typeLabel}</span>
                      </div>
                      <div class="flex items-center gap-2 text-sm font-bold text-orange-700">
                        <i class="fas fa-calendar-check text-orange-600"></i>
                        <span>실시일: ${eventDate}</span>
                      </div>
                      <div class="flex items-center gap-2 text-sm font-bold text-red-700">
                        <i class="fas fa-clock text-red-600"></i>
                        <span>마감일: ${deadlineDate}</span>
                      </div>
                    </div>
                  </div>

                  ${myApplicationHTML}

                  ${
                    ev.description
                      ? `
                    <div class="bg-gray-50 rounded-lg p-4">
                      <h5 class="font-medium text-gray-700 mb-2">상세 설명</h5>
                      <p class="text-gray-600 text-sm whitespace-pre-wrap">${saf(
                        ev.description
                      )}</p>
                    </div>
                  `
                      : ""
                  }

                  ${
                    (ev.type === "mt" || ev.type === "assembly") && ev.payment
                      ? `
                    <div class="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                      <h5 class="font-semibold text-amber-900 mb-3 flex items-center">
                        <i class="fas fa-wallet mr-2 text-amber-600"></i>입금 정보
                      </h5>
                      <div class="space-y-3">
                        ${
                          ev.payment.amount
                            ? `
                        <div class="flex items-center gap-2 text-sm">
                          <i class="fas fa-won-sign text-amber-600"></i>
                          <span class="text-gray-700 font-medium">입금 금액:</span>
                          <span class="text-gray-800 font-bold text-lg">${formatKRW(
                            ev.payment.amount
                          )}</span>
                        </div>
                        `
                            : ""
                        }
                        ${
                          ev.payment.bank && ev.payment.number
                            ? `
                        <div class="flex items-center gap-2 text-sm">
                          <i class="fas fa-university text-amber-600"></i>
                          <span class="text-gray-700 font-medium">입금 계좌:</span>
                          <span class="text-gray-800 font-semibold">${saf(
                            ev.payment.bank
                          )} ${saf(ev.payment.number)}</span>
                          ${
                            ev.payment.holder
                              ? `<span class="text-gray-600 text-xs">(예금주: ${saf(
                                  ev.payment.holder
                                )})</span>`
                              : ""
                          }
                        </div>
                        `
                            : ""
                        }
                        ${
                          ev.payment.bank && ev.payment.number
                            ? `
                        <div class="flex justify-end">
                          <button
                            type="button"
                            onclick="navigator.clipboard.writeText('${saf(
                              ev.payment.bank || ""
                            )} ${saf(
                              ev.payment.number || ""
                            )}').then(() => alert('계좌번호가 복사되었습니다!'))"
                            class="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            <i class="fas fa-copy mr-1"></i>계좌번호 복사
                          </button>
                        </div>
                        `
                            : ""
                        }
                        ${
                          ev.payment.note
                            ? `
                        <div class="text-sm text-amber-800 bg-amber-100 p-2 rounded">
                          <i class="fas fa-info-circle mr-1"></i>${saf(
                            ev.payment.note
                          )}
                        </div>
                        `
                            : ""
                        }
                      </div>
                    </div>
                  `
                      : ""
                  }

                  ${
                    ev.type === "tasting" &&
                    ev.restaurants &&
                    ev.restaurants.length > 0
                      ? `
                    <div class="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
                      <h5 class="font-semibold text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-utensils mr-2 text-orange-600"></i>식당별 신청 현황
                      </h5>
                      <div class="space-y-3">
                        ${ev.restaurants
                          .map((restaurant) => {
                            const reservations =
                              restaurant.reservations || [];
                            const waiting = restaurant.waiting || [];
                            const capacity =
                              restaurant.capacity || ev.limit || 0;

                            // 신청한 사람 이름 찾기
                            const participantNames = reservations
                              .slice()
                              .reverse()
                              .map((res) => {
                                const member = membersData?.find(
                                  (m) => m.studentId === res.studentId
                                );
                                return (
                                  member?.name ||
                                  res.name ||
                                  res.studentId ||
                                  "익명"
                                );
                              });

                            const waitingNames = waiting
                              .slice()
                              .reverse()
                              .map((wait) => {
                                const member = membersData?.find(
                                  (m) => m.studentId === wait.studentId
                                );
                                return (
                                  member?.name ||
                                  wait.name ||
                                  wait.studentId ||
                                  "익명"
                                );
                              });

                            // 현재 사용자가 신청한 식당인지 확인
                            const isMyRestaurant =
                              currentUser &&
                              reservations.some(
                                (res) =>
                                  res.studentId === currentUser.studentId
                              );

                            return `
                            <div class="bg-white rounded-lg p-3 border ${
                              isMyRestaurant
                                ? "border-orange-500 border-2"
                                : "border-gray-200"
                            }">
                              <div class="flex items-center justify-between mb-2">
                                <h6 class="font-semibold text-gray-800 flex items-center">
                                  ${
                                    isMyRestaurant
                                      ? '<i class="fas fa-check-circle text-orange-600 mr-2"></i>'
                                      : ""
                                  }
                                  ${saf(restaurant.name || "식당명 없음")}
                                </h6>
                                <span class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                  ${reservations.length}/${capacity}명
                                  ${
                                    waiting.length > 0
                                      ? ` (+${waiting.length}명 대기)`
                                      : ""
                                  }
                                </span>
                              </div>
                              ${
                                participantNames.length > 0
                                  ? `
                                <div class="mt-2">
                                  <p class="text-xs font-semibold text-gray-600 mb-1">참가자:</p>
                                  <div class="flex flex-wrap gap-1">
                                    ${participantNames
                                      .map(
                                        (name) => `
                                      <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${saf(
                                        name
                                      )}</span>
                                    `
                                      )
                                      .join("")}
                                  </div>
                                </div>
                                `
                                  : ""
                              }
                              ${
                                waitingNames.length > 0
                                  ? `
                                <div class="mt-2">
                                  <p class="text-xs font-semibold text-amber-600 mb-1">대기자:</p>
                                  <div class="flex flex-wrap gap-1">
                                    ${waitingNames
                                      .map(
                                        (name) => `
                                      <span class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">${saf(
                                        name
                                      )}</span>
                                    `
                                      )
                                      .join("")}
                                  </div>
                                </div>
                                `
                                  : ""
                              }
                            </div>
                          `;
                          })
                          .join("")}
                      </div>
                    </div>
                  `
                      : `
                  <div class="bg-gray-50 rounded-lg p-4">
                    <h5 class="font-medium text-gray-700 mb-2">신청 현황</h5>
                    <p class="text-gray-600 text-sm">참가자: ${
                      (ev.applicants || []).length
                    }명 / ${ev.limit || 0}명</p>
                    ${
                      (ev.waiting || []).length > 0
                        ? `<p class="text-gray-600 text-sm mt-1">대기자: ${ev.waiting.length}명</p>`
                        : ""
                    }
                    ${
                      ev.applicants && ev.applicants.length > 0
                        ? `
                        <div class="mt-3">
                          <p class="text-xs font-semibold text-gray-600 mb-1">참가자 목록:</p>
                          <div class="flex flex-wrap gap-1">
                            ${ev.applicants
                              .slice()
                              .reverse()
                              .map((app) => {
                                const member = membersData?.find(
                                  (m) => m.studentId === app.studentId
                                );
                                const name =
                                  member?.name ||
                                  app.name ||
                                  app.studentId ||
                                  "익명";
                                return `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${saf(
                                  name
                                )}</span>`;
                              })
                              .join("")}
                          </div>
                        </div>
                        `
                        : ""
                    }
                  </div>
                  `
                  }
                </div>
              </div>
            </div>
          </div>
        `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// 이벤트 상세 모달 닫기 (eventsData용)
export function closeEventDetailModalMain() {
  const modal = document.getElementById("event-detail-modal-main");
  if (modal) {
    modal.remove();
  }
}

// 달력 이벤트 상세 모달 닫기 (roadmapData용)
export function closeEventDetailModal() {
  const modal = document.getElementById("event-detail-modal");
  if (modal) {
    modal.remove();
  }
}

// 로드맵 일정 수정 모달 열기
export function openRoadmapEventEditModal(eventId, eventIndex) {
  const { roadmapData } = state;
  const event = roadmapData.find((e) => e.id === eventId);
  if (!event) return;

  const modalHTML = `
          <div id="roadmap-event-edit-modal" class="fixed inset-0 bg-black/60 flex justify-center items-center px-4 z-50">
            <div class="bg-white p-6 md:p-7 rounded-2xl shadow-xl max-w-md w-full">
              <h3 class="text-xl font-bold text-gray-800 mb-4">로드맵 일정 수정</h3>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">일정 제목</label>
                  <input id="roadmap-event-edit-name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" value="${saf(
                    event.activityName
                  )}" placeholder="일정 제목">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                  <input id="roadmap-event-edit-date" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" value="${
                    event.activityDate
                  }">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea id="roadmap-event-edit-description" rows="5" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="일정 설명을 입력하세요&#10;줄바꿈이 가능합니다">${saf(
                    event.description || ""
                  )}</textarea>
                  <p class="text-xs text-gray-500 mt-1">💡 Enter 키로 줄바꿈이 가능합니다</p>
                </div>
                <div>
                  <label class="flex items-center gap-2">
                    <input id="roadmap-event-edit-admin-only" type="checkbox" class="w-4 h-4 text-orange-600 bg-white border border-gray-300 rounded focus:ring-orange-500 focus:ring-2" ${
                      event.isAdminOnly ? "checked" : ""
                    }>
                    <span class="text-sm font-medium text-gray-700">관리자만 보이도록 설정</span>
                  </label>
                  <p class="text-xs text-gray-500 mt-1">체크하면 일반 회원에게는 보이지 않습니다</p>
                </div>
                <input id="roadmap-event-edit-id" type="hidden" value="${eventId}">
              </div>
              <div class="flex gap-3 mt-6">
                <button id="roadmap-event-edit-save" class="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors">
                  <i class="fas fa-save mr-2"></i>수정
                </button>
                <button id="roadmap-event-edit-cancel" class="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                  취소
                </button>
              </div>
            </div>
          </div>
        `;

  // 기존 모달 제거
  const existingModal = document.getElementById("roadmap-event-edit-modal");
  if (existingModal) existingModal.remove();

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // 이벤트 리스너 추가
  document
    .getElementById("roadmap-event-edit-save")
    .addEventListener("click", async () => {
      const eventId = document.getElementById("roadmap-event-edit-id").value;
      const name = document.getElementById("roadmap-event-edit-name").value.trim();
      const date = document.getElementById("roadmap-event-edit-date").value;
      const description = document.getElementById(
        "roadmap-event-edit-description"
      ).value;
      const isAdminOnly = document.getElementById(
        "roadmap-event-edit-admin-only"
      ).checked;

      if (!name) {
        showAlert("😥", "일정 제목을 입력해주세요.");
        return;
      }

      if (!date) {
        showAlert("😥", "날짜를 선택해주세요.");
        return;
      }

      try {
        // 문서 존재 여부 확인
        const docRef = doc(db, "roadmap", eventId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          showAlert("😥", "수정하려는 일정을 찾을 수 없습니다.");
          return;
        }

        await updateDoc(docRef, {
          activityName: name,
          activityDate: date,
          description: description,
          isAdminOnly: isAdminOnly,
        });
        showAlert("✅", "로드맵 일정이 수정되었습니다.");
        document.getElementById("roadmap-event-edit-modal").remove();
        // 수정 후 로드맵 새로고침 (onSnapshot으로 자동 업데이트됨)
      } catch (error) {
        console.error("일정 수정 오류:", error);
        if (error.code === "not-found") {
          showAlert("😥", "수정하려는 일정을 찾을 수 없습니다.");
        } else {
          showAlert("😥", "일정 수정에 실패했습니다.");
        }
      }
    });

  document
    .getElementById("roadmap-event-edit-cancel")
    .addEventListener("click", () => {
      document.getElementById("roadmap-event-edit-modal").remove();
    });
}

// 로드맵 일정 삭제 함수
export async function deleteRoadmapEvent(eventId) {
  if (!confirm("정말로 이 로드맵 일정을 삭제하시겠습니까?")) {
    return;
  }

  try {
    // 문서 존재 여부 확인
    const docRef = doc(db, "roadmap", eventId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      showAlert("😥", "삭제하려는 일정을 찾을 수 없습니다.");
      return;
    }

    await deleteDoc(docRef);
    showAlert("✅", "로드맵 일정이 삭제되었습니다.");
    // renderHorizontalRoadmap은 전역 함수로 접근
    if (typeof window.renderHorizontalRoadmap === "function") {
      window.renderHorizontalRoadmap();
    }
  } catch (error) {
    console.error("로드맵 삭제 오류:", error);
    if (error.code === "not-found") {
      showAlert("😥", "삭제하려는 일정을 찾을 수 없습니다.");
    } else {
      showAlert("😥", "로드맵 일정 삭제에 실패했습니다.");
    }
  }
}

