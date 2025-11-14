// /js/auth.js
import { state } from "./state.js";
import { showAlert, scheduleRender } from "./utils.js";
import { startPresence, stopPresence } from "./presence.js";
import { db, auth } from "./firebase.js";
import { showKakaoFriendAddGuide } from "./kakao-notifications.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * 관리자 목록 및 직책 정보 1회 로드
 */
async function loadAdminListOnce() {
  try {
    const snap = await getDoc(doc(db, "admins", "list"));
    state.adminList = snap.exists() ? snap.data().studentIds || [] : [];
    const adminPositions = snap.exists() ? snap.data().positions || {} : {};

    // 현재 사용자가 관리자인 경우 직책 설정
    if (
      state.currentUser &&
      state.adminList.includes(state.currentUser.studentId)
    ) {
      state.currentUser.position =
        adminPositions[state.currentUser.studentId] || "일반 회원";
      console.log("=== 사용자 직책 설정 ===");
      console.log("studentId:", state.currentUser.studentId);
      console.log("설정된 직책:", state.currentUser.position);
    }
  } catch (e) {
    console.warn("[auth] admins/list load failed:", e?.message || e);
    state.adminList = [];
  }
}

/**
 * 로그인 (학번/이름)
 * - members/{sid} 문서가 있어야 하며 이름 일치
 * - status가 rejected/blocked면 차단
 * - pending은 로그인 허용(안내 배너), 운영에선 active만 허용하고 싶으면 아래 if문 바꾸면 됨
 */
export async function loginWithStudent(sidRaw, nameRaw) {
  const sid = (sidRaw || "").trim();
  const nm = (nameRaw || "").trim();

  if (!sid || !nm) {
    showAlert("😥", "학번과 이름을 모두 입력해주세요.");
    return false;
  }

  try {
    const mref = doc(db, "members", sid);
    const ms = await getDoc(mref);
    if (!ms.exists()) {
      showAlert(
        "⛔",
        "등록된 회원이 아닙니다. 회원가입 기간에 <b>회원가입</b> 버튼으로 가입해주세요."
      );
      return false;
    }
    const data = ms.data() || {};

    if ((data.name || "").trim() !== nm) {
      showAlert(
        "🙅‍♂️",
        "입력한 이름이 회원 정보와 일치하지 않습니다. 운영진에게 수정 요청해주세요."
      );
      return false;
    }

    const status = data.status || "active";
    if (status === "rejected" || status === "blocked") {
      showAlert(
        "⛔",
        status === "rejected"
          ? "가입이 거절되었습니다."
          : "접근이 제한된 회원입니다."
      );
      return false;
    }
    if (status === "pending") {
      // 개발/테스트 편의상 로그인 허용 + 안내 (운영에서 막으려면 여기서 return false)
      showAlert(
        "⏳",
        "<b>관리자 승인 대기중</b>입니다. 일부 기능이 제한될 수 있어요."
      );
    }

    // Firebase에서 최신 카카오 정보 가져오기 (localStorage 무시, Firebase 우선)
    // kakaoUserId는 숫자로 저장되어 있을 수 있으므로 문자열로 변환
    let kakaoUserId = data.kakaoUserId || null;
    if (kakaoUserId !== null && kakaoUserId !== undefined && kakaoUserId !== "") {
      kakaoUserId = String(kakaoUserId); // 문자열로 통일
    } else {
      kakaoUserId = null; // null, undefined, 빈 문자열은 모두 null로 처리
    }
    const kakaoNickname = data.kakaoNickname || null;
    const kakaoProfileImage = data.kakaoProfileImage || null;
    
    // Firebase에서 가져온 값만 사용 (localStorage 무시)
    const finalKakaoUserId = kakaoUserId;
    const finalKakaoNickname = kakaoNickname;
    const finalKakaoProfileImage = kakaoProfileImage;
    
    console.log("[학번 로그인] Firebase에서 가져온 카카오 정보:", {
      원본_kakaoUserId: data.kakaoUserId,
      타입: typeof data.kakaoUserId,
      변환된_kakaoUserId: finalKakaoUserId,
      kakaoNickname: finalKakaoNickname,
      kakaoProfileImage: finalKakaoProfileImage
    });
    
    // 세션 저장 + 전역 상태 갱신 (카카오 정보 포함)
    localStorage.setItem(
      "foodieUser",
      JSON.stringify({ 
        studentId: sid, 
        name: nm,
        kakaoUserId: finalKakaoUserId,
        kakaoNickname: finalKakaoNickname,
        kakaoProfileImage: finalKakaoProfileImage
      })
    );
    state.currentUser = { 
      studentId: sid, 
      name: nm,
      kakaoUserId: finalKakaoUserId,
      kakaoNickname: finalKakaoNickname,
      kakaoProfileImage: finalKakaoProfileImage
    };

    // Presence 시작
    startPresence();

    // 관리자 목록 1회 로드(버튼/탭 노출 판정에 사용)
    await loadAdminListOnce();

    // ✅ 화면 갱신
    scheduleRender();
    
    // 로그인 성공 후 페이지 새로고침 (화면 갱신을 위해)
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
    return true;
  } catch (e) {
    console.warn("[auth] login error:", e?.message || e);
    showAlert("😥", "로그인 중 오류가 발생했습니다.");
    return false;
  }
}

