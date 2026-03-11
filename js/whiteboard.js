import { COLLAB_STATE, OBJECT, PERMISSION, SCOPE, ROLE, state, uid, now } from './model.js';
import { canOperateOnObject, isLockedByOther } from './permissions.js';
import { pushOperation, setUserInteractionState } from './collaboration.js';

export const findObject = (objectId) => state.whiteboard.objects.find((o) => o.objectId === objectId && !o.deleted);

export function createObject({ objectType, content, regionId, x, y, width, height, zIndex, parentRegionId = null, sourceType, sourceGrantSessionId = null, ownerType, ownerId, operationType, mediaType = null, attachmentId = null, sourceSurfaceId = null }) {
  const obj = {
    objectId: uid('obj'), objectType, content, createdBy: state.currentUserId, actorRole: state.currentRole, scopeLevel: SCOPE.OBJECT,
    regionId, editableByPolicy: [PERMISSION.ANNOTATE, PERMISSION.EDIT_REGION, PERMISSION.EDIT_BOARD], createdAt: now(), x, y, width, height, zIndex, parentRegionId,
    ownerType, ownerId, sourceType, lockedBy: null, conflictState: 'none', lastModifiedAt: now(), lastOperationType: operationType, sourceGrantSessionId, deleted: false,
    mediaType, attachmentId, sourceSurfaceId
  };
  state.whiteboard.objects.push(obj);
  pushOperation({ operationType, permissionType: objectType === OBJECT.ANNOTATION ? PERMISSION.ANNOTATE : PERMISSION.EDIT_BOARD, scopeLevel: SCOPE.OBJECT, targetRegionId: regionId, objectId: obj.objectId, payload: { mediaType, attachmentId }, grantSessionId: sourceGrantSessionId });
  return obj;
}

export function selectObject(objectId, userId = state.currentUserId) {
  const obj = findObject(objectId);
  if (!obj || !canOperateOnObject(obj, 'select')) return;
  state.selectedObjectId = objectId;
  state.collaboration.selectedObjectByUser[userId] = objectId;
  setUserInteractionState(userId, COLLAB_STATE.SELECTING);
  obj.conflictState = 'none';
  obj.lastOperationType = 'update-object';
  obj.lastModifiedAt = now();
  pushOperation({ operationType: 'update-object', permissionType: PERMISSION.INSPECT, scopeLevel: SCOPE.OBJECT, targetRegionId: obj.regionId, objectId, payload: { selectedBy: userId } });
}

export function annotateFromUser(targetObjectId, text, grantSessionId = null) {
  const target = findObject(targetObjectId);
  if (!target) return null;
  if (isLockedByOther(target)) {
    target.conflictState = 'occupied-by-other-user';
    return null;
  }
  if (!canOperateOnObject(target, 'annotate')) {
    target.conflictState = 'permission-denied';
    return null;
  }
  target.lockedBy = state.currentUserId;
  setUserInteractionState(state.currentUserId, COLLAB_STATE.ANNOTATING);
  const note = createObject({
    objectType: OBJECT.ANNOTATION, content: text, regionId: target.regionId, x: target.x + 8, y: target.y + target.height + 8,
    width: 240, height: 48, zIndex: target.zIndex + 2, parentRegionId: target.regionId, sourceType: 'student-annotation',
    sourceGrantSessionId: grantSessionId, ownerType: 'student', ownerId: state.currentUserId, operationType: 'annotate-object'
  });
  target.lockedBy = null;
  setUserInteractionState(state.currentUserId, COLLAB_STATE.VIEWING);
  return note;
}

export function aiInsertSummaryObject(text) {
  setUserInteractionState(state.currentUserId, COLLAB_STATE.EDITING);
  const obj = createObject({
    objectType: OBJECT.TEXT_BLOCK, content: text, regionId: 'region-a', x: 355, y: 48, width: 250, height: 70, zIndex: 6, parentRegionId: 'region-a',
    sourceType: 'ai-summary', ownerType: 'teacher', ownerId: state.teacherId, operationType: 'ai-insert-object'
  });
  setUserInteractionState(state.currentUserId, COLLAB_STATE.VIEWING);
  return obj;
}
