// 참가자 관리 모듈
// 버전: 2025-01-27

import { state } from "../../state.js";
import { showAlert, saf } from "../../utils.js";
import { db } from "../../firebase.js";
import { doc, runTransaction, updateDoc, collection, addDoc } from "firebase/firestore";

const TRANSACTION_OPTIONS = { maxAttempts: 1 };

// 유틸리티 함수
const maskStudentId = (sid) => {
  if (typeof window.maskStudentIdGlobal === "function") {
    return window.maskStudentIdGlobal(sid);
  }
  return sid ? `${sid.slice(0, 4)}****` : "";
};

const isFullAdmin = () => {
  if (typeof window.isFullAdmin === "function") {
    return window.isFullAdmin();
  }
  const { currentUser, adminList } = state;
  return currentUser && adminList?.includes(currentUser.studentId);
};

// 참가자 목록 토글
export function toggleParticipantsList(event, uniqueId, hiddenCount) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const hiddenDiv = document.getElementById(`${uniqueId}-hidden`);
  if (!hiddenDiv) {
    console.error("숨겨진 참가자 목록을 찾을 수 없습니다:", uniqueId);
    return;
  }

  // event.target 또는 event.currentTarget 사용
  let button = event ? event.currentTarget || event.target : null;

  // 버튼이 클릭된 요소가 아니라면 가장 가까운 button 찾기
  if (button && button.tagName !== "BUTTON") {
    button = button.closest("button");
  }

  if (!button) {
    console.error("버튼을 찾을 수 없습니다");
    return;
  }

  const icon = button.querySelector("i");
  const text = button.querySelector("span");

  if (!icon || !text) {
    // 폴백: innerHTML로 직접 변경 (정상 작동)
    const isHidden = hiddenDiv.classList.contains("hidden");
    if (isHidden) {
      hiddenDiv.classList.remove("hidden");
      button.innerHTML = `<i class="fas fa-chevron-up"></i><span>접기</span>`;
    } else {
      hiddenDiv.classList.add("hidden");
      button.innerHTML = `<i class="fas fa-chevron-down"></i><span>외 ${hiddenCount}명 더보기</span>`;
    }
    return;
  }

  const isHidden = hiddenDiv.classList.contains("hidden");

  if (isHidden) {
    // 펼치기
    hiddenDiv.classList.remove("hidden");
    icon.className = "fas fa-chevron-up";
    text.textContent = "접기";
  } else {
    // 접기
    hiddenDiv.classList.add("hidden");
    icon.className = "fas fa-chevron-down";
    text.textContent = `외 ${hiddenCount}명 더보기`;
  }
}

// 미식회 참가자 상세 토글
export function toggleRestaurantParticipantsDetails(event, uniqueId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const detailDiv = document.getElementById(`${uniqueId}-details`);
  if (!detailDiv) {
    console.error("참가자 상세 목록을 찾을 수 없습니다:", uniqueId);
    return;
  }

  let button = event ? event.currentTarget || event.target : null;
  if (button && button.tagName !== "BUTTON") {
    button = button.closest("button");
  }
  if (!button) {
    console.error("참가자 상세 토글 버튼을 찾을 수 없습니다");
    return;
  }

  const icon = button.querySelector("i");
  const text = button.querySelector("span");
  const isHidden = detailDiv.classList.contains("hidden");

  if (isHidden) {
    // 펼치기
    detailDiv.classList.remove("hidden");
    if (icon) icon.className = "fas fa-chevron-up";
    if (text) text.textContent = "참가자 상세 접기";
  } else {
    // 접기
    detailDiv.classList.add("hidden");
    if (icon) icon.className = "fas fa-chevron-down";
    if (text) text.textContent = "참가자 상세 보기";
  }
}

