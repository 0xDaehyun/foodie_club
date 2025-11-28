// 로드맵 이벤트 관리 모듈
// 버전: 2025-01-27

import { state } from "../../state.js";
import { showAlert, saf } from "../../utils.js";
import { db } from "../../firebase.js";
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

// 활동 상세 토글
export function toggleActivityDetails(eventId) {
  const details = document.getElementById(`details-${eventId}`);
  const chevron = document.getElementById(`chevron-${eventId}`);

  if (details && chevron) {
    if (details.classList.contains("hidden")) {
      details.classList.remove("hidden");
      chevron.style.transform = "rotate(180deg)";
    } else {
      details.classList.add("hidden");
      chevron.style.transform = "rotate(0deg)";
    }
  }
}

// 새 일정 추가 모달 열기
export function openAddEventModal(selectedDate) {
  const { currentUser } = state;
  
  // 회장단(풀 어드민)만 새 일정 추가 가능
  if (!currentUser || !(typeof window.isFullAdmin === "function" && window.isFullAdmin())) {
    showAlert("ℹ️", "푸디 캘린더는 회장단만 수정/추가할 수 있습니다.");
    return;
  }

  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  modal.innerHTML = `
          <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-gray-800">새 일정 추가</h3>
              <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times"></i>
              </button>
            </div>

            <form id="calendar-add-event-form">
              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">일정명</label>
                <input
                  id="calendar-event-name"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="일정명을 입력하세요"
                  required
                >
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">날짜</label>
                <input
                  id="calendar-event-date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value="${selectedDate}"
                  required
                >
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  id="calendar-event-description"
                  rows="5"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="일정 설명을 입력하세요&#10;줄바꿈이 가능합니다"
                ></textarea>
                <p class="text-xs text-gray-500 mt-1">💡 Enter 키로 줄바꿈이 가능합니다</p>
              </div>

              <div class="flex justify-end gap-2">
                <button
                  type="button"
                  onclick="this.closest('.fixed').remove()"
                  class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                >
                  일정 추가
                </button>
              </div>
            </form>
          </div>
        `;

  document.body.appendChild(modal);

  // 폼 제출 이벤트 처리
  modal
    .querySelector("#calendar-add-event-form")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = document.getElementById("calendar-event-name").value;
      const date = document.getElementById("calendar-event-date").value;
      const description = document.getElementById(
        "calendar-event-description"
      ).value;

      if (!name || !date) {
        showAlert("😥", "일정명과 날짜는 필수입니다.");
        return;
      }

      try {
        // roadmapData에서 최대 order 값 찾기
        const { roadmapData } = state;
        const maxOrder = Math.max(
          ...(roadmapData || []).map((e) => e.order || 0),
          0
        );
        const newOrder = maxOrder + 1;

        await addDoc(collection(db, "roadmap"), {
          activityName: name,
          activityDate: date,
          description: description || "",
          order: newOrder,
          createdAt: new Date().toISOString(),
        });

        showAlert("✅", "일정이 추가되었습니다!");
        modal.remove();
        
        // 로드맵은 onSnapshot으로 자동 업데이트됨
      } catch (error) {
        console.error("일정 추가 오류:", error);
        showAlert("😥", "일정 추가에 실패했습니다.");
      }
    });
}


