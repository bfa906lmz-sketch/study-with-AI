const ROLE = { TEACHER: "teacher", STUDENT: "student" };
const SCOPE = { BOARD: "board-level", REGION: "region-level", OBJECT: "object-level" };
const PERMISSION = { VIEW: "view", INSPECT: "inspect", ANNOTATE: "annotate", EDIT_REGION: "edit-region", EDIT_BOARD: "edit-board" };
const OBJECT = { TEXT_BLOCK: "text-block", ANNOTATION: "annotation", REGION: "region" };
const ATTACHMENT = { IMAGE: "image", FILE: "file", WHITEBOARD_SNAPSHOT: "whiteboard-snapshot", SCREEN_CAPTURE: "screen-capture" };
const SURFACE = { TEACHER_SCREEN: "teacher-screen", STUDENT_SCREEN: "student-screen", WHITEBOARD: "whiteboard" };
const COLLAB_STATE = {
  IDLE: "idle",
  VIEWING: "viewing",
  SELECTING: "selecting",
  ANNOTATING: "annotating",
  EDITING: "editing",
  PENDING_ROLLBACK: "pending-rollback",
  GRANT_ACTIVE: "grant-active",
  GRANT_ENDED: "grant-ended"
};

const messages = {
  meetingTitle: "Advanced Physics — Live Class",
  meetingSubtitle: "Phase 4 • Multimodal input and shared surface modeling",
  classCode: "Class Code: PHY-402",
  teacherCamera: "Teacher Camera",
  liveStatus: "Live",
  teacherWorkspace: "Teacher ↔ AI Workspace",
  teacherAiAnswer: "Teacher AI Summary",
  sendToWhiteboard: "Send to Whiteboard",
  whiteboardAndLesson: "Whiteboard / Current Lesson",
  inspectPanel: "Object Inspector & Collaboration Cues",
  askAiAboutSelection: "Ask AI about selection",
  saveToPersonalNotes: "Save to personal notes",
  studentCameraGrid: "Student Camera Grid",
  publicInteractionHub: "Public Interaction Hub",
  studentAiWorkspace: "Student AI Workspace",
  studentAiAnswer: "AI Answer (Student)",
  send: "Send",
  upload: "Upload",
  paste: "Paste",
  micStart: "🎙 Start",
  micStop: "⏹ Stop",
  sharedSurfaceTitle: "Live Shared Surface (Mock)",
  copySnapshot: "Copy Snapshot",
  insertSnapshotToWhiteboard: "To Whiteboard",
  sendSnapshotToChat: "To AI Chat",
  saveSnapshotToNotes: "To Notes",
  presentationModeOff: "Presentation: Off",
  presentationModeOn: "Presentation: On",
  teacherInputPlaceholder: "Ask AI as teacher...",
  studentInputPlaceholder: "Ask AI as student...",
  teacherControls: "Teacher Whiteboard Governance",
  runPhase4Flow: "Run Phase 4 Demo Flow",
  debugPanelTitle: "Developer Debug State",
  publicLayerHint: "Public classroom layer • visible to all participants",
  teacherOnlyHint: "Teacher capability layer • restricted controls",
  studentPrivateHint: "Student private layer • visible to this student only",
  publicSharedHint: "Shared stage: selecting/editing here affects classroom content.",
  publicInteractionHint: "Public interaction stream visible to all participants.",
  whiteboardTabs: ["Whiteboard", "Lesson Content", "AI Outline", "Summary"],
  whiteboardTools: ["Select", "Annotate", "Move", "Erase", "Pointer"],
  teacherQuickActions: ["Generate opening question", "Generate outline", "Generate exercises", "Summarize lesson"],
  hubTabs: ["Group Chat", "Private Chat", "Hand Raises", "Polls", "Requests"],
  teacherControlTabs: ["Audit", "Grant Sessions", "Operations", "Rollback"],
  roleSwitcher: { teacher: "Teacher View", student: "Student View" },
  toolbarGroups: {
    audioVideo: ["Mute/Unmute", "Video On/Off", "Mute All"],
    teachingTools: ["Share Screen", "Whiteboard", "Record"],
    participation: ["Participants", "Chat", "Manage Hand Raises", "Polls", "Reactions"],
    session: ["Record to Cloud", "Breakout Rooms", "End Meeting"]
  }
};

