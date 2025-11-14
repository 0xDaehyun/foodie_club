// /js/mypage.js
// 마이페이지 탭 렌더링
import { state } from "./state.js";
import { saf } from "./utils.js";
import { linkKakaoAccount, unlinkKakaoAccount } from "./auth.js";
import { scheduleRender } from "./utils.js";

export function renderMyPageTab() {
  const container = document.getElementById("mypage-tab");
  if (!container) return;

  const user = state.currentUser;
  if (!user) {
    container.innerHTML = `<div class="section text-center py-8">
      <p class="text-gray-500">로그인이 필요합니다.</p>
    </div>`;
    return;
  }

  const isKakaoLinked = !!user.kakaoUserId;
  const kakaoProfileImage = user.kakaoProfileImage || null;
  const kakaoNickname = user.kakaoNickname || null;

  container.innerHTML = `
    <div class="section">
      <h2 class="text-2xl font-bold text-gray-800 mb-6">마이페이지</h2>
      
      <!-- 사용자 정보 카드 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 flex items-center justify-center text-white text-2xl font-bold">
            ${
              kakaoProfileImage
                ? `<img src="${kakaoProfileImage}" alt="프로필" class="w-full h-full rounded-full object-cover" />`
                : user.name?.charAt(0) || "U"
            }
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-800">${saf(user.name)}</h3>
            <p class="text-sm text-gray-500">학번: ${saf(user.studentId)}</p>
          </div>
        </div>
      </div>

      <!-- 카카오 계정 연동 섹션 -->
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-bold text-gray-800 mb-1">
              <i class="fas fa-comment-dots mr-2 text-yellow-500"></i>카카오 계정 연동
            </h3>
            <p class="text-sm text-gray-500">
              카카오 계정을 연동하면 간편하게 로그인할 수 있습니다.
            </p>
          </div>
          <span class="px-3 py-1 rounded-full text-sm font-medium ${
            isKakaoLinked
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }">
            ${isKakaoLinked ? "연동됨" : "미연동"}
          </span>
        </div>

        ${
          isKakaoLinked
            ? `
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div class="flex items-center gap-3 mb-2">
              ${
                kakaoProfileImage
                  ? `<img src="${kakaoProfileImage}" alt="카카오 프로필" class="w-10 h-10 rounded-full" />`
                  : `<div class="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold">K</div>`
              }
              <div>
                <p class="font-semibold text-gray-800">${saf(
                  kakaoNickname || "카카오 계정"
                )}</p>
                <p class="text-xs text-gray-500">카카오 계정이 연동되어 있습니다</p>
              </div>
            </div>
          </div>
          <button
            id="kakao-unlink-btn"
            type="button"
            class="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
          >
            <i class="fas fa-unlink mr-2"></i>카카오 계정 연동 해제
          </button>
        `
            : `
          <button
            id="kakao-link-btn"
            type="button"
            class="w-full px-4 py-2 bg-[#FEE500] hover:bg-[#FDD835] text-gray-900 rounded-lg font-semibold transition-colors flex items-center justify-center"
          >
            <svg
              class="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"
              />
            </svg>
            카카오 계정 연동하기
          </button>
        `
        }
      </div>
    </div>
  `;

  // 카카오 연동 버튼 이벤트
  const linkBtn = container.querySelector("#kakao-link-btn");
  if (linkBtn) {
    linkBtn.addEventListener("click", async () => {
      linkBtn.disabled = true;
      linkBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i>연동 중...';
      const success = await linkKakaoAccount();
      if (success) {
        scheduleRender();
      } else {
        linkBtn.disabled = false;
        linkBtn.innerHTML = `
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
          </svg>
          카카오 계정 연동하기
        `;
      }
    });
  }

  // 카카오 연동 해제 버튼 이벤트
  const unlinkBtn = container.querySelector("#kakao-unlink-btn");
  if (unlinkBtn) {
    unlinkBtn.addEventListener("click", async () => {
      unlinkBtn.disabled = true;
      unlinkBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin mr-2"></i>해제 중...';
      const success = await unlinkKakaoAccount();
      if (success) {
        scheduleRender();
      } else {
        unlinkBtn.disabled = false;
        unlinkBtn.innerHTML =
          '<i class="fas fa-unlink mr-2"></i>카카오 계정 연동 해제';
      }
    });
  }
}
