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

export function startPublicListeners(USE_DEMO_OFFLINE) {
  // 재시도 로직을 위한 헬퍼 함수
  const retryListener = (key, setupFn, delay = 1000) => {
    return setTimeout(() => {
      if (unsubPublic[key]) {
        unsubPublic[key]();
        unsubPublic[key] = null;
      }
      setupFn();
    }, delay);
  };

  // 타임아웃 체크를 위한 헬퍼 함수
  const setupWithTimeout = (key, listenerFn, setupFn, timeoutMs = 1000) => {
    let hasData = false;
    const timeoutId = setTimeout(() => {
      if (!hasData) {
        console.warn(`${key}: 데이터 로딩 타임아웃, 재시도합니다.`);
        retryListener(key, setupFn);
      }
    }, timeoutMs);

    const wrappedListener = (snap) => {
      hasData = true;
      clearTimeout(timeoutId);
      listenerFn(snap);
    };

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
          retryListener("admins", setupAdmins);
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
          retryListener("signup", setupSignup);
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
          retryListener("dues", setupDues);
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
            state.blocksData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            scheduleRender();
          },
          setupBlocks
        ),
        (err) => {
          console.warn("blocks:", err?.message);
          retryListener("blocks", setupBlocks);
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
            state.roadmapData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            scheduleRender();
          },
          setupRoadmap
        ),
        (err) => {
          console.warn("roadmap:", err?.message);
          if (USE_DEMO_OFFLINE) {
            state.roadmapData = DEMO.roadmap;
            scheduleRender();
          } else {
            retryListener("roadmap", setupRoadmap);
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
            state.eventsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            scheduleRender();
          },
          setupEvents
        ),
        (err) => {
          console.warn("events:", err?.message);
          retryListener("events", setupEvents);
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

  // 재시도 로직을 위한 헬퍼 함수
  const retryListener = (key, setupFn, delay = 1000) => {
    return setTimeout(() => {
      if (unsubAdmin[key]) {
        unsubAdmin[key]();
        unsubAdmin[key] = null;
      }
      setupFn();
    }, delay);
  };

  // 타임아웃 체크를 위한 헬퍼 함수
  const setupWithTimeout = (key, listenerFn, setupFn, timeoutMs = 1000) => {
    let hasData = false;
    const timeoutId = setTimeout(() => {
      if (!hasData) {
        console.warn(`${key}: 데이터 로딩 타임아웃, 재시도합니다.`);
        retryListener(key, setupFn);
      }
    }, timeoutMs);

    const wrappedListener = (snap) => {
      hasData = true;
      clearTimeout(timeoutId);
      listenerFn(snap);
    };

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
          retryListener("suggestions", setupSuggestions);
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
            state.historyData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            scheduleRender();
          },
          setupHistory
        ),
        (err) => {
          console.warn("history:", err?.message);
          retryListener("history", setupHistory);
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
            state.membersData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            scheduleRender();
          },
          setupMembers
        ),
        (err) => {
          console.warn("members:", err?.message);
          retryListener("members", setupMembers);
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
            state.presenceData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            computeOnline();
            renderPresenceUI();
          },
          setupPresence
        ),
        (err) => {
          console.warn("presence:", err?.message);
          retryListener("presence", setupPresence);
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