const state = {
  roomId: "room-phy-402",
  boardId: "board-main",
  teacherId: "teacher-dr-rivera",
  currentRole: ROLE.TEACHER,
  currentUserId: "teacher-dr-rivera",
  activeHubTab: messages.hubTabs[0],
  activeTeacherControlTab: messages.teacherControlTabs[0],
  currentTool: "Select",
  selectedObjectId: null,
  students: [
    { id: "stu-ava", name: "Ava", status: "Listening", groupId: "group-a" },
    { id: "stu-liam", name: "Liam", status: "Note-taking", groupId: "group-a" },
    { id: "stu-noah", name: "Noah", status: "Asking question", groupId: "group-b" },
    { id: "stu-emma", name: "Emma", status: "In breakout prep", groupId: "group-b" }
  ],
  whiteboard: { activeTab: "Whiteboard", objects: [], baselineObjects: [] },
  teacherAiAnswer: "AI Suggestion: Use momentum diagrams then compare pre/post vectors.",
  studentAiAnswer: "Student Hint: First identify system boundaries before equations.",
  teacherMessages: [{ role: "ai", text: "Need help preparing the next explanation?", attachments: [] }],
  studentMessages: [{ role: "ai", text: "Select an object and I can explain it.", attachments: [] }],
  hubContent: {
    "Group Chat": ["Team B: vector direction is confusing."],
    "Private Chat": ["Ava → Teacher: can you revisit region A?"],
    "Hand Raises": ["Noah: annotate the equation?"],
    Polls: ["Poll #1: Which quantity stays constant?"],
    Requests: ["Emma: show more screen examples"]
  },
  whiteboardPermissions: [
    { id: "perm-view", targetType: "class", targetIds: ["all"], permissionType: PERMISSION.VIEW, scopeLevel: SCOPE.BOARD, targetRegionId: null, active: true, grantSessionId: null },
    { id: "perm-inspect", targetType: "class", targetIds: ["all"], permissionType: PERMISSION.INSPECT, scopeLevel: SCOPE.OBJECT, targetRegionId: null, active: true, grantSessionId: null }
  ],
  grantSessions: [],
  operations: [],
  privateNotes: [],
  attachments: [],
  surface: {
    activeSurfaceId: SURFACE.TEACHER_SCREEN,
    surfaces: [
      { surfaceId: SURFACE.TEACHER_SCREEN, sourceType: "teacher", ownerId: "teacher-dr-rivera", title: "Teacher Shared Screen", active: true, permitted: true },
      { surfaceId: SURFACE.STUDENT_SCREEN, sourceType: "student", ownerId: "stu-noah", title: "Student Shared Screen (Permitted)", active: false, permitted: true },
      { surfaceId: SURFACE.WHITEBOARD, sourceType: "system", ownerId: "board-main", title: "Whiteboard Main View", active: false, permitted: true }
    ],
    presentationMode: false
  },
  speech: {
    teacher: { recording: false, transcript: "" },
    student: { recording: false, transcript: "" }
  },
  collaboration: {
    activeUsers: ["teacher-dr-rivera", "stu-noah", "stu-emma"],
    activeToolByUser: { "teacher-dr-rivera": "Select", "stu-noah": "Inspect", "stu-emma": "Inspect" },
    selectedObjectByUser: {},
    presenceByUser: { "teacher-dr-rivera": "on-board", "stu-noah": "watching", "stu-emma": "watching" },
    pendingOperations: [],
    interactionStateByUser: { "teacher-dr-rivera": COLLAB_STATE.VIEWING, "stu-noah": COLLAB_STATE.VIEWING, "stu-emma": COLLAB_STATE.VIEWING },
    governanceState: COLLAB_STATE.IDLE
  }
};

function uid(prefix) { return `${prefix}-${Math.random().toString(16).slice(2, 10)}`; }
function clone(v) { return JSON.parse(JSON.stringify(v)); }
function now() { return new Date().toISOString(); }

function getUser(userId) {
  if (userId === state.teacherId) return { id: state.teacherId, name: "Dr. Rivera", role: ROLE.TEACHER, groupId: null };
  return state.students.find((s) => s.id === userId) || { id: userId, name: userId, role: ROLE.STUDENT, groupId: null };
}

