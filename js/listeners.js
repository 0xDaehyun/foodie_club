import { db, doc, onSnapshot, collection, query, orderBy } from "./firebase.js";
import { state } from "./state.js";
import { scheduleRender } from "./utils.js";
import { computeOnline, renderPresenceUI } from "./presence.js";

export const unsubPublic = {
  admins: null,
  signup: null,
  dues: null,
  blocks: null,
  roadmap: null,
  events: null,
};
export const unsubAdmin = {
  suggestions: null,
  history: null,
  members: null,
  presence: null,
};

export const DEMO = {
  roadmap: [
    {
      id: "r1",
      activityName: "1차 미식회",
      activityDate: new Date().toISOString().slice(0, 10),
      order: 0,
    },
    {
      id: "r2",
      activityName: "2차 미식회",
      activityDate: new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .slice(0, 10),
      order: 1,
    },
    {
      id: "r3",
      activityName: "번개 이벤트",
      activityDate: new Date(Date.now() + 14 * 86400000)
        .toISOString()
        .slice(0, 10),
      order: 2,
    },
    {
      id: "r4",
      activityName: "MT",
      activityDate: new Date(Date.now() + 21 * 86400000)
        .toISOString()
        .slice(0, 10),
      order: 3,
    },
  ],
};

export const clearPublic = () =>
  Object.keys(unsubPublic).forEach((k) => {
    if (unsubPublic[k]) {
      unsubPublic[k]();
      unsubPublic[k] = null;
    }
  });
export const clearAdmin = () =>
  Object.keys(unsubAdmin).forEach((k) => {
    if (unsubAdmin[k]) {
      unsubAdmin[k]();
      unsubAdmin[k] = null;
    }
  });

// 모든 리스너 정리 (로그아웃 시 사용)
export function stopAllListeners() {
  clearPublic();
  clearAdmin();
}

// 로딩 상태 관리
let loadingStates = new Set();
let dataLoadedFlags = {
  blocks: false,
  roadmap: false,
  events: false,
  admins: false,
  signup: false,
  dues: false,
};

const showLoadingIndicator = (key) => {
  loadingStates.add(key);
  updateLoadingUI();
};
const hideLoadingIndicator = (key) => {
  loadingStates.delete(key);
  updateLoadingUI();
};

// 데이터 로드 완료 플래그 설정
const markDataLoaded = (key) => {
  if (key in dataLoadedFlags) {
    dataLoadedFlags[key] = true;
  }
  checkAndRetryEmptyData();
};

// 빈 데이터 즉시 재로딩 체크 (재시도 카운터로 무한 루프 방지)
let retryCounts = {
  blocks: 0,
  roadmap: 0,
  events: 0,
};
const MAX_RETRIES = 5; // 최대 5번 재시도로 증가

