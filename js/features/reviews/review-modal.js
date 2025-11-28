// 리뷰 기능 모듈
// 버전: 2025-01-27

import { state } from "../../state.js";
import { showAlert, saf } from "../../utils.js";
import { db, doc, runTransaction, getDoc } from "../../firebase.js";

const TRANSACTION_OPTIONS = { maxAttempts: 1 };

// 유틸리티 함수들 (index.html에서 정의된 것들)
const toDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.toDate === "function"
  ) {
    try {
      const converted = value.toDate();
      if (
        converted instanceof Date &&
        !Number.isNaN(converted.getTime())
      ) {
        return converted;
      }
    } catch (err) {
      // ignore conversion errors
    }
  }
  if (typeof value === "number") {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value === "string") {
    const fromString = new Date(value);
    return Number.isNaN(fromString.getTime()) ? null : fromString;
  }
  return null;
};

const typeLabel = (t) =>
  ({
    tasting: "미식회",
    general: "일반",
    mt: "MT",
    assembly: "총회",
  }[t] || t);

// 리뷰 모달 열기
export function openReviewModal(eventId) {
  const { eventsData, currentUser } = state;
  const event = eventsData.find((e) => e.id === eventId);
  if (!event) return;

  // MT와 총회는 후기 작성 불가
  if (event.type === "mt" || event.type === "assembly") {
    showAlert("ℹ️", "MT와 총회는 후기 작성이 필요하지 않습니다.");
    return;
  }

  const existingReview = event.reviews?.find(
    (r) => r.studentId === currentUser?.studentId
  );

  const formatReviewDateTime = (value) => {
    const date = toDateSafe(value);
    if (!date) return "일시 미정";
    const weekday = date.toLocaleDateString("ko-KR", {
      weekday: "short",
    });
    return `${date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} (${weekday}) ${date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  // getParticipationDetails는 전역 함수로 접근
  const participation =
    typeof window.getParticipationDetails === "function"
      ? window.getParticipationDetails(event)
      : {
          restaurantName: "",
          restaurantInfo: null,
          restaurantId: null,
        };

  const typeLabelText = typeLabel(event.type) || "이벤트";
  const eventDateDisplay = formatReviewDateTime(event.datetime);
  const highlightTitle =
    event.type === "tasting" && participation.restaurantName
      ? participation.restaurantName
      : event.title || "이벤트";
  const highlightSubtitle =
    event.type === "tasting" && participation.restaurantName
      ? event.title || ""
      : "";
  const selectedRestaurant =
    event.type === "tasting" && Array.isArray(event.restaurants)
      ? event.restaurants.find((restaurant) => {
          const rid =
            restaurant.id ||
            restaurant.rid ||
            restaurant.restaurantId ||
            restaurant.name ||
            "";
          if (participation.restaurantId) {
            return participation.restaurantId === rid;
          }
          return (restaurant.name || "") === participation.restaurantName;
        }) || null
      : null;
  const highlightMenu = selectedRestaurant?.info || "";
  const highlightStats =
    event.type === "tasting" && participation.restaurantInfo
      ? `
                <div class="mt-3 flex flex-wrap justify-center gap-2 text-[11px] md:text-xs text-orange-700">
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-white/70 rounded-full border border-orange-200">
                    <i class="fas fa-users"></i>정원 ${
                      participation.restaurantInfo.capacity ?? "-"
                    }명
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-white/70 rounded-full border border-orange-200">
                    <i class="fas fa-user-check"></i>신청 ${
                      participation.restaurantInfo.reservations ?? 0
                    }명
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-1 bg-white/70 rounded-full border border-orange-200">
                    <i class="fas fa-user-clock"></i>대기 ${
                      participation.restaurantInfo.waiting ?? 0
                    }명
                  </span>
                </div>
              `
      : "";
  const highlightSection = `
          <div class="rounded-3xl bg-gradient-to-br from-orange-100 via-white to-orange-50 border border-orange-200 shadow-sm px-4 py-5 text-center space-y-2">
            <div class="inline-flex items-center justify-center gap-2 text-[11px] md:text-xs font-semibold uppercase tracking-wider text-orange-600">
              <i class="fas fa-pen-nib"></i>${saf(typeLabelText)} 후기
            </div>
            <div class="text-2xl md:text-3xl font-black text-orange-900 leading-tight">
              ${saf(highlightTitle)}
            </div>
            <div class="text-sm md:text-base font-semibold text-gray-800 tracking-tight">
              ${saf(eventDateDisplay)}
            </div>
            ${
              highlightSubtitle
                ? `<div class="text-[12px] md:text-sm text-gray-500">${saf(
                    highlightSubtitle
                  )}</div>`
                : ""
            }
            ${
              highlightMenu
                ? `<div class="mt-3 inline-flex items-start gap-2 rounded-2xl bg-white/80 px-3 py-2 text-left text-xs md:text-sm text-gray-700 border border-orange-200 shadow-inner">
                    <span class="text-orange-500 font-semibold flex items-center gap-1">
                      <i class="fas fa-utensils"></i>대표 메뉴
                    </span>
                    <span class="font-medium leading-snug">${saf(
                      highlightMenu
                    )}</span>
                  </div>`
                : ""
            }
            ${highlightStats}
          </div>
        `;

  document.getElementById(
    "review-modal-title"
  ).textContent = `${event.title} 평가`;
  document.getElementById("review-modal-content").innerHTML = `
          <div class="space-y-4 md:space-y-5">
            ${highlightSection}

            <div>
              <label class="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">평점</label>
              <div class="flex gap-0.5 md:gap-1 mb-1 md:mb-2 items-center justify-center" id="rating-stars">
                ${Array.from({ length: 5 }, (_, i) => {
                  const rating = i + 1;
                  const currentRating = existingReview?.rating || 0;
                  const isSelected = rating <= currentRating;

                  return `<button type="button" class="star-rating-btn text-2xl md:text-3xl transition-all hover:scale-110 active:scale-95" data-rating="${rating}">
                    <i class="fas fa-star ${
                      isSelected ? "text-yellow-400" : "text-gray-300"
                    }"></i>
                  </button>`;
                }).join("")}
              </div>
              <p class="text-xs text-gray-500 text-center hidden md:block">
                1점 단위로 평가할 수 있습니다 (별을 클릭하세요)
              </p>
              <div class="text-center mt-1 md:mt-2">
                <span class="text-xl md:text-2xl font-bold text-orange-600" id="current-rating-display">${
                  existingReview?.rating || 0
                }</span>
                <span class="text-xs md:text-sm text-gray-600">점</span>
              </div>
            </div>

            <div>
              <label for="review-comment" class="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                후기 <span class="text-gray-500 font-normal">(선택사항)</span>
              </label>
              <textarea
                id="review-comment"
                rows="3"
                class="md:rows-4 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                placeholder="이벤트에 대한 소감이나 후기를 남겨주세요... (별점만 선택해도 저장됩니다)"
                autocomplete="off"
                spellcheck="false"
                data-no-autocomplete="true"
                data-lpignore="true"
                data-form-type="other">${
                  existingReview?.comment || ""
                }</textarea>
            </div>

            <div class="flex gap-2 md:gap-3 pt-2 md:pt-4">
              <button type="button" id="save-review" class="flex-1 bg-orange-500 text-white py-2 px-3 md:px-4 rounded-lg hover:bg-orange-600 transition-colors text-sm">
                <i class="fas fa-save mr-1 md:mr-2"></i>
                ${existingReview ? "수정하기" : "저장하기"}
              </button>
              <button type="button" id="cancel-review" class="flex-1 bg-gray-500 text-white py-2 px-3 md:px-4 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                취소
              </button>
            </div>
          </div>
        `;

  // 별점 클릭 이벤트
  let selectedRating = existingReview?.rating || 0;

  const updateStarDisplay = (rating) => {
    document.querySelectorAll(".star-rating-btn").forEach((btn) => {
      const btnRating = parseFloat(btn.dataset.rating);
      const star = btn.querySelector("i");

      // star 요소가 존재하는지 확인
      if (star) {
        // 모든 색상 클래스와 스타일 초기화
        star.classList.remove(
          "text-gray-300",
          "text-yellow-300",
          "text-yellow-400"
        );
        star.style.opacity = "";

        // 선택된 별점에 따라 색상 적용
        if (btnRating <= rating && rating > 0) {
          star.classList.add("text-yellow-400");
          star.style.opacity = "1";
        } else {
          star.classList.add("text-gray-300");
          star.style.opacity = "1";
        }

        star.style.transition = "color 0.2s ease, opacity 0.2s ease";
      }
    });

    // 현재 점수 표시 업데이트
    const ratingDisplay = document.getElementById("current-rating-display");
    if (ratingDisplay) {
      ratingDisplay.textContent = rating || 0;
      ratingDisplay.style.transition = "all 0.2s ease";
      if (rating > 0) {
        ratingDisplay.style.transform = "scale(1.1)";
        setTimeout(() => {
          ratingDisplay.style.transform = "scale(1)";
        }, 200);
      }
    }
  };

  // 초기 별점 표시 업데이트
  updateStarDisplay(selectedRating);

  // 별 클릭 이벤트
  document.querySelectorAll(".star-rating-btn").forEach((btn) => {
    // 호버 효과: 마우스 올렸을 때 미리보기
    btn.addEventListener("mouseenter", () => {
      const hoverRating = parseFloat(btn.dataset.rating);
      document.querySelectorAll(".star-rating-btn").forEach((b) => {
        const bRating = parseFloat(b.dataset.rating);
        const star = b.querySelector("i");
        if (star) {
          // 호버 시에만 미리보기 (연한 노란색)
          if (bRating <= hoverRating) {
            star.classList.remove("text-gray-300", "text-yellow-400");
            star.classList.add("text-yellow-300");
            star.style.opacity = "0.8";
          } else {
            star.classList.remove("text-yellow-300", "text-yellow-400");
            star.classList.add("text-gray-300");
            star.style.opacity = "0.5";
          }
        }
      });
    });

    // 호버 아웃: 실제 선택된 별점으로 복원
    btn.addEventListener("mouseleave", () => {
      updateStarDisplay(selectedRating);
    });

    // 클릭 이벤트 - 즉시 색상 반영
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      selectedRating = parseFloat(btn.dataset.rating);

      // 즉시 색상 업데이트
      updateStarDisplay(selectedRating);

      // 클릭 피드백 애니메이션
      btn.style.transform = "scale(0.9)";
      setTimeout(() => {
        btn.style.transform = "scale(1)";
      }, 150);

      // 호버 이벤트 제거 후 다시 추가 (확실한 상태 복원)
      setTimeout(() => {
        updateStarDisplay(selectedRating);
      }, 200);
    });
  });

  // 저장 버튼 이벤트
  document
    .getElementById("save-review")
    .addEventListener("click", async () => {
      const comment = document
        .getElementById("review-comment")
        .value.trim();

      // 별점만 있어도 저장 가능 (별점 필수, 텍스트는 선택사항)
      if (selectedRating === 0) {
        showAlert("⚠️", "평점을 선택해주세요.");
        return;
      }

      try {
        // 별점만 있어도 리뷰 저장 (comment는 빈 문자열이어도 됨)
        await saveEventReview(eventId, selectedRating, comment || "");
        closeReviewModal();
        // renderHistoryTab와 renderRoadmapTab는 전역 함수로 접근
        if (typeof window.renderHistoryTab === "function") {
          const isAdmin =
            typeof window.isAdmin === "function" ? window.isAdmin() : false;
          window.renderHistoryTab(isAdmin);
        }
        const message = comment
          ? "평가가 저장되었습니다."
          : "별점 평가가 저장되었습니다.";
        showAlert("✅", message);
      } catch (error) {
        showAlert("😥", "평가 저장 중 오류가 발생했습니다.");
      }
    });

  // 취소 버튼 이벤트
  document
    .getElementById("cancel-review")
    .addEventListener("click", closeReviewModal);

  document.getElementById("review-modal").classList.remove("hidden");
}

// 리뷰 저장
export async function saveEventReview(eventId, rating, comment) {
  const { eventsData, currentUser } = state;
  const eventRef = doc(db, "events", eventId);

  await runTransaction(
    db,
    async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists())
        throw new Error("이벤트를 찾을 수 없습니다.");

      const eventData = eventDoc.data();
      const reviews = eventData.reviews || [];

      // 기존 평가 찾아서 업데이트하거나 새로 추가
      const existingIndex = reviews.findIndex(
        (r) => r.studentId === currentUser?.studentId
      );
      const review = {
        studentId: currentUser?.studentId,
        studentName: currentUser?.name,
        name: currentUser?.name, // 리뷰 화면에서 사용하는 필드
        rating: rating,
        comment: comment || "", // 텍스트는 선택사항 (빈 문자열 허용)
        timestamp: new Date().toISOString(),
        createdAt:
          existingIndex >= 0
            ? reviews[existingIndex].createdAt
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        reviews[existingIndex] = review;
      } else {
        reviews.push(review);
      }

      transaction.update(eventRef, { reviews: reviews });
    },
    TRANSACTION_OPTIONS
  );

  // eventsData 업데이트
  const eventIndex = eventsData.findIndex((e) => e.id === eventId);
  let updatedEventData = null;
  if (eventIndex >= 0) {
    const eventDoc = await getDoc(eventRef);
    if (eventDoc.exists()) {
      updatedEventData = { id: eventDoc.id, ...eventDoc.data() };
      eventsData[eventIndex] = updatedEventData;
      // 리뷰 탭이 활성화되어 있으면 다시 렌더링
      if (
        typeof window.currentMainTab !== "undefined" &&
        window.currentMainTab === "roadmap"
      ) {
        if (typeof window.scheduleRender === "function") {
          window.scheduleRender();
        }
      }
    }
  }

  // 미식회인 경우 미식회 후기 화면이 자동으로 업데이트되도록 보장
  if (updatedEventData && updatedEventData.type === "tasting") {
    // 미식회 후기 화면을 다시 렌더링하기 위해 roadmap 탭을 다시 렌더링
    setTimeout(() => {
      if (
        typeof window.currentMainTab !== "undefined" &&
        window.currentMainTab === "roadmap"
      ) {
        if (typeof window.renderRoadmapTab === "function") {
          const isAdmin =
            typeof window.isAdmin === "function" ? window.isAdmin() : false;
          window.renderRoadmapTab(isAdmin);
        }
      }
    }, 100);
  }
}

// 리뷰 모달 닫기
export function closeReviewModal() {
  document.getElementById("review-modal")?.classList.add("hidden");
}

