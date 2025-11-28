# 📊 모듈화 현황 분석 보고서

**생성일**: 2025-01-27  
**분석 대상**: index.html 및 js/ 디렉토리

---

## ✅ 완료된 모듈화

### 1. **설정 모듈** (`js/config/`)
- ✅ `firebase-config.js` - Firebase 설정 및 함수 export
- ✅ `kakao-config.js` - 카카오 SDK 설정 및 함수 export

### 2. **인증 모듈** (`js/auth.js`)
- ✅ `loginWithStudent()` - 학번/이름 로그인
- ✅ `verifyAutoLogin()` - 자동 로그인
- ✅ `logoutUser()` - 로그아웃
- ✅ `linkKakaoAccount()` - 카카오 계정 연동
- ✅ `unlinkKakaoAccount()` - 카카오 계정 해제
- ✅ `loginWithKakao()` - 카카오 로그인

### 3. **이벤트 관리 모듈** (`js/events.js`)
- ✅ `computeEventStats()` - 이벤트 통계 계산
- ✅ `eventCardHTML()` - 이벤트 카드 HTML 생성
- ✅ `adminEventsPanelHTML()` - 관리자 이벤트 패널
- ✅ `reserveGeneral()` - 일반 이벤트 신청
- ✅ `cancelGeneral()` - 일반 이벤트 취소
- ✅ `reserveTasting()` - 미식회 신청
- ✅ `cancelTasting()` - 미식회 취소
- ✅ `createOrSaveEvent()` - 이벤트 생성/저장
- ✅ `archiveEvent()` - 이벤트 보관
- ✅ `unarchiveEvent()` - 이벤트 재게시
- ✅ `deleteEvent()` - 이벤트 삭제
- ✅ `exportApplicantsXLSX()` - 참가자 엑셀 내보내기

### 4. **대시보드 모듈** (`js/dashboard.js`)
- ✅ `renderDashboardTab()` - 대시보드 탭 렌더링
- ✅ `renderHomeBlocksAdmin()` - 홈 블록 관리
- ✅ `renderMembersAdmin()` - 회원 관리

### 5. **알림 모듈**
- ✅ `js/features/notifications/kakao-notify.js` - 카카오 알림
- ✅ `js/kakao-notifications.js` - 카카오 알림 유틸리티

### 6. **기타 모듈**
- ✅ `js/utils.js` - 유틸리티 함수들
- ✅ `js/state.js` - 전역 상태 관리
- ✅ `js/firebase.js` - Firebase 인스턴스
- ✅ `js/tabs.js` - 탭 렌더링
- ✅ `js/listeners.js` - Firebase 리스너
- ✅ `js/presence.js` - 접속자 관리
- ✅ `js/signup.js` - 회원가입
- ✅ `js/mypage.js` - 마이페이지
- ✅ `js/history.js` - 명예의 전당
- ✅ `js/system.js` - 시스템 관리
- ✅ `js/suggestions.js` - 건의사항
- ✅ `js/prelogin.js` - 로그인 전 화면

---

## ⚠️ index.html에만 있는 함수들 (모듈화 필요)

### **조짜기 관련**
- ❌ `window.openGroupMakerModal()` - 조짜기 모달 열기 (13946번 라인)
- ❌ `window.closeGroupMakerModal()` - 조짜기 모달 닫기 (14154번 라인)
- ❌ `createGroupsNew()` - 조 생성 알고리즘 (13660번 라인)
- ❌ `updateLeaderSelectorsNew()` - 조장 선택기 업데이트 (13599번 라인)
- ❌ `showGroupResultsNew()` - 조 편성 결과 표시 (13863번 라인)

### **리뷰 관련**
- ❌ `window.openReviewModal()` - 리뷰 모달 열기 (28328번 라인)

### **이벤트 상세 관련**
- ❌ `window.openRoadmapEventEditModal()` - 로드맵 이벤트 수정 모달 (8698번 라인)
- ❌ `window.showEventDetails()` - 이벤트 상세 표시 (22405번 라인)
- ❌ `window.showEventDetailModal()` - 이벤트 상세 모달 (22408번 라인)
- ❌ `window.closeEventDetailModal()` - 이벤트 상세 모달 닫기 (23061번 라인)
- ❌ `window.closeEventDetailModalMain()` - 이벤트 상세 모달 닫기 (메인) (22976번 라인)
- ❌ `window.deleteRoadmapEvent()` - 로드맵 이벤트 삭제 (23069번 라인)
- ❌ `window.openAddEventModal()` - 이벤트 추가 모달 (21831번 라인)
- ❌ `window.toggleActivityDetails()` - 활동 상세 토글 (21567번 라인)