/**
 * 자동 로그인 검증(앱 부팅 시)
 */
export async function verifyAutoLogin(saved) {
  try {
    if (!saved?.studentId || !saved?.name) return false;

    const mref = doc(db, "members", saved.studentId);
    const ms = await getDoc(mref);
    if (!ms.exists()) return false;
    const d = ms.data() || {};
    if ((d.name || "").trim() !== saved.name) return false;

    // 운영에서 'active'만 통과시키려면 아래 조건 주석 해제
    // if ((d.status || "active") !== "active") return false;

    // Firebase에서 최신 카카오 정보 가져오기 (localStorage 무시, Firebase 우선)
    // kakaoUserId는 숫자로 저장되어 있을 수 있으므로 문자열로 변환
    let kakaoUserId = d.kakaoUserId || null;
    if (kakaoUserId !== null && kakaoUserId !== undefined && kakaoUserId !== "") {
      kakaoUserId = String(kakaoUserId); // 문자열로 통일
    } else {
      kakaoUserId = null; // null, undefined, 빈 문자열은 모두 null로 처리
    }
    const kakaoNickname = d.kakaoNickname || null;
    const kakaoProfileImage = d.kakaoProfileImage || null;
    
    console.log("[자동 로그인] Firebase에서 가져온 카카오 정보:", {
      원본_kakaoUserId: d.kakaoUserId,
      타입: typeof d.kakaoUserId,
      변환된_kakaoUserId: kakaoUserId,
      kakaoNickname,
      kakaoProfileImage
    });
    
    state.currentUser = {
      studentId: saved.studentId,
      name: saved.name,
      kakaoUserId: kakaoUserId,
      kakaoNickname: kakaoNickname,
      kakaoProfileImage: kakaoProfileImage,
    };
    
    // localStorage에도 Firebase에서 가져온 최신 카카오 정보 저장
    const updated = {
      ...saved,
      kakaoUserId: kakaoUserId,
      kakaoNickname: kakaoNickname,
      kakaoProfileImage: kakaoProfileImage,
    };
    localStorage.setItem("foodieUser", JSON.stringify(updated));
    console.log("[자동 로그인] localStorage 업데이트 완료:", updated);
    startPresence();
    await loadAdminListOnce();

    scheduleRender();
    return true;
  } catch (e) {
    console.warn("[auth] auto login check failed:", e?.message || e);
    return false;
  }
}

/**
 * 로그아웃
 */
export async function logoutUser() {
  try {
    // 모든 리스너 정리 (Firebase 권한 오류 방지)
    const { stopAllListeners } = await import("./listeners.js");
    stopAllListeners();
    
    stopPresence();
    
    // 카카오 연동 정보는 유지하고 나머지만 삭제
    const saved = JSON.parse(localStorage.getItem("foodieUser") || "{}");
    const kakaoInfo = {
      kakaoUserId: saved.kakaoUserId || null,
      kakaoNickname: saved.kakaoNickname || null,
      kakaoProfileImage: saved.kakaoProfileImage || null
    };
    
    // 카카오 정보만 유지하고 나머지 삭제
    if (kakaoInfo.kakaoUserId) {
      localStorage.setItem("foodieUser", JSON.stringify(kakaoInfo));
      console.log("[로그아웃] 카카오 정보 유지:", kakaoInfo);
    } else {
    localStorage.removeItem("foodieUser");
      console.log("[로그아웃] 카카오 정보 없음, localStorage 삭제");
    }
    
    // 카카오 SDK는 로그아웃하지 않음 (연동 정보 유지를 위해)
    
    state.currentUser = null;
    state.adminList = [];
    
    // 상태 데이터 초기화
    state.membersData = [];
    state.eventsData = [];
    state.presenceData = [];
    state.suggestionsData = [];
    state.historyData = [];
    state.roadmapData = [];
    state.blocksData = [];
  } catch (e) {
    console.warn("[auth] logout error:", e?.message || e);
  }
  // ✅ 화면 갱신
  scheduleRender();
}

/**
 * 카카오 계정 연동
 * - 기존 계정에 카카오 계정 정보를 연동
 */