const checkAndRetryEmptyData = () => {
  // blocks 데이터가 로드되었는데 비어있으면 즉시 재시도
  if (
    dataLoadedFlags.blocks &&
    (!state.blocksData || state.blocksData.length === 0)
  ) {
    if (retryCounts.blocks < MAX_RETRIES && unsubPublic.blocks) {
      retryCounts.blocks++;
      console.warn(
        `blocks 데이터가 비어있어 즉시 재로딩합니다. (${retryCounts.blocks}/${MAX_RETRIES})`
      );
      unsubPublic.blocks();
      unsubPublic.blocks = null;
      // 지체없이 즉시 재시도
      setTimeout(() => {
        if (!unsubPublic.blocks) {
          const setupBlocks = () => {
            unsubPublic.blocks = onSnapshot(
              query(collection(db, "homepageBlocks"), orderBy("order", "asc")),
              (snap) => {
                const hasData = snap.docs.length > 0;
                state.blocksData = snap.docs.map((d) => ({
                  id: d.id,
                  ...d.data(),
                }));
                if (hasData) retryCounts.blocks = 0; // 성공 시 카운터 리셋
                markDataLoaded("blocks");
                scheduleRender();
                // 데이터가 여전히 비어있으면 다시 체크
                if (!hasData) {
                  setTimeout(() => checkAndRetryEmptyData(), 50);
                }
              },
              (err) => {
                console.warn("blocks:", err?.message);
                hideLoadingIndicator("blocks");
                setTimeout(() => checkAndRetryEmptyData(), 0);
              }
            );
          };
          setupBlocks();
        }
      }, 0);
    } else if (retryCounts.blocks >= MAX_RETRIES) {
      console.warn(
        `blocks 데이터 재로딩 ${MAX_RETRIES}번 시도했지만 여전히 비어있습니다.`
      );
    }
  }
  
  // roadmap 데이터가 로드되었는데 비어있으면 즉시 재시도
  if (
    dataLoadedFlags.roadmap &&
    (!state.roadmapData || state.roadmapData.length === 0)
  ) {
    if (retryCounts.roadmap < MAX_RETRIES && unsubPublic.roadmap) {
      retryCounts.roadmap++;
      console.warn(
        `roadmap 데이터가 비어있어 즉시 재로딩합니다. (${retryCounts.roadmap}/${MAX_RETRIES})`
      );
      unsubPublic.roadmap();
      unsubPublic.roadmap = null;
      setTimeout(() => {
        if (!unsubPublic.roadmap) {
          const setupRoadmap = () => {
            unsubPublic.roadmap = onSnapshot(
              collection(db, "roadmap"),
              (snap) => {
                const hasData = snap.docs.length > 0;
                state.roadmapData = snap.docs.map((d) => ({
                  id: d.id,
                  ...d.data(),
                }));
                if (hasData) retryCounts.roadmap = 0;
                markDataLoaded("roadmap");
                scheduleRender();
                // 데이터가 여전히 비어있으면 다시 체크
                if (!hasData) {
                  setTimeout(() => checkAndRetryEmptyData(), 50);
                }
              },
              (err) => {
                console.warn("roadmap:", err?.message);
                hideLoadingIndicator("roadmap");
                setTimeout(() => checkAndRetryEmptyData(), 0);
              }
            );
          };
          setupRoadmap();
        }
      }, 0);
    } else if (retryCounts.roadmap >= MAX_RETRIES) {
      console.warn(
        `roadmap 데이터 재로딩 ${MAX_RETRIES}번 시도했지만 여전히 비어있습니다.`
      );
    }
  }
  
  // events 데이터가 로드되었는데 비어있으면 즉시 재시도
  if (
    dataLoadedFlags.events &&
    (!state.eventsData || state.eventsData.length === 0)
  ) {
    if (retryCounts.events < MAX_RETRIES && unsubPublic.events) {
      retryCounts.events++;
      console.warn(
        `events 데이터가 비어있어 즉시 재로딩합니다. (${retryCounts.events}/${MAX_RETRIES})`
      );
      unsubPublic.events();
      unsubPublic.events = null;
      setTimeout(() => {
        if (!unsubPublic.events) {
          const setupEvents = () => {
            unsubPublic.events = onSnapshot(
              query(collection(db, "events"), orderBy("datetime", "asc")),
              (snap) => {
                const hasData = snap.docs.length > 0;
                state.eventsData = snap.docs.map((d) => ({
                  id: d.id,
                  ...d.data(),
                }));
                if (hasData) retryCounts.events = 0;
                markDataLoaded("events");
                scheduleRender();
                // 데이터가 여전히 비어있으면 다시 체크
                if (!hasData) {
                  setTimeout(() => checkAndRetryEmptyData(), 50);
                }
              },
              (err) => {
                console.warn("events:", err?.message);
                hideLoadingIndicator("events");
                setTimeout(() => checkAndRetryEmptyData(), 0);
              }
            );
          };
          setupEvents();
        }
      }, 0);
    } else if (retryCounts.events >= MAX_RETRIES) {
      console.warn(
        `events 데이터 재로딩 ${MAX_RETRIES}번 시도했지만 여전히 비어있습니다.`
      );
    }
  }
};

// 초기 데이터 로드 후 빈 데이터 체크 (지연 실행)
const scheduleEmptyDataCheck = () => {
  setTimeout(() => {
    checkAndRetryEmptyData();
  }, 200);
};

