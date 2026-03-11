import { ROLE, SCOPE, PERMISSION, state, getUser } from './model.js';

function permissionContext() {
  const user = getUser(state.currentUserId);
  return { role: state.currentRole, userId: state.currentUserId, groupIds: user.groupId ? [user.groupId] : [] };
}

export function isPermissionGranted(permissionType, scopeLevel, regionId = null) {
  const ctx = permissionContext();
  if (ctx.role === ROLE.TEACHER) return true;
  return state.whiteboardPermissions.some((perm) => {
    if (!perm.active || perm.permissionType !== permissionType) return false;
    const scopeMatches = perm.scopeLevel === scopeLevel || perm.scopeLevel === SCOPE.BOARD;
    const regionMatches = !perm.targetRegionId || !regionId || perm.targetRegionId === regionId;
    if (!scopeMatches || !regionMatches) return false;
    if (perm.targetType === 'class') return true;
    if (perm.targetType === 'student') return perm.targetIds.includes(ctx.userId);
    if (perm.targetType === 'student_group') return perm.targetIds.some((id) => ctx.groupIds.includes(id));
    return false;
  });
}

export const canViewBoard = () => isPermissionGranted(PERMISSION.VIEW, SCOPE.BOARD);
export const canInspectSelection = () => isPermissionGranted(PERMISSION.INSPECT, SCOPE.OBJECT);
export const canAnnotateRegion = (regionId) => isPermissionGranted(PERMISSION.ANNOTATE, SCOPE.REGION, regionId);
export const canEditRegion = (regionId) => isPermissionGranted(PERMISSION.EDIT_REGION, SCOPE.REGION, regionId);
export const canEditBoard = () => isPermissionGranted(PERMISSION.EDIT_BOARD, SCOPE.BOARD);
export const isLockedByOther = (obj) => obj.lockedBy && obj.lockedBy !== state.currentUserId;

export function canOperateOnObject(obj, actionType) {
  if (!obj || obj.deleted) return false;
  const region = obj.regionId || obj.parentRegionId;
  if (actionType === 'select') return canViewBoard() && (state.currentRole === ROLE.TEACHER || canInspectSelection());
  if (actionType === 'annotate') return !isLockedByOther(obj) && canAnnotateRegion(region);
  if (actionType === 'edit') return !isLockedByOther(obj) && (canEditBoard() || canEditRegion(region));
  if (actionType === 'move') return !isLockedByOther(obj) && (state.currentRole === ROLE.TEACHER || canEditRegion(region));
  if (actionType === 'delete') return state.currentRole === ROLE.TEACHER;
  if (actionType === 'inspect') return canInspectSelection();
  return false;
}
