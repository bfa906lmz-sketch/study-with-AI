export const ROLE = { TEACHER: "teacher", STUDENT: "student" };
export const SCOPE = { BOARD: "board-level", REGION: "region-level", OBJECT: "object-level" };
export const PERMISSION = { VIEW: "view", INSPECT: "inspect", ANNOTATE: "annotate", EDIT_REGION: "edit-region", EDIT_BOARD: "edit-board" };
export const OBJECT = { TEXT_BLOCK: "text-block", ANNOTATION: "annotation", REGION: "region" };
export const ATTACHMENT = { IMAGE: "image", FILE: "file", WHITEBOARD_SNAPSHOT: "whiteboard-snapshot", SCREEN_CAPTURE: "screen-capture" };
export const SURFACE = { TEACHER_SCREEN: "teacher-screen", STUDENT_SCREEN: "student-screen", WHITEBOARD: "whiteboard" };
export const COLLAB_STATE = {
  IDLE: "idle", VIEWING: "viewing", SELECTING: "selecting", ANNOTATING: "annotating", EDITING: "editing", PENDING_ROLLBACK: "pending-rollback", GRANT_ACTIVE: "grant-active", GRANT_ENDED: "grant-ended"
};

export const messages = {
  meetingTitle: "Advanced Physics — Live Class", meetingSubtitle: "Phase 4 • Multimodal input and shared surface modeling", classCode: "Class Code: PHY-402", teacherCamera: "Teacher Camera", liveStatus: "Live", teacherWorkspace: "Teacher ↔ AI Workspace", teacherAiAnswer: "Teacher AI Summary", sendToWhiteboard: "Send to Whiteboard", whiteboardAndLesson: "Whiteboard / Current Lesson", inspectPanel: "Object Inspector & Collaboration Cues", askAiAboutSelection: "Ask AI about selection", saveToPersonalNotes: "Save to personal notes", studentCameraGrid: "Student Camera Grid", cameraPanel: "Camera Panel", publicInteractionHub: "Public Interaction Hub", studentAiWorkspace: "Student AI Workspace", studentAiAnswer: "AI Answer (Student)", studentRaiseHand: "Raise Hand", studentRequestUpload: "Request Upload", studentShareToClass: "Share to Class", studentSubmitRequest: "Submit Request", studentMore: "More ▾", studentStatusPendingReview: "Pending Review", studentStatusSharedToClass: "Shared to Class", studentStatusAccessGranted: "Access Granted", studentStatusRejected: "Rejected", send: "Send", upload: "Upload", paste: "Paste", micStart: "🎙 Start", micStop: "⏹ Stop", sharedSurfaceTitle: "Live Shared Surface (Mock)", copySnapshot: "Copy Snapshot", insertSnapshotToWhiteboard: "To Whiteboard", sendSnapshotToChat: "To AI Chat", saveSnapshotToNotes: "To Notes", presentationModeOff: "Presentation: Off", presentationModeOn: "Presentation: On", teacherInputPlaceholder: "Ask AI as teacher...", studentInputPlaceholder: "Ask AI as student...", teacherControls: "Teacher Whiteboard Governance", runPhase4Flow: "Run Phase 4 Demo Flow", debugPanelTitle: "Developer Debug State", publicLayerHint: "Public classroom layer • visible to all participants", teacherOnlyHint: "Teacher capability layer • restricted controls", studentPrivateHint: "Student private layer • visible to this student only", publicSharedHint: "Shared stage: selecting/editing here affects classroom content.", publicInteractionHint: "Public interaction stream visible to all participants.", publicChatPlaceholder: "Message class...",
  whiteboardTabs: ["Whiteboard", "Lesson Content", "AI Outline", "Summary"], whiteboardTools: ["Select", "Annotate", "Move", "Erase", "Pointer"], teacherQuickActions: ["Generate opening question", "Generate outline", "Generate exercises", "Summarize lesson"], hubTabs: ["Chat", "Shares", "Hand Raises"], teacherControlTabs: ["Audit", "Grant Sessions", "Operations", "Rollback"], roleSwitcher: { teacher: "Teacher View", student: "Student View" },
  toolbarGroups: { audioVideo: ["Mute/Unmute", "Video On/Off", "Mute All"], teachingTools: ["Share Screen", "Whiteboard", "Record"], participation: ["Participants", "Chat", "Manage Hand Raises", "Polls", "Reactions"], session: ["Record to Cloud", "Breakout Rooms", "End Meeting"] }
};