### **참가자 관리**
- ❌ `window.toggleParticipantsList()` - 참가자 목록 토글 (8842번 라인)
- ❌ `window.toggleRestaurantParticipantsDetails()` - 식당 참가자 상세 (8900, 10413번 라인)
- ❌ `window.getParticipationDetails()` - 참가 상세 정보 (10454번 라인)
- ❌ `window.confirmRemoveParticipant()` - 참가자 제거 확인 (12067번 라인)
- ❌ `window.openAddParticipantModal()` - 참가자 추가 모달 (13080번 라인)
- ❌ `window.closeAddParticipantModal()` - 참가자 추가 모달 닫기 (13089번 라인)
- ❌ `window.addParticipantToEventQuick()` - 빠른 참가자 추가 (13092번 라인)
- ❌ `window.removeParticipantFromEvent()` - 참가자 제거 (13134번 라인)
- ❌ `window.toggleParticipantsPublicVisibility()` - 참가자 공개/비공개 (22984번 라인)
- ❌ `window.toggleRestaurantParticipantsPublicVisibility()` - 식당 참가자 공개/비공개 (23022번 라인)

### **조모임 관리**
- ❌ `window.openGroupManageModal()` - 조모임 관리 모달 (17269번 라인)
- ❌ `window.searchMembersForGroup()` - 조모임 회원 검색 (17857번 라인)
- ❌ `window.addMemberToGroup()` - 조모임 회원 추가 (17959번 라인)
- ❌ `window.removeGroupMember()` - 조모임 회원 제거 (18031번 라인)
- ❌ `window.setGroupMemberRole()` - 조모임 회원 역할 설정 (18095번 라인)
- ❌ `window.openGroupAddModal()` - 조모임 추가 모달 (23254번 라인)
- ❌ `window.openGroupEditModal()` - 조모임 수정 모달 (23821번 라인)

### **식당 관련**
- ❌ `window.openRestaurantEditModal()` - 식당 수정 모달 (3992번 라인)
- ❌ `window.saveRestaurantMenu()` - 식당 메뉴 저장 (4040번 라인)
- ❌ `window.toggleRestaurantReviews()` - 식당 리뷰 토글 (25971번 라인)

### **회원 관리**
- ❌ `window.saveNewMember()` - 새 회원 저장 (3911번 라인)
- ❌ `window.selectAllChanges()` - 변경사항 전체 선택 (16732번 라인)
- ❌ `window.applySelectedChanges()` - 선택된 변경사항 적용 (16744번 라인)

### **알림 관리**
- ❌ `window.deleteNotification()` - 알림 삭제 (12355번 라인)

### **문의/건의**
- ❌ `window.openInquiryModal()` - 문의 모달 열기 (3697번 라인)

### **카카오 관련**
- ❌ `window.handleKakaoLogin()` - 카카오 로그인 처리 (3180번 라인)
- ❌ `window.handleKakaoLinkFromActivity()` - 활동에서 카카오 연동 (6381번 라인)

### **유틸리티**
- ❌ `window.copyToClipboard()` - 클립보드 복사 (3606번 라인)
- ❌ `window.toggleAdminList()` - 관리자 목록 토글 (19141번 라인)
- ❌ `window.changeCalendarMonth()` - 캘린더 월 변경 (21934번 라인)

### **블록 관리**
- ❌ `window.closeBlockModal()` - 블록 모달 닫기 (29075번 라인)
- ❌ `window.addModalScoreRow()` - 점수 행 추가 (29076번 라인)
- ❌ `window.addModalQAItem()` - Q&A 항목 추가 (29077번 라인)
- ❌ `window.removePositionFromCategory()` - 카테고리에서 직책 제거 (29081번 라인)
- ❌ `window.saveBlock()` - 블록 저장 (29883번 라인)

### **로딩/화면**
- ❌ `window.setSequentialLoadingComplete()` - 순차 로딩 완료 (26898번 라인)
- ❌ `window.hideLoadingScreen()` - 로딩 화면 숨기기 (26925번 라인)

---

## 🔍 중복 가능성 확인 필요

### **확인된 중복 없음**
현재 분석 결과, 모듈화된 파일과 index.html 간의 명확한 중복은 발견되지 않았습니다. 다만 다음 사항을 확인해야 합니다:

