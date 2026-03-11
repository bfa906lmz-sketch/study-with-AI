import { COLLAB_STATE, PERMISSION, SCOPE, state, uid, now, getUser, clone } from './model.js';

export const setUserInteractionState = (userId, nextState) => {
  state.collaboration.interactionStateByUser[userId] = nextState;
};

export function pushOperation({ operationType, permissionType, scopeLevel, targetRegionId = null, objectId = null, payload = {}, grantSessionId = null }) {
  const op = {
    operationId: uid('op'), roomId: state.roomId, boardId: state.boardId, actorId: state.currentUserId, actorRole: state.currentRole,
    groupId: getUser(state.currentUserId).groupId || null, permissionType, scopeLevel, targetRegionId, objectId, operationType,
    payload, timestamp: now(), revoked: false, grantSessionId
  };
  state.operations.push(op);
  state.collaboration.pendingOperations.push(op.operationId);
  if (state.collaboration.pendingOperations.length > 20) state.collaboration.pendingOperations.shift();
  return op;
}

export function createGrantSession({ targetType, targetIds, permissionType, scopeLevel, targetRegionId = null }) {
  if (permissionType === PERMISSION.EDIT_BOARD && targetType === 'class') return { ok: false, reason: 'Cannot grant board to whole class' };
  const session = { sessionId: uid('grant'), roomId: state.roomId, grantedByTeacherId: state.teacherId, targetType, targetIds, permissionType, scopeLevel, targetRegionId, startedAt: now(), endedAt: null, active: true };
  state.grantSessions.push(session);
  state.whiteboardPermissions.push({ id: uid('perm'), targetType, targetIds, permissionType, scopeLevel, targetRegionId, active: true, grantSessionId: session.sessionId });
  state.collaboration.governanceState = COLLAB_STATE.GRANT_ACTIVE;
  pushOperation({ operationType: 'update-object', permissionType, scopeLevel, targetRegionId, payload: { grant: 'started', targetIds }, grantSessionId: session.sessionId });
  return { ok: true, session };
}

export function endGrantSession(sessionId) {
  const session = state.grantSessions.find((s) => s.sessionId === sessionId);
  if (!session || !session.active) return;
  session.active = false;
  session.endedAt = now();
  state.whiteboardPermissions.forEach((p) => { if (p.grantSessionId === sessionId) p.active = false; });
  state.collaboration.governanceState = COLLAB_STATE.GRANT_ENDED;
  pushOperation({ operationType: 'update-object', permissionType: session.permissionType, scopeLevel: session.scopeLevel, targetRegionId: session.targetRegionId, payload: { grant: 'ended', sessionId }, grantSessionId: sessionId });
}

export function rollbackSelectedObject(findObject) {
  const obj = findObject(state.selectedObjectId);
  if (!obj) return;
  state.collaboration.governanceState = COLLAB_STATE.PENDING_ROLLBACK;
  obj.deleted = true;
  obj.conflictState = 'rolled-back';
  obj.lastOperationType = 'delete-object';
  obj.lastModifiedAt = now();
  pushOperation({ operationType: 'delete-object', permissionType: PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.OBJECT, targetRegionId: obj.regionId, objectId: obj.objectId, payload: { strategy: 'selected-object' }, grantSessionId: obj.sourceGrantSessionId });
  state.collaboration.governanceState = COLLAB_STATE.VIEWING;
}

export function rollbackGrantSession(sessionId) {
  state.collaboration.governanceState = COLLAB_STATE.PENDING_ROLLBACK;
  state.whiteboard.objects.forEach((obj) => {
    if (obj.sourceGrantSessionId === sessionId) {
      obj.deleted = true;
      obj.conflictState = 'rolled-back';
      obj.lastOperationType = 'delete-object';
      obj.lastModifiedAt = now();
    }
  });
  pushOperation({ operationType: 'delete-object', permissionType: PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.REGION, payload: { strategy: 'grant-session', sessionId }, grantSessionId: sessionId });
  state.collaboration.governanceState = COLLAB_STATE.VIEWING;
}

export function restoreTeacherBaseline() {
  state.whiteboard.objects = clone(state.whiteboard.baselineObjects).map((obj) => ({
    ...obj,
    lockedBy: null,
    conflictState: 'none',
    lastOperationType: obj.lastOperationType || 'create-object',
    lastModifiedAt: now()
  }));
  state.selectedObjectId = null;
  state.collaboration.selectedObjectByUser = {};
  Object.keys(state.collaboration.interactionStateByUser).forEach((userId) => {
    state.collaboration.interactionStateByUser[userId] = COLLAB_STATE.VIEWING;
  });
  state.collaboration.governanceState = COLLAB_STATE.IDLE;
  pushOperation({ operationType: 'delete-object', permissionType: PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.BOARD, payload: { strategy: 'restore-baseline' } });
}

export function selectedObjectGovernanceInfo(findObject) {
  const obj = findObject(state.selectedObjectId);
  if (!obj) return null;
  const latestOp = [...state.operations].reverse().find((op) => op.objectId === obj.objectId);
  return {
    source: obj.sourceType,
    owner: `${obj.ownerType}:${obj.ownerId}`,
    sourceGrantSession: obj.sourceGrantSessionId || 'none',
    lockEditor: obj.lockedBy ? getUser(obj.lockedBy).name : 'none',
    latestOperation: latestOp ? `${latestOp.operationType} (${latestOp.operationId})` : obj.lastOperationType,
    action: obj.sourceGrantSessionId ? 'rollback object or grant session' : 'rollback object'
  };
}