function initBoardObjects() {
  const base = [
    {
      objectId: "region-a", objectType: OBJECT.REGION, content: "Region A", createdBy: state.teacherId, actorRole: ROLE.TEACHER,
      scopeLevel: SCOPE.REGION, regionId: "region-a", editableByPolicy: [PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(),
      x: 20, y: 20, width: 320, height: 170, zIndex: 1, parentRegionId: null,
      ownerType: "teacher", ownerId: state.teacherId, sourceType: "teacher-baseline", lockedBy: null, conflictState: "none", lastModifiedAt: now(), lastOperationType: "create-object",
      mediaType: null, attachmentId: null, sourceSurfaceId: null, sourceGrantSessionId: null, deleted: false
    },
    {
      objectId: "text-a-1", objectType: OBJECT.TEXT_BLOCK, content: "Lesson Objective: Understand conservation of momentum.", createdBy: state.teacherId, actorRole: ROLE.TEACHER,
      scopeLevel: SCOPE.OBJECT, regionId: "region-a", editableByPolicy: [PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(),
      x: 38, y: 44, width: 280, height: 58, zIndex: 2, parentRegionId: "region-a",
      ownerType: "teacher", ownerId: state.teacherId, sourceType: "teacher-baseline", lockedBy: null, conflictState: "none", lastModifiedAt: now(), lastOperationType: "create-object",
      mediaType: null, attachmentId: null, sourceSurfaceId: null, sourceGrantSessionId: null, deleted: false
    },
    {
      objectId: "text-a-2", objectType: OBJECT.TEXT_BLOCK, content: "Note: Total momentum before = after in isolated systems.", createdBy: state.teacherId, actorRole: ROLE.TEACHER,
      scopeLevel: SCOPE.OBJECT, regionId: "region-a", editableByPolicy: [PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(),
      x: 38, y: 112, width: 280, height: 58, zIndex: 2, parentRegionId: "region-a",
      ownerType: "teacher", ownerId: state.teacherId, sourceType: "teacher-baseline", lockedBy: null, conflictState: "none", lastModifiedAt: now(), lastOperationType: "create-object",
      mediaType: null, attachmentId: null, sourceSurfaceId: null, sourceGrantSessionId: null, deleted: false
    }
  ];
  state.whiteboard.objects = base;
  state.whiteboard.baselineObjects = clone(base);
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => { const key = el.dataset.i18n; if (messages[key]) el.textContent = messages[key]; });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => { const key = el.dataset.i18nPlaceholder; if (messages[key]) el.placeholder = messages[key]; });
}

function permissionContext() {
  const user = getUser(state.currentUserId);
  return { role: state.currentRole, userId: state.currentUserId, groupIds: user.groupId ? [user.groupId] : [] };
}

function isPermissionGranted(permissionType, scopeLevel, regionId = null) {
  const ctx = permissionContext();
  if (ctx.role === ROLE.TEACHER) return true;
  return state.whiteboardPermissions.some((perm) => {
    if (!perm.active || perm.permissionType !== permissionType) return false;
    const scopeMatches = perm.scopeLevel === scopeLevel || perm.scopeLevel === SCOPE.BOARD;
    const regionMatches = !perm.targetRegionId || !regionId || perm.targetRegionId === regionId;
    if (!scopeMatches || !regionMatches) return false;
    if (perm.targetType === "class") return true;
    if (perm.targetType === "student") return perm.targetIds.includes(ctx.userId);
    if (perm.targetType === "student_group") return perm.targetIds.some((id) => ctx.groupIds.includes(id));
    return false;
  });
}

function canViewBoard() { return isPermissionGranted(PERMISSION.VIEW, SCOPE.BOARD); }
function canInspectSelection() { return isPermissionGranted(PERMISSION.INSPECT, SCOPE.OBJECT); }
function canAnnotateRegion(regionId) { return isPermissionGranted(PERMISSION.ANNOTATE, SCOPE.REGION, regionId); }
function canEditRegion(regionId) { return isPermissionGranted(PERMISSION.EDIT_REGION, SCOPE.REGION, regionId); }
function canEditBoard() { return isPermissionGranted(PERMISSION.EDIT_BOARD, SCOPE.BOARD); }
function isLockedByOther(obj) { return obj.lockedBy && obj.lockedBy !== state.currentUserId; }

function canOperateOnObject(obj, actionType) {
  if (!obj || obj.deleted) return false;
  const region = obj.regionId || obj.parentRegionId;
  if (actionType === "select") return canViewBoard() && (state.currentRole === ROLE.TEACHER || canInspectSelection());
  if (actionType === "annotate") return !isLockedByOther(obj) && canAnnotateRegion(region);
  if (actionType === "edit") return !isLockedByOther(obj) && (canEditBoard() || canEditRegion(region));
  if (actionType === "move") return !isLockedByOther(obj) && (state.currentRole === ROLE.TEACHER || canEditRegion(region));
  if (actionType === "delete") return state.currentRole === ROLE.TEACHER;
  if (actionType === "inspect") return canInspectSelection();
  return false;
}

function setUserInteractionState(userId, nextState) { state.collaboration.interactionStateByUser[userId] = nextState; }

function pushOperation({ operationType, permissionType, scopeLevel, targetRegionId = null, objectId = null, payload = {}, grantSessionId = null }) {
  const op = {
    operationId: uid("op"), roomId: state.roomId, boardId: state.boardId, actorId: state.currentUserId, actorRole: state.currentRole,
    groupId: getUser(state.currentUserId).groupId || null, permissionType, scopeLevel, targetRegionId, objectId, operationType,
    payload, timestamp: now(), revoked: false, grantSessionId
  };
  state.operations.push(op);
  state.collaboration.pendingOperations.push(op.operationId);
  if (state.collaboration.pendingOperations.length > 20) state.collaboration.pendingOperations.shift();
  return op;
}

function findObject(objectId) { return state.whiteboard.objects.find((o) => o.objectId === objectId && !o.deleted); }

function createAttachment({ type, sourceContext, name, linkedObjectId = null, sourceSurfaceId = null, metadata = {} }) {
  const attachment = {
    attachmentId: uid("att"), type, sourceContext, name, mime: metadata.mime || (type === ATTACHMENT.IMAGE ? "image/png" : "application/octet-stream"),
    sizeLabel: metadata.sizeLabel || "mock 120KB", createdBy: state.currentUserId, createdAt: now(), linkedObjectId, sourceSurfaceId, previewText: metadata.previewText || ""
  };
  state.attachments.push(attachment);
  return attachment;
}

function renderAttachmentCard(att) {
  const isImage = [ATTACHMENT.IMAGE, ATTACHMENT.WHITEBOARD_SNAPSHOT, ATTACHMENT.SCREEN_CAPTURE].includes(att.type);
  return `
    <div class="attachment-card">
      ${isImage ? '<div class="attachment-image-preview"></div>' : ''}
      <div><strong>${att.name}</strong></div>
      <div class="attachment-meta">${att.type} • ${att.sizeLabel} • by ${getUser(att.createdBy).name}</div>
    </div>`;
}

function createObject({ objectType, content, regionId, x, y, width, height, zIndex, parentRegionId = null, sourceType, sourceGrantSessionId = null, ownerType, ownerId, operationType, mediaType = null, attachmentId = null, sourceSurfaceId = null }) {
  const obj = {
    objectId: uid("obj"), objectType, content, createdBy: state.currentUserId, actorRole: state.currentRole, scopeLevel: SCOPE.OBJECT,
    regionId, editableByPolicy: [PERMISSION.ANNOTATE, PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(), x, y, width, height, zIndex, parentRegionId,
    ownerType, ownerId, sourceType, lockedBy: null, conflictState: "none", lastModifiedAt: now(), lastOperationType: operationType, sourceGrantSessionId, deleted: false,
    mediaType, attachmentId, sourceSurfaceId
  };
  state.whiteboard.objects.push(obj);
  pushOperation({ operationType, permissionType: objectType === OBJECT.ANNOTATION ? PERMISSION.ANNOTATE : PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.OBJECT, targetRegionId: regionId, objectId: obj.objectId, payload: { mediaType, attachmentId }, grantSessionId: sourceGrantSessionId });
  return obj;
}

function selectObject(objectId, userId = state.currentUserId) {
  const obj = findObject(objectId);
  if (!obj || !canOperateOnObject(obj, "select")) return;
  state.selectedObjectId = objectId;
  state.collaboration.selectedObjectByUser[userId] = objectId;
  setUserInteractionState(userId, COLLAB_STATE.SELECTING);
  obj.conflictState = "none";
  obj.lastOperationType = "update-object";
  obj.lastModifiedAt = now();
  pushOperation({ operationType: "update-object", permissionType: PERMISSION.INSPECT, scopeLevel: SCOPE.OBJECT, targetRegionId: obj.regionId, objectId, payload: { selectedBy: userId } });
}

function annotateFromUser(targetObjectId, text, grantSessionId = null) {
  const target = findObject(targetObjectId);
  if (!target) return null;
  if (isLockedByOther(target)) {
    target.conflictState = "occupied-by-other-user";
    return null;
  }
  if (!canOperateOnObject(target, "annotate")) {
    target.conflictState = "permission-denied";
    return null;
  }
  target.lockedBy = state.currentUserId;
  setUserInteractionState(state.currentUserId, COLLAB_STATE.ANNOTATING);
  const note = createObject({
    objectType: OBJECT.ANNOTATION, content: text, regionId: target.regionId, x: target.x + 8, y: target.y + target.height + 8,
    width: 240, height: 48, zIndex: target.zIndex + 2, parentRegionId: target.regionId, sourceType: "student-annotation",
    sourceGrantSessionId: grantSessionId, ownerType: "student", ownerId: state.currentUserId, operationType: "annotate-object"
  });
  target.lockedBy = null;
  setUserInteractionState(state.currentUserId, COLLAB_STATE.VIEWING);
  return note;
}

function aiInsertSummaryObject(text) {
  setUserInteractionState(state.currentUserId, COLLAB_STATE.EDITING);
  const obj = createObject({
    objectType: OBJECT.TEXT_BLOCK, content: text, regionId: "region-a", x: 355, y: 48, width: 250, height: 70, zIndex: 6, parentRegionId: "region-a",
    sourceType: "ai-summary", ownerType: "teacher", ownerId: state.teacherId, operationType: "ai-insert-object"
  });
  setUserInteractionState(state.currentUserId, COLLAB_STATE.VIEWING);
  return obj;
}

function createGrantSession({ targetType, targetIds, permissionType, scopeLevel, targetRegionId = null }) {
  if (permissionType === PERMISSION.EDIT_BOARD && targetType === "class") return { ok: false, reason: "Cannot grant board to whole class" };
  const session = { sessionId: uid("grant"), roomId: state.roomId, grantedByTeacherId: state.teacherId, targetType, targetIds, permissionType, scopeLevel, targetRegionId, startedAt: now(), endedAt: null, active: true };
  state.grantSessions.push(session);
  state.whiteboardPermissions.push({ id: uid("perm"), targetType, targetIds, permissionType, scopeLevel, targetRegionId, active: true, grantSessionId: session.sessionId });
  state.collaboration.governanceState = COLLAB_STATE.GRANT_ACTIVE;
  pushOperation({ operationType: "update-object", permissionType, scopeLevel, targetRegionId, payload: { grant: "started", targetIds }, grantSessionId: session.sessionId });
  return { ok: true, session };
}

function endGrantSession(sessionId) {
  const session = state.grantSessions.find((s) => s.sessionId === sessionId);
  if (!session || !session.active) return;
  session.active = false;
  session.endedAt = now();
  state.whiteboardPermissions.forEach((p) => { if (p.grantSessionId === sessionId) p.active = false; });
  state.collaboration.governanceState = COLLAB_STATE.GRANT_ENDED;
  pushOperation({ operationType: "update-object", permissionType: session.permissionType, scopeLevel: session.scopeLevel, targetRegionId: session.targetRegionId, payload: { grant: "ended", sessionId }, grantSessionId: sessionId });
}

function rollbackSelectedObject() {
  const obj = findObject(state.selectedObjectId);
  if (!obj) return;
  state.collaboration.governanceState = COLLAB_STATE.PENDING_ROLLBACK;
  obj.deleted = true;
  obj.conflictState = "rolled-back";
  obj.lastOperationType = "delete-object";
  obj.lastModifiedAt = now();
  pushOperation({ operationType: "delete-object", permissionType: PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.OBJECT, targetRegionId: obj.regionId, objectId: obj.objectId, payload: { strategy: "selected-object" }, grantSessionId: obj.sourceGrantSessionId });
  state.collaboration.governanceState = COLLAB_STATE.VIEWING;
}

function rollbackGrantSession(sessionId) {
  state.collaboration.governanceState = COLLAB_STATE.PENDING_ROLLBACK;
  state.whiteboard.objects.forEach((obj) => {
    if (obj.sourceGrantSessionId === sessionId) {
      obj.deleted = true;
      obj.conflictState = "rolled-back";
      obj.lastOperationType = "delete-object";
      obj.lastModifiedAt = now();
    }
  });
  pushOperation({ operationType: "delete-object", permissionType: PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.REGION, payload: { strategy: "grant-session", sessionId }, grantSessionId: sessionId });
  state.collaboration.governanceState = COLLAB_STATE.VIEWING;
}

function restoreTeacherBaseline() {
  state.whiteboard.objects = clone(state.whiteboard.baselineObjects);
  state.selectedObjectId = null;
  pushOperation({ operationType: "delete-object", permissionType: PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.BOARD, payload: { strategy: "restore-baseline" } });
}

function captureSurfaceSnapshot() {
  const surface = state.surface.surfaces.find((s) => s.surfaceId === state.surface.activeSurfaceId);
  return createAttachment({ type: ATTACHMENT.SCREEN_CAPTURE, sourceContext: "shared-surface", name: `${surface.title} Snapshot`, sourceSurfaceId: surface.surfaceId, metadata: { sizeLabel: "mock 340KB", previewText: surface.title } });
}

function snapshotToWhiteboard(att) {
  createObject({
    objectType: OBJECT.ANNOTATION,
    content: `Snapshot: ${att.name}`,
    regionId: "region-a",
    x: 355,
    y: 132,
    width: 250,
    height: 52,
    zIndex: 7,
    parentRegionId: "region-a",
    sourceType: "surface-snapshot",
    ownerType: state.currentRole,
    ownerId: state.currentUserId,
    operationType: "create-object",
    mediaType: ATTACHMENT.SCREEN_CAPTURE,
    attachmentId: att.attachmentId,
    sourceSurfaceId: att.sourceSurfaceId
  });
}

function snapshotToChat(att, target) {
  const list = target === "teacher" ? state.teacherMessages : state.studentMessages;
  list.push({ role: "user", text: `Attached snapshot for context`, attachments: [att.attachmentId] });
}

function snapshotToNotes(att) {
  state.privateNotes.push({ noteId: uid("note"), userId: state.currentUserId, attachmentId: att.attachmentId, text: `Saved ${att.name}`, createdAt: now() });
}

function mockUploadAttachment(sourceContext, listType) {
  const type = Math.random() > 0.5 ? ATTACHMENT.IMAGE : ATTACHMENT.FILE;
  const att = createAttachment({ type, sourceContext, name: type === ATTACHMENT.IMAGE ? "diagram.png" : "lesson-notes.pdf", metadata: { sizeLabel: type === ATTACHMENT.IMAGE ? "mock 210KB" : "mock 540KB" } });
  if (listType === "teacher") state.teacherMessages.push({ role: "user", text: "Uploaded attachment", attachments: [att.attachmentId] });
  if (listType === "student") state.studentMessages.push({ role: "user", text: "Uploaded attachment", attachments: [att.attachmentId] });
  if (listType === "public") state.hubContent["Group Chat"].push(`Attachment shared: ${att.name}`);
}

function mockPasteAttachment(sourceContext, listType) {
  const att = createAttachment({ type: ATTACHMENT.IMAGE, sourceContext, name: "pasted-image.png", metadata: { sizeLabel: "mock 180KB" } });
  if (listType === "teacher") state.teacherMessages.push({ role: "user", text: "Pasted image", attachments: [att.attachmentId] });
  if (listType === "student") state.studentMessages.push({ role: "user", text: "Pasted image", attachments: [att.attachmentId] });
  if (listType === "public") state.hubContent["Group Chat"].push(`Pasted to public hub: ${att.name}`);
}

function toggleSpeech(roleKey) {
  const speechState = state.speech[roleKey];
  speechState.recording = !speechState.recording;
  if (!speechState.recording) {
    const transcript = roleKey === "teacher" ? "Can you summarize today's momentum activity?" : "Please explain the selected region step by step.";
    speechState.transcript = transcript;
    const input = document.getElementById(roleKey === "teacher" ? "teacherChatInput" : "studentChatInput");
    input.value = transcript;
  }
}

function renderButtons(containerId, labels, className, activeLabel, onClick) {
  const root = document.getElementById(containerId);
  root.innerHTML = "";
  labels.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `${className} ${activeLabel === label ? "active" : ""}`;
    btn.textContent = label;
    if (onClick) btn.onclick = () => onClick(label);
    root.appendChild(btn);
  });
}

