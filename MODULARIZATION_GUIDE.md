# 🏗️ Foodie 웹 서비스 모듈화 가이드

## 📁 새로운 프로젝트 구조

```
프로젝트 루트/
├── index.html (간소화 예정)
├── styles.css
├── js/
│   ├── config/
│   │   ├── firebase-config.js ✅ (완료)
│   │   └── kakao-config.js ✅ (완료)
│   ├── features/
│   │   └── notifications/
│   │       └── kakao-notify.js ✅ (완료)
│   ├── core/
│   ├── auth/
│   ├── ui/
│   └── utils/
└── 이 파일 (MODULARIZATION_GUIDE.md)
```

---

## 🎯 완료된 모듈

### 1. Firebase 설정 모듈 (`js/config/firebase-config.js`)

**기능:**
- Firebase 앱 초기화
- Firestore, Auth, Storage 인스턴스 제공
- 모든 Firebase 함수 export

**사용 예시:**
```javascript
import { db, doc, getDoc, updateDoc } from "./config/firebase-config.js";

// Firestore에서 데이터 읽기
const userDoc = await getDoc(doc(db, "users", "123"));
console.log(userDoc.data());

// Firestore 데이터 업데이트
await updateDoc(doc(db, "users", "123"), {
  name: "홍길동"
});
```

---

### 2. 카카오 SDK 모듈 (`js/config/kakao-config.js`)

**기능:**
- 카카오 SDK 초기화
- 카카오 로그인/로그아웃
- 카카오톡 메시지 전송
- 연동 상태 확인

**사용 예시:**
```javascript
import {
  initKakao,
  kakaoLogin,
  sendKakaoMessage,
  isKakaoConnected
} from "./config/kakao-config.js";

// 1. SDK 초기화 (앱 시작 시 1회)
initKakao("YOUR_JAVASCRIPT_KEY");

// 2. 사용자 카카오 로그인
const authData = await kakaoLogin();
console.log("액세스 토큰:", authData.access_token);

// 3. 카카오톡 메시지 전송
await sendKakaoMessage({
  text: "안녕하세요! 테스트 메시지입니다.",
  link: "https://your-site.com"
});

// 4. 연동 상태 확인
if (isKakaoConnected()) {
  console.log("카카오 연동됨");
}
```

---

### 3. 카카오 알림 모듈 (`js/features/notifications/kakao-notify.js`)

**기능:**
- 이벤트 타입별 자동 알림
- MT/총회 입금 정보 알림
- 미식회 신청 알림
- 일반 이벤트 신청 알림

**사용 예시:**
```javascript
import { autoNotify } from "./features/notifications/kakao-notify.js";

// MT 신청 완료 시 자동 알림
async function onMTApplicationComplete(eventData) {
  // 1. Firebase에 신청 정보 저장
  await saveApplication(eventData);
  
  // 2. 웹 알림 표시
  showAlert("✅", "신청이 완료되었습니다!");
  
  // 3. 카카오 연동된 경우 자동으로 카톡 발송
  await autoNotify("mt", {
    title: eventData.title,
    amount: "50,000",
    bank: "농협",
    account: "123-456-789",
    holder: "홍길동",
    note: "신청 후 24시간 이내 입금해주세요."
  });
}

// 미식회 신청 완료 시 자동 알림
async function onTastingApplicationComplete(eventData, restaurantData) {
  await saveApplication(eventData);
  showAlert("✅", "미식회 신청이 완료되었습니다!");
  
  await autoNotify("tasting", eventData, {
    restaurant: restaurantData
  });
}
```

---

## 🔧 index.html에 모듈 적용하기

### 기존 방식 (인라인 스크립트)
```html
<script>
  // Firebase 초기화
  import { initializeApp } from "https://...";
  const firebaseConfig = { ... };
  const app = initializeApp(firebaseConfig);
  
  // 수천 줄의 코드...
</script>
```

### 새로운 방식 (모듈 분리)
```html
<head>
  <!-- 카카오 SDK -->
  <script src="https://developers.kakao.com/sdk/js/kakao.js"></script>
</head>

<body>
  <!-- HTML 마크업만 -->
  
  <!-- 메인 스크립트 (맨 마지막에) -->
  <script type="module">
    import { initKakao } from "./js/config/kakao-config.js";
    import { db } from "./js/config/firebase-config.js";
    
    // 앱 초기화
    initKakao("YOUR_JAVASCRIPT_KEY");
    
    // 나머지 로직...
  </script>
</body>
```

---

## 📝 다음 단계

### 진행 예정 작업:
1. ✅ Firebase 설정 모듈 분리 (완료)
2. ✅ 카카오 SDK 모듈 분리 (완료)
3. ✅ 카카오 알림 모듈 생성 (완료)
4. ⏳ 이벤트 관련 함수들 모듈화
5. ⏳ UI 컴포넌트 (모달, 알림) 모듈화
6. ⏳ 유틸리티 함수 정리
7. ⏳ index.html 간소화

### 예상 효과:
- ✅ 코드 가독성 향상
- ✅ 유지보수 용이
- ✅ 재사용성 증가
- ✅ 테스트 용이
- ✅ 협업 효율 향상

---

## 🚀 빠른 시작

### 1. 카카오 JavaScript 키 발급
1. [카카오 디벨로퍼스](https://developers.kakao.com) 접속
2. [앱 설정] → [앱 키] → JavaScript 키 복사

### 2. index.html에 적용
```html
<script type="module">
  import { initKakao } from "./js/config/kakao-config.js";
  
  // 여기에 복사한 키 입력
  initKakao("YOUR_JAVASCRIPT_KEY_HERE");
</script>
```

### 3. 이벤트 신청 로직에 알림 추가
기존 신청 함수를 찾아서 `autoNotify()` 추가:

```javascript
import { autoNotify } from "./js/features/notifications/kakao-notify.js";

// 기존 MT 신청 함수
async function applyForMT(eventId) {
  // ... 기존 코드 ...
  
  // 신청 완료 후 알림 추가 (3줄만 추가!)
  await autoNotify("mt", {
    title: event.title,
    amount: formatKRW(event.payment.amount),
    bank: event.payment.bank,
    account: event.payment.number,
    holder: event.payment.holder,
    note: event.payment.note
  });
}
```

---

## 💡 팁

### 카카오 연동 선택 사항으로 만들기
```javascript
// 설정 페이지에 추가
<button onclick="connectKakao()">카카오 알림 받기</button>

async function connectKakao() {
  const authData = await kakaoLogin();
  
  // Firebase에 토큰 저장
  await updateDoc(doc(db, "users", currentUser.id), {
    kakaoConnected: true,
    kakaoToken: authData.access_token
  });
  
  alert("✅ 카카오 알림이 활성화되었습니다!");
}
```

### 에러 처리
```javascript
try {
  await autoNotify("mt", eventData);
} catch (error) {
  // 카톡 전송 실패해도 신청은 완료된 상태
  console.log("카카오톡 전송 실패 (무시):", error);
}
```

---

## 📞 문의

모듈 사용 중 문제가 있으면 콘솔 로그를 확인하세요:
```javascript
// 개발 모드 활성화
localStorage.setItem("foodie_debug", "true");
location.reload();
```

---

**마지막 업데이트:** 2025-11-07




































