export const state = {
  currentUser: null,
  adminList: [],
  MASTER_CODE: "foodie_emergency_2024!",

  // settings
  signupSettings: { open: false, start: "", end: "" },
  duesSettings: {
    enabled: false,
    bank: "",
    number: "",
    holder: "",
    amount: "",
    note: "",
  },

  // data
  roadmapData: [],
  suggestionsData: [],
  historyData: [],
  eventsData: [],
  membersData: [],
  blocksData: [],
  presenceData: [],
  onlineUsers: [],

  memberSearchTerm: "",
  editingEventId: null,
  roadmapShowAll: false,
  presenceTimer: null,

  // 홈블록 편집 상태
  editingBlockId_notice: null,
  editingBlockId_qa: null,
  editingBlockId_scores: null,
};