// 참가 상세 정보 가져오기
export function getParticipationDetails(ev) {
  const { currentUser } = state;
  
  if (!currentUser?.studentId) {
    return {
      restaurantName: "",
      companionsLine: "",
      isWaitlisted: false,
      myEntry: null,
      waitPosition: null,
      restaurantInfo: null,
      restaurantId: null,
      applicantCount: (ev.applicants || []).length,
      waitingCount: (ev.waiting || []).length,
    };
  }

  const sid = currentUser.studentId;
  let restaurantName = "";
  let restaurantInfo = null;
  let isWaitlisted = false;
  let waitPosition = null;
  let myEntry = null;
  const companionNames = [];

  if (ev.type === "tasting" && Array.isArray(ev.restaurants)) {
    for (const restaurant of ev.restaurants) {
      const restaurantId =
        restaurant.id ||
        restaurant.rid ||
        restaurant.restaurantId ||
        restaurant.name ||
        "";
      const reservations = restaurant.reservations || [];
      const waitings = restaurant.waiting || [];
      const reservationIndex = reservations.findIndex(
        (res) => res.studentId === sid
      );

      if (reservationIndex >= 0) {
        restaurantName = restaurant.name || "";
        myEntry = reservations[reservationIndex];
        restaurantInfo = {
          id: restaurantId || null,
          name: restaurant.name || "",
          capacity: restaurant.capacity ?? reservations.length,
          reservations: reservations.length,
          waiting: waitings.length,
        };
        reservations.forEach((res) => {
          if (res.studentId !== sid) {
            companionNames.push(
              res.name || maskStudentId(res.studentId)
            );
          }
        });
        break;
      }

      const waitingIndex = waitings.findIndex(
        (res) => res.studentId === sid
      );
      if (waitingIndex >= 0) {
        restaurantName = restaurant.name || "";
        isWaitlisted = true;
        waitPosition = waitingIndex + 1;
        myEntry = waitings[waitingIndex];
        restaurantInfo = {
          id: restaurantId || null,
          name: restaurant.name || "",
          capacity: restaurant.capacity ?? reservations.length,
          reservations: reservations.length,
          waiting: waitings.length,
        };
        waitings.forEach((res) => {
          if (res.studentId !== sid) {
            companionNames.push(
              res.name || maskStudentId(res.studentId)
            );
          }
        });
        break;
      }
    }
  } else {
    const applicants = ev.applicants || [];
    const waiting = ev.waiting || [];
    const applicantIndex = applicants.findIndex(
      (applicant) => applicant.studentId === sid
    );
    const waitingIndex = waiting.findIndex(
      (applicant) => applicant.studentId === sid
    );

    if (applicantIndex >= 0) {
      myEntry = applicants[applicantIndex];
      applicants.forEach((applicant, index) => {
        if (applicant.studentId !== sid) {
          companionNames.push(
            applicant.name || maskStudentId(applicant.studentId)
          );
        }
      });
    } else if (waitingIndex >= 0) {
      myEntry = waiting[waitingIndex];
      isWaitlisted = true;
      waitPosition = waitingIndex + 1;
      waiting.forEach((applicant) => {
        if (applicant.studentId !== sid) {
          companionNames.push(
            applicant.name || maskStudentId(applicant.studentId)
          );
        }
      });
    } else {
      applicants.forEach((applicant) => {
        companionNames.push(
          applicant.name || maskStudentId(applicant.studentId)
        );
      });
    }
  }

  let companionsLine = "";
  if (companionNames.length > 0) {
    const uniqueNames = [
      ...new Set(companionNames.filter((name) => !!name)),
    ].map((name) => saf(name));
    const displayNames = uniqueNames.slice(0, 3).join(", ");
    const extraCount =
      uniqueNames.length > 3 ? ` 외 ${uniqueNames.length - 3}명` : "";
    companionsLine = `함께한 회원: ${displayNames}${extraCount}`;
  } else if (isWaitlisted) {
    companionsLine = "대기 목록에 등록되어 있습니다.";
  }

  return {
    restaurantName,
    companionsLine,
    isWaitlisted,
    myEntry,
    waitPosition,
    restaurantInfo,
    restaurantId: restaurantInfo?.id || null,
    applicantCount: (ev.applicants || []).length,
    waitingCount: (ev.waiting || []).length,
  };
}