1. **카카오 관련 함수**
   - `js/config/kakao-config.js`에 `kakaoLogin()` 등이 있음
   - `index.html`에 `window.handleKakaoLogin()`이 있음
   - → 이 둘은 다른 목적이지만 통합 가능

2. **이벤트 관련 함수**
   - `js/events.js`에 많은 함수가 export됨
   - `index.html`에도 이벤트 관련 함수들이 있음
   - → 일부는 중복일 수 있음

---

## 📋 모듈화 우선순위

### **1단계: 조짜기 기능** (높은 우선순위)
- 파일: `js/features/groups/group-maker.js`
- 함수들:
  - `openGroupMakerModal()`
  - `closeGroupMakerModal()`
  - `createGroupsNew()`
  - `updateLeaderSelectorsNew()`
  - `showGroupResultsNew()`

### **2단계: 리뷰 기능** (높은 우선순위)
- 파일: `js/features/reviews/review-modal.js`
- 함수들:
  - `openReviewModal()`
  - 리뷰 작성/수정 관련 함수들

### **3단계: 이벤트 상세 모달** (중간 우선순위)
- 파일: `js/features/events/event-detail-modal.js`
- 함수들:
  - `showEventDetails()`
  - `showEventDetailModal()`
  - `closeEventDetailModal()`
  - `openRoadmapEventEditModal()`
  - `deleteRoadmapEvent()`

### **4단계: 참가자 관리** (중간 우선순위)
- 파일: `js/features/events/participants.js`
- 함수들:
  - `toggleParticipantsList()`
  - `toggleRestaurantParticipantsDetails()`
  - `confirmRemoveParticipant()`
  - `openAddParticipantModal()`
  - `addParticipantToEventQuick()`
  - `removeParticipantFromEvent()`

### **5단계: 조모임 관리** (낮은 우선순위)
- 파일: `js/features/groups/group-management.js`
- 함수들:
  - `openGroupManageModal()`
  - `searchMembersForGroup()`
  - `addMemberToGroup()`
  - `removeGroupMember()`
  - `setGroupMemberRole()`

### **6단계: 식당 관리** (낮은 우선순위)
- 파일: `js/features/restaurants/restaurant-management.js`
- 함수들:
  - `openRestaurantEditModal()`
  - `saveRestaurantMenu()`
  - `toggleRestaurantReviews()`

### **7단계: UI 유틸리티** (낮은 우선순위)
- 파일: `js/ui/modals.js` 또는 `js/utils/modals.js`
- 함수들:
  - `openInquiryModal()`
  - `copyToClipboard()`
  - 기타 모달 관련 함수들

---

## 🛠️ 모듈화 작업 가이드

### **1. 새 모듈 파일 생성**
```javascript
// js/features/groups/group-maker.js
import { state } from "../../state.js";
import { showAlert } from "../../utils.js";
import { db, doc, updateDoc } from "../../firebase.js";

export async function openGroupMakerModal(eventId) {
  // 기존 코드 이동
}

export function closeGroupMakerModal() {
  // 기존 코드 이동
}
```

### **2. index.html에서 import 및 window에 할당**
```javascript
// index.html 하단
<script type="module">
  import { openGroupMakerModal, closeGroupMakerModal } from "./js/features/groups/group-maker.js";
  
  // HTML onclick에서 사용하기 위해 window에 할당
  window.openGroupMakerModal = openGroupMakerModal;
  window.closeGroupMakerModal = closeGroupMakerModal;
</script>
```

### **3. 기존 코드 제거**
- index.html에서 해당 함수 정의 제거
- 중복 코드 확인 및 정리

---

## 📊 통계

- **모듈화 완료**: 약 30개 함수
- **모듈화 필요**: 약 50개 함수
- **index.html 라인 수**: 30,260줄
- **예상 모듈화 후**: 약 20,000줄 (33% 감소 예상)

---

## ⚠️ 주의사항

1. **HTML onclick 속성**: 많은 함수가 HTML의 `onclick` 속성에서 직접 호출됨
   - 해결: 모듈화 후 `window.함수명`으로 할당 필요

2. **의존성 관리**: 함수 간 의존성이 복잡함
   - 해결: import 순서 주의 및 순환 참조 방지

3. **전역 변수**: `window.state`, `window.currentUser` 등 전역 변수 사용
   - 해결: `js/state.js`를 통한 상태 관리

4. **점진적 모듈화**: 한 번에 모든 것을 모듈화하지 말고 단계적으로 진행

---

**다음 단계**: 우선순위에 따라 단계적으로 모듈화 진행


