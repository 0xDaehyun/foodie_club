// 조짜기 기능 모듈
// 버전: 2025-01-27

import { state } from "../../state.js";
import { showAlert, saf } from "../../utils.js";

// 조장 선택기 업데이트
export function updateLeaderSelectorsNew(
  participants,
  groupCount,
  preserveSelections = false
) {
  const container = document.getElementById("leader-selectors-new");
  if (!container) return;

  // 기존 선택 정보 저장 (preserveSelections가 true일 때만)
  const previousSelections = {};
  if (preserveSelections) {
    container.querySelectorAll(".leader-select-new").forEach((select) => {
      if (select.value) {
        previousSelections[select.dataset.group] = select.value;
      }
    });
  }

  // 모든 선택기에서 선택된 조장들 수집
  const selectedLeaders = new Set(Object.values(previousSelections));

  container.innerHTML = "";
  for (let i = 1; i <= groupCount; i++) {
    const currentSelection = previousSelections[i] || "";

    container.innerHTML += `
            <div class="flex items-center gap-2 p-2 bg-white border rounded-lg">
              <div class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold">
                ${i}
              </div>
              <select class="leader-select-new flex-1 px-3 py-2 border rounded-lg text-sm focus:border-yellow-400" data-group="${i}">
                <option value="">조장 선택</option>
                ${participants
                  .map((p) => {
                    // 이미 다른 조에서 선택된 조장은 비활성화 (현재 조의 선택은 제외)
                    const isSelected =
                      selectedLeaders.has(p.studentId) &&
                      currentSelection !== p.studentId;
                    const selectedAttr =
                      currentSelection === p.studentId ? "selected" : "";
                    const disabledAttr = isSelected ? "disabled" : "";
                    const label = isSelected
                      ? `${p.name} (이미 선택됨)`
                      : `${p.name} (${p.gender}/${p.college})`;
                    return `<option value="${p.studentId}" ${selectedAttr} ${disabledAttr}>${saf(label)}</option>`;
                  })
                  .join("")}
              </select>
            </div>
          `;
  }

  // 조장 선택 시 다른 선택기 업데이트
  container.querySelectorAll(".leader-select-new").forEach((select) => {
    select.addEventListener("change", () => {
      updateLeaderSelectorsNew(participants, groupCount, true);
    });
  });
}