function renderRoleSwitch() {
  const labels = [messages.roleSwitcher.teacher, messages.roleSwitcher.student];
  const active = state.currentRole === ROLE.TEACHER ? labels[0] : labels[1];
  renderButtons("roleSwitch", labels, "segment-btn", active, (label) => {
    state.currentRole = label === labels[0] ? ROLE.TEACHER : ROLE.STUDENT;
    state.currentUserId = state.currentRole === ROLE.TEACHER ? state.teacherId : "stu-noah";
    state.collaboration.activeToolByUser[state.currentUserId] = state.currentTool;
    updateRoleVisibility();
    renderAll();
  });
}

function updateRoleVisibility() {
  document.querySelectorAll('[data-role-visibility="teacher"]').forEach((el) => el.classList.toggle("hidden", state.currentRole !== ROLE.TEACHER));
}

function renderChat(logId, list) {
  const log = document.getElementById(logId);
  log.innerHTML = "";
  list.slice(-4).forEach((msg) => {
    const hasAtt = msg.attachments && msg.attachments.length;
    const bubble = document.createElement("div");
    bubble.className = `chat-message ${msg.role === "user" ? "user" : "ai"} ${hasAtt ? "with-attachments" : ""}`;
    bubble.innerHTML = `<div>${msg.text}</div>`;
    if (hasAtt) {
      const html = msg.attachments
        .map((id) => state.attachments.find((a) => a.attachmentId === id))
        .filter(Boolean)
        .map((att) => renderAttachmentCard(att))
        .join("");
      bubble.innerHTML += html;
    }
    log.appendChild(bubble);
  });
}