export const state = {
  roomId: "room-phy-402", boardId: "board-main", teacherId: "teacher-dr-rivera", currentRole: ROLE.TEACHER, currentUserId: "teacher-dr-rivera",
  activeHubTab: messages.hubTabs[0], activeTeacherControlTab: messages.teacherControlTabs[0], currentTool: "Select", selectedObjectId: null,
  students: [
    { id: "stu-ava", name: "student1", status: "Listening", groupId: "group-a" }, { id: "stu-liam", name: "student2", status: "Note-taking", groupId: "group-a" },
    { id: "stu-noah", name: "student3", status: "Asking question", groupId: "group-b" }, { id: "stu-emma", name: "student4", status: "In breakout prep", groupId: "group-b" }
  ],
  whiteboard: { activeTab: "Whiteboard", objects: [], baselineObjects: [] },
  teacherAiAnswer: "AI Suggestion: Use momentum diagrams then compare pre/post vectors.", studentAiAnswer: "Student Hint: First identify system boundaries before equations.",
  teacherMessages: [{ role: "ai", text: "Need help preparing the next explanation?", attachments: [] }],
  studentMessages: [{ role: "ai", text: "Select an object and I can explain it.", attachments: [] }],
  studentActionStatus: [],
  hubContent: { "Chat": ["student4: Great explanation!", "student1: Thanks!", "Koi: Let's review the next problem."], "Shares": ["student1 shared: Study Notes.pdf • Approved", "student3 shared: My AI Discussion • Approved", "student2 shared: Geometry Diagram.jpg • Approved"], "Hand Raises": ["student3: annotate the equation?"] },
  whiteboardPermissions: [
    { id: "perm-view", targetType: "class", targetIds: ["all"], permissionType: PERMISSION.VIEW, scopeLevel: SCOPE.BOARD, targetRegionId: null, active: true, grantSessionId: null },
    { id: "perm-inspect", targetType: "class", targetIds: ["all"], permissionType: PERMISSION.INSPECT, scopeLevel: SCOPE.OBJECT, targetRegionId: null, active: true, grantSessionId: null }
  ],
  grantSessions: [], operations: [], privateNotes: [], attachments: [],
  surface: {
    activeSurfaceId: SURFACE.TEACHER_SCREEN,
    surfaces: [
      { surfaceId: SURFACE.TEACHER_SCREEN, sourceType: "teacher", ownerId: "teacher-dr-rivera", title: "Teacher Shared Screen", active: true, permitted: true },
      { surfaceId: SURFACE.STUDENT_SCREEN, sourceType: "student", ownerId: "stu-noah", title: "Student Shared Screen (Permitted)", active: false, permitted: true },
      { surfaceId: SURFACE.WHITEBOARD, sourceType: "system", ownerId: "board-main", title: "Whiteboard Main View", active: false, permitted: true }
    ],
    presentationMode: false
  },
  speech: { teacher: { recording: false, transcript: "" }, student: { recording: false, transcript: "" } },
  collaboration: {
    activeUsers: ["teacher-dr-rivera", "stu-noah", "stu-emma"],
    activeToolByUser: { "teacher-dr-rivera": "Select", "stu-noah": "Inspect", "stu-emma": "Inspect" },
    selectedObjectByUser: {}, presenceByUser: { "teacher-dr-rivera": "on-board", "stu-noah": "watching", "stu-emma": "watching" }, pendingOperations: [],
    interactionStateByUser: { "teacher-dr-rivera": COLLAB_STATE.VIEWING, "stu-noah": COLLAB_STATE.VIEWING, "stu-emma": COLLAB_STATE.VIEWING }, governanceState: COLLAB_STATE.IDLE
  }
};

export const uid = (prefix) => `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
export const clone = (v) => JSON.parse(JSON.stringify(v));
export const now = () => new Date().toISOString();

export function getUser(userId) {
  if (userId === state.teacherId) return { id: state.teacherId, name: "Koi", role: ROLE.TEACHER, groupId: null };
  return state.students.find((s) => s.id === userId) || { id: userId, name: userId, role: ROLE.STUDENT, groupId: null };
}

export function initBoardObjects() {
  const base = [
    { objectId: "region-a", objectType: OBJECT.REGION, content: "Region A", createdBy: state.teacherId, actorRole: ROLE.TEACHER, scopeLevel: SCOPE.REGION, regionId: "region-a", editableByPolicy: [PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(), x: 20, y: 20, width: 320, height: 170, zIndex: 1, parentRegionId: null, ownerType: "teacher", ownerId: state.teacherId, sourceType: "teacher-baseline", lockedBy: null, conflictState: "none", lastModifiedAt: now(), lastOperationType: "create-object", mediaType: null, attachmentId: null, sourceSurfaceId: null, sourceGrantSessionId: null, deleted: false },
    { objectId: "text-a-1", objectType: OBJECT.TEXT_BLOCK, content: "Lesson Objective: Understand conservation of momentum.", createdBy: state.teacherId, actorRole: ROLE.TEACHER, scopeLevel: SCOPE.OBJECT, regionId: "region-a", editableByPolicy: [PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(), x: 38, y: 44, width: 280, height: 58, zIndex: 2, parentRegionId: "region-a", ownerType: "teacher", ownerId: state.teacherId, sourceType: "teacher-baseline", lockedBy: null, conflictState: "none", lastModifiedAt: now(), lastOperationType: "create-object", mediaType: null, attachmentId: null, sourceSurfaceId: null, sourceGrantSessionId: null, deleted: false },
    { objectId: "text-a-2", objectType: OBJECT.TEXT_BLOCK, content: "Note: Total momentum before = after in isolated systems.", createdBy: state.teacherId, actorRole: ROLE.TEACHER, scopeLevel: SCOPE.OBJECT, regionId: "region-a", editableByPolicy: [PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(), x: 38, y: 112, width: 280, height: 58, zIndex: 2, parentRegionId: "region-a", ownerType: "teacher", ownerId: state.teacherId, sourceType: "teacher-baseline", lockedBy: null, conflictState: "none", lastModifiedAt: now(), lastOperationType: "create-object", mediaType: null, attachmentId: null, sourceSurfaceId: null, sourceGrantSessionId: null, deleted: false }
  ];
  state.whiteboard.objects = base;
  state.whiteboard.baselineObjects = clone(base);
}
