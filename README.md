# 🍽️ Foodie - 전북대 맛집 탐방 동아리

<div align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
</div>

<br>

<div align="center">
  <h3>🍴 전북대학교 맛집 탐방 동아리 '푸디'의 공식 웹사이트</h3>
  <p>맛있는 식사를 통해 소통하고 성장하는 동아리 커뮤니티 플랫폼</p>
</div>

---

## 📋 목차

- [🌟 프로젝트 소개](#-프로젝트-소개)
- [✨ 주요 기능](#-주요-기능)
- [🛠️ 기술 스택](#️-기술-스택)
- [🚀 시작하기](#-시작하기)
- [📱 화면 구성](#-화면-구성)
- [👥 팀원](#-팀원)
- [📄 라이선스](#-라이선스)

---

## 🌟 프로젝트 소개

**Foodie**는 전북대학교 맛집 탐방 동아리 '푸디'를 위한 종합 커뮤니티 플랫폼입니다. 동아리원들이 맛집 정보를 공유하고, 미식회 일정을 관리하며, 소통할 수 있는 통합 웹 서비스를 제공합니다.

### 🎯 프로젝트 목표

- **맛집 정보 공유**: 동아리원들이 발견한 맛집 정보를 체계적으로 관리
- **일정 관리**: 미식회, MT, 총회 등 동아리 활동 일정을 효율적으로 관리
- **커뮤니티 활성화**: 조모임 랭킹 시스템을 통한 동아리원 간 소통 증진
- **관리 효율성**: 관리자 도구를 통한 동아리 운영 자동화

---

## ✨ 주요 기능

### 🍽️ **미식회 & 이벤트 관리**

- 📅 **일정 관리**: 달력 형태의 직관적인 일정 표시
- 📝 **신청 시스템**: 이벤트별 참가 신청 및 관리
- 👥 **인원 관리**: 정원 설정 및 대기자 관리
- 📊 **통계**: 참가 현황 및 인기도 분석

### 📚 **커뮤니티 기능**

- 📢 **공지사항**: 중요한 소식 및 업데이트 알림
- 💬 **소통 공간**: 동아리원 간 자유로운 소통
- 👤 **회원 관리**: 회원가입, 승인, 정보 관리
- 🔐 **권한 관리**: 관리자 및 일반 회원 권한 구분

### 📱 **반응형 디자인**

- 💻 **데스크톱**: 전체 기능을 활용한 완전한 경험
- 📱 **모바일**: 터치 최적화된 직관적인 인터페이스

---

## 🛠️ 기술 스택

### **Frontend**

- **HTML5** - 시맨틱 마크업
- **CSS3** - 스타일링 및 애니메이션
- **JavaScript (ES6+)** - 동적 기능 구현
- **Tailwind CSS** - 유틸리티 퍼스트 CSS 프레임워크

### **Backend & Database**

- **Firebase Authentication** - 사용자 인증
- **Cloud Firestore** - 실시간 데이터베이스
- **Firebase Hosting** - 웹 호스팅

### **외부 라이브러리**

- **Font Awesome** - 아이콘
- **html2canvas** - 캘린더 이미지 다운로드
- **DOMPurify** - XSS 방지
- **XLSX** - 엑셀 파일 처리

---

## 🚀 시작하기

### 📋 사전 요구사항

- 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- 인터넷 연결

### 🔧 설치 및 실행

1. **저장소 클론**

   ```bash
   git clone https://github.com/your-username/foodie-website.git
   cd foodie-website
   ```

2. **Firebase 설정**

   - Firebase 프로젝트 생성
   - `firebase-config.js` 파일에 설정 정보 입력

3. **웹 서버 실행**

   ```bash
   # 간단한 로컬 서버 실행 (Python 3)
   python -m http.server 8000

   # 또는 Node.js 서버
   npx serve .
   ```

4. **브라우저에서 접속**
   ```
   http://localhost:8000
   ```

---

## 📱 화면 구성

### 🏠 **메인 화면**

- 로그인/회원가입 폼
- 현재 접속자 목록
- 조모임 랭킹 (로그인 시)

### 📅 **일정 관리**

- 달력 형태의 일정 표시
- 이벤트 상세 정보 및 신청
- 관리자용 일정 추가/수정 기능

### 👥 **관리자 패널**

- 회원 관리 및 승인
- 이벤트 생성 및 관리
- 통계 및 분석 도구

---

## 🎨 주요 특징

### 🌈 **사용자 경험 (UX)**

- **직관적인 인터페이스**: 누구나 쉽게 사용할 수 있는 디자인
- **빠른 로딩**: 최적화된 코드로 빠른 페이지 로딩
- **반응형 디자인**: 모든 기기에서 완벽한 경험
- **접근성**: 다양한 사용자를 고려한 접근성 설계

### 🔒 **보안**

- **XSS 방지**: DOMPurify를 통한 안전한 HTML 처리
- **권한 관리**: 역할 기반 접근 제어
- **데이터 검증**: 입력 데이터 유효성 검사

### ⚡ **성능**

- **실시간 업데이트**: Firebase를 통한 실시간 데이터 동기화
- **캐싱**: 로컬 스토리지를 활용한 데이터 캐싱
- **최적화**: 불필요한 리렌더링 방지

---

## 👥 팀원

### 🎯 **개발자: 회장 이대현**

-  총괄 개발 및 기획
-  데이터베이스 설계
-  UI/UX 디자인 및 기획
-  콘텐츠 및 마케팅

### 🙏 **특별 감사**

- 베타 테스터 및 피드백 제공자들

---

## 📈 향후 계획

### 🚀 **단기 계획**

- [ ] 모바일 앱 개발
- [ ] 실시간 채팅 기능 추가
- [ ] 맛집 리뷰 시스템 구축

### 🌟 **장기 계획**

- [ ] 페이먼트 시스템 연결 후 결제 시스템 구현
- [ ] 소셜 로그인 연동
- [ ] 다국어 지원

---

## 📞 문의 및 지원

- **이메일**: leedaehyun11@naver.com
- **GitHub Issues**: [Issues 페이지](https://github.com/your-username/foodie-website/issues)
- **동아리 연락처**: 전북대학교 Foodie 동아리 인스타그램

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

<div align="center">
  <p>🍽️ <strong>맛있는 식사를 통해 소통하고 성장하는 Foodie와 함께하세요!</strong> 🍽️</p>
  <p>Made by Foodie 2025 회장 이대현🧑🏻‍💻</p>
</div>

---

### 📊 프로젝트 통계

![GitHub stars](https://img.shields.io/github/stars/your-username/foodie-website?style=social)
![GitHub forks](https://img.shields.io/github/forks/your-username/foodie-website?style=social)
![GitHub issues](https://img.shields.io/github/issues/your-username/foodie-website)
![GitHub pull requests](https://img.shields.io/github/issues-pr/your-username/foodie-website)

![GitHub last commit](https://img.shields.io/github/last-commit/your-username/foodie-website)
![GitHub contributors](https://img.shields.io/github/contributors/your-username/foodie-website)
![GitHub repo size](https://img.shields.io/github/repo-size/your-username/foodie-website)