function wireChat(formId, inputId, list, logId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  form.onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    list.push({ role: "user", text, attachments: [] });
    list.push({ role: "ai", text: "Mock AI reply captured for future backend wiring.", attachments: [] });
    input.value = "";
    renderChat(logId, list);
  };
}

function renderStudentGrid() {
  const root = document.getElementById("studentGrid");
  root.innerHTML = "";
  state.students.forEach((s) => {
    const tile = document.createElement("div");
    tile.className = "student-tile";
    tile.innerHTML = `<strong>${s.name}</strong><span>${s.status}</span>`;
    root.appendChild(tile);
  });
}

function renderHub() {
  renderButtons("hubTabs", messages.hubTabs, "segment-btn", state.activeHubTab, (tab) => {
    state.activeHubTab = tab;
    renderHub();
  });
  const root = document.getElementById("hubActiveList");
  root.innerHTML = "";
  (state.hubContent[state.activeHubTab] || []).forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    root.appendChild(li);
  });
}

function renderBoardHints() {
  document.getElementById("boardModeHint").textContent = canEditBoard() ? "Board: editable" : "Board: read-only";
  const activeGrant = state.grantSessions.find((g) => g.active);
  document.getElementById("tempGrantHint").textContent = activeGrant ? `Grant: ${activeGrant.permissionType} in ${activeGrant.targetRegionId}` : "Grant: none";
  document.getElementById("stateMachineHint").textContent = `State: ${state.collaboration.interactionStateByUser[state.currentUserId] || COLLAB_STATE.IDLE}`;
  document.getElementById("presentationHint").textContent = state.surface.presentationMode ? "External display: active" : "External display: off";
}

