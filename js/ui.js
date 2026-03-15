import { ROLE, PERMISSION, SCOPE, ATTACHMENT, COLLAB_STATE, REQUEST_TYPE, REQUEST_STATUS, messages, state, getUser, uid, now } from './model.js';
import { canEditBoard, canViewBoard, canInspectSelection, canAnnotateRegion, canEditRegion, canOperateOnObject } from './permissions.js';
import { findObject, selectObject, annotateFromUser, aiInsertSummaryObject } from './whiteboard.js';
import { createGrantSession, endGrantSession, rollbackSelectedObject, rollbackGrantSession, restoreTeacherBaseline, selectedObjectGovernanceInfo } from './collaboration.js';
import { createAttachment, renderAttachmentCard, snapshotToWhiteboard, snapshotToChat, snapshotToNotes, mockUploadAttachment, mockPasteAttachment } from './attachments.js';
import { renderChat, renderHub, wireChat } from './uiMessaging.js';
import { captureSurfaceSnapshot, togglePresentationMode } from './surfaces.js';
import { toggleSpeech } from './speech.js';

export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { const key = el.dataset.i18n; if (messages[key]) el.textContent = messages[key]; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { const key = el.dataset.i18nPlaceholder; if (messages[key]) el.placeholder = messages[key]; });
}

