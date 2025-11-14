// 카카오톡 알림 전송 기능
// 동아리 카카오 계정을 통해 회원들에게 알림을 전송합니다.

/**
 * 동아리 카카오 계정 친구추가 안내 모달 표시
 */
export function showKakaoFriendAddGuide() {
  // 동아리 카카오 계정 정보 (설정에서 가져올 수 있도록)
  const CLUB_KAKAO_ID = "동아리카카오계정"; // 실제 카카오톡 ID로 변경 필요
  const CLUB_KAKAO_NAME = "푸디 동아리"; // 동아리 이름
  
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black/50 flex justify-center items-center px-4 z-[9999]";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-gray-800">📱 카카오톡 알림 받기</h3>
        <button 
          id="close-kakao-guide-modal"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <div class="space-y-4">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-sm text-gray-700 mb-3">
            <strong>${CLUB_KAKAO_NAME}</strong> 카카오톡 계정을 친구로 추가하시면<br>
            활동 신청, 취소, 대기순번 변경 등 중요한 알림을 받을 수 있습니다!
          </p>
          
          <div class="bg-white rounded-lg p-3 border border-yellow-300">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xl font-bold">
                푸
              </div>
              <div>
                <p class="font-semibold text-gray-800">${CLUB_KAKAO_NAME}</p>
                <p class="text-xs text-gray-500">카카오톡 ID: <span class="font-mono">${CLUB_KAKAO_ID}</span></p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="space-y-2">
          <h4 class="font-semibold text-gray-800 text-sm">📌 알림을 받을 수 있는 경우:</h4>
          <ul class="text-sm text-gray-600 space-y-1 ml-4">
            <li>• 활동 신청 완료</li>
            <li>• 활동 취소 완료</li>
            <li>• 대기순번에서 확정으로 변경</li>
            <li>• 활동 정보 변경</li>
          </ul>
        </div>
        
        <div class="flex gap-2 pt-2">
          <button
            id="open-kakao-talk-btn"
            class="flex-1 px-4 py-3 bg-[#FEE500] hover:bg-[#FDD835] text-gray-900 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z" />
            </svg>
            카카오톡에서 친구추가
          </button>
          <button
            id="close-kakao-guide-btn"
            class="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 닫기 버튼 이벤트
  const closeBtn = modal.querySelector("#close-kakao-guide-modal");
  const laterBtn = modal.querySelector("#close-kakao-guide-btn");
  const openKakaoBtn = modal.querySelector("#open-kakao-talk-btn");
  
  const closeModal = () => {
    modal.remove();
  };
  
  closeBtn?.addEventListener("click", closeModal);
  laterBtn?.addEventListener("click", closeModal);
  
  // 카카오톡 열기 버튼
  openKakaoBtn?.addEventListener("click", () => {
    // 카카오톡 앱에서 친구 추가 페이지로 이동
    // 카카오톡 URL 스킴 사용 (실제 카카오톡 ID로 변경 필요)
    const kakaoTalkUrl = `kakaotalk://plusfriend/add/${CLUB_KAKAO_ID}`;
    const webUrl = `https://pf.kakao.com/_${CLUB_KAKAO_ID}`; // 카카오톡 채널 URL
    
    // 모바일에서는 카카오톡 앱 열기 시도, 실패 시 웹으로
    window.location.href = kakaoTalkUrl;
    
    // 앱이 없으면 웹으로 이동
    setTimeout(() => {
      window.open(webUrl, "_blank");
    }, 500);
    
    closeModal();
  });
  
  // 모달 외부 클릭 시 닫기
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

/**
 * 동아리 카카오 계정으로 알림 전송
 * @param {string} userId - 회원의 카카오 User ID
 * @param {string} message - 전송할 메시지
 * @returns {Promise<boolean>} 전송 성공 여부
 */
export async function sendClubKakaoNotification(userId, message) {
  try {
    // 동아리 카카오 계정의 REST API 키 사용
    // 실제 구현 시 서버 사이드에서 처리하는 것이 안전합니다
    const CLUB_KAKAO_REST_API_KEY = ""; // 동아리 카카오 계정의 REST API 키
    
    if (!CLUB_KAKAO_REST_API_KEY) {
      console.warn("⚠️ 동아리 카카오 계정 REST API 키가 설정되지 않았습니다.");
      return false;
    }
    
    // 카카오톡 메시지 API를 사용하여 알림 전송
    // 실제 구현은 서버 사이드에서 처리하는 것을 권장합니다
    const response = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
      method: "POST",
      headers: {
        "Authorization": `KakaoAK ${CLUB_KAKAO_REST_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        template_object: JSON.stringify({
          object_type: "text",
          text: message,
          link: {
            web_url: window.location.href,
            mobile_web_url: window.location.href,
          },
        }),
      }),
    });
    
    if (response.ok) {
      console.log("✅ 카카오톡 알림 전송 완료");
      return true;
    } else {
      console.error("❌ 카카오톡 알림 전송 실패:", await response.text());
      return false;
    }
  } catch (error) {
    console.error("❌ 카카오톡 알림 전송 오류:", error);
    return false;
  }
}

/**
 * 활동 신청 완료 알림
 * @param {Object} eventData - 이벤트 정보
 * @param {Object} userData - 사용자 정보
 */
export async function notifyActivityReservation(eventData, userData) {
  if (!userData?.kakaoUserId) {
    console.log("ℹ️ 카카오 연동 안 됨 - 알림 생략");
    return false;
  }
  
  const message = `✅ ${eventData.title} 신청 완료!\n\n` +
    `📅 일시: ${eventData.datetime || "추후 공지"}\n` +
    `📍 장소: ${eventData.location || "추후 공지"}\n\n` +
    `자세한 내용은 앱에서 확인하세요!`;
  
  return await sendClubKakaoNotification(userData.kakaoUserId, message);
}

/**
 * 활동 취소 완료 알림
 * @param {Object} eventData - 이벤트 정보
 * @param {Object} userData - 사용자 정보
 */
export async function notifyActivityCancellation(eventData, userData) {
  if (!userData?.kakaoUserId) {
    console.log("ℹ️ 카카오 연동 안 됨 - 알림 생략");
    return false;
  }
  
  const message = `🗑️ ${eventData.title} 신청이 취소되었습니다.\n\n` +
    `다른 활동에 참여해보세요!`;
  
  return await sendClubKakaoNotification(userData.kakaoUserId, message);
}

/**
 * 대기순번에서 확정으로 변경 알림
 * @param {Object} eventData - 이벤트 정보
 * @param {Object} userData - 사용자 정보
 */
export async function notifyWaitlistToConfirmed(eventData, userData) {
  if (!userData?.kakaoUserId) {
    console.log("ℹ️ 카카오 연동 안 됨 - 알림 생략");
    return false;
  }
  
  const message = `🎉 ${eventData.title} 대기순번에서 확정되었습니다!\n\n` +
    `📅 일시: ${eventData.datetime || "추후 공지"}\n` +
    `📍 장소: ${eventData.location || "추후 공지"}\n\n` +
    `활동에 참여할 수 있습니다!`;
  
  return await sendClubKakaoNotification(userData.kakaoUserId, message);
}