function renderCapabilitySummary() {
  const caps = { view: canViewBoard(), inspect: canInspectSelection(), annotateRegionA: canAnnotateRegion("region-a"), editRegionA: canEditRegion("region-a"), editBoard: canEditBoard() };
  const enabled = Object.keys(caps).filter((k) => caps[k]).join(", ");
  document.getElementById("capabilitySummary").textContent = `Effective: ${enabled || "none"}`;
}

function renderWhiteboardTabs() {
  renderButtons("whiteboardTabs", messages.whiteboardTabs, "segment-btn", state.whiteboard.activeTab, (tab) => {
    state.whiteboard.activeTab = tab;
    renderWhiteboardTabs();
  });
}

function renderWhiteboardTools() {
  renderButtons("whiteboardTools", messages.whiteboardTools, "tool-btn", state.currentTool, (tool) => {
    state.currentTool = tool;
    state.collaboration.activeToolByUser[state.currentUserId] = tool;
    setUserInteractionState(state.currentUserId, tool === "Annotate" ? COLLAB_STATE.ANNOTATING : COLLAB_STATE.SELECTING);
    renderAll();
  });
}

function renderWhiteboardObjects() {
  const stage = document.getElementById("whiteboardStage");
  stage.innerHTML = "";
  if (!canViewBoard()) return;
  const objects = [...state.whiteboard.objects].filter((o) => !o.deleted).sort((a, b) => a.zIndex - b.zIndex);
  objects.forEach((obj) => {
    const el = document.createElement("div");
    el.className = `wb-object type-${obj.objectType} ${state.selectedObjectId === obj.objectId ? "selected" : ""}`;
    el.style.left = `${obj.x}px`;
    el.style.top = `${obj.y}px`;
    el.style.width = `${obj.width}px`;
    el.style.height = `${obj.height}px`;
    el.style.zIndex = obj.zIndex;

    const selectors = Object.entries(state.collaboration.selectedObjectByUser)
      .filter(([, selected]) => selected === obj.objectId)
      .map(([uid2]) => getUser(uid2).name)
      .join(", ");
    const grantScope = obj.sourceGrantSessionId ? `<span class="wb-cue grant">grant:${obj.sourceGrantSessionId.slice(0, 8)}</span>` : "";
    const lockCue = obj.lockedBy ? `<span class="wb-cue lock">locked:${getUser(obj.lockedBy).name}</span>` : "";
    const selectCue = selectors ? `<span class="wb-cue">${selectors} selecting</span>` : "";

    el.innerHTML = `<div class="wb-content">${obj.content}</div>${selectCue}${grantScope}${lockCue}`;
    el.onclick = () => {
      selectObject(obj.objectId);
      renderAll();
    };
    stage.appendChild(el);
  });
}

function renderInspector() {
  const obj = findObject(state.selectedObjectId);
  const snippet = document.getElementById("selectedSnippet");
  const meta = document.getElementById("selectedObjectMeta");
  const conflict = document.getElementById("conflictHint");
  const cues = document.getElementById("collabCueList");
  cues.innerHTML = "";

  if (!obj) {
    snippet.textContent = "No object selected.";
    meta.textContent = "";
    conflict.textContent = "";
    return;
  }

  snippet.textContent = obj.content;
  meta.textContent = `owner:${obj.ownerType}:${obj.ownerId} • source:${obj.sourceType} • media:${obj.mediaType || "none"}`;
  conflict.textContent = obj.conflictState === "none" ? "" : `Conflict: ${obj.conflictState}`;

  [
    `source grant: ${obj.sourceGrantSessionId || "none"}`,
    `lock/editor: ${obj.lockedBy ? getUser(obj.lockedBy).name : "none"}`,
    `last operation: ${obj.lastOperationType}`,
    `source surface: ${obj.sourceSurfaceId || "none"}`
  ].forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    cues.appendChild(li);
  });
}

function selectedObjectGovernanceInfo() {
  const obj = findObject(state.selectedObjectId);
  if (!obj) return null;
  const latestOp = [...state.operations].reverse().find((op) => op.objectId === obj.objectId);
  return {
    source: obj.sourceType,
    owner: `${obj.ownerType}:${obj.ownerId}`,
    sourceGrantSession: obj.sourceGrantSessionId || "none",
    lockEditor: obj.lockedBy ? getUser(obj.lockedBy).name : "none",
    latestOperation: latestOp ? `${latestOp.operationType} (${latestOp.operationId})` : obj.lastOperationType,
    action: obj.sourceGrantSessionId ? "rollback object or grant session" : "rollback object"
  };
}

function renderTeacherControlTabs() {
  renderButtons("teacherControlTabs", messages.teacherControlTabs, "segment-btn", state.activeTeacherControlTab, (tab) => {
    state.activeTeacherControlTab = tab;
    renderTeacherControlBody();
  });
}