function renderButtons(containerId, labels, className, activeLabel, onClick) {
  const root = document.getElementById(containerId);
  root.innerHTML = '';
  labels.forEach((label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${className} ${activeLabel === label ? 'active' : ''}`;
    btn.textContent = label;
    if (onClick) btn.onclick = () => onClick(label);
    root.appendChild(btn);
  });
}

export function updateRoleVisibility() {
  document.body.classList.toggle('role-student', state.currentRole === ROLE.STUDENT);
  document.body.classList.toggle('role-teacher', state.currentRole === ROLE.TEACHER);
  document.querySelectorAll('[data-role-visibility="teacher"]').forEach((el) => el.classList.toggle('hidden', state.currentRole !== ROLE.TEACHER));
  document.querySelectorAll('[data-role-visibility="student"]').forEach((el) => el.classList.toggle('hidden', state.currentRole !== ROLE.STUDENT));
}

export function renderRoleSwitch(renderAll) {
  const labels = [messages.roleSwitcher.teacher, messages.roleSwitcher.student];
  const active = state.currentRole === ROLE.TEACHER ? labels[0] : labels[1];
  renderButtons('roleSwitch', labels, 'segment-btn', active, (label) => {
    state.currentRole = label === labels[0] ? ROLE.TEACHER : ROLE.STUDENT;
    state.currentUserId = state.currentRole === ROLE.TEACHER ? state.teacherId : 'stu-noah';
    state.collaboration.activeToolByUser[state.currentUserId] = state.currentTool;
    updateRoleVisibility();
    renderAll();
  });
}

function renderStudentGrid() {
  const root = document.getElementById('studentGrid');
  root.innerHTML = '';
  const fixedParticipants = [
    { name: 'Koi', status: 'Instructor', teacher: true },
    { name: 'student1', status: 'Live' },
    { name: 'student2', status: 'Live' },
    { name: 'student3', status: 'Live' },
    { name: 'student4', status: 'Live' }
  ];

  fixedParticipants.forEach((p) => {
    const tile = document.createElement('div');
    tile.className = `student-tile ${p.teacher ? 'teacher-tile' : ''}`;
    tile.innerHTML = `<strong>${p.name}${p.teacher ? ' <span class="teacher-badge">Teacher</span>' : ''}</strong><span>${p.status}</span>`;
    root.appendChild(tile);
  });
}

function renderBoardHints() {
  const hasWriteAccess = canEditBoard() || canAnnotateRegion('region-a');
  document.getElementById('boardModeHint').textContent = hasWriteAccess ? 'Board: access granted' : 'Board: view-only (restricted)';
  const activeGrant = state.grantSessions.find((g) => g.active);
  document.getElementById('tempGrantHint').textContent = activeGrant ? `Grant: ${activeGrant.permissionType} in ${activeGrant.targetRegionId}` : 'Grant: none';
  document.getElementById('stateMachineHint').textContent = `State: ${state.collaboration.interactionStateByUser[state.currentUserId] || COLLAB_STATE.IDLE}`;
  document.getElementById('presentationHint').textContent = state.surface.presentationMode ? 'External display: active' : 'External display: off';
}

function renderCapabilitySummary() {
  const caps = { view: canViewBoard(), inspect: canInspectSelection(), annotateRegionA: canAnnotateRegion('region-a'), editRegionA: canEditRegion('region-a'), editBoard: canEditBoard() };
  document.getElementById('capabilitySummary').textContent = `Effective: ${Object.keys(caps).filter((k) => caps[k]).join(', ') || 'none'}`;
}

function renderWhiteboardTabs() {
  renderButtons('whiteboardTabs', messages.whiteboardTabs, 'segment-btn', state.whiteboard.activeTab, (tab) => {
    state.whiteboard.activeTab = tab;
    renderWhiteboardTabs();
  });
}

function canUseTool(tool) {
  if (state.currentRole === ROLE.TEACHER) return true;
  if (tool === 'Select' || tool === 'Pointer') return canViewBoard();
  if (tool === 'Annotate') return canAnnotateRegion('region-a') || canEditBoard();
  return canEditBoard();
}

function renderWhiteboardTools(renderAll) {
  const root = document.getElementById('whiteboardTools');
  root.innerHTML = '';
  messages.whiteboardTools.forEach((tool) => {
    const btn = document.createElement('button');
    const enabled = canUseTool(tool);
    btn.type = 'button';
    btn.className = `tool-btn ${state.currentTool === tool ? 'active' : ''} ${enabled ? '' : 'locked'}`;
    btn.textContent = enabled ? tool : `${tool} 🔒`;
    btn.disabled = !enabled;
    btn.onclick = () => {
      if (!enabled) return;
      state.currentTool = tool;
      state.collaboration.activeToolByUser[state.currentUserId] = tool;
      state.collaboration.interactionStateByUser[state.currentUserId] = tool === 'Annotate' ? COLLAB_STATE.ANNOTATING : COLLAB_STATE.SELECTING;
      renderAll();
    };
    root.appendChild(btn);
  });
}

function renderWhiteboardObjects(renderAll) {
  const stage = document.getElementById('whiteboardStage');
  stage.innerHTML = '';
  if (!canViewBoard()) return;
  [...state.whiteboard.objects].filter((o) => !o.deleted).sort((a, b) => a.zIndex - b.zIndex).forEach((obj) => {
    const el = document.createElement('div');
    el.className = `wb-object type-${obj.objectType} ${state.selectedObjectId === obj.objectId ? 'selected' : ''}`;
    el.style.left = `${obj.x}px`;
    el.style.top = `${obj.y}px`;
    el.style.width = `${obj.width}px`;
    el.style.height = `${obj.height}px`;
    el.style.zIndex = obj.zIndex;
    const selectors = Object.entries(state.collaboration.selectedObjectByUser).filter(([, selected]) => selected === obj.objectId).map(([uid2]) => getUser(uid2).name).join(', ');
    const grantScope = obj.sourceGrantSessionId ? `<span class="wb-cue grant">grant:${obj.sourceGrantSessionId.slice(0, 8)}</span>` : '';
    const lockCue = obj.lockedBy ? `<span class="wb-cue lock">locked:${getUser(obj.lockedBy).name}</span>` : '';
    const selectCue = selectors ? `<span class="wb-cue">${selectors} selecting</span>` : '';
    el.innerHTML = `<div class="wb-content">${obj.content}</div>${selectCue}${grantScope}${lockCue}`;
    el.onclick = () => { selectObject(obj.objectId); renderAll(); };
    stage.appendChild(el);
  });
}

function renderInspector() {
  const obj = findObject(state.selectedObjectId);
  const snippet = document.getElementById('selectedSnippet');
  const meta = document.getElementById('selectedObjectMeta');
  const conflict = document.getElementById('conflictHint');
  const cues = document.getElementById('collabCueList');
  cues.innerHTML = '';
  if (!obj) {
    snippet.textContent = 'No object selected.';
    meta.textContent = '';
    conflict.textContent = '';
    return;
  }
  snippet.textContent = obj.content;
  meta.textContent = `owner:${obj.ownerType}:${obj.ownerId} • source:${obj.sourceType} • media:${obj.mediaType || 'none'}`;
  conflict.textContent = obj.conflictState === 'none' ? '' : `Conflict: ${obj.conflictState}`;
  [`source grant: ${obj.sourceGrantSessionId || 'none'}`, `lock/editor: ${obj.lockedBy ? getUser(obj.lockedBy).name : 'none'}`, `last operation: ${obj.lastOperationType}`, `source surface: ${obj.sourceSurfaceId || 'none'}`].forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    cues.appendChild(li);
  });
}

function renderTeacherControlTabs(renderTeacherControlBody) {
  renderButtons('teacherControlTabs', messages.teacherControlTabs, 'segment-btn', state.activeTeacherControlTab, (tab) => {
    state.activeTeacherControlTab = tab;
    renderTeacherControlBody();
  });
}

function summarizeRequestTarget(request) {
  const target = request.target || {};
  if (request.type === REQUEST_TYPE.UPLOAD) return target.attachmentName || 'Student workspace upload';
  if (request.type === REQUEST_TYPE.WHITEBOARD_ACCESS) return `${target.boardId || state.boardId} / ${target.regionId || 'board'}`;
  if (request.type === REQUEST_TYPE.SHARE_AI_CHAT) return target.preview || 'Current AI chat context';
  if (request.type === REQUEST_TYPE.SHARE_NOTES) return target.preview || 'Current private notes';
  return target.key || 'request-target';
}

function transitionStudentRequestStatus(requestId, nextStatus, decisionReason = '') {
  if (state.currentRole !== ROLE.TEACHER) return false;
  const request = state.studentRequests.find((item) => item.requestId === requestId);
  if (!request) return false;

  const validTransition =
    (request.status === REQUEST_STATUS.PENDING && [REQUEST_STATUS.APPROVED, REQUEST_STATUS.REJECTED].includes(nextStatus))
    || (request.status === REQUEST_STATUS.APPROVED && nextStatus === REQUEST_STATUS.REVOKED);

  if (!validTransition) return false;

  const updatedAt = now();
  request.status = nextStatus;
  request.updatedAt = updatedAt;
  if (nextStatus === REQUEST_STATUS.REVOKED) {
    request.revokedBy = state.currentUserId;
    request.revokedAt = updatedAt;
  } else {
    request.reviewedBy = state.currentUserId;
    request.reviewedAt = updatedAt;
  }
  request.decisionReason = decisionReason || '';
  request.history.push({ status: nextStatus, at: updatedAt, actorId: state.currentUserId, reason: request.decisionReason || null });
  return true;
}


function upsertHubShareEntryForRequest(request, statusLabel = 'Approved') {
  const shares = state.hubContent.Shares;
  const existing = shares.find((entry) => typeof entry === 'object' && entry.requestId === request.requestId);
  const ownerName = getUser(request.ownerId).name;
  const typeLabel = studentRequestTypeLabel(request.type);
  const text = `${ownerName} shared: ${typeLabel} • ${statusLabel}`;
  if (existing) {
    existing.text = text;
    existing.status = statusLabel.toLowerCase();
    existing.updatedAt = now();
    if (!existing.shareId) existing.shareId = uid('share');
    request.routedShareEntryId = existing.shareId;
    return existing;
  }
  const created = { shareId: uid('share'), requestId: request.requestId, text, attachments: [], status: statusLabel.toLowerCase(), updatedAt: now() };
  shares.push(created);
  request.routedShareEntryId = created.shareId;
  return created;
}

function removeHubShareEntryForRequest(requestId) {
  state.hubContent.Shares = state.hubContent.Shares.filter((entry) => !(typeof entry === 'object' && entry.requestId === requestId));
}

function ensureWhiteboardAccessFromRequest(request) {
  if (request.type !== REQUEST_TYPE.WHITEBOARD_ACCESS || request.status !== REQUEST_STATUS.APPROVED) return;
  const existingPerm = request.appliedPermissionId ? state.whiteboardPermissions.find((perm) => perm.id === request.appliedPermissionId) : null;
  if (existingPerm) {
    existingPerm.active = true;
    return;
  }
  const permId = uid('perm');
  state.whiteboardPermissions.push({
    id: permId,
    targetType: 'student',
    targetIds: [request.ownerId],
    permissionType: PERMISSION.ANNOTATE,
    scopeLevel: SCOPE.REGION,
    targetRegionId: request.target?.regionId || 'region-a',
    active: true,
    grantSessionId: null,
    sourceRequestId: request.requestId
  });
  request.appliedPermissionId = permId;
}

function revokeWhiteboardAccessFromRequest(request) {
  if (!request.appliedPermissionId) return;
  const perm = state.whiteboardPermissions.find((item) => item.id === request.appliedPermissionId);
  if (perm) perm.active = false;
}

function applyApprovalEffectsFromCanonicalRequests() {
  const requestIds = new Set(state.studentRequests.map((request) => request.requestId));

  // Cleanup orphan request-derived artifacts to keep startup baseline deterministic.
  state.hubContent.Shares = state.hubContent.Shares.filter((entry) => (
    !(typeof entry === 'object' && entry.requestId && !requestIds.has(entry.requestId))
  ));
  state.whiteboardPermissions = state.whiteboardPermissions.filter((perm) => !(perm.sourceRequestId && !requestIds.has(perm.sourceRequestId)));

  state.studentRequests.forEach((request) => {
    const canRouteShare = [REQUEST_TYPE.SHARE_AI_CHAT, REQUEST_TYPE.SHARE_NOTES].includes(request.type)
      || (request.type === REQUEST_TYPE.UPLOAD && (request.target?.attachmentId || request.target?.attachmentName));

    const isTeacherApproved = request.status === REQUEST_STATUS.APPROVED && !!request.reviewedBy && !!request.reviewedAt;
    const isTeacherRevoked = request.status === REQUEST_STATUS.REVOKED && !!request.revokedBy && !!request.revokedAt;

    if (isTeacherApproved) {
      if (canRouteShare) upsertHubShareEntryForRequest(request, 'Approved');
      ensureWhiteboardAccessFromRequest(request);
      return;
    }

    if (isTeacherRevoked) {
      if (canRouteShare) upsertHubShareEntryForRequest(request, 'Revoked');
      revokeWhiteboardAccessFromRequest(request);
      return;
    }

    // draft / pending / rejected / unreviewed-approved should not publish shares or keep approval effects active
    removeHubShareEntryForRequest(request.requestId);
    revokeWhiteboardAccessFromRequest(request);
  });
}

function wireTeacherApprovalQueueActions(renderAll) {
  const body = document.getElementById('teacherControlBody');
  body.querySelectorAll('[data-request-action]').forEach((btn) => {
    btn.onclick = () => {
      const requestId = btn.dataset.requestId;
      const action = btn.dataset.requestAction;
      const nextStatus = action === 'approve' ? REQUEST_STATUS.APPROVED : action === 'reject' ? REQUEST_STATUS.REJECTED : REQUEST_STATUS.REVOKED;
      const defaultReason = action === 'reject' ? 'Teacher rejected request' : action === 'revoke' ? 'Teacher revoked approved request' : 'Teacher approved request';
      transitionStudentRequestStatus(requestId, nextStatus, defaultReason);
      renderAll();
    };
  });
}

function renderTeacherControlBody(renderAll) {
  const body = document.getElementById('teacherControlBody');
  if (state.currentRole !== ROLE.TEACHER) { body.innerHTML = '<p>Teacher-only panel</p>'; return; }
  if (state.activeTeacherControlTab === 'Approval Queue') {
    const queue = [...state.studentRequests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (!queue.length) {
      body.innerHTML = '<p>No student requests in queue yet.</p>';
      return;
    }

    body.innerHTML = `
      <div class="approval-queue">
        ${queue.map((request) => {
          const owner = getUser(request.ownerId).name;
          const statusLabel = formatRequestStatusLabel(request.status);
          const timeLabel = new Date(request.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const canApproveOrReject = request.status === REQUEST_STATUS.PENDING;
          const canRevoke = request.status === REQUEST_STATUS.APPROVED;
          return `
            <div class="approval-row">
              <div class="approval-main">
                <strong>${owner}</strong>
                <span>${studentRequestTypeLabel(request.type)}</span>
                <span class="approval-target">${summarizeRequestTarget(request)}</span>
              </div>
              <div class="approval-meta">
                <span class="status-tag ${request.status}">${statusLabel}</span>
                <span class="request-time">${timeLabel}</span>
              </div>
              <div class="approval-actions">
                ${canApproveOrReject ? `<button type="button" data-request-action="approve" data-request-id="${request.requestId}">Approve</button><button type="button" data-request-action="reject" data-request-id="${request.requestId}" class="secondary">Reject</button>` : ''}
                ${canRevoke ? `<button type="button" data-request-action="revoke" data-request-id="${request.requestId}" class="danger">Revoke</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    wireTeacherApprovalQueueActions(renderAll);
    return;
  }

  if (state.activeTeacherControlTab === 'Audit') {
    const info = selectedObjectGovernanceInfo(findObject);
    body.innerHTML = info ? `<ul class="simple-list"><li>object source: ${info.source}</li><li>owner: ${info.owner}</li><li>source grant session: ${info.sourceGrantSession}</li><li>current lock/editor: ${info.lockEditor}</li><li>latest operation: ${info.latestOperation}</li><li>governance action: ${info.action}</li></ul>` : '<p>Select an object to inspect governance audit context.</p>';
    return;
  }
  if (state.activeTeacherControlTab === 'Grant Sessions') {
    body.innerHTML = `<p>Region grants apply to child objects inside that region only.</p><div class="action-row"><button id="grantTeamBRegionA">Grant Team B annotate in Region A</button></div><ul class="simple-list">${state.grantSessions.map((s) => `<li>${s.sessionId} • ${s.permissionType} • region:${s.targetRegionId} • ${s.active ? 'active' : 'ended'} <button data-end="${s.sessionId}">End</button></li>`).join('') || '<li>No sessions yet.</li>'}</ul>`;
    document.getElementById('grantTeamBRegionA').onclick = () => { createGrantSession({ targetType: 'student_group', targetIds: ['group-b'], permissionType: PERMISSION.ANNOTATE, scopeLevel: SCOPE.REGION, targetRegionId: 'region-a' }); renderAll(); };
    body.querySelectorAll('[data-end]').forEach((btn) => { btn.onclick = () => { endGrantSession(btn.dataset.end); renderAll(); }; });
    return;
  }
  if (state.activeTeacherControlTab === 'Operations') {
    body.innerHTML = `<ul class="simple-list">${state.operations.slice(-10).map((op) => `<li>${op.operationType} • object:${op.objectId || 'n/a'} • actor:${op.actorId} • region:${op.targetRegionId || 'board'}</li>`).join('') || '<li>No operations yet.</li>'}</ul>`;
    return;
  }
  body.innerHTML = '<div class="action-row"><button id="rollbackSelectedObj">Rollback selected object</button><button id="rollbackLatestGrant">Rollback latest grant session</button><button id="restoreBaseline">Restore baseline</button></div>';
  document.getElementById('rollbackSelectedObj').onclick = () => { rollbackSelectedObject(findObject); renderAll(); };
  document.getElementById('rollbackLatestGrant').onclick = () => { const grant = [...state.grantSessions].reverse().find((g) => g.sessionId); if (grant) rollbackGrantSession(grant.sessionId); renderAll(); };
  document.getElementById('restoreBaseline').onclick = () => { restoreTeacherBaseline(); renderAll(); };
}

function renderSharedSurface() {
  const labels = state.surface.surfaces.filter((s) => s.permitted).map((s) => s.title);
  const activeTitle = state.surface.surfaces.find((s) => s.surfaceId === state.surface.activeSurfaceId)?.title;
  renderButtons('sharedSurfaceSources', labels, 'segment-btn', activeTitle, (title) => {
    const s = state.surface.surfaces.find((x) => x.title === title);
    if (!s) return;
    state.surface.activeSurfaceId = s.surfaceId;
    renderSharedSurface();
    renderDebugPanel();
  });
  const surface = state.surface.surfaces.find((s) => s.surfaceId === state.surface.activeSurfaceId);
  document.getElementById('surfacePreview').textContent = `${surface.title} • source: ${surface.sourceType} • owner: ${surface.ownerId}`;
  const status = document.getElementById('surfaceStatusPill');
  if (status) status.textContent = state.surface.presentationMode ? 'Presenting' : 'Live';
  document.getElementById('presentationToggleBtn').textContent = state.surface.presentationMode ? messages.presentationModeOn : messages.presentationModeOff;
}

function renderAttachmentLists() {
  const teacher = state.attachments.filter((a) => a.sourceContext === 'teacher-workspace').slice(-3);
  const student = state.attachments.filter((a) => a.sourceContext === 'student-workspace').slice(-3);
  const pub = state.attachments.filter((a) => a.sourceContext === 'public-hub').slice(-3);
  document.getElementById('teacherAttachmentList').innerHTML = teacher.map(renderAttachmentCard).join('');
  document.getElementById('studentAttachmentList').innerHTML = student.map(renderAttachmentCard).join('');
  document.getElementById('publicAttachmentList').innerHTML = pub.map(renderAttachmentCard).join('');
}

function wireEntryPoints(renderAll) {
  document.getElementById('teacherUploadBtn').onclick = () => { mockUploadAttachment('teacher-workspace', 'teacher'); renderAll(); };
  document.getElementById('teacherPasteBtn').onclick = () => { mockPasteAttachment('teacher-workspace', 'teacher'); renderAll(); };
  document.getElementById('studentPasteBtn').onclick = () => { mockPasteAttachment('student-workspace', 'student'); renderAll(); };
}

function wireSpeech() {
  const teacherMic = document.getElementById('teacherMicBtn');
  const studentMic = document.getElementById('studentMicBtn');
  teacherMic.onclick = () => {
    toggleSpeech('teacher');
    teacherMic.classList.toggle('recording', state.speech.teacher.recording);
    teacherMic.textContent = state.speech.teacher.recording ? messages.micStop : messages.micStart;
  };
  studentMic.onclick = () => {
    toggleSpeech('student');
    studentMic.classList.toggle('recording', state.speech.student.recording);
    studentMic.textContent = state.speech.student.recording ? messages.micStop : messages.micStart;
  };
}

function wireSurfaceActions(renderAll) {
  const sharedCard = document.getElementById('sharedSurfaceCard');
  const expandBtn = document.getElementById('sharedSurfaceExpandBtn');
  if (expandBtn && sharedCard) {
    expandBtn.onclick = () => {
      sharedCard.classList.toggle('expanded');
      expandBtn.textContent = sharedCard.classList.contains('expanded') ? 'Close' : 'Open';
    };
  }
  document.getElementById('presentationToggleBtn').onclick = () => { togglePresentationMode(); renderAll(); };
  document.getElementById('captureCopyBtn').onclick = () => {
    const snap = captureSurfaceSnapshot();
    state.hubContent.Shares.push(`Snapshot copied (mock): ${snap.name} • Approved`);
    renderAll();
  };
  document.getElementById('captureToWhiteboardBtn').onclick = () => { const snap = captureSurfaceSnapshot(); snapshotToWhiteboard(snap); renderAll(); };
  document.getElementById('captureToChatBtn').onclick = () => { const snap = captureSurfaceSnapshot(); snapshotToChat(snap, state.currentRole === ROLE.TEACHER ? 'teacher' : 'student'); renderAll(); };
  document.getElementById('captureToNotesBtn').onclick = () => { const snap = captureSurfaceSnapshot(); snapshotToNotes(snap); renderAll(); };
}

function wireInspectorActions(renderAll) {
  document.getElementById('askAiFromSelectionBtn').onclick = () => {
    const obj = findObject(state.selectedObjectId);
    if (!obj || !canOperateOnObject(obj, 'inspect')) return;
    state.studentMessages.push({ role: 'user', text: `Explain object: ${obj.content}`, attachments: [] });
    state.studentMessages.push({ role: 'ai', text: `Mock explanation: source=${obj.sourceType}, owner=${obj.ownerType}.`, attachments: [] });
    renderChat('studentChatLog', state.studentMessages);
  };
  document.getElementById('saveNoteBtn').onclick = () => {
    const obj = findObject(state.selectedObjectId);
    if (!obj || !canOperateOnObject(obj, 'inspect')) return;
    snapshotToNotes(createAttachment({ type: ATTACHMENT.WHITEBOARD_SNAPSHOT, sourceContext: 'whiteboard-inspector', name: `Selection ${obj.objectId}`, linkedObjectId: obj.objectId, metadata: { sizeLabel: 'mock 95KB' } }));
    renderAll();
  };
}

function getStudentRequestTarget(requestType, ownerId) {
  if (requestType === REQUEST_TYPE.UPLOAD) {
    const latestAttachment = [...state.attachments].reverse().find((a) => a.createdBy === ownerId && a.sourceContext === 'student-workspace') || null;
    return {
      key: latestAttachment ? latestAttachment.attachmentId : 'student-workspace-upload',
      sourceContext: 'student-workspace',
      attachmentId: latestAttachment?.attachmentId || null,
      attachmentName: latestAttachment?.name || null
    };
  }

  if (requestType === REQUEST_TYPE.WHITEBOARD_ACCESS) {
    return {
      key: `board:${state.boardId}:region-a:annotate`,
      boardId: state.boardId,
      regionId: 'region-a',
      permissionType: PERMISSION.ANNOTATE
    };
  }

  if (requestType === REQUEST_TYPE.SHARE_AI_CHAT) {
    const latestMessageIndex = [...state.studentMessages].map((message, index) => ({ message, index })).reverse().find(({ message }) => message.role === 'user')?.index ?? null;
    return {
      key: latestMessageIndex !== null ? `student-chat-${latestMessageIndex}` : 'student-chat-latest',
      conversationOwnerId: ownerId,
      messageIndex: latestMessageIndex,
      preview: latestMessageIndex !== null ? state.studentMessages[latestMessageIndex].text.slice(0, 80) : ''
    };
  }

  const latestNote = [...state.privateNotes].reverse().find((note) => note.userId === ownerId) || null;
  return {
    key: latestNote ? latestNote.noteId : 'private-notes-latest',
    noteId: latestNote?.noteId || null,
    attachmentId: latestNote?.attachmentId || null,
    preview: latestNote?.text || 'Share most recent private note'
  };
}

function upsertStudentRequest({ requestType, ownerId = state.currentUserId, nextStatus = REQUEST_STATUS.DRAFT }) {
  const target = getStudentRequestTarget(requestType, ownerId);
  const request = state.studentRequests.find((item) => item.ownerId === ownerId && item.type === requestType && item.target?.key === target.key);
  if (request) {
    request.target = target;
    request.status = nextStatus;
    request.updatedAt = now();
    request.reviewedBy = nextStatus === REQUEST_STATUS.DRAFT ? null : request.reviewedBy || null;
    request.reviewedAt = nextStatus === REQUEST_STATUS.DRAFT ? null : request.reviewedAt || null;
    request.revokedBy = nextStatus === REQUEST_STATUS.DRAFT ? null : request.revokedBy || null;
    request.revokedAt = nextStatus === REQUEST_STATUS.DRAFT ? null : request.revokedAt || null;
    request.decisionReason = nextStatus === REQUEST_STATUS.DRAFT ? '' : request.decisionReason || '';
    request.routedShareEntryId = nextStatus === REQUEST_STATUS.DRAFT ? null : request.routedShareEntryId || null;
    request.appliedPermissionId = nextStatus === REQUEST_STATUS.DRAFT ? null : request.appliedPermissionId || null;
    request.history.push({ status: nextStatus, at: request.updatedAt, actorId: ownerId });
    return request;
  }

  const createdAt = now();
  const created = {
    requestId: uid('req'),
    ownerId,
    type: requestType,
    status: nextStatus,
    createdAt,
    updatedAt: createdAt,
    target,
    reviewedBy: null,
    reviewedAt: null,
    revokedBy: null,
    revokedAt: null,
    decisionReason: '',
    routedShareEntryId: null,
    appliedPermissionId: null,
    history: [{ status: nextStatus, at: createdAt, actorId: ownerId }]
  };
  state.studentRequests.push(created);
  return created;
}

function submitStudentDraftRequests(ownerId = state.currentUserId) {
  let updated = 0;
  state.studentRequests.forEach((request) => {
    if (request.ownerId !== ownerId || request.status !== REQUEST_STATUS.DRAFT) return;
    request.status = REQUEST_STATUS.PENDING;
    request.updatedAt = now();
    request.history.push({ status: REQUEST_STATUS.PENDING, at: request.updatedAt, actorId: ownerId });
    updated += 1;
  });
  return updated;
}

function studentRequestTypeLabel(type) {
  const labels = {
    [REQUEST_TYPE.UPLOAD]: 'Request Upload',
    [REQUEST_TYPE.WHITEBOARD_ACCESS]: 'Request Whiteboard Access',
    [REQUEST_TYPE.SHARE_AI_CHAT]: 'Share AI Chat',
    [REQUEST_TYPE.SHARE_NOTES]: 'Share Notes'
  };
  return labels[type] || type;
}

function renderStudentStatusTags() {
  const root = document.getElementById('studentStatusTags');
  const myRequests = state.studentRequests.filter((request) => request.ownerId === state.currentUserId);
  const statuses = new Set(myRequests.map((request) => request.status));
  const map = {
    [REQUEST_STATUS.DRAFT]: { cls: 'draft', label: 'Draft' },
    [REQUEST_STATUS.PENDING]: { cls: 'pending', label: messages.studentStatusPendingReview },
    [REQUEST_STATUS.APPROVED]: { cls: 'approved', label: messages.studentStatusAccessGranted },
    [REQUEST_STATUS.REJECTED]: { cls: 'rejected', label: messages.studentStatusRejected },
    [REQUEST_STATUS.REVOKED]: { cls: 'revoked', label: 'Revoked' }
  };

  root.innerHTML = [...statuses].map((status) => {
    const item = map[status];
    return item ? `<span class="status-tag ${item.cls}">${item.label}</span>` : '';
  }).join('');
}

function setStudentRequestNotice(text = '') {
  state.studentRequestNotice = text;
}

function renderStudentRequestNotice() {
  const el = document.getElementById('studentRequestNotice');
  if (!el) return;
  el.textContent = state.studentRequestNotice || '';
}

function formatRequestStatusLabel(status) {
  const map = {
    [REQUEST_STATUS.DRAFT]: 'Draft',
    [REQUEST_STATUS.PENDING]: 'Pending',
    [REQUEST_STATUS.APPROVED]: 'Approved',
    [REQUEST_STATUS.REJECTED]: 'Rejected',
    [REQUEST_STATUS.REVOKED]: 'Revoked'
  };
  return map[status] || status;
}

function renderRequestCenter() {
  const root = document.getElementById('studentRequestCenter');
  if (!root) return;
  const myRequests = [...state.studentRequests]
    .filter((request) => request.ownerId === state.currentUserId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (!myRequests.length) {
    root.innerHTML = '<p class="request-center-empty">No active requests yet.</p>';
    return;
  }

  root.innerHTML = myRequests.slice(0, 4).map((request) => `
    <div class="request-center-item">
      <span class="request-title">${studentRequestTypeLabel(request.type)}</span>
      <span class="status-tag ${request.status}">${formatRequestStatusLabel(request.status)}</span>
      <span class="request-time">${new Date(request.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
    </div>
  `).join('');
}

function wireStudentActions(renderAll) {
  const moreBtn = document.getElementById('studentMoreBtn');
  const moreMenu = document.getElementById('studentMoreMenu');
  moreBtn.onclick = () => moreMenu.classList.toggle('hidden');

  document.getElementById('studentRaiseHandBtn').onclick = () => {
    state.hubContent['Hand Raises'].push('student3 raised hand for help.');
    renderAll();
  };

  document.getElementById('studentRequestUploadBtn').onclick = () => {
    const request = upsertStudentRequest({ requestType: REQUEST_TYPE.UPLOAD });
    setStudentRequestNotice(request.target?.attachmentId
      ? 'Upload request drafted with current attachment context.'
      : 'Upload request drafted. Add content via Paste to include upload context.');
    renderAll();
  };

  document.getElementById('studentShareBtn').onclick = () => {
    const hasChatContext = state.studentMessages.some((message) => message.role === 'user');
    if (!hasChatContext) {
      setStudentRequestNotice('No AI chat context yet. Ask AI first, then share chat.');
      renderAll();
      return;
    }
    upsertStudentRequest({ requestType: REQUEST_TYPE.SHARE_AI_CHAT });
    setStudentRequestNotice('AI chat share request drafted.');
    renderAll();
  };

  document.getElementById('studentRequestWhiteboardBtn').onclick = () => {
    upsertStudentRequest({ requestType: REQUEST_TYPE.WHITEBOARD_ACCESS });
    setStudentRequestNotice('Whiteboard access request drafted.');
    renderAll();
  };

  document.getElementById('studentShareNotesBtn').onclick = () => {
    upsertStudentRequest({ requestType: REQUEST_TYPE.SHARE_NOTES });
    setStudentRequestNotice('Notes share request drafted.');
    renderAll();
  };

  document.getElementById('studentSubmitRequestBtn').onclick = () => {
    const submitted = submitStudentDraftRequests();
    if (!submitted) {
      setStudentRequestNotice('No draft requests to submit yet. Create a request first.');
      renderAll();
      return;
    }
    setStudentRequestNotice(`${submitted} request${submitted > 1 ? 's' : ''} submitted for teacher review.`);
    renderAll();
  };
}

function renderToolbarGroup(containerId, labels, isSession = false) {
  const root = document.getElementById(containerId);
  root.innerHTML = '';
  root.classList.toggle('session', isSession);
  labels.forEach((label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toolbar-action';
    if (label === 'Mute All') btn.classList.add('warning');
    if (label === 'End Meeting') btn.classList.add('danger');
    btn.textContent = label;
    root.appendChild(btn);
  });
}

function runPhase4Flow(renderAll) {
  state.currentRole = ROLE.TEACHER;
  state.currentUserId = state.teacherId;
  selectObject('text-a-1', state.teacherId);
  const grant = createGrantSession({ targetType: 'student_group', targetIds: ['group-b'], permissionType: PERMISSION.ANNOTATE, scopeLevel: SCOPE.REGION, targetRegionId: 'region-a' });
  if (!grant.ok) return;
  state.currentRole = ROLE.STUDENT;
  state.currentUserId = 'stu-noah';
  const created = annotateFromUser('text-a-1', 'Team B annotation: compare vectors before/after.', grant.session.sessionId);
  state.currentRole = ROLE.TEACHER;
  state.currentUserId = state.teacherId;
  if (created) selectObject(created.objectId, state.teacherId);
  endGrantSession(grant.session.sessionId);
  if (created) rollbackSelectedObject(findObject);
  const snap = captureSurfaceSnapshot();
  snapshotToWhiteboard(snap);
  aiInsertSummaryObject(`AI Summary: ${state.teacherAiAnswer}`);
  renderRoleSwitch(renderAll);
  renderAll();
}

function renderDebugPanel() {
  const lines = [
    `currentRole: ${state.currentRole}`,
    `currentTool: ${state.currentTool}`,
    `currentSelection: ${state.selectedObjectId || 'none'}`,
    `governanceState: ${state.collaboration.governanceState}`,
    `interactionState: ${state.collaboration.interactionStateByUser[state.currentUserId] || COLLAB_STATE.IDLE}`,
    `activeGrantSessions: ${state.grantSessions.filter((s) => s.active).map((s) => s.sessionId).join(',') || 'none'}`,
    `activeSurface: ${state.surface.activeSurfaceId}`,
    `presentationMode: ${state.surface.presentationMode}`,
    `attachmentsTotal: ${state.attachments.length}`,
    `speechTeacher: ${JSON.stringify(state.speech.teacher)}`,
    `speechStudent: ${JSON.stringify(state.speech.student)}`,
    `activeUsers: ${state.collaboration.activeUsers.join(',')}`,
    `selectedObjectByUser: ${JSON.stringify(state.collaboration.selectedObjectByUser)}`,
    `pendingOperations: ${state.collaboration.pendingOperations.join(',') || 'none'}`
  ];
  const root = document.getElementById('debugList');
  root.innerHTML = '';
  lines.forEach((line) => { const li = document.createElement('li'); li.textContent = line; root.appendChild(li); });
}

export function createRenderAll() {
  return function renderAll() {
    applyApprovalEffectsFromCanonicalRequests();
    renderBoardHints();
    renderCapabilitySummary();
    renderWhiteboardTools(renderAll);
    renderSharedSurface();
    renderWhiteboardObjects(renderAll);
    renderInspector();
    renderAttachmentLists();
    renderHub();
    renderChat('teacherChatLog', state.teacherMessages);
    renderChat('studentChatLog', state.studentMessages);
    renderStudentStatusTags();
    renderStudentRequestNotice();
    renderRequestCenter();
    renderTeacherControlTabs(() => renderTeacherControlBody(renderAll));
    renderTeacherControlBody(renderAll);
    renderDebugPanel();
  };
}

export function initUi(renderAll) {
  document.getElementById('teacherAiAnswerText').textContent = state.teacherAiAnswer;
  document.getElementById('studentAiAnswerText').textContent = state.studentAiAnswer;
  renderRoleSwitch(renderAll);
  renderButtons('teacherQuickActions', messages.teacherQuickActions, 'quick-chip', null);
  renderWhiteboardTabs();
  renderWhiteboardTools(renderAll);
  renderStudentGrid();
  renderHub();
  wireChat('teacherChatForm', 'teacherChatInput', state.teacherMessages, 'teacherChatLog');
  wireChat('studentChatForm', 'studentChatInput', state.studentMessages, 'studentChatLog');
  wireEntryPoints(renderAll);
  wireSpeech();
  wireSurfaceActions(renderAll);
  wireInspectorActions(renderAll);
  wireStudentActions(renderAll);
  renderToolbarGroup('toolbarAudioVideo', messages.toolbarGroups.audioVideo);
  renderToolbarGroup('toolbarTeaching', messages.toolbarGroups.teachingTools);
  renderToolbarGroup('toolbarParticipation', messages.toolbarGroups.participation);
  renderToolbarGroup('toolbarSession', messages.toolbarGroups.session, true);
  updateRoleVisibility();
  document.getElementById('sendToWhiteboardBtn').onclick = () => { if (!canEditBoard()) return; aiInsertSummaryObject(`Teacher AI Push: ${state.teacherAiAnswer}`); renderAll(); };
  document.getElementById('runPhase4FlowBtn').onclick = () => runPhase4Flow(renderAll);
}
