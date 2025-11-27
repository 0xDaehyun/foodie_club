# Firebase Hosting 배포 가이드

## 📋 사전 준비

### 1. Firebase CLI 설치 확인
```bash
firebase --version
```

설치되어 있지 않다면:
```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인
```bash
firebase login
```

브라우저가 열리면 Google 계정으로 로그인하세요.

### 3. 프로젝트 확인
현재 프로젝트: `foodie-club-694ba`

프로젝트가 올바른지 확인:
```bash
firebase projects:list
```

## 🚀 배포 절차

### 1. Firebase Hosting 초기화 (최초 1회만)
```bash
firebase init hosting
```

질문에 대한 답변:
- **What do you want to use as your public directory?** → `.` (현재 디렉토리)
- **Configure as a single-page app?** → `Yes`
- **Set up automatic builds and deploys with GitHub?** → `No` (원하면 나중에 설정 가능)
- **File index.html already exists. Overwrite?** → `No`

### 2. 배포
```bash
firebase deploy --only hosting
```

### 3. 배포 확인
배포가 완료되면 다음과 같은 URL이 표시됩니다:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/foodie-club-694ba/overview
Hosting URL: https://foodie-club-694ba.web.app
```

## 📝 주요 파일 설명

### `firebase.json`
- Firebase Hosting 설정 파일
- `public`: 배포할 디렉토리 (현재 디렉토리 `.`)
- `rewrites`: 모든 경로를 `index.html`로 리다이렉트 (SPA 지원)
- `headers`: 캐시 설정

### `.firebaserc`
- Firebase 프로젝트 ID 설정
- 현재 프로젝트: `foodie-club-694ba`

## 🔧 배포 전 확인사항

### 1. 환경 변수 확인
- Firebase 설정이 올바른지 확인 (`js/firebase.js`)
- 카카오 SDK 키가 올바른지 확인

### 2. 파일 확인
- `index.html`이 루트에 있는지 확인
- 필요한 모든 JS 파일이 `js/` 디렉토리에 있는지 확인

### 3. 테스트
로컬에서 테스트:
```bash
firebase serve
```

브라우저에서 `http://localhost:5000` 접속하여 테스트

## 🔄 업데이트 배포

코드를 수정한 후 다시 배포:
```bash
firebase deploy --only hosting
```

## 📊 배포 이력 확인

```bash
firebase hosting:channel:list
```

## 🛠️ 고급 설정

### 커스텀 도메인 연결
1. Firebase Console → Hosting → "도메인 추가"
2. DNS 설정 안내에 따라 설정
3. SSL 인증서 자동 발급 (무료)

### 환경별 배포 (프리뷰 채널)
```bash
# 프리뷰 채널 생성
firebase hosting:channel:deploy preview-channel-name

# 프로덕션 배포
firebase deploy --only hosting
```

## ⚠️ 주의사항

1. **CORS 설정**: Firebase Hosting은 자동으로 CORS를 처리하므로 추가 설정 불필요
2. **HTTPS**: Firebase Hosting은 자동으로 HTTPS를 제공
3. **캐시**: 배포 후 변경사항이 즉시 반영되지 않을 수 있음 (브라우저 캐시 삭제 필요)

## 🐛 문제 해결

### 배포 실패 시
```bash
# 로그 확인
firebase deploy --only hosting --debug

# Firebase 로그인 상태 확인
firebase login:list
```

### 로컬 테스트
```bash
firebase serve --only hosting
```

## 📚 참고 자료

- [Firebase Hosting 문서](https://firebase.google.com/docs/hosting)
- [Firebase CLI 참조](https://firebase.google.com/docs/cli)

