function renderTeacherControlBody() {
  const body = document.getElementById("teacherControlBody");
  if (state.currentRole !== ROLE.TEACHER) {
    body.innerHTML = "<p>Teacher-only panel</p>";
    return;
  }

  if (state.activeTeacherControlTab === "Audit") {
    const info = selectedObjectGovernanceInfo();
    body.innerHTML = info
      ? `<ul class="simple-list"><li>object source: ${info.source}</li><li>owner: ${info.owner}</li><li>source grant session: ${info.sourceGrantSession}</li><li>current lock/editor: ${info.lockEditor}</li><li>latest operation: ${info.latestOperation}</li><li>governance action: ${info.action}</li></ul>`
      : "<p>Select an object to inspect governance audit context.</p>";
    return;
  }

  if (state.activeTeacherControlTab === "Grant Sessions") {
    body.innerHTML = `
      <p>Region grants apply to child objects inside that region only.</p>
      <div class="action-row"><button id="grantTeamBRegionA">Grant Team B annotate in Region A</button></div>
      <ul class="simple-list">${state.grantSessions.map((s) => `<li>${s.sessionId} • ${s.permissionType} • region:${s.targetRegionId} • ${s.active ? "active" : "ended"} <button data-end="${s.sessionId}">End</button></li>`).join("") || "<li>No sessions yet.</li>"}</ul>`;

    document.getElementById("grantTeamBRegionA").onclick = () => {
      createGrantSession({ targetType: "student_group", targetIds: ["group-b"], permissionType: PERMISSION.ANNOTATE, scopeLevel: SCOPE.REGION, targetRegionId: "region-a" });
      renderAll();
    };
    body.querySelectorAll("[data-end]").forEach((btn) => {
      btn.onclick = () => {
        endGrantSession(btn.dataset.end);
        renderAll();
      };
    });
    return;
  }

  if (state.activeTeacherControlTab === "Operations") {
    body.innerHTML = `<ul class="simple-list">${state.operations.slice(-10).map((op) => `<li>${op.operationType} • object:${op.objectId || "n/a"} • actor:${op.actorId} • region:${op.targetRegionId || "board"}</li>`).join("") || "<li>No operations yet.</li>"}</ul>`;
    return;
  }

  body.innerHTML = `
    <div class="action-row">
      <button id="rollbackSelectedObj">Rollback selected object</button>
      <button id="rollbackLatestGrant">Rollback latest grant session</button>
      <button id="restoreBaseline">Restore baseline</button>
    </div>`;

  document.getElementById("rollbackSelectedObj").onclick = () => { rollbackSelectedObject(); renderAll(); };
  document.getElementById("rollbackLatestGrant").onclick = () => {
    const grant = [...state.grantSessions].reverse().find((g) => g.sessionId);
    if (grant) rollbackGrantSession(grant.sessionId);
    renderAll();
  };
  document.getElementById("restoreBaseline").onclick = () => { restoreTeacherBaseline(); renderAll(); };
}

function renderSharedSurface() {
  const labels = state.surface.surfaces.filter((s) => s.permitted).map((s) => s.title);
  const activeTitle = state.surface.surfaces.find((s) => s.surfaceId === state.surface.activeSurfaceId)?.title;
  renderButtons("sharedSurfaceSources", labels, "segment-btn", activeTitle, (title) => {
    const s = state.surface.surfaces.find((x) => x.title === title);
    if (!s) return;
    state.surface.activeSurfaceId = s.surfaceId;
    renderSharedSurface();
    renderDebugPanel();
  });
  const surface = state.surface.surfaces.find((s) => s.surfaceId === state.surface.activeSurfaceId);
  document.getElementById("surfacePreview").textContent = `${surface.title} • source: ${surface.sourceType} • owner: ${surface.ownerId}`;

  const presentationBtn = document.getElementById("presentationToggleBtn");
  presentationBtn.textContent = state.surface.presentationMode ? messages.presentationModeOn : messages.presentationModeOff;
}

function renderAttachmentLists() {
  const teacher = state.attachments.filter((a) => a.sourceContext === "teacher-workspace").slice(-3);
  const student = state.attachments.filter((a) => a.sourceContext === "student-workspace").slice(-3);
  const pub = state.attachments.filter((a) => a.sourceContext === "public-hub").slice(-3);
  document.getElementById("teacherAttachmentList").innerHTML = teacher.map(renderAttachmentCard).join("");
  document.getElementById("studentAttachmentList").innerHTML = student.map(renderAttachmentCard).join("");
  document.getElementById("publicAttachmentList").innerHTML = pub.map(renderAttachmentCard).join("");
}

function wireEntryPoints() {
  document.getElementById("teacherUploadBtn").onclick = () => { mockUploadAttachment("teacher-workspace", "teacher"); renderAll(); };
  document.getElementById("teacherPasteBtn").onclick = () => { mockPasteAttachment("teacher-workspace", "teacher"); renderAll(); };
  document.getElementById("studentUploadBtn").onclick = () => { mockUploadAttachment("student-workspace", "student"); renderAll(); };
  document.getElementById("studentPasteBtn").onclick = () => { mockPasteAttachment("student-workspace", "student"); renderAll(); };
  document.getElementById("publicUploadBtn").onclick = () => { mockUploadAttachment("public-hub", "public"); renderAll(); };
  document.getElementById("publicPasteBtn").onclick = () => { mockPasteAttachment("public-hub", "public"); renderAll(); };
}

function wireSpeech() {
  const teacherMic = document.getElementById("teacherMicBtn");
  const studentMic = document.getElementById("studentMicBtn");
  teacherMic.onclick = () => {
    toggleSpeech("teacher");
    teacherMic.classList.toggle("recording", state.speech.teacher.recording);
    teacherMic.textContent = state.speech.teacher.recording ? messages.micStop : messages.micStart;
  };
  studentMic.onclick = () => {
    toggleSpeech("student");
    studentMic.classList.toggle("recording", state.speech.student.recording);
    studentMic.textContent = state.speech.student.recording ? messages.micStop : messages.micStart;
  };
}

function wireSurfaceActions() {
  document.getElementById("presentationToggleBtn").onclick = () => {
    state.surface.presentationMode = !state.surface.presentationMode;
    renderAll();
  };
  document.getElementById("captureCopyBtn").onclick = () => {
    const snap = captureSurfaceSnapshot();
    state.hubContent.Requests.push(`Snapshot copied (mock): ${snap.name}`);
    renderAll();
  };
  document.getElementById("captureToWhiteboardBtn").onclick = () => {
    const snap = captureSurfaceSnapshot();
    snapshotToWhiteboard(snap);
    renderAll();
  };
  document.getElementById("captureToChatBtn").onclick = () => {
    const snap = captureSurfaceSnapshot();
    snapshotToChat(snap, state.currentRole === ROLE.TEACHER ? "teacher" : "student");
    renderAll();
  };
  document.getElementById("captureToNotesBtn").onclick = () => {
    const snap = captureSurfaceSnapshot();
    snapshotToNotes(snap);
    renderAll();
  };
}