// 참가자 제거 알림 전송
async function sendRemovalNotification(eventId, studentId, eventTitle) {
  try {
    console.log("📤 참가자 제외 알림 전송 시도:", {
      eventId,
      studentId,
      eventTitle,
    });

    // 알림 데이터 생성
    const notificationData = {
      type: "participant_removed",
      eventId: eventId,
      eventTitle: eventTitle,
      studentId: studentId,
      message: `안녕하세요. ${eventTitle} 이벤트에서 참가자에서 제외되었습니다. 문의사항이 있으시면 운영진에게 연락해주세요.`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // 알림 저장 (notifications 컬렉션 사용)
    await addDoc(collection(db, "notifications"), notificationData);
    console.log("✅ 참가자 제외 알림 전송 성공");
  } catch (error) {
    console.error("❌ 알림 전송 실패:", error);
  }
}

// 참가자 제거 내부 함수
async function removeParticipant(
  eventId,
  studentId,
  listType,
  restaurantId = null
) {
  let wasRemoved = false;
  let eventTitle = "";

  try {
    await runTransaction(
      db,
      async (tx) => {
        const ref = doc(db, "events", eventId);
        const snap = await tx.get(ref);
        const ev = snap.data();
        eventTitle = ev.title;

        if (restaurantId) {
          // 미식회 경우
          const idx = ev.restaurants.findIndex(
            (r) => r.id === restaurantId
          );
          if (idx === -1) throw new Error("restaurant not found");
          const r = ev.restaurants[idx];

          // 참가자 찾기 및 제외
          const before =
            listType === "reservations"
              ? r.reservations?.length
              : r.waiting?.length;

          if (listType === "reservations") {
            r.reservations = r.reservations.filter(
              (p) => p.studentId !== studentId
            );
          } else {
            r.waiting = r.waiting.filter(
              (p) => p.studentId !== studentId
            );
          }

          ev.restaurants[idx] = r;
          tx.update(ref, { restaurants: ev.restaurants });

          wasRemoved =
            (listType === "reservations"
              ? r.reservations.length
              : r.waiting.length) < before;
        } else {
          // 일반 이벤트 경우
          const before =
            listType === "applicants"
              ? ev.applicants?.length
              : ev.waiting?.length;

          if (listType === "applicants") {
            ev.applicants = ev.applicants.filter(
              (p) => p.studentId !== studentId
            );
          } else {
            ev.waiting = ev.waiting.filter(
              (p) => p.studentId !== studentId
            );
          }

          tx.update(ref, {
            applicants: ev.applicants,
            waiting: ev.waiting,
          });

          wasRemoved =
            (listType === "applicants"
              ? ev.applicants.length
              : ev.waiting.length) < before;
        }
      },
      TRANSACTION_OPTIONS
    );

    // transaction 완료 후 알림 전송
    if (wasRemoved) {
      await sendRemovalNotification(eventId, studentId, eventTitle);
    }

    showAlert("✅", "참가자가 제외되었습니다.");
    // renderReservationTab은 전역 함수로 접근
    if (typeof window.renderReservationTab === "function") {
      window.renderReservationTab(isFullAdmin());
    }
  } catch (error) {
    console.error("참가자 제외 오류:", error);
    if (error?.code === "resource-exhausted")
      showAlert(
        "😥",
        "요청이 너무 많아 잠시 후 다시 시도해주세요.<br>불편을 드려 죄송합니다."
      );
    else showAlert("😥", "참가자 제외 실패");
  }
}

// 참가자 제거 확인
export async function confirmRemoveParticipant(
  eventId,
  studentId,
  listType,
  restaurantId = null
) {
  // 회장단 권한 체크
  if (!isFullAdmin()) {
    showAlert("🔒", "회장단만 참가자를 제외할 수 있습니다.");
    return;
  }

  // 이벤트 정보 가져오기
  const { eventsData } = state;
  const event = eventsData.find((e) => e.id === eventId);
  if (!event) {
    showAlert("😥", "이벤트를 찾을 수 없습니다.");
    return;
  }

  // 참가자 정보 찾기
  let participant = null;
  let participantName = "";

  if (restaurantId) {
    // 미식회 경우
    const restaurant = event.restaurants?.find(
      (r) => r.id === restaurantId
    );
    if (!restaurant) {
      showAlert("😥", "식당을 찾을 수 없습니다.");
      return;
    }
    const list =
      listType === "reservations"
        ? restaurant.reservations
        : restaurant.waiting;
    participant = list?.find((p) => p.studentId === studentId);
    participantName = participant?.name || "";
  } else {
    // 일반 이벤트 경우
    const list =
      listType === "applicants" ? event.applicants : event.waiting;
    participant = list?.find((p) => p.studentId === studentId);
    participantName = participant?.name || "";
  }

  if (!participant) {
    showAlert("😥", "참가자를 찾을 수 없습니다.");
    return;
  }

  // 확인 문구
  const confirmMsg = `해당 참가자를 제외시키겠습니까?\n\n이름: ${participantName} (${maskStudentId(
    studentId
  )})\n이벤트: ${event.title}`;

  if (!confirm(confirmMsg)) {
    return;
  }

  // 제외 실행
  await removeParticipant(eventId, studentId, listType, restaurantId);
}

// 참가자 추가 내부 함수
async function addParticipantToEvent(eventId, member) {
  const eventRef = doc(db, "events", eventId);

  await runTransaction(
    db,
    async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists()) {
        throw new Error("이벤트를 찾을 수 없습니다.");
      }

      const eventData = eventDoc.data();
      const participant = {
        studentId: member.studentId,
        name: member.name,
        appliedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      if (eventData.type === "tasting" && eventData.restaurants) {
        // 미식회인 경우
        const restaurantSelect = document.getElementById(
          "participant-restaurant-select"
        );
        if (!restaurantSelect) {
          throw new Error("식당을 선택해주세요.");
        }

        const restaurantId = restaurantSelect.value;
        const restaurants = [...(eventData.restaurants || [])];

        const restaurantIndex = restaurants.findIndex(
          (r) => r.id === restaurantId
        );

        if (restaurantIndex === -1) {
          throw new Error("선택한 식당을 찾을 수 없습니다.");
        }

        const restaurant = restaurants[restaurantIndex];
        const reservations = [...(restaurant.reservations || [])];
        const waiting = [...(restaurant.waiting || [])];

        // 이미 참가자 또는 대기자인지 확인
        const isAlreadyParticipant = reservations.some(
          (r) => r.studentId === member.studentId
        );
        const isAlreadyWaiting = waiting.some(
          (w) => w.studentId === member.studentId
        );

        if (isAlreadyParticipant || isAlreadyWaiting) {
          throw new Error("이미 참가 중인 회원입니다.");
        }

        // 정원 확인
        const capacity = restaurant.capacity || eventData.limit || 0;
        if (reservations.length >= capacity) {
          // 정원이 꽉 찼으면 대기열에 추가
          waiting.push(participant);
          restaurant.waiting = waiting;
        } else {
          // 정원이 남았으면 참가자 목록에 추가
          reservations.push(participant);
          restaurant.reservations = reservations;
        }

        restaurants[restaurantIndex] = restaurant;
        transaction.update(eventRef, { restaurants });
      } else {
        // 일반 이벤트인 경우
        const applicants = [...(eventData.applicants || [])];
        const waiting = [...(eventData.waiting || [])];

        // 이미 참가자 또는 대기자인지 확인
        const isAlreadyParticipant = applicants.some(
          (a) => a.studentId === member.studentId
        );
        const isAlreadyWaiting = waiting.some(
          (w) => w.studentId === member.studentId
        );

        if (isAlreadyParticipant || isAlreadyWaiting) {
          throw new Error("이미 참가 중인 회원입니다.");
        }

        // 정원 확인
        const limit = eventData.limit || 0;
        if (limit > 0 && applicants.length >= limit) {
          // 정원이 꽉 찼으면 대기열에 추가
          waiting.push(participant);
          transaction.update(eventRef, { waiting });
        } else {
          // 정원이 남았거나 제한이 없으면 참가자 목록에 추가
          applicants.push(participant);
          transaction.update(eventRef, { applicants });
        }
      }
    },
    TRANSACTION_OPTIONS
  );
}