// 조 생성 알고리즘 (라운드 로빈)
export function createGroupsNew(
  participants,
  groupCount,
  genderBalance,
  collegeMix,
  leaderMode
) {
  const groups = Array.from({ length: groupCount }, () => []);
  // 기존 isLeader 플래그 제거하고 복사
  const members = participants.map((p) => {
    const clean = { ...p };
    delete clean.isLeader;
    return clean;
  });

  // 1. 수동 조장 선택
  const selectedLeaders = new Set();
  const manualLeaderAssignments = []; // 조장 할당 정보 저장

  if (leaderMode === "manual") {
    document.querySelectorAll(".leader-select-new").forEach((select) => {
      const leaderStudentId = select.value;
      if (leaderStudentId && !selectedLeaders.has(leaderStudentId)) {
        selectedLeaders.add(leaderStudentId);
        const leaderIdx = members.findIndex(
          (p) => p.studentId === leaderStudentId
        );
        if (leaderIdx >= 0) {
          const leader = members.splice(leaderIdx, 1)[0];
          leader.isLeader = true;
          const groupIdx = parseInt(select.dataset.group) - 1;

          // 조장을 맨 앞에 배치
          groups[groupIdx].unshift(leader);

          manualLeaderAssignments.push({
            studentId: leaderStudentId,
            name: leader.name,
            groupIdx: groupIdx,
          });

          console.log(
            `👑 조장 배치: ${leader.name} → ${groupIdx + 1}조 (맨 앞)`
          );
        }
      }
    });

    if (manualLeaderAssignments.length > 0) {
      console.log("✅ 수동 조장 배치 완료:", manualLeaderAssignments);
    }
  }

  // 2. 나머지 인원 배치
  // 조장이 배치된 조를 고려하여 가장 적은 인원을 가진 조부터 배치
  const getSmallestGroupIdx = () => {
    const sizes = groups.map((g, idx) => ({ idx, size: g.length }));
    // 조장이 없는 조를 우선 선택
    const groupsWithoutLeader = sizes.filter(
      (s) => !groups[s.idx].some((m) => m.isLeader)
    );
    if (groupsWithoutLeader.length > 0) {
      // 조장이 없는 조 중 가장 작은 조
      groupsWithoutLeader.sort((a, b) => a.size - b.size);
      return groupsWithoutLeader[0].idx;
    }
    // 모든 조에 조장이 있으면 가장 작은 조
    sizes.sort((a, b) => a.size - b.size);
    return sizes[0].idx;
  };

  if (genderBalance && collegeMix) {
    // 성별 + 학과 균형
    const byGenderCollege = {};
    members.forEach((p) => {
      const key = `${p.gender}-${p.college || "기타"}`;
      if (!byGenderCollege[key]) byGenderCollege[key] = [];
      byGenderCollege[key].push(p);
    });

    Object.values(byGenderCollege).forEach((list) =>
      list.sort(() => Math.random() - 0.5)
    );

    Object.keys(byGenderCollege)
      .sort()
      .forEach((key) => {
        byGenderCollege[key].forEach((member) => {
          const smallestIdx = getSmallestGroupIdx();
          groups[smallestIdx].push(member);
        });
      });
  } else if (genderBalance) {
    // 성별만 균형
    const males = members
      .filter((p) => p.gender === "남성")
      .sort(() => Math.random() - 0.5);
    const females = members
      .filter((p) => p.gender === "여성")
      .sort(() => Math.random() - 0.5);
    const others = members
      .filter((p) => p.gender !== "남성" && p.gender !== "여성")
      .sort(() => Math.random() - 0.5);

    [males, females, others].forEach((list) => {
      list.forEach((member) => {
        const smallestIdx = getSmallestGroupIdx();
        groups[smallestIdx].push(member);
      });
    });
  } else if (collegeMix) {
    // 학과만 균형
    const byCollege = {};
    members.forEach((p) => {
      const college = p.college || "기타";
      if (!byCollege[college]) byCollege[college] = [];
      byCollege[college].push(p);
    });

    Object.values(byCollege).forEach((list) =>
      list.sort(() => Math.random() - 0.5)
    );

    Object.keys(byCollege)
      .sort()
      .forEach((college) => {
        byCollege[college].forEach((member) => {
          const smallestIdx = getSmallestGroupIdx();
          groups[smallestIdx].push(member);
        });
      });
  } else {
    // 무작위
    members.sort(() => Math.random() - 0.5);
    members.forEach((member) => {
      const smallestIdx = getSmallestGroupIdx();
      groups[smallestIdx].push(member);
    });
  }

  // 3. 인원 균형 맞추기
  for (let iter = 0; iter < 10; iter++) {
    const sizes = groups.map((g) => g.length);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);
    if (maxSize - minSize <= 1) break;

    const maxIdx = sizes.indexOf(maxSize);
    const minIdx = sizes.indexOf(minSize);
    const memberToMove = groups[maxIdx]
      .slice()
      .reverse()
      .find((m) => !m.isLeader);

    if (memberToMove) {
      groups[maxIdx].splice(groups[maxIdx].indexOf(memberToMove), 1);
      groups[minIdx].push(memberToMove);
    }
  }

  // 4. 자동 조장 설정 (또는 수동 모드에서 조장 미선택 시 자동 설정)
  if (leaderMode === "auto" || leaderMode === "manual") {
    groups.forEach((group, idx) => {
      if (group.length > 0 && !group.some((m) => m.isLeader)) {
        group[0].isLeader = true;
        console.log(`👑 자동 조장 설정: ${group[0].name} → ${idx + 1}조`);
      }
    });
  }

  // 5. 조장을 맨 앞으로 (안전장치)
  groups.forEach((group, idx) => {
    const leaderIdx = group.findIndex((m) => m.isLeader);
    if (leaderIdx > 0) {
      console.log(
        `⚠️ 조장이 ${leaderIdx + 1}번째에 있음. 맨 앞으로 이동: ${
          group[leaderIdx].name
        } (${idx + 1}조)`
      );
      const [leader] = group.splice(leaderIdx, 1);
      group.unshift(leader);
    } else if (leaderIdx === 0) {
      console.log(
        `✅ ${idx + 1}조 조장 확인: ${group[0].name} (이미 맨 앞)`
      );
    }
  });

  // 최종 결과 로그
  console.log("🎯 최종 조 편성 결과:");
  groups.forEach((group, idx) => {
    const leader = group.find((m) => m.isLeader);
    console.log(
      `${idx + 1}조 (${group.length}명): 조장=${
        leader?.name || "없음"
      }, 멤버=[${group.map((m) => m.name).join(", ")}]`
    );
  });

  return groups;
}

