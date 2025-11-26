// 카카오 SDK 초기화 및 관리

/**
 * 카카오 SDK 초기화
 * @param {string} jsKey - 카카오 JavaScript 키
 */
export function initKakao(jsKey) {
  if (!window.Kakao) {
    console.error("Kakao SDK가 로드되지 않았습니다.");
    return false;
  }

  if (!Kakao.isInitialized()) {
    Kakao.init(jsKey);
    console.log("✅ Kakao SDK 초기화 완료:", Kakao.isInitialized());
  }

  return Kakao.isInitialized();
}

/**
 * 카카오 로그인
 * @returns {Promise<Object>} 인증 객체 (access_token, refresh_token 등)
 */
export function kakaoLogin() {
  return new Promise((resolve, reject) => {
    Kakao.Auth.login({
      success: (authObj) => {
        console.log("✅ 카카오 로그인 성공:", authObj);
        resolve(authObj);
      },
      fail: (err) => {
        console.error("❌ 카카오 로그인 실패:", err);
        reject(err);
      },
    });
  });
}

/**
 * 카카오 로그아웃
 */
export function kakaoLogout() {
  return new Promise((resolve, reject) => {
    if (!Kakao.Auth.getAccessToken()) {
      resolve();
      return;
    }

    Kakao.Auth.logout(() => {
      console.log("✅ 카카오 로그아웃 완료");
      resolve();
    });
  });
}

/**
 * 카카오톡 "나에게 보내기" 메시지 전송
 * @param {Object} messageData - 메시지 데이터 { title, description, link }
 */
export async function sendKakaoMessage(messageData) {
  if (!Kakao.Auth.getAccessToken()) {
    throw new Error("카카오 로그인이 필요합니다.");
  }

  try {
    await Kakao.API.request({
      url: "/v2/api/talk/memo/default/send",
      data: {
        template_object: {
          object_type: "text",
          text: messageData.text,
          link: {
            web_url: messageData.link || window.location.href,
            mobile_web_url: messageData.link || window.location.href,
          },
        },
      },
    });
    console.log("✅ 카카오톡 메시지 전송 완료");
    return true;
  } catch (error) {
    console.error("❌ 카카오톡 메시지 전송 실패:", error);
    return false;
  }
}

/**
 * 카카오 액세스 토큰 확인
 * @returns {string|null} 액세스 토큰 또는 null
 */
export function getKakaoAccessToken() {
  return Kakao.Auth.getAccessToken();
}

/**
 * 카카오 연동 상태 확인
 * @returns {boolean} 연동 여부
 */
export function isKakaoConnected() {
  return !!Kakao.Auth.getAccessToken();
}

// 카카오 SDK export
export const Kakao = window.Kakao;



