// 참가자 추가 모달 열기
export async function openAddParticipantModal(eventId) {
  // 이미 열려 있는 참가자 수정 모달이 있다면 제거
  closeAddParticipantModal();

  const { eventsData, membersData } = state;
  const event = eventsData.find((e) => e.id === eventId);
  if (!event) {
    showAlert("😥", "이벤트를 찾을 수 없습니다.");
    return;
  }

  // 현재 참가자 목록 가져오기
  const getCurrentParticipants = () => {
    if (event.type === "tasting" && event.restaurants) {
      const allParticipants = [];
      event.restaurants.forEach((r) => {
        (r.reservations || []).forEach((p) => {
          allParticipants.push({
            studentId: p.studentId,
            name: p.name,
            restaurantId: r.id,
            restaurantName: r.name,
            type: "reservation",
          });
        });
        (r.waiting || []).forEach((p) => {
          allParticipants.push({
            studentId: p.studentId,
            name: p.name,
            restaurantId: r.id,
            restaurantName: r.name,
            type: "waiting",
          });
        });
      });
      return allParticipants;
    } else {
      const participants = (event.applicants || []).map((p) => ({
        studentId: p.studentId,
        name: p.name,
        type: "applicant",
      }));
      const waiting = (event.waiting || []).map((w) => ({
        studentId: w.studentId,
        name: w.name,
        type: "waiting",
      }));
      return [...participants, ...waiting];
    }
  };

  const currentParticipants = getCurrentParticipants();
  const currentParticipantIds = currentParticipants.map(
    (p) => p.studentId
  );

  // 미식회인 경우 식당 선택 포함
  let restaurantSelectHTML = "";
  if (event.type === "tasting" && event.restaurants) {
    restaurantSelectHTML = `
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-utensils mr-2 text-orange-500"></i>식당 선택 <span class="text-red-500">*</span>
              </label>
              <select id="participant-restaurant-select" class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                ${event.restaurants
                  .map(
                    (r) => `
                  <option value="${r.id}">${saf(r.name)} (${
                      r.reservations?.length || 0
                    }/${r.capacity || event.limit || 0}명)</option>
                `
                  )
                  .join("")}
              </select>
            </div>
          `;
  }

  // 현재 참가자 목록 HTML 생성 (식당 필터링 지원)
  const renderCurrentParticipants = (filteredParticipants = null) => {
    const participantsToShow =
      filteredParticipants !== null
        ? filteredParticipants
        : currentParticipants;

    if (participantsToShow.length === 0) {
      return '<p class="text-sm text-gray-400 italic text-center py-4">참가자가 없습니다</p>';
    }

    return participantsToShow
      .map((p) => {
        const memberInfo = membersData?.find(
          (m) => m.studentId === p.studentId
        );
        return `
                <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-3 flex-1">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                      ${(p.name || "").charAt(0) || "?"}
                    </div>
                    <div class="flex-1">
                      <div class="font-semibold text-gray-800">${saf(
                        p.name || "알 수 없음"
                      )}</div>
                      <div class="text-xs text-gray-500">
                        ${p.studentId || ""}${
          memberInfo && memberInfo.college
            ? ` · ${memberInfo.college}`
            : ""
        }
                        ${
                          p.restaurantName
                            ? ` · ${saf(p.restaurantName)}`
                            : ""
                        }
                        ${
                          p.type === "waiting"
                            ? ' <span class="text-amber-600 font-semibold">(대기)</span>'
                            : ""
                        }
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                    onclick="if(typeof window.removeParticipantFromEvent === 'function') window.removeParticipantFromEvent('${eventId}', '${
                      p.studentId
                    }', ${p.restaurantId ? `'${p.restaurantId}'` : "null"}, '${saf(
                      p.name
                    )}')"
                  >
                    <i class="fas fa-trash mr-1"></i>제거
                  </button>
                </div>
              `;
      })
      .join("");
  };

  const modalHTML = `
          <div id="add-participant-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                  <h3 class="text-xl font-bold text-gray-800">참가자 수정</h3>
                  <button onclick="if(typeof window.closeAddParticipantModal === 'function') window.closeAddParticipantModal();" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                  </button>
                </div>

                <div class="mb-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                  <p class="text-sm font-semibold text-gray-800 mb-1">
                    <i class="fas fa-calendar-alt mr-2 text-blue-600"></i>${saf(
                      event.title
                    )}
                  </p>
                  <p class="text-xs text-gray-600">
                    ${new Date(event.datetime).toLocaleString("ko-KR")}
                  </p>
                </div>

                ${restaurantSelectHTML}

                <!-- 현재 참가자 목록 -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-users mr-2 text-green-500"></i>현재 참가자 <span class="text-gray-500 font-normal" id="participant-count">(${
                      currentParticipants.length
                    }명)</span>
                  </label>
                  <div id="participant-current-list" class="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                    ${renderCurrentParticipants()}
                  </div>
                </div>

                <!-- 회원 검색 -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    <i class="fas fa-user-plus mr-2 text-blue-500"></i>회원 검색 및 수정
                  </label>
                  <input
                    type="text"
                    id="participant-search-input"
                    placeholder="이름 또는 학번으로 검색..."
                    class="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    autocomplete="off"
                  />
                  <div id="participant-search-results" class="mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                    <p class="text-sm text-gray-400 text-center py-4">검색어를 입력하여 회원을 찾아주세요</p>
                  </div>
                </div>

                <div class="flex gap-3">
                  <button
                    onclick="if(typeof window.closeAddParticipantModal === 'function') window.closeAddParticipantModal();"
                    class="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // 검색 기능
  const searchInput = document.getElementById("participant-search-input");
  const searchResults = document.getElementById(
    "participant-search-results"
  );
  const currentList = document.getElementById("participant-current-list");
  const participantCount = document.getElementById("participant-count");
  const restaurantSelect = document.getElementById(
    "participant-restaurant-select"
  );

  // 식당 선택에 따른 참가자 필터링
  const updateParticipantList = () => {
    let filteredParticipants = currentParticipants;

    // 미식회이고 식당 선택이 있으면 해당 식당의 참가자만 필터링
    if (
      event.type === "tasting" &&
      event.restaurants &&
      restaurantSelect
    ) {
      const selectedRestaurantId = restaurantSelect.value;
      if (selectedRestaurantId) {
        filteredParticipants = currentParticipants.filter(
          (p) => p.restaurantId === selectedRestaurantId
        );
      }
    }

    // 참가자 목록 업데이트
    if (currentList) {
      currentList.innerHTML =
        renderCurrentParticipants(filteredParticipants);
    }

    // 참가자 수 업데이트
    if (participantCount) {
      participantCount.textContent = `(${filteredParticipants.length}명)`;
    }
  };

  // 식당 선택 변경 시 참가자 목록 업데이트
  if (restaurantSelect) {
    restaurantSelect.addEventListener("change", () => {
      updateParticipantList();
      // 검색 결과도 새로고침 (선택된 식당의 참가자는 검색 결과에서 제외)
      if (searchInput.value) {
        searchParticipants(searchInput.value);
      }
    });
  }

  const searchParticipants = (searchTerm) => {
    if (!searchTerm.trim()) {
      searchResults.innerHTML =
        '<p class="text-sm text-gray-400 text-center py-4">검색어를 입력하여 회원을 찾아주세요</p>';
      return;
    }

    // 띄어쓰기로 구분된 여러 검색어 처리
    const searchKeywords = searchTerm
      .trim()
      .split(/\s+/)
      .filter((keyword) => keyword.length > 0)
      .map((keyword) => keyword.toLowerCase());

    // 각 검색어에 매칭되는 회원들을 찾기
    const matchedMembers = new Map();

    // 선택된 식당의 참가자 ID 목록 가져오기 (미식회인 경우)
    let filteredParticipantIds = currentParticipantIds;
    if (
      event.type === "tasting" &&
      event.restaurants &&
      restaurantSelect
    ) {
      const selectedRestaurantId = restaurantSelect.value;
      if (selectedRestaurantId) {
        filteredParticipantIds = currentParticipants
          .filter((p) => p.restaurantId === selectedRestaurantId)
          .map((p) => p.studentId);
      }
    }

    searchKeywords.forEach((keyword) => {
      (membersData || []).forEach((m) => {
        const nameMatch = m.name?.toLowerCase().includes(keyword);
        const idMatch = m.studentId?.toLowerCase().includes(keyword);
        const isAlreadyParticipant = filteredParticipantIds.includes(
          m.studentId
        );
        const isActive = (m.status || "pending") === "active";

        if ((nameMatch || idMatch) && !isAlreadyParticipant && isActive) {
          matchedMembers.set(m.studentId || m.name, m);
        }
      });
    });

    const filtered = Array.from(matchedMembers.values()).slice(0, 50);

    if (filtered.length === 0) {
      searchResults.innerHTML =
        '<p class="text-sm text-gray-400 text-center py-4">검색 결과가 없습니다</p>';
    } else {
      searchResults.innerHTML = filtered
        .map((member) => {
          const matchedKeywords = searchKeywords.filter(
            (keyword) =>
              member.name?.toLowerCase().includes(keyword) ||
              member.studentId?.toLowerCase().includes(keyword)
          );

          return `
                  <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        ${member.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div class="font-semibold text-gray-800">${saf(
                          member.name || "알 수 없음"
                        )}</div>
                        <div class="text-xs text-gray-500">${
                          member.studentId || ""
                        } · ${member.college || ""}</div>
                        ${
                          matchedKeywords.length > 0
                            ? `<div class="text-xs text-blue-500 mt-0.5">
                                <i class="fas fa-search mr-1"></i>${matchedKeywords.join(
                                  ", "
                                )} 검색어로 매칭
                              </div>`
                            : ""
                        }
                      </div>
                    </div>
                    <button
                      type="button"
                      class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                      onclick="if(typeof window.addParticipantToEventQuick === 'function') window.addParticipantToEventQuick('${eventId}', '${
                        member.studentId
                      }', '${saf(member.name).replace(/'/g, "\\'")}')"
                    >
                      <i class="fas fa-plus mr-1"></i>추가
                    </button>
                  </div>
                `;
        })
        .join("");
    }
  };

  searchInput.addEventListener("input", (e) => {
    searchParticipants(e.target.value);
  });

  // 초기 검색어가 있으면 검색 실행
  if (searchInput.value) {
    searchParticipants(searchInput.value);
  }
}

// 참가자 추가 모달 닫기
export function closeAddParticipantModal() {
  const modal = document.getElementById("add-participant-modal");
  if (modal) {
    modal.remove();
  }
}

// 빠른 참가자 추가 함수 (검색 결과에서 바로 추가)
export async function addParticipantToEventQuick(
  eventId,
  studentId,
  memberName
) {
  try {
    const { eventsData } = state;
    const event = eventsData.find((e) => e.id === eventId);
    if (!event) {
      showAlert("😥", "이벤트를 찾을 수 없습니다.");
      return;
    }

    // 미식회인 경우 식당 선택 확인
    if (event.type === "tasting" && event.restaurants) {
      const restaurantSelect = document.getElementById(
        "participant-restaurant-select"
      );
      if (!restaurantSelect) {
        showAlert("⚠️", "식당을 선택해주세요.");
        return;
      }
    }

    const member = { studentId, name: memberName };
    await addParticipantToEvent(eventId, member);

    // 모달 새로고침
    setTimeout(() => {
      const event = eventsData.find((e) => e.id === eventId);
      if (event) {
        openAddParticipantModal(eventId);
      }
    }, 500);

    showAlert("✅", `${memberName} 회원이 추가되었습니다.`);
  } catch (error) {
    console.error("참가자 추가 오류:", error);
    showAlert("😥", "참가자 추가에 실패했습니다: " + error.message);
  }
}

// 참가자 제거 함수
export async function removeParticipantFromEvent(
  eventId,
  studentId,
  restaurantId,
  memberName
) {
  if (
    !confirm(`정말로 ${memberName} 회원을 이벤트에서 제거하시겠습니까?`)
  ) {
    return;
  }

  try {
    const eventRef = doc(db, "events", eventId);

    await runTransaction(
      db,
      async (transaction) => {
        const eventDoc = await transaction.get(eventRef);
        if (!eventDoc.exists()) {
          throw new Error("이벤트를 찾을 수 없습니다.");
        }

        const eventData = eventDoc.data();

        if (
          eventData.type === "tasting" &&
          eventData.restaurants &&
          restaurantId
        ) {
          // 미식회인 경우 특정 식당에서 제거
          const restaurants = [...(eventData.restaurants || [])];
          const restaurantIndex = restaurants.findIndex(
            (r) => r.id === restaurantId
          );

          if (restaurantIndex === -1) {
            throw new Error("식당을 찾을 수 없습니다.");
          }

          const restaurant = restaurants[restaurantIndex];
          const reservations = [
            ...(restaurant.reservations || []),
          ].filter((r) => r.studentId !== studentId);
          const waiting = [...(restaurant.waiting || [])].filter(
            (w) => w.studentId !== studentId
          );

          restaurant.reservations = reservations;
          restaurant.waiting = waiting;
          restaurants[restaurantIndex] = restaurant;

          transaction.update(eventRef, { restaurants });
        } else {
          // 일반 이벤트인 경우
          const applicants = [...(eventData.applicants || [])].filter(
            (a) => a.studentId !== studentId
          );
          const waiting = [...(eventData.waiting || [])].filter(
            (w) => w.studentId !== studentId
          );

          transaction.update(eventRef, { applicants, waiting });
        }
      },
      TRANSACTION_OPTIONS
    );

    showAlert("✅", `${memberName} 회원이 제거되었습니다.`);

    // 모달 새로고침
    setTimeout(() => {
      const { eventsData } = state;
      const event = eventsData.find((e) => e.id === eventId);
      if (event) {
        openAddParticipantModal(eventId);
      }
    }, 500);

    // 전체 화면 새로고침
    if (typeof window.scheduleRender === "function") {
      window.scheduleRender();
    }
  } catch (error) {
    console.error("참가자 제거 오류:", error);
    if (error?.code === "resource-exhausted")
      showAlert(
        "😥",
        "요청이 너무 많아 잠시 후 다시 시도해주세요.<br>불편을 드려 죄송합니다."
      );
    else showAlert("😥", "참가자 제거에 실패했습니다: " + error.message);
  }
}

// 참가자 공개/비공개 토글 (일반 이벤트)
export async function toggleParticipantsPublicVisibility(
  eventId,
  type
) {
  if (!isFullAdmin()) return;

  try {
    const { eventsData } = state;
    const ev = eventsData.find((e) => e.id === eventId);
    if (!ev) {
      showAlert("😥", "이벤트를 찾을 수 없습니다.");
      return;
    }

    const fieldName =
      type === "applicants"
        ? "participantsVisibleToAll"
        : "waitingVisibleToAll";
    const currentValue = ev[fieldName] || false;
    const newValue = !currentValue;

    await updateDoc(doc(db, "events", eventId), {
      [fieldName]: newValue,
    });

    showAlert(
      "✅",
      newValue
        ? "모두에게 보이도록 설정되었습니다."
        : "회장단만 볼 수 있도록 설정되었습니다."
    );
    // renderReservationTab은 전역 함수로 접근
    if (typeof window.renderReservationTab === "function") {
      window.renderReservationTab(isFullAdmin());
    }
  } catch (error) {
    console.error("참가자 공개 설정 변경 오류:", error);
    showAlert("😥", "설정 변경에 실패했습니다.");
  }
}

// 참가자 공개/비공개 토글 (미식회)
export async function toggleRestaurantParticipantsPublicVisibility(
  eventId,
  restaurantId,
  type
) {
  if (!isFullAdmin()) return;

  try {
    const { eventsData } = state;
    const ev = eventsData.find((e) => e.id === eventId);
    if (!ev) {
      showAlert("😥", "이벤트를 찾을 수 없습니다.");
      return;
    }

    const fieldName =
      type === "reservations"
        ? "participantsVisibleToAll"
        : "waitingVisibleToAll";
    const currentValue = ev[fieldName] || false;
    const newValue = !currentValue;

    await updateDoc(doc(db, "events", eventId), {
      [fieldName]: newValue,
    });

    showAlert(
      "✅",
      newValue
        ? "모두에게 보이도록 설정되었습니다."
        : "회장단만 볼 수 있도록 설정되었습니다."
    );
    // renderReservationTab은 전역 함수로 접근
    if (typeof window.renderReservationTab === "function") {
      window.renderReservationTab(isFullAdmin());
    }
  } catch (error) {
    console.error("참가자 공개 설정 변경 오류:", error);
    showAlert("😥", "설정 변경에 실패했습니다.");
  }
}