// 결과 표시
export function showGroupResultsNew(eventId, groups) {
  const ev = state.eventsData.find((e) => e.id === eventId);
  if (!ev) {
    console.error("이벤트를 찾을 수 없습니다:", eventId);
    return;
  }

  const totalMembers = groups.reduce((sum, g) => sum + g.length, 0);

  const resultsHTML = `
          <div id="group-results-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                <div>
                  <h3 class="text-2xl font-bold text-white">조 편성 결과</h3>
                  <p class="text-purple-100 text-sm">${saf(ev.title)} - 총 ${totalMembers}명 / ${groups.length}개 조</p>
                </div>
                <button onclick="document.getElementById('group-results-modal').remove()" class="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2">
                  <i class="fas fa-times text-xl"></i>
                </button>
              </div>

              <div class="p-6 overflow-y-auto flex-1">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${groups
                    .map(
                      (group, idx) => `
                    <div class="border-2 border-purple-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
                      <div class="flex items-center justify-between mb-3">
                        <h4 class="text-xl font-bold text-purple-600">${
                          idx + 1
                        }조</h4>
                        <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">${
                          group.length
                        }명</span>
                      </div>
                      <div class="space-y-2">
                        ${group
                          .map(
                            (member) => `
                          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                            ${
                              member.isLeader
                                ? '<i class="fas fa-crown text-yellow-500 text-lg"></i>'
                                : '<div class="w-5"></div>'
                            }
                            <div class="flex-1 min-w-0">
                              <div class="font-semibold text-gray-900">${saf(
                                member.name
                              )}</div>
                              <div class="text-xs text-gray-500">${saf(
                                member.gender
                              )} / ${saf(member.college)}</div>
                            </div>
                          </div>
                        `
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>

              <div class="px-6 py-4 bg-gray-50 border-t flex gap-3">
                <button onclick="document.getElementById('group-results-modal').remove(); if(typeof window.openGroupMakerModal === 'function') window.openGroupMakerModal('${eventId}')"
                  class="px-6 py-3 border-2 border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 font-semibold">
                  <i class="fas fa-redo mr-2"></i>다시 짜기
                </button>
                <button onclick="document.getElementById('group-results-modal').remove()"
                  class="flex-1 bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 font-semibold">
                  <i class="fas fa-check mr-2"></i>확인
                </button>
              </div>
            </div>
          </div>
        `;

  document.body.insertAdjacentHTML("beforeend", resultsHTML);
}

// 조짜기 모달 열기
export async function openGroupMakerModal(eventId) {
  // 이미 모달이 열려있으면 중복 생성 방지
  if (document.getElementById("group-maker-modal")) {
    console.log("⚠️ 팀 구성하기 모달이 이미 열려있습니다.");
    return;
  }

  const ev = state.eventsData.find((e) => e.id === eventId);
  if (!ev) return showAlert("😥", "이벤트를 찾을 수 없습니다.");

  // 참가자 목록 수집
  let participants = [];
  if (ev.type === "tasting") {
    (ev.restaurants || []).forEach((r) => {
      (r.reservations || []).forEach((p) => {
        if (!participants.find((x) => x.studentId === p.studentId)) {
          participants.push(p);
        }
      });
    });
  } else {
    participants = ev.applicants || [];
  }

  if (participants.length === 0) {
    return showAlert("😥", "참가자가 없습니다.");
  }

  // 기존 모달들 모두 제거
  document.getElementById("group-maker-modal")?.remove();
  document.getElementById("group-results-modal")?.remove();

  // 간단한 모달 HTML
  const modalHTML = `
                        <div id="group-maker-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            <div class="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                                <div>
                                  <h3 class="text-2xl font-bold text-white">팀 구성하기</h3>
                  <p class="text-purple-100 text-sm">참가자 ${participants.length}명을 조로 나눕니다</p>
                                </div>
                <button type="button" id="group-maker-close-btn" class="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors">
                    <i class="fas fa-times text-xl"></i>
                  </button>
                </div>

              <div class="p-6 overflow-y-auto flex-1 space-y-4">
                <div class="border-2 border-gray-200 rounded-xl p-4">
                  <label class="block text-lg font-bold text-gray-800 mb-2">
                    <i class="fas fa-users mr-2 text-purple-600"></i>조 개수
                  </label>
                  <input type="number" id="group-count-new" min="2" max="10" value="2"
                    class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold focus:border-purple-500">
                </div>

                <div class="border-2 border-gray-200 rounded-xl p-4">
                  <label class="block text-lg font-bold text-gray-800 mb-3">
                    <i class="fas fa-balance-scale mr-2 text-blue-600"></i>균형 옵션
                  </label>
                  <div class="space-y-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" id="gender-balance-new" checked class="w-5 h-5">
                      <span>성별 균형 맞추기</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" id="college-mix-new" checked class="w-5 h-5">
                      <span>학과 고르게 섞기</span>
                    </label>
                  </div>
                </div>

                <div class="border-2 border-gray-200 rounded-xl p-4">
                  <label class="block text-lg font-bold text-gray-800 mb-3">
                    <i class="fas fa-crown mr-2 text-yellow-600"></i>조장 설정
                  </label>
                  <div class="space-y-2 mb-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="leader-mode-new" value="manual" checked class="w-5 h-5">
                      <span>수동으로 선택</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="leader-mode-new" value="auto" class="w-5 h-5">
                      <span>자동 설정 (각 조 첫 번째 사람)</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="leader-mode-new" value="none" class="w-5 h-5">
                      <span>조장 없음</span>
                    </label>
                  </div>

                  <div id="manual-leader-area-new">
                    <div id="leader-selectors-new" class="space-y-2 max-h-60 overflow-y-auto"></div>
                  </div>
                </div>
              </div>

              <div class="px-6 py-4 bg-gray-50 border-t flex gap-3">
                <button type="button" id="group-maker-cancel-btn" class="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-white hover:border-gray-400 transition-colors font-semibold">
                  <i class="fas fa-times mr-2"></i>취소
                </button>
                <button type="button" id="generate-groups-btn" class="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-lg">
                  <i class="fas fa-magic mr-2"></i>팀 구성하기 시작!
                </button>
              </div>
            </div>
          </div>
        `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // 이벤트 리스너 설정
  setTimeout(() => {
    // 현재 입력된 조 개수 가져오기 (기본값 2)
    const initialGroupCount =
      parseInt(document.getElementById("group-count-new").value) || 2;
    updateLeaderSelectorsNew(participants, initialGroupCount);

    // 닫기 버튼 이벤트 리스너
    const closeBtn = document.getElementById("group-maker-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        console.log("🔴 닫기 버튼 클릭됨");
        closeGroupMakerModal();
      });
    }

    // 취소 버튼 이벤트 리스너
    const cancelBtn = document.getElementById("group-maker-cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        console.log("🔴 취소 버튼 클릭됨");
        closeGroupMakerModal();
      });
    }

    // 모달 배경 클릭으로 닫기
    const modal = document.getElementById("group-maker-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          console.log("🔴 모달 배경 클릭으로 닫기");
          closeGroupMakerModal();
        }
      });
    }

    document
      .getElementById("group-count-new")
      ?.addEventListener("input", (e) => {
        updateLeaderSelectorsNew(
          participants,
          parseInt(e.target.value) || 2,
          true // 선택 정보 보존
        );
      });

    document
      .querySelectorAll('input[name="leader-mode-new"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          const area = document.getElementById("manual-leader-area-new");
          area.style.display =
            radio.value === "manual" ? "block" : "none";
          if (radio.value === "manual") {
            updateLeaderSelectorsNew(
              participants,
              parseInt(
                document.getElementById("group-count-new").value
              ) || 2,
              true // 선택 정보 보존
            );
          }
        });
      });

    // 조 짜기 버튼
    document
      .getElementById("generate-groups-btn")
      ?.addEventListener("click", () => {
        console.log("🔵 조 짜기 버튼 클릭됨");

        // 옵셔널 체이닝과 기본값 사용으로 안전하게 처리
        const groupCount =
          parseInt(document.getElementById("group-count-new")?.value) || 2;
        const genderBalance =
          document.getElementById("gender-balance-new")?.checked ?? true;
        const collegeMix =
          document.getElementById("college-mix-new")?.checked ?? true;
        const leaderMode =
          document.querySelector('input[name="leader-mode-new"]:checked')
            ?.value || "none";

        console.log("✅ 조 짜기 설정:", {
          groupCount,
          genderBalance,
          collegeMix,
          leaderMode,
        });

        const groups = createGroupsNew(
          participants,
          groupCount,
          genderBalance,
          collegeMix,
          leaderMode
        );
        closeGroupMakerModal();
        showGroupResultsNew(eventId, groups);
      });
  }, 50);
}

// 모달 닫기
export function closeGroupMakerModal() {
  document.getElementById("group-maker-modal")?.remove();
}