export async function linkKakaoAccount() {
  console.log("[카카오 연동] linkKakaoAccount 함수 시작");
  
  // 카카오 SDK 초기화 확인 및 초기화
  if (typeof window.Kakao === "undefined") {
    console.error("[카카오 연동] Kakao SDK가 정의되지 않음");
    showAlert("😥", "카카오 SDK가 로드되지 않았습니다.");
    return false;
  }
  
  // 전역 초기화 함수 사용 (중복 초기화 방지)
  if (Kakao.isInitialized()) {
    // 이미 초기화됨
  } else if (typeof window.initKakaoSDK === "function") {
    window.initKakaoSDK();
  } else {
    const KAKAO_JS_KEY = "28869968a8cfea9a996172c117d64eb2";
    if (KAKAO_JS_KEY) {
      try {
        Kakao.init(KAKAO_JS_KEY);
      } catch (error) {
        console.error("카카오 SDK 초기화 오류:", error);
      }
    }
  }
  
  if (!Kakao.isInitialized()) {
    showAlert("😥", "카카오 SDK가 초기화되지 않았습니다.");
    return false;
  }

  // state.currentUser 확인 (디버깅 로그 추가)
  console.log("[카카오 연동] state 확인:", {
    state: state,
    currentUser: state.currentUser,
    studentId: state.currentUser?.studentId,
    name: state.currentUser?.name,
    localStorage: localStorage.getItem("foodieUser")
  });
  
  if (!state.currentUser) {
    console.error("[카카오 연동] state.currentUser가 없음");
    
    // localStorage에서 사용자 정보 확인
    const saved = JSON.parse(localStorage.getItem("foodieUser") || "{}");
    if (saved.studentId && saved.name) {
      console.warn("[카카오 연동] localStorage에는 사용자 정보가 있지만 state.currentUser가 없음. state 동기화 필요");
      // state를 다시 로드해보기
      const { verifyAutoLogin } = await import("./auth.js");
      const autoLoginSuccess = await verifyAutoLogin(saved);
      if (autoLoginSuccess) {
        console.log("[카카오 연동] 자동 로그인으로 state.currentUser 복구 성공");
        // state가 복구되었으므로 자동으로 다시 시도
        console.log("[카카오 연동] state 복구 후 자동으로 linkKakaoAccount 재호출");
        return await linkKakaoAccount();
      }
    }
    
    showAlert("😥", "먼저 로그인해주세요.");
    return false;
  }
  
  // 이미 카카오 계정이 연동되어 있는지 확인
  const currentKakaoUserId = state.currentUser?.kakaoUserId;
  if (currentKakaoUserId && currentKakaoUserId !== null && currentKakaoUserId !== "" && currentKakaoUserId !== 0) {
    showAlert("ℹ️", "이미 카카오 계정이 연동되어 있습니다.");
    return false;
  }
  
  console.log("[카카오 연동] 현재 사용자:", {
    studentId: state.currentUser.studentId,
    name: state.currentUser.name
  });

  try {
    console.log("[카카오 연동] 카카오 로그인 요청 시작");
    
    // 기존 카카오 세션 정리 (다른 계정 선택 가능하도록)
    if (window.Kakao && window.Kakao.Auth && window.Kakao.Auth.getAccessToken()) {
      console.log("[카카오 연동] 기존 카카오 세션 정리 중...");
      window.Kakao.Auth.logout();
      // 로그아웃 후 잠시 대기 (세션 정리 시간 확보)
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 카카오 로그인 요청
    const authObj = await new Promise((resolve, reject) => {
      Kakao.Auth.login({
        success: (auth) => resolve(auth),
        fail: (err) => reject(err),
      });
    });

    // 카카오 사용자 정보 가져오기
    const userInfo = await new Promise((resolve, reject) => {
      Kakao.API.request({
        url: "/v2/user/me",
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });

    // 카카오 ID는 숫자로 저장 (Firebase에서 숫자와 문자열이 다르게 인식됨)
    const kakaoId = Number(userInfo.id);
    const kakaoIdString = String(userInfo.id); // 검색용 문자열 버전도 준비
    const kakaoNickname = userInfo.kakao_account?.profile?.nickname || null;
    const kakaoProfileImage =
      userInfo.kakao_account?.profile?.profile_image_url || null;

    console.log("[카카오 연동] 저장할 정보:", {
      studentId: state.currentUser.studentId,
      kakaoId,
      kakaoIdString,
      kakaoNickname,
      kakaoProfileImage
    });

    // 이미 다른 계정에 연동된 카카오 계정인지 확인
    const membersRef = collection(db, "members");
    let existingLinkQuery = query(membersRef, where("kakaoUserId", "==", kakaoId));
    let existingLinkSnapshot = await getDocs(existingLinkQuery);
    
    // 숫자로 찾지 못하면 문자열로도 시도
    if (existingLinkSnapshot.empty) {
      existingLinkQuery = query(membersRef, where("kakaoUserId", "==", kakaoIdString));
      existingLinkSnapshot = await getDocs(existingLinkQuery);
    }
    
    // 다른 계정에 이미 연동되어 있는지 확인
    if (!existingLinkSnapshot.empty) {
      const existingMember = existingLinkSnapshot.docs[0];
      const existingStudentId = existingMember.id;
      
      // 현재 사용자와 다른 계정에 연동되어 있으면 에러
      if (existingStudentId !== state.currentUser.studentId) {
        const existingMemberData = existingMember.data();
        showAlert(
          "😥",
          `이 카카오 계정은 이미 다른 계정(${existingMemberData.name || existingStudentId})에 연동되어 있습니다.<br>다른 카카오 계정을 사용하거나, 기존 연동을 해제한 후 다시 시도해주세요.`
        );
        // 카카오 로그아웃
        Kakao.Auth.logout();
        return false;
      }
      // 같은 계정에 이미 연동되어 있으면 성공 처리
      console.log("[카카오 연동] 이미 같은 계정에 연동되어 있음");
      showAlert("ℹ️", "이미 이 계정에 카카오 계정이 연동되어 있습니다.");
      return true;
    }

    // 기존 회원 정보에 카카오 정보 연동 (숫자로 저장)
    const memberRef = doc(db, "members", state.currentUser.studentId);
    
    // 저장 전 현재 상태 확인
    const beforeSnap = await getDoc(memberRef);
    if (beforeSnap.exists()) {
      const beforeData = beforeSnap.data();
      console.log("[카카오 연동] 저장 전 상태:", {
        studentId: state.currentUser.studentId,
        기존_kakaoUserId: beforeData.kakaoUserId,
        기존_타입: typeof beforeData.kakaoUserId
      });
    }
    
    await updateDoc(memberRef, {
      kakaoUserId: kakaoId, // 숫자로 저장
      kakaoNickname: kakaoNickname,
      kakaoProfileImage: kakaoProfileImage,
      kakaoLinkedAt: new Date().toISOString(),
    });
    
    console.log("[카카오 연동] Firebase에 저장 완료:", {
      studentId: state.currentUser.studentId,
      저장한_kakaoUserId: kakaoId,
      저장한_타입: typeof kakaoId
    });
    
    // 저장 확인: 즉시 다시 읽어서 확인
    const verifyRef = doc(db, "members", state.currentUser.studentId);
    const verifySnap = await getDoc(verifyRef);
    if (!verifySnap.exists()) {
      console.error("[카카오 연동] 저장 확인 실패: 회원 문서가 존재하지 않음");
      showAlert("😥", "회원 정보를 찾을 수 없습니다.");
      return false;
    }
    
    const verifyData = verifySnap.data();
    console.log("[카카오 연동] 저장 확인:", {
      저장된_kakaoUserId: verifyData.kakaoUserId,
      타입: typeof verifyData.kakaoUserId,
      원본_kakaoId: kakaoId,
      원본_타입: typeof kakaoId,
      저장_성공: verifyData.kakaoUserId === kakaoId
    });
    
    // 저장이 제대로 안되었으면 에러
    if (verifyData.kakaoUserId !== kakaoId) {
      console.error("[카카오 연동] 저장 실패: 저장된 값과 원본 값이 다름");
      showAlert("😥", "카카오 계정 연동 저장에 실패했습니다. 다시 시도해주세요.");
      return false;
    }
    
    // state.membersData에서 해당 회원 찾아서 업데이트
    if (state.membersData && Array.isArray(state.membersData)) {
      const memberIndex = state.membersData.findIndex(
        (m) => (m.studentId || m.id) === state.currentUser.studentId
      );
      if (memberIndex !== -1) {
        // 해당 회원 데이터 업데이트 (Firebase에서 읽은 값 사용)
        const updatedMember = {
          ...state.membersData[memberIndex],
          kakaoUserId: verifyData.kakaoUserId, // Firebase에서 읽은 값 (숫자)
          kakaoNickname: verifyData.kakaoNickname,
          kakaoProfileImage: verifyData.kakaoProfileImage,
        };
        // _kakaoUserIdString도 추가 (listeners.js와 동일한 형식)
        if (updatedMember.kakaoUserId !== undefined && updatedMember.kakaoUserId !== null) {
          updatedMember._kakaoUserIdString = String(updatedMember.kakaoUserId);
        }
        state.membersData[memberIndex] = updatedMember;
        console.log("[카카오 연동] state.membersData 업데이트 완료:", {
          studentId: state.currentUser.studentId,
          kakaoUserId: updatedMember.kakaoUserId,
          타입: typeof updatedMember.kakaoUserId,
          _kakaoUserIdString: updatedMember._kakaoUserIdString
        });
      } else {
        console.warn("[카카오 연동] state.membersData에서 회원을 찾을 수 없음:", {
          studentId: state.currentUser.studentId,
          membersData_길이: state.membersData.length,
          membersData_학번들: state.membersData.map(m => m.studentId || m.id)
        });
      }
    } else {
      console.warn("[카카오 연동] state.membersData가 없거나 배열이 아님:", state.membersData);
    }

    // 현재 사용자 상태 업데이트 (문자열로 저장하여 일관성 유지)
    if (!state.currentUser) {
      console.error("[카카오 연동] state.currentUser가 없습니다!");
      showAlert("😥", "로그인 상태를 확인할 수 없습니다.");
      return false;
    }
    
    state.currentUser.kakaoUserId = kakaoIdString;
    state.currentUser.kakaoNickname = kakaoNickname;
    state.currentUser.kakaoProfileImage = kakaoProfileImage;

    // localStorage에도 카카오 정보 저장 (문자열로 저장)
    localStorage.setItem(
      "foodieUser",
      JSON.stringify({
        ...state.currentUser,
        kakaoUserId: kakaoIdString,
        kakaoNickname: kakaoNickname,
        kakaoProfileImage: kakaoProfileImage,
      })
    );
    
    console.log("[카카오 연동] state.currentUser 업데이트 완료:", {
      studentId: state.currentUser.studentId,
      kakaoUserId: state.currentUser.kakaoUserId,
      타입: typeof state.currentUser.kakaoUserId
    });
    
    // 화면 갱신 (renderReservationTab이 다시 호출되도록)
    scheduleRender();
    
    // renderReservationTab을 직접 호출하여 내 활동 섹션 업데이트
    setTimeout(async () => {
      try {
        const { renderReservationTab } = await import("./tabs.js");
        const isAdmin = !!(state.currentUser && state.adminList?.includes(state.currentUser.studentId));
        renderReservationTab(isAdmin);
        console.log("[카카오 연동] renderReservationTab 재호출 완료");
      } catch (error) {
        console.error("[카카오 연동] renderReservationTab 재호출 실패:", error);
      }
    }, 100);

    // 회원 목록 강제 업데이트 (관리자 탭이 열려있지 않아도 업데이트)
    if (state.membersData && Array.isArray(state.membersData)) {
      const memberIndex = state.membersData.findIndex(
        (m) => (m.studentId || m.id) === state.currentUser.studentId
      );
      if (memberIndex !== -1) {
        // 숫자로 저장 (Firebase와 동일하게)
        state.membersData[memberIndex] = {
          ...state.membersData[memberIndex],
          kakaoUserId: kakaoId, // 숫자로 저장
          kakaoNickname: kakaoNickname,
          kakaoProfileImage: kakaoProfileImage,
        };
        // _kakaoUserIdString도 추가 (listeners.js와 동일한 형식)
        if (state.membersData[memberIndex].kakaoUserId !== undefined && state.membersData[memberIndex].kakaoUserId !== null) {
          state.membersData[memberIndex]._kakaoUserIdString = String(state.membersData[memberIndex].kakaoUserId);
        }
        console.log("[카카오 연동] state.membersData 강제 업데이트 완료:", {
          studentId: state.currentUser.studentId,
          kakaoUserId: state.membersData[memberIndex].kakaoUserId,
          타입: typeof state.membersData[memberIndex].kakaoUserId,
          _kakaoUserIdString: state.membersData[memberIndex]._kakaoUserIdString
        });
      } else {
        console.warn("[카카오 연동] state.membersData에서 회원을 찾을 수 없음:", {
          studentId: state.currentUser.studentId,
          membersData_길이: state.membersData.length
        });
      }
    } else {
      console.warn("[카카오 연동] state.membersData가 없거나 배열이 아님:", state.membersData);
    }
    
    // 회원 목록이 열려있으면 즉시 렌더링
    const subtabContainer = document.getElementById("subtab-container");
    if (subtabContainer) {
      try {
        const { renderMembersAdmin } = await import("./dashboard.js");
        renderMembersAdmin(subtabContainer);
        console.log("[카카오 연동] 회원 목록 강제 렌더링 완료");
      } catch (error) {
        console.warn("[카카오 연동] 회원 목록 렌더링 실패:", error);
      }
    }

    showAlert("✅", "카카오 계정이 연동되었습니다.");
    
    // 동아리 카카오 계정 친구추가 안내 모달 표시
    // 모달이 닫힌 후에만 화면 갱신 및 페이지 새로고침
    setTimeout(() => {
      showKakaoFriendAddGuide(() => {
        // 모달이 닫힌 후 실행될 콜백
        console.log("[카카오 연동] 친구추가 안내 모달 닫힘, 페이지 새로고침 시작");
        // 페이지 새로고침 (친구추가 모달을 확인한 후)
        setTimeout(() => {
          window.location.reload();
        }, 300);
      });
    }, 500);
    
    return true;
  } catch (error) {
    console.error("[auth] 카카오 연동 실패:", error);
    showAlert("😥", "카카오 계정 연동에 실패했습니다.");
    return false;
  }
}

/**
 * 카카오 계정 연동 해제
 */
export async function unlinkKakaoAccount() {
  console.log("[카카오 연동 해제] 시작, state.currentUser:", state.currentUser);
  
  // state.currentUser 확인
  if (!state.currentUser || !state.currentUser.studentId) {
    console.warn("[카카오 연동 해제] state.currentUser가 없음, localStorage 확인 중...");
    
    // localStorage에서 사용자 정보 확인
    const saved = JSON.parse(localStorage.getItem("foodieUser") || "{}");
    console.log("[카카오 연동 해제] localStorage 데이터:", saved);
    
    if (saved.studentId && saved.name) {
      console.log("[카카오 연동 해제] localStorage에 사용자 정보 있음, state 복구 시도");
      
      // verifyAutoLogin을 사용하지 않고 직접 Firebase에서 확인
      try {
        const mref = doc(db, "members", saved.studentId);
        const ms = await getDoc(mref);
        if (ms.exists()) {
          const d = ms.data() || {};
          if ((d.name || "").trim() === saved.name) {
            // state.currentUser 직접 설정
            let kakaoUserId = d.kakaoUserId || null;
            if (kakaoUserId !== null && kakaoUserId !== undefined && kakaoUserId !== "") {
              kakaoUserId = String(kakaoUserId);
            } else {
              kakaoUserId = null;
            }
            
            state.currentUser = {
              studentId: saved.studentId,
              name: saved.name,
              kakaoUserId: kakaoUserId,
              kakaoNickname: d.kakaoNickname || null,
              kakaoProfileImage: d.kakaoProfileImage || null,
            };
            console.log("[카카오 연동 해제] state.currentUser 복구 완료:", state.currentUser);
          } else {
            console.error("[카카오 연동 해제] 이름 불일치");
            showAlert("😥", "로그인 정보가 일치하지 않습니다. 다시 로그인해주세요.");
            return false;
          }
        } else {
          console.error("[카카오 연동 해제] Firebase에서 회원 정보를 찾을 수 없음");
          showAlert("😥", "회원 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
          return false;
        }
      } catch (error) {
        console.error("[카카오 연동 해제] Firebase 확인 오류:", error);
        showAlert("😥", "로그인 상태를 확인할 수 없습니다. 다시 로그인해주세요.");
        return false;
      }
    } else {
      console.error("[카카오 연동 해제] localStorage에도 사용자 정보 없음");
      showAlert("😥", "먼저 로그인해주세요.");
      return false;
    }
  }
  
  // 여기까지 왔으면 state.currentUser가 확실히 있음
  console.log("[카카오 연동 해제] state.currentUser 확인 완료:", {
    studentId: state.currentUser.studentId,
    name: state.currentUser.name,
    kakaoUserId: state.currentUser.kakaoUserId
  });
  
  // Firebase에서 최신 정보 확인
  let hasKakaoAccount = false;
  try {
    const memberRef = doc(db, "members", state.currentUser.studentId);
    const memberSnap = await getDoc(memberRef);
    
    if (!memberSnap.exists()) {
      showAlert("😥", "회원 정보를 찾을 수 없습니다.");
      return false;
    }
    
    const memberData = memberSnap.data();
    console.log("[카카오 연동 해제] Firebase에서 읽은 데이터:", {
      kakaoUserId: memberData.kakaoUserId,
      타입: typeof memberData.kakaoUserId,
      state_currentUser_kakaoUserId: state.currentUser?.kakaoUserId,
      state_타입: typeof state.currentUser?.kakaoUserId
    });
    
    // 숫자와 문자열 모두 확인 (Firebase는 숫자로 저장, state는 문자열로 저장 가능)
    const firebaseKakaoUserId = memberData.kakaoUserId;
    const stateKakaoUserId = state.currentUser?.kakaoUserId;
    
    // Firebase에서 읽은 값 확인 (숫자 또는 문자열)
    const hasFirebaseKakao = firebaseKakaoUserId !== null && 
                             firebaseKakaoUserId !== undefined && 
                             firebaseKakaoUserId !== "" && 
                             firebaseKakaoUserId !== 0;
    
    // state.currentUser 값 확인 (문자열 또는 숫자)
    const hasStateKakao = stateKakaoUserId !== null && 
                         stateKakaoUserId !== undefined && 
                         stateKakaoUserId !== "" && 
                         stateKakaoUserId !== 0;
    
    // 둘 중 하나라도 있으면 연동되어 있는 것으로 판단
    hasKakaoAccount = hasFirebaseKakao || hasStateKakao;
    
    console.log("[카카오 연동 해제] 연동 상태 확인:", {
      hasFirebaseKakao,
      hasStateKakao,
      hasKakaoAccount
    });
    
    if (!hasKakaoAccount) {
      showAlert("ℹ️", "연동된 카카오 계정이 없습니다.");
      return false;
    }
  } catch (error) {
    console.error("[카카오 연동 해제] Firebase 확인 오류:", error);
    // Firebase 확인 실패 시 state.currentUser로 확인
    const stateKakaoUserId = state.currentUser?.kakaoUserId;
    hasKakaoAccount = stateKakaoUserId !== null && 
                     stateKakaoUserId !== undefined && 
                     stateKakaoUserId !== "" && 
                     stateKakaoUserId !== 0;
    
    if (!hasKakaoAccount) {
      showAlert("ℹ️", "연동된 카카오 계정이 없습니다.");
      return false;
    }
  }

  if (!confirm("카카오 계정 연동을 해제하시겠습니까?")) {
    return false;
  }

  try {
    const memberRef = doc(db, "members", state.currentUser.studentId);
    await updateDoc(memberRef, {
      kakaoUserId: null,
      kakaoNickname: null,
      kakaoProfileImage: null,
      kakaoLinkedAt: null,
    });
    
    console.log("[카카오 연동 해제] Firebase에 저장 완료");
    
    // 저장 확인: 즉시 다시 읽어서 확인
    const verifyRef = doc(db, "members", state.currentUser.studentId);
    const verifySnap = await getDoc(verifyRef);
    if (verifySnap.exists()) {
      const verifyData = verifySnap.data();
      console.log("[카카오 연동 해제] 저장 확인:", {
        저장된_kakaoUserId: verifyData.kakaoUserId
      });
      
      // state.membersData에서 해당 회원 찾아서 업데이트
      if (state.membersData && Array.isArray(state.membersData)) {
        const memberIndex = state.membersData.findIndex(
          (m) => (m.studentId || m.id) === state.currentUser.studentId
        );
        if (memberIndex !== -1) {
          // 해당 회원 데이터 업데이트
          const updatedMember = {
            ...state.membersData[memberIndex],
            kakaoUserId: null,
            kakaoNickname: null,
            kakaoProfileImage: null,
          };
          // _kakaoUserIdString도 제거
          delete updatedMember._kakaoUserIdString;
          state.membersData[memberIndex] = updatedMember;
          console.log("[카카오 연동 해제] state.membersData 업데이트 완료:", {
            studentId: state.currentUser.studentId
          });
          
          // 회원 목록 강제 업데이트 (열려있지 않아도 시도)
          const { renderMembersAdmin } = await import("./dashboard.js");
          const subtabContainer = document.getElementById("subtab-container");
          if (subtabContainer) {
            renderMembersAdmin(subtabContainer);
            console.log("[카카오 연동 해제] 회원 목록 강제 업데이트 완료");
          } else {
            console.log("[카카오 연동 해제] subtab-container를 찾을 수 없음, Firebase 리스너가 자동 업데이트할 것임");
          }
        } else {
          console.warn("[카카오 연동 해제] state.membersData에서 회원을 찾을 수 없음");
        }
      }
    }

    // 현재 사용자 상태 업데이트
    state.currentUser.kakaoUserId = null;
    state.currentUser.kakaoNickname = null;
    state.currentUser.kakaoProfileImage = null;

    // localStorage에서도 카카오 정보 제거
    const saved = JSON.parse(localStorage.getItem("foodieUser") || "{}");
    saved.kakaoUserId = null;
    saved.kakaoNickname = null;
    saved.kakaoProfileImage = null;
    localStorage.setItem("foodieUser", JSON.stringify(saved));
    console.log("[카카오 연동 해제] localStorage 업데이트 완료:", saved);

    // 카카오 로그아웃
    if (window.Kakao && window.Kakao.Auth && window.Kakao.Auth.getAccessToken()) {
      window.Kakao.Auth.logout();
    }

    showAlert("✅", "카카오 계정 연동이 해제되었습니다.");
    
    // 화면 갱신 및 회원 목록 업데이트
    scheduleRender();
    
    // Firebase 리스너가 자동으로 업데이트하지만, 즉시 반영을 위해 약간의 지연 후 재렌더링
    setTimeout(async () => {
      const { renderMembersAdmin } = await import("./dashboard.js");
      const subtabContainer = document.getElementById("subtab-container");
      if (subtabContainer) {
        renderMembersAdmin(subtabContainer);
        console.log("[카카오 연동 해제] 지연 후 회원 목록 업데이트 완료");
      }
    }, 500);
    
    return true;
  } catch (error) {
    console.error("[auth] 카카오 연동 해제 실패:", error);
    showAlert("😥", "카카오 계정 연동 해제에 실패했습니다.");
    return false;
  }
}

/**
 * 카카오로 로그인
 * - 카카오 계정으로 로그인하여 연동된 기존 계정 찾기
 */
export async function loginWithKakao() {
  // 카카오 SDK 초기화 확인 및 초기화
  if (typeof window.Kakao === "undefined") {
    showAlert("😥", "카카오 SDK가 로드되지 않았습니다.");
    return false;
  }
  
  // 전역 초기화 함수 사용 (중복 초기화 방지)
  if (Kakao.isInitialized()) {
    // 이미 초기화됨
  } else if (typeof window.initKakaoSDK === "function") {
    window.initKakaoSDK();
  } else {
    const KAKAO_JS_KEY = "28869968a8cfea9a996172c117d64eb2";
    if (KAKAO_JS_KEY) {
      try {
        Kakao.init(KAKAO_JS_KEY);
      } catch (error) {
        console.error("카카오 SDK 초기화 오류:", error);
      }
    }
  }
  
  if (!Kakao.isInitialized()) {
    showAlert("😥", "카카오 SDK가 초기화되지 않았습니다.");
    return false;
  }

  try {
    // 기존 카카오 세션 정리 (다른 계정 선택 가능하도록)
    if (window.Kakao && window.Kakao.Auth && window.Kakao.Auth.getAccessToken()) {
      console.log("[카카오 로그인] 기존 카카오 세션 정리 중...");
      window.Kakao.Auth.logout();
      // 로그아웃 후 잠시 대기 (세션 정리 시간 확보)
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 카카오 로그인 요청
    const authObj = await new Promise((resolve, reject) => {
      Kakao.Auth.login({
        success: (auth) => resolve(auth),
        fail: (err) => reject(err),
      });
    });

    // 카카오 사용자 정보 가져오기
    const userInfo = await new Promise((resolve, reject) => {
      Kakao.API.request({
        url: "/v2/user/me",
        success: (res) => resolve(res),
        fail: (err) => reject(err),
      });
    });

    // 카카오 ID는 숫자로 저장되어 있으므로 숫자로 검색
    const kakaoId = Number(userInfo.id);
    const kakaoIdString = String(userInfo.id);
    
    console.log("[카카오 로그인] 검색할 카카오 ID:", {
      숫자: kakaoId,
      문자열: kakaoIdString
    });

    // 카카오 ID로 연동된 회원 찾기 (숫자와 문자열 모두 확인)
    const membersRef = collection(db, "members");
    
    // 디버깅: 모든 회원의 kakaoUserId 확인
    const allMembersSnapshot = await getDocs(membersRef);
    const allKakaoUserIds = [];
    allMembersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.kakaoUserId !== undefined && data.kakaoUserId !== null) {
        allKakaoUserIds.push({
          studentId: doc.id,
          kakaoUserId: data.kakaoUserId,
          타입: typeof data.kakaoUserId,
          값: data.kakaoUserId
        });
      }
    });
    console.log("[카카오 로그인] Firebase에 저장된 모든 kakaoUserId:", allKakaoUserIds);
    console.log("[카카오 로그인] 검색할 값:", { 숫자: kakaoId, 문자열: kakaoIdString });
    
    // 먼저 숫자로 검색 (일반적으로 숫자로 저장됨)
    let q = query(membersRef, where("kakaoUserId", "==", kakaoId));
    let querySnapshot = await getDocs(q);
    
    console.log("[카카오 로그인] 숫자 검색 결과:", querySnapshot.size, "개");
    if (querySnapshot.size > 0) {
      querySnapshot.forEach((doc) => {
        console.log("[카카오 로그인] 찾은 회원:", {
          studentId: doc.id,
          kakaoUserId: doc.data().kakaoUserId,
          타입: typeof doc.data().kakaoUserId
        });
      });
    }
    
    // 숫자로 찾지 못하면 문자열로도 시도
    if (querySnapshot.empty) {
      console.log("[카카오 로그인] 문자열로 재검색:", kakaoIdString);
      q = query(membersRef, where("kakaoUserId", "==", kakaoIdString));
      querySnapshot = await getDocs(q);
      console.log("[카카오 로그인] 문자열 검색 결과:", querySnapshot.size, "개");
      if (querySnapshot.size > 0) {
        querySnapshot.forEach((doc) => {
          console.log("[카카오 로그인] 찾은 회원:", {
            studentId: doc.id,
            kakaoUserId: doc.data().kakaoUserId,
            타입: typeof doc.data().kakaoUserId
          });
        });
      }
    }

    if (querySnapshot.empty) {
      showAlert(
        "ℹ️",
        "연동된 계정이 없습니다.<br>먼저 로그인 후 마이페이지에서 카카오 계정을 연동해주세요."
      );
      // 카카오 로그아웃
      Kakao.Auth.logout();
      return false;
    }

    // 첫 번째 매칭된 회원 정보 가져오기
    const memberDoc = querySnapshot.docs[0];
    const memberData = memberDoc.data();
    const studentId = memberDoc.id;
    const name = memberData.name || "";

    // 회원 상태 확인
    const status = memberData.status || "active";
    if (status === "rejected" || status === "blocked") {
      showAlert(
        "⛔",
        status === "rejected"
          ? "가입이 거절되었습니다."
          : "접근이 제한된 회원입니다."
      );
      Kakao.Auth.logout();
      return false;
    }

    if (status === "pending") {
      showAlert(
        "⏳",
        "<b>관리자 승인 대기중</b>입니다. 일부 기능이 제한될 수 있어요."
      );
    }

    // Firebase에서 카카오 정보 가져오기 (localStorage에는 문자열로 저장)
    const finalKakaoUserId = kakaoIdString; // localStorage에는 문자열로 저장
    const finalKakaoNickname = memberData.kakaoNickname || null;
    const finalKakaoProfileImage = memberData.kakaoProfileImage || null;
    
    // 세션 저장 + 전역 상태 갱신 (카카오 정보 포함)
    localStorage.setItem(
      "foodieUser",
      JSON.stringify({ 
        studentId, 
        name, 
        kakaoUserId: finalKakaoUserId,
        kakaoNickname: finalKakaoNickname,
        kakaoProfileImage: finalKakaoProfileImage
      })
    );
    state.currentUser = {
      studentId,
      name,
      kakaoUserId: finalKakaoUserId,
      kakaoNickname: finalKakaoNickname,
      kakaoProfileImage: finalKakaoProfileImage,
    };

    // Presence 시작
    startPresence();

    // 관리자 목록 1회 로드
    await loadAdminListOnce();

    console.log("[카카오 로그인] 로그인 완료, 화면 갱신 시작:", {
      studentId: state.currentUser?.studentId,
      name: state.currentUser?.name
    });
    
    // ✅ 화면 갱신
    scheduleRender();
    
    // 로그인 성공 알림 표시 후 페이지 새로고침
    showAlert("✅", "카카오 로그인 성공!");
    
    // 페이지 새로고침 (화면 갱신을 위해)
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
    return true;
  } catch (error) {
    console.error("[auth] 카카오 로그인 실패:", error);
    showAlert("😥", "카카오 로그인에 실패했습니다.");
    return false;
  }
}
