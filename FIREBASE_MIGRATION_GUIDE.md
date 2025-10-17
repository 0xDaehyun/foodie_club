# 🔄 Firebase 계정 마이그레이션 가이드

## 📋 목차

1. [준비 단계](#1-준비-단계)
2. [새 Firebase 프로젝트 생성](#2-새-firebase-프로젝트-생성)
3. [데이터 백업](#3-데이터-백업)
4. [데이터 마이그레이션](#4-데이터-마이그레이션)
5. [코드 업데이트](#5-코드-업데이트)
6. [테스트](#6-테스트)
7. [배포](#7-배포)

---

## 1. 준비 단계

### ✅ 체크리스트

- [ ] 현재 Firebase 프로젝트의 관리자 권한 확인
- [ ] 새 Firebase 계정 준비
- [ ] 백업 시간 선정 (서비스 이용이 적은 시간대)
- [ ] 팀원들에게 마이그레이션 일정 공지

### 📊 현재 데이터베이스 구조

#### Firestore Collections:

- `members` - 회원 정보
- `events` - 이벤트 정보
- `inquiries` - 문의 내역
- `suggestions` - 건의사항
- `history` - 명예의 전당
- `blocks` - 홈 블록 데이터
- `roadmap` - 일정 정보
- `presence` - 실시간 접속 정보
- `rankings` - 조모임 랭킹

#### Settings Documents:

- `settings/signup` - 회원가입 설정
- `settings/dues` - 회비 설정
- `settings/customPositions` - 커스텀 직책
- `settings/deletedPositions` - 삭제된 직책
- `settings/presidentPositions` - 회장단 직책
- `admins/list` - 관리자 목록

#### Storage:

- 식당 이미지 (`restaurants/`)
- 기타 업로드 파일

---

## 2. 새 Firebase 프로젝트 생성

### 2.1 Firebase Console에서 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `foodie-club-new` (또는 원하는 이름)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

### 2.2 Firebase 서비스 활성화

#### Authentication 설정

```bash
1. Authentication 메뉴 → 시작하기
2. 로그인 방법 → 익명 사용 설정
```

#### Firestore Database 설정

```bash
1. Firestore Database 메뉴 → 데이터베이스 만들기
2. 위치 선택: asia-northeast3 (서울)
3. 프로덕션 모드로 시작
4. 보안 규칙 설정 (아래 참조)
```

#### Storage 설정

```bash
1. Storage 메뉴 → 시작하기
2. 보안 규칙 설정 (아래 참조)
```

### 2.3 보안 규칙 설정

#### Firestore 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 회원 정보
    match /members/{memberId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // 이벤트
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // 문의
    match /inquiries/{inquiryId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // 기타 컬렉션들
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

#### Storage 보안 규칙

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 2.4 Firebase 설정 정보 복사

```javascript
// Firebase Console → 프로젝트 설정 → 일반 → 내 앱
// "웹 앱에 Firebase 추가" 클릭 후 설정 정보 복사

const firebaseConfig = {
  apiKey: "YOUR_NEW_API_KEY",
  authDomain: "YOUR_NEW_PROJECT.firebaseapp.com",
  projectId: "YOUR_NEW_PROJECT_ID",
  storageBucket: "YOUR_NEW_PROJECT.appspot.com",
  messagingSenderId: "YOUR_NEW_MESSAGING_SENDER_ID",
  appId: "YOUR_NEW_APP_ID",
};
```

---

## 3. 데이터 백업

### 3.1 Firestore 데이터 내보내기

#### 방법 1: Firebase CLI 사용 (권장)

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 현재 프로젝트로 전환
firebase use foodie-club-694ba

# Firestore 데이터 내보내기
gcloud firestore export gs://foodie-club-694ba.appspot.com/backup-$(date +%Y%m%d)

# 내보낸 데이터 다운로드
gsutil -m cp -r gs://foodie-club-694ba.appspot.com/backup-YYYYMMDD ./firestore-backup
```

#### 방법 2: 수동 백업 스크립트 사용

아래 HTML 파일을 생성하여 브라우저에서 실행:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Firestore Backup</title>
  </head>
  <body>
    <h1>Firestore 데이터 백업</h1>
    <button onclick="backupData()">백업 시작</button>
    <pre id="status"></pre>

    <script type="module">
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
      import {
        getFirestore,
        collection,
        getDocs,
      } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

      const firebaseConfig = {
        apiKey: "AIzaSyDdrnlSQZa-GD006G9fvgYDL0V_ib3_pcE",
        authDomain: "foodie-club-694ba.firebaseapp.com",
        projectId: "foodie-club-694ba",
        storageBucket: "foodie-club-694ba.appspot.com",
        messagingSenderId: "563737208880",
        appId: "1:563737208880:web:d82b4ea6dd06754eb7e5f5",
      };

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);

      window.backupData = async function () {
        const status = document.getElementById("status");
        status.textContent = "백업 시작...\n";

        const collections = [
          "members",
          "events",
          "inquiries",
          "suggestions",
          "history",
          "blocks",
          "roadmap",
          "presence",
          "rankings",
        ];

        const backup = {};

        for (const collectionName of collections) {
          status.textContent += `${collectionName} 백업 중...\n`;
          const snapshot = await getDocs(collection(db, collectionName));
          backup[collectionName] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
        }

        // Settings 문서들
        status.textContent += "Settings 백업 중...\n";
        const settingsDocs = [
          "signup",
          "dues",
          "customPositions",
          "deletedPositions",
          "presidentPositions",
        ];
        backup.settings = {};

        for (const docName of settingsDocs) {
          const docRef = doc(db, "settings", docName);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            backup.settings[docName] = docSnap.data();
          }
        }

        // Admins 문서
        const adminsRef = doc(db, "admins", "list");
        const adminsSnap = await getDoc(adminsRef);
        if (adminsSnap.exists()) {
          backup.admins = adminsSnap.data();
        }

        // JSON 파일로 다운로드
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `foodie-backup-${
          new Date().toISOString().split("T")[0]
        }.json`;
        link.click();

        status.textContent += "\n백업 완료! 파일이 다운로드되었습니다.";
      };
    </script>
  </body>
</html>
```

### 3.2 Storage 데이터 백업

```bash
# Storage 데이터 다운로드
gsutil -m cp -r gs://foodie-club-694ba.appspot.com/* ./storage-backup/
```

---

## 4. 데이터 마이그레이션

### 4.1 Firestore 데이터 가져오기

#### 방법 1: Firebase CLI 사용

```bash
# 새 프로젝트로 전환
firebase use YOUR_NEW_PROJECT_ID

# 데이터 가져오기
gcloud firestore import gs://YOUR_NEW_PROJECT.appspot.com/backup-YYYYMMDD
```

#### 방법 2: 복원 스크립트 사용

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Firestore Restore</title>
  </head>
  <body>
    <h1>Firestore 데이터 복원</h1>
    <input type="file" id="backupFile" accept=".json" />
    <button onclick="restoreData()">복원 시작</button>
    <pre id="status"></pre>

    <script type="module">
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
      import {
        getFirestore,
        collection,
        doc,
        setDoc,
        serverTimestamp,
      } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

      const firebaseConfig = {
        // 새 Firebase 프로젝트 설정 입력
        apiKey: "YOUR_NEW_API_KEY",
        authDomain: "YOUR_NEW_PROJECT.firebaseapp.com",
        projectId: "YOUR_NEW_PROJECT_ID",
        storageBucket: "YOUR_NEW_PROJECT.appspot.com",
        messagingSenderId: "YOUR_NEW_MESSAGING_SENDER_ID",
        appId: "YOUR_NEW_APP_ID",
      };

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);

      window.restoreData = async function () {
        const fileInput = document.getElementById("backupFile");
        const status = document.getElementById("status");

        if (!fileInput.files[0]) {
          alert("백업 파일을 선택해주세요");
          return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function (e) {
          try {
            const backup = JSON.parse(e.target.result);
            status.textContent = "복원 시작...\n";

            // 컬렉션 복원
            for (const [collectionName, documents] of Object.entries(backup)) {
              if (collectionName === "settings" || collectionName === "admins")
                continue;

              status.textContent += `${collectionName} 복원 중... (${documents.length}개)\n`;

              for (const docData of documents) {
                const { id, ...data } = docData;

                // Timestamp 변환
                const processedData = {};
                for (const [key, value] of Object.entries(data)) {
                  if (value && typeof value === "object" && value.seconds) {
                    processedData[key] = new Date(value.seconds * 1000);
                  } else {
                    processedData[key] = value;
                  }
                }

                await setDoc(doc(db, collectionName, id), processedData);
              }
            }

            // Settings 복원
            if (backup.settings) {
              status.textContent += "Settings 복원 중...\n";
              for (const [docName, data] of Object.entries(backup.settings)) {
                await setDoc(doc(db, "settings", docName), data);
              }
            }

            // Admins 복원
            if (backup.admins) {
              status.textContent += "Admins 복원 중...\n";
              await setDoc(doc(db, "admins", "list"), backup.admins);
            }

            status.textContent += "\n✅ 복원 완료!";
          } catch (error) {
            status.textContent += `\n❌ 오류 발생: ${error.message}`;
            console.error(error);
          }
        };

        reader.readAsText(file);
      };
    </script>
  </body>
</html>
```

### 4.2 Storage 데이터 업로드

```bash
# 새 프로젝트의 Storage로 업로드
gsutil -m cp -r ./storage-backup/* gs://YOUR_NEW_PROJECT.appspot.com/
```

---

## 5. 코드 업데이트

### 5.1 Firebase 설정 변경

#### index.html 파일 수정

```javascript
// 2455-2462줄 수정
const firebaseConfig = {
  apiKey: "YOUR_NEW_API_KEY",
  authDomain: "YOUR_NEW_PROJECT.firebaseapp.com",
  projectId: "YOUR_NEW_PROJECT_ID",
  storageBucket: "YOUR_NEW_PROJECT.appspot.com",
  messagingSenderId: "YOUR_NEW_MESSAGING_SENDER_ID",
  appId: "YOUR_NEW_APP_ID",
};
```

#### js/firebase.js 파일 수정 (있는 경우)

```javascript
// 7-13줄 수정
export const firebaseConfig = {
  apiKey: "YOUR_NEW_API_KEY",
  authDomain: "YOUR_NEW_PROJECT.firebaseapp.com",
  projectId: "YOUR_NEW_PROJECT_ID",
  storageBucket: "YOUR_NEW_PROJECT.appspot.com",
  messagingSenderId: "YOUR_NEW_MESSAGING_SENDER_ID",
  appId: "YOUR_NEW_APP_ID",
};
```

### 5.2 변경사항 커밋

```bash
git add .
git commit -m "chore: Firebase 프로젝트 마이그레이션 - 새 설정으로 업데이트"
```

---

## 6. 테스트

### 6.1 로컬 테스트

```bash
# 로컬 서버 실행
npx serve .
# 또는
python -m http.server 8000
```

### 6.2 테스트 체크리스트

#### 인증 테스트

- [ ] 로그인 가능 여부
- [ ] 회원가입 가능 여부
- [ ] 로그아웃 정상 작동

#### 데이터 테스트

- [ ] 회원 목록 표시
- [ ] 이벤트 목록 표시
- [ ] 문의 내역 확인
- [ ] 명예의 전당 표시
- [ ] 일정 표시

#### 기능 테스트

- [ ] 이벤트 신청
- [ ] 문의하기
- [ ] 관리자 기능 (회원 관리, 이벤트 생성 등)
- [ ] 이미지 업로드
- [ ] 실시간 업데이트

#### 성능 테스트

- [ ] 페이지 로딩 속도
- [ ] 실시간 데이터 동기화
- [ ] 대용량 데이터 처리

---

## 7. 배포

### 7.1 프로덕션 배포

```bash
# GitHub Pages 배포 (자동)
git push origin main

# 또는 수동 배포
# 웹 호스팅 서비스에 파일 업로드
```

### 7.2 배포 후 확인사항

- [ ] 프로덕션 환경에서 로그인 테스트
- [ ] 모든 기능 정상 작동 확인
- [ ] 사용자에게 공지
- [ ] 구 Firebase 프로젝트 보관 (1개월 후 삭제 권장)

---

## 🚨 주의사항

### 1. 타이밍

- 사용자가 적은 시간대에 진행 (새벽 시간 권장)
- 마이그레이션 전 사용자에게 사전 공지

### 2. 백업

- 마이그레이션 전 반드시 완전한 백업
- 백업 파일 안전한 곳에 보관 (최소 2곳)

### 3. 테스트

- 프로덕션 배포 전 철저한 테스트
- 주요 기능 모두 확인

### 4. 롤백 계획

- 문제 발생 시 즉시 구 설정으로 복구 가능하도록 준비
- 구 Firebase 프로젝트 즉시 삭제하지 말 것

---

## 📞 문제 해결

### 데이터 마이그레이션 실패 시

```bash
1. 백업 파일 확인
2. 네트워크 상태 확인
3. Firebase 프로젝트 할당량 확인
4. 보안 규칙 확인
```

### 인증 오류 발생 시

```bash
1. Firebase Console → Authentication 설정 확인
2. 익명 인증 활성화 확인
3. 도메인 승인 목록 확인
```

### 이미지 로딩 실패 시

```bash
1. Storage 보안 규칙 확인
2. CORS 설정 확인
3. 이미지 URL 확인
```

---

## ✅ 마이그레이션 완료 후

1. **구 프로젝트 정리**

   - 1개월 후 구 Firebase 프로젝트 삭제
   - 백업 파일 안전한 곳에 보관

2. **모니터링**

   - Firebase Console에서 사용량 모니터링
   - 오류 로그 확인
   - 사용자 피드백 수집

3. **문서화**
   - 마이그레이션 과정 기록
   - 발생한 문제와 해결 방법 문서화

---

## 📚 참고 자료

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 데이터 마이그레이션](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Storage 마이그레이션](https://firebase.google.com/docs/storage/web/start)

---

**작성일**: 2025년 1월
**마지막 업데이트**: 2025년 1월

