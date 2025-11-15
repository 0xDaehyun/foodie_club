// 카카오톡 알림 기능
import { sendKakaoMessage, isKakaoConnected } from "../../config/kakao-config.js";

/**
 * 이벤트 신청 완료 알림 (MT/총회)
 * @param {Object} eventData - 이벤트 정보
 */
export async function notifyEventApplication(eventData) {
  if (!isKakaoConnected()) {
    console.log("ℹ️ 카카오 연동 안 됨 - 알림 생략");
    return false;
  }

  const messageText = `✅ ${eventData.title} 신청 완료!\n\n` +
    `💰 입금 정보\n` +
    `금액: ${eventData.amount}원\n` +
    `계좌: ${eventData.bank} ${eventData.account}\n` +
    `예금주: ${eventData.holder}\n\n` +
    `📌 ${eventData.note || "신청 후 24시간 이내 입금해주세요."}`;

  try {
    const success = await sendKakaoMessage({
      text: messageText,
      link: window.location.href,
    });

    if (success) {
      console.log("✅ 이벤트 신청 알림 전송 완료");
    }

    return success;
  } catch (error) {
    console.error("❌ 이벤트 신청 알림 전송 실패:", error);
    return false;
  }
}

/**
 * 미식회 신청 완료 알림
 * @param {Object} eventData - 미식회 정보
 * @param {Object} restaurantData - 식당 정보
 */
export async function notifyTastingApplication(eventData, restaurantData) {
  if (!isKakaoConnected()) {
    console.log("ℹ️ 카카오 연동 안 됨 - 알림 생략");
    return false;
  }

  const messageText = `✅ ${eventData.title} 신청 완료!\n\n` +
    `🍽️ 선택한 식당\n` +
    `이름: ${restaurantData.name}\n` +
    `카테고리: ${restaurantData.category}\n` +
    `정원: ${restaurantData.maxCapacity}명\n\n` +
    `📅 일시: ${eventData.date}\n` +
    `📍 위치는 추후 공지됩니다.`;

  try {
    const success = await sendKakaoMessage({
      text: messageText,
      link: window.location.href,
    });

    if (success) {
      console.log("✅ 미식회 신청 알림 전송 완료");
    }

    return success;
  } catch (error) {
    console.error("❌ 미식회 신청 알림 전송 실패:", error);
    return false;
  }
}

/**
 * 일반 이벤트 신청 완료 알림
 * @param {Object} eventData - 이벤트 정보
 */
export async function notifyGeneralApplication(eventData) {
  if (!isKakaoConnected()) {
    console.log("ℹ️ 카카오 연동 안 됨 - 알림 생략");
    return false;
  }

  const messageText = `✅ ${eventData.title} 신청 완료!\n\n` +
    `📅 일시: ${eventData.date}\n` +
    `📍 장소: ${eventData.location || "추후 공지"}\n` +
    `👥 정원: ${eventData.maxCapacity}명\n\n` +
    `자세한 내용은 앱에서 확인하세요!`;

  try {
    const success = await sendKakaoMessage({
      text: messageText,
      link: window.location.href,
    });

    if (success) {
      console.log("✅ 일반 이벤트 신청 알림 전송 완료");
    }

    return success;
  } catch (error) {
    console.error("❌ 일반 이벤트 신청 알림 전송 실패:", error);
    return false;
  }
}

/**
 * 이벤트 타입에 맞는 알림 자동 전송
 * @param {string} eventType - 이벤트 타입 (tasting, general, mt, assembly)
 * @param {Object} eventData - 이벤트 정보
 * @param {Object} additionalData - 추가 정보 (식당 정보 등)
 */
export async function autoNotify(eventType, eventData, additionalData = {}) {
  switch (eventType) {
    case "tasting":
      return await notifyTastingApplication(eventData, additionalData.restaurant);
    case "mt":
    case "assembly":
      return await notifyEventApplication(eventData);
    case "general":
      return await notifyGeneralApplication(eventData);
    default:
      console.warn("⚠️ 알 수 없는 이벤트 타입:", eventType);
      return false;
  }
}




























