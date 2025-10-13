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
  if (!unsubPublic.admins) {
    unsubPublic.admins = onSnapshot(doc(db, "admins", "list"), (snap) => {
      state.adminList = snap.exists() ? snap.data().studentIds || [] : [];
      ensureAdminOptionals();
      scheduleRender();
    });
  }
  if (!unsubPublic.signup) {
    unsubPublic.signup = onSnapshot(doc(db, "settings", "signup"), (snap) => {
      state.signupSettings = snap.exists()
        ? snap.data()
        : { open: false, start: "", end: "" };
      scheduleRender();
    });
  }
  if (!unsubPublic.dues) {
    unsubPublic.dues = onSnapshot(doc(db, "settings", "dues"), (snap) => {
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
    });
  }
  if (!unsubPublic.blocks) {
    unsubPublic.blocks = onSnapshot(
      query(collection(db, "homepageBlocks"), orderBy("order", "asc")),
      (snap) => {
        state.blocksData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        scheduleRender();
      },
      (err) => console.warn("blocks:", err?.message)
    );
  }
  if (!unsubPublic.roadmap) {
    unsubPublic.roadmap = onSnapshot(
      collection(db, "roadmap"),
      (snap) => {
        state.roadmapData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        scheduleRender();
      },
      (err) => {
        console.warn("roadmap:", err?.message);
        if (USE_DEMO_OFFLINE) {
          state.roadmapData = DEMO.roadmap;
          scheduleRender();
        }
      }
    );
  }
  if (!unsubPublic.events) {
    unsubPublic.events = onSnapshot(
      query(collection(db, "events"), orderBy("datetime", "asc")),
      (snap) => {
        state.eventsData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        scheduleRender();
      },
      (err) => console.warn("events:", err?.message)
    );
  }
}

export function startAdminListeners() {
  const isAdmin =
    state.currentUser && state.adminList.includes(state.currentUser.studentId);
  if (!isAdmin) return;
  if (!unsubAdmin.suggestions) {
    unsubAdmin.suggestions = onSnapshot(
      query(collection(db, "suggestions"), orderBy("timestamp", "desc")),
      (snap) => {
        state.suggestionsData = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        scheduleRender();
      },
      (err) => console.warn("suggestions:", err?.message)
    );
  }
  if (!unsubAdmin.history) {
    unsubAdmin.history = onSnapshot(
      query(collection(db, "history"), orderBy("createdAt", "desc")),
      (snap) => {
        state.historyData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        scheduleRender();
      },
      (err) => console.warn("history:", err?.message)
    );
  }
  if (!unsubAdmin.members) {
    unsubAdmin.members = onSnapshot(
      query(collection(db, "members"), orderBy("name", "asc")),
      (snap) => {
        state.membersData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        scheduleRender();
      },
      (err) => console.warn("members:", err?.message)
    );
  }
  if (!unsubAdmin.presence) {
    unsubAdmin.presence = onSnapshot(
      collection(db, "presence"),
      (snap) => {
        state.presenceData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        computeOnline();
        renderPresenceUI();
      },
      (err) => console.warn("presence:", err?.message)
    );
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