const updateLoadingUI = () => {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;
  
  const loadingId = "data-loading-indicator";
  let loadingEl = document.getElementById(loadingId);
  
  if (loadingStates.size > 0) {
    if (!loadingEl) {
      loadingEl = document.createElement("div");
      loadingEl.id = loadingId;
      loadingEl.className =
        "fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse";
      loadingEl.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        <span class="text-sm font-medium">데이터를 불러오는 중...</span>
      `;
      document.body.appendChild(loadingEl);
    }
    loadingEl.classList.remove("hidden");
  } else {
    if (loadingEl) {
      loadingEl.classList.add("hidden");
      setTimeout(() => {
        if (loadingEl && loadingStates.size === 0) {
          loadingEl.remove();
        }
      }, 300);
    }
  }
};

export function startPublicListeners(USE_DEMO_OFFLINE) {
  // 재시도 로직을 위한 헬퍼 함수 (0.1초로 변경)
  const retryListener = (key, setupFn, delay = 100) => {
    showLoadingIndicator(key);
    return setTimeout(() => {
      if (unsubPublic[key]) {
        unsubPublic[key]();
        unsubPublic[key] = null;
      }
      setupFn();
    }, delay);
  };

  // 타임아웃 체크를 위한 헬퍼 함수 (0.1초로 변경, 초기 로드 시 즉시 체크)
  const setupWithTimeout = (key, listenerFn, setupFn, timeoutMs = 100) => {
    let hasData = false;
    let isFirstCheck = true;
    showLoadingIndicator(key);
    
    // 초기 로드 즉시 체크 (데이터가 없으면 바로 재시도)
    const immediateCheck = () => {
      if (isFirstCheck && !hasData) {
        isFirstCheck = false;
        // 데이터가 없으면 타임아웃 없이 즉시 재시도
        setTimeout(() => {
          if (!hasData) {
            console.warn(`${key}: 초기 데이터 로드 실패, 즉시 재시도합니다.`);
            retryListener(key, setupFn, 0);
          }
        }, 0);
      }
    };
    
    const timeoutId = setTimeout(() => {
      if (!hasData) {
        console.warn(
          `${key}: 데이터 로딩 타임아웃 (${timeoutMs}ms), 재시도합니다.`
        );
        retryListener(key, setupFn, 0);
      }
    }, timeoutMs);

    const wrappedListener = (snap) => {
      const hasAnyData =
        snap &&
        snap.exists !== false &&
        (snap.docs ? snap.docs.length > 0 : true);
      if (!hasAnyData && isFirstCheck) {
        immediateCheck();
        return;
      }
      hasData = true;
      clearTimeout(timeoutId);
      hideLoadingIndicator(key);
      listenerFn(snap);
    };

    // 초기 체크 실행
    immediateCheck();

    return wrappedListener;
  };

  if (!unsubPublic.admins) {
    const setupAdmins = () => {
      unsubPublic.admins = onSnapshot(
        doc(db, "admins", "list"),
        setupWithTimeout(
          "admins",
          (snap) => {
            state.adminList = snap.exists() ? snap.data().studentIds || [] : [];
            ensureAdminOptionals();
            scheduleRender();
          },
          setupAdmins
        ),
        (err) => {
          console.warn("admins:", err?.message);
          hideLoadingIndicator("admins");
          retryListener("admins", setupAdmins, 100);
        }
      );
    };
    setupAdmins();
  }
  if (!unsubPublic.signup) {
    const setupSignup = () => {
      unsubPublic.signup = onSnapshot(
        doc(db, "settings", "signup"),
        setupWithTimeout(
          "signup",
          (snap) => {
            state.signupSettings = snap.exists()
              ? snap.data()
              : { open: false, start: "", end: "" };
            scheduleRender();
          },
          setupSignup
        ),
        (err) => {
          console.warn("signup:", err?.message);
          hideLoadingIndicator("signup");
          retryListener("signup", setupSignup, 100);
        }
      );
    };
    setupSignup();
  }
  if (!unsubPublic.dues) {
    const setupDues = () => {
      unsubPublic.dues = onSnapshot(
        doc(db, "settings", "dues"),
        setupWithTimeout(
          "dues",
          (snap) => {
            state.duesSettings = snap.exists()
              ? snap.data()
              : {
                  enabled: false,
                  bank: "",
                  number: "",
                  holder: "",
                  amount: "",
                  note: "",
                };
            scheduleRender();
          },
          setupDues
        ),
        (err) => {
          console.warn("dues:", err?.message);
          hideLoadingIndicator("dues");
          retryListener("dues", setupDues, 100);
        }
      );
    };
    setupDues();
  }
  if (!unsubPublic.blocks) {
    const setupBlocks = () => {
      unsubPublic.blocks = onSnapshot(
        query(collection(db, "homepageBlocks"), orderBy("order", "asc")),
        setupWithTimeout(
          "blocks",
          (snap) => {
            const hasData = snap.docs.length > 0;
            state.blocksData = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            markDataLoaded("blocks");
            scheduleRender();
            // 데이터가 비어있으면 즉시 체크
            if (!hasData) {
              setTimeout(() => checkAndRetryEmptyData(), 100);
            }
          },
          setupBlocks
        ),
        (err) => {
          console.warn("blocks:", err?.message);
          hideLoadingIndicator("blocks");
          retryListener("blocks", setupBlocks, 100);
        }
      );
    };
    setupBlocks();
  }
  if (!unsubPublic.roadmap) {
    const setupRoadmap = () => {
      unsubPublic.roadmap = onSnapshot(
        collection(db, "roadmap"),
        setupWithTimeout(
          "roadmap",
          (snap) => {
            const hasData = snap.docs.length > 0;
            state.roadmapData = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            markDataLoaded("roadmap");
            scheduleRender();
            // 데이터가 비어있으면 즉시 체크
            if (!hasData) {
              setTimeout(() => checkAndRetryEmptyData(), 100);
            }
          },
          setupRoadmap
        ),
        (err) => {
          console.warn("roadmap:", err?.message);
          if (USE_DEMO_OFFLINE) {
            state.roadmapData = DEMO.roadmap;
            scheduleRender();
          } else {
            hideLoadingIndicator("roadmap");
            retryListener("roadmap", setupRoadmap, 100);
          }
        }
      );
    };
    setupRoadmap();
  }
  if (!unsubPublic.events) {
    const setupEvents = () => {
      unsubPublic.events = onSnapshot(
        query(collection(db, "events"), orderBy("datetime", "asc")),
        setupWithTimeout(
          "events",
          (snap) => {
            const hasData = snap.docs.length > 0;
            state.eventsData = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            markDataLoaded("events");
            scheduleRender();
            // 데이터가 비어있으면 즉시 체크
            if (!hasData) {
              setTimeout(() => checkAndRetryEmptyData(), 100);
            }
          },
          setupEvents
        ),
        (err) => {
          console.warn("events:", err?.message);
          hideLoadingIndicator("events");
          retryListener("events", setupEvents, 100);
        }
      );
    };
    setupEvents();
  }
}

export function startAdminListeners() {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (!isAdmin) return;

  // 재시도 로직을 위한 헬퍼 함수 (0.1초로 변경)
  const retryListener = (key, setupFn, delay = 100) => {
    showLoadingIndicator(`admin-${key}`);
    return setTimeout(() => {
      if (unsubAdmin[key]) {
        unsubAdmin[key]();
        unsubAdmin[key] = null;
      }
      setupFn();
    }, delay);
  };

  // 타임아웃 체크를 위한 헬퍼 함수 (0.1초로 변경, 초기 로드 시 즉시 체크)
  const setupWithTimeout = (key, listenerFn, setupFn, timeoutMs = 100) => {
    let hasData = false;
    let isFirstCheck = true;
    showLoadingIndicator(`admin-${key}`);
    
    // 초기 로드 즉시 체크
    const immediateCheck = () => {
      if (isFirstCheck && !hasData) {
        isFirstCheck = false;
        setTimeout(() => {
          if (!hasData) {
            console.warn(`${key}: 초기 데이터 로드 실패, 즉시 재시도합니다.`);
            retryListener(key, setupFn, 0);
          }
        }, 0);
      }
    };
    
    const timeoutId = setTimeout(() => {
      if (!hasData) {
        console.warn(
          `${key}: 데이터 로딩 타임아웃 (${timeoutMs}ms), 재시도합니다.`
        );
        retryListener(key, setupFn, 0);
      }
    }, timeoutMs);

    const wrappedListener = (snap) => {
      const hasAnyData =
        snap &&
        snap.exists !== false &&
        (snap.docs ? snap.docs.length > 0 : true);
      if (!hasAnyData && isFirstCheck) {
        immediateCheck();
        return;
      }
      hasData = true;
      clearTimeout(timeoutId);
      hideLoadingIndicator(`admin-${key}`);
      listenerFn(snap);
    };

    immediateCheck();

    return wrappedListener;
  };

  if (!unsubAdmin.suggestions) {
    const setupSuggestions = () => {
      unsubAdmin.suggestions = onSnapshot(
        query(collection(db, "suggestions"), orderBy("timestamp", "desc")),
        setupWithTimeout(
          "suggestions",
          (snap) => {
            state.suggestionsData = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            scheduleRender();
          },
          setupSuggestions
        ),
        (err) => {
          console.warn("suggestions:", err?.message);
          hideLoadingIndicator("admin-suggestions");
          retryListener("suggestions", setupSuggestions, 100);
        }
      );
    };
    setupSuggestions();
  }
  if (!unsubAdmin.history) {
    const setupHistory = () => {
      unsubAdmin.history = onSnapshot(
        query(collection(db, "history"), orderBy("createdAt", "desc")),
        setupWithTimeout(
          "history",
          (snap) => {
            state.historyData = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            scheduleRender();
          },
          setupHistory
        ),
        (err) => {
          console.warn("history:", err?.message);
          hideLoadingIndicator("admin-history");
          retryListener("history", setupHistory, 100);
        }
      );
    };
    setupHistory();
  }
  if (!unsubAdmin.members) {
    const setupMembers = () => {
      unsubAdmin.members = onSnapshot(
        query(collection(db, "members"), orderBy("name", "asc")),
        setupWithTimeout(
          "members",
          (snap) => {
            state.membersData = snap.docs.map((d) => {
              const data = d.data();
              // kakaoUserId는 숫자로 저장되어 있지만, 표시를 위해 문자열로도 보관
              // 원본 숫자 값은 유지하되, 표시용 문자열도 추가
              if (data.kakaoUserId !== undefined && data.kakaoUserId !== null && data.kakaoUserId !== "") {
                // 원본 타입 유지 (숫자면 숫자, 문자열이면 문자열)
                // 하지만 표시를 위해 문자열 버전도 준비
                data._kakaoUserIdString = String(data.kakaoUserId);
              } else {
                // kakaoUserId가 null이거나 빈 값이면 _kakaoUserIdString도 제거
                delete data._kakaoUserIdString;
              }
              return { id: d.id, ...data };
            });
            console.log("[listeners] membersData 로드됨:", state.membersData.length, "개");
            scheduleRender();
            // 회원 관리 탭이 열려있으면 다시 렌더링
            const subtabContainer = document.getElementById("subtab-container");
            if (subtabContainer && subtabContainer.innerHTML.includes("회원 관리")) {
              import("./dashboard.js").then(({ renderMembersAdmin }) => {
                renderMembersAdmin(subtabContainer);
              });
            }
          },
          setupMembers
        ),
        (err) => {
          console.warn("members:", err?.message);
          hideLoadingIndicator("admin-members");
          retryListener("members", setupMembers, 100);
        }
      );
    };
    setupMembers();
  }
  if (!unsubAdmin.presence) {
    const setupPresence = () => {
      unsubAdmin.presence = onSnapshot(
        collection(db, "presence"),
        setupWithTimeout(
          "presence",
          (snap) => {
            state.presenceData = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            computeOnline();
            renderPresenceUI();
          },
          setupPresence
        ),
        (err) => {
          console.warn("presence:", err?.message);
          hideLoadingIndicator("admin-presence");
          retryListener("presence", setupPresence, 100);
        }
      );
    };
    setupPresence();
  }
}
export function ensureAdminOptionals() {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (isAdmin) startAdminListeners();
  else {
    clearAdmin();
    renderPresenceUI();
  }
}