function wireInspectorActions() {
  document.getElementById("askAiFromSelectionBtn").onclick = () => {
    const obj = findObject(state.selectedObjectId);
    if (!obj || !canOperateOnObject(obj, "inspect")) return;
    state.studentMessages.push({ role: "user", text: `Explain object: ${obj.content}`, attachments: [] });
    state.studentMessages.push({ role: "ai", text: `Mock explanation: source=${obj.sourceType}, owner=${obj.ownerType}.`, attachments: [] });
    renderChat("studentChatLog", state.studentMessages);
  };
  document.getElementById("saveNoteBtn").onclick = () => {
    const obj = findObject(state.selectedObjectId);
    if (!obj || !canOperateOnObject(obj, "inspect")) return;
    snapshotToNotes(createAttachment({ type: ATTACHMENT.WHITEBOARD_SNAPSHOT, sourceContext: "whiteboard-inspector", name: `Selection ${obj.objectId}`, linkedObjectId: obj.objectId, metadata: { sizeLabel: "mock 95KB" } }));
    renderAll();
  };
}

function renderToolbarGroup(containerId, labels, isSession = false) {
  const root = document.getElementById(containerId);
  root.innerHTML = "";
  root.classList.toggle("session", isSession);
  labels.forEach((label) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toolbar-action";
    if (label === "Mute All") btn.classList.add("warning");
    if (label === "End Meeting") btn.classList.add("danger");
    btn.textContent = label;
    root.appendChild(btn);
  });
}

function runPhase4Flow() {
  state.currentRole = ROLE.TEACHER;
  state.currentUserId = state.teacherId;
  selectObject("text-a-1", state.teacherId);

  const grant = createGrantSession({ targetType: "student_group", targetIds: ["group-b"], permissionType: PERMISSION.ANNOTATE, scopeLevel: SCOPE.REGION, targetRegionId: "region-a" });
  if (!grant.ok) return;

  state.currentRole = ROLE.STUDENT;
  state.currentUserId = "stu-noah";
  const created = annotateFromUser("text-a-1", "Team B annotation: compare vectors before/after.", grant.session.sessionId);

  state.currentRole = ROLE.TEACHER;
  state.currentUserId = state.teacherId;
  if (created) selectObject(created.objectId, state.teacherId);
  endGrantSession(grant.session.sessionId);
  if (created) rollbackSelectedObject();

  const snap = captureSurfaceSnapshot();
  snapshotToWhiteboard(snap);
  aiInsertSummaryObject(`AI Summary: ${state.teacherAiAnswer}`);

  renderRoleSwitch();
  renderAll();
}

function renderDebugPanel() {
  const lines = [
    `currentRole: ${state.currentRole}`,
    `currentTool: ${state.currentTool}`,
    `currentSelection: ${state.selectedObjectId || "none"}`,
    `governanceState: ${state.collaboration.governanceState}`,
    `interactionState: ${state.collaboration.interactionStateByUser[state.currentUserId] || COLLAB_STATE.IDLE}`,
    `activeGrantSessions: ${state.grantSessions.filter((s) => s.active).map((s) => s.sessionId).join(",") || "none"}`,
    `activeSurface: ${state.surface.activeSurfaceId}`,
    `presentationMode: ${state.surface.presentationMode}`,
    `attachmentsTotal: ${state.attachments.length}`,
    `speechTeacher: ${JSON.stringify(state.speech.teacher)}`,
    `speechStudent: ${JSON.stringify(state.speech.student)}`,
    `activeUsers: ${state.collaboration.activeUsers.join(",")}`,
    `selectedObjectByUser: ${JSON.stringify(state.collaboration.selectedObjectByUser)}`,
    `pendingOperations: ${state.collaboration.pendingOperations.join(",") || "none"}`
  ];
  const root = document.getElementById("debugList");
  root.innerHTML = "";
  lines.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    root.appendChild(li);
  });
}

function renderAll() {
  renderBoardHints();
  renderCapabilitySummary();
  renderSharedSurface();
  renderWhiteboardObjects();
  renderInspector();
  renderAttachmentLists();
  renderHub();
  renderChat("teacherChatLog", state.teacherMessages);
  renderChat("studentChatLog", state.studentMessages);
  renderTeacherControlTabs();
  renderTeacherControlBody();
  renderDebugPanel();
}

function init() {
  initBoardObjects();
  applyI18n();
  document.getElementById("teacherAiAnswerText").textContent = state.teacherAiAnswer;
  document.getElementById("studentAiAnswerText").textContent = state.studentAiAnswer;

  renderRoleSwitch();
  renderButtons("teacherQuickActions", messages.teacherQuickActions, "quick-chip", null);
  renderWhiteboardTabs();
  renderWhiteboardTools();
  renderStudentGrid();
  renderHub();

  wireChat("teacherChatForm", "teacherChatInput", state.teacherMessages, "teacherChatLog");
  wireChat("studentChatForm", "studentChatInput", state.studentMessages, "studentChatLog");
  wireEntryPoints();
  wireSpeech();
  wireSurfaceActions();
  wireInspectorActions();

  renderToolbarGroup("toolbarAudioVideo", messages.toolbarGroups.audioVideo);
  renderToolbarGroup("toolbarTeaching", messages.toolbarGroups.teachingTools);
  renderToolbarGroup("toolbarParticipation", messages.toolbarGroups.participation);
  renderToolbarGroup("toolbarSession", messages.toolbarGroups.session, true);

  updateRoleVisibility();

  document.getElementById("sendToWhiteboardBtn").onclick = () => {
    if (!canEditBoard()) return;
    aiInsertSummaryObject(`Teacher AI Push: ${state.teacherAiAnswer}`);
    renderAll();
  };
  document.getElementById("runPhase4FlowBtn").onclick = runPhase4Flow;

  renderAll();
}

// TODO(next): wire real media stream and clipboard APIs once backend/realtime channels are available.
// TODO(next): persist attachments, snapshots, and media-linked whiteboard artifacts server-side.
init();
