import { ATTACHMENT, OBJECT, state, uid, now, getUser } from './model.js';
import { createObject } from './whiteboard.js';

export function createAttachment({ type, sourceContext, name, linkedObjectId = null, sourceSurfaceId = null, metadata = {} }) {
  const attachment = {
    attachmentId: uid('att'), type, sourceContext, name, mime: metadata.mime || (type === ATTACHMENT.IMAGE ? 'image/png' : 'application/octet-stream'),
    sizeLabel: metadata.sizeLabel || 'mock 120KB', createdBy: state.currentUserId, createdAt: now(), linkedObjectId, sourceSurfaceId, previewText: metadata.previewText || ''
  };
  state.attachments.push(attachment);
  return attachment;
}

export function renderAttachmentCard(att) {
  const isImage = [ATTACHMENT.IMAGE, ATTACHMENT.WHITEBOARD_SNAPSHOT, ATTACHMENT.SCREEN_CAPTURE].includes(att.type);
  return `<div class="attachment-card">${isImage ? '<div class="attachment-image-preview"></div>' : ''}<div><strong>${att.name}</strong></div><div class="attachment-meta">${att.type} • ${att.sizeLabel} • by ${getUser(att.createdBy).name}</div></div>`;
}

export function snapshotToWhiteboard(att) {
  createObject({ objectType: OBJECT.ANNOTATION, content: `Snapshot: ${att.name}`, regionId: 'region-a', x: 355, y: 132, width: 250, height: 52, zIndex: 7, parentRegionId: 'region-a', sourceType: 'surface-snapshot', ownerType: state.currentRole, ownerId: state.currentUserId, operationType: 'create-object', mediaType: ATTACHMENT.SCREEN_CAPTURE, attachmentId: att.attachmentId, sourceSurfaceId: att.sourceSurfaceId });
}

export function snapshotToChat(att, target) {
  const list = target === 'teacher' ? state.teacherMessages : state.studentMessages;
  list.push({ role: 'user', text: 'Attached snapshot for context', attachments: [att.attachmentId] });
}

export function snapshotToNotes(att) {
  state.privateNotes.push({ noteId: uid('note'), userId: state.currentUserId, attachmentId: att.attachmentId, text: `Saved ${att.name}`, createdAt: now() });
}

export function mockUploadAttachment(sourceContext, listType) {
  const type = Math.random() > 0.5 ? ATTACHMENT.IMAGE : ATTACHMENT.FILE;
  const att = createAttachment({ type, sourceContext, name: type === ATTACHMENT.IMAGE ? 'diagram.png' : 'lesson-notes.pdf', metadata: { sizeLabel: type === ATTACHMENT.IMAGE ? 'mock 210KB' : 'mock 540KB' } });
  if (listType === 'teacher') state.teacherMessages.push({ role: 'user', text: 'Uploaded attachment', attachments: [att.attachmentId] });
  if (listType === 'student') state.studentMessages.push({ role: 'user', text: 'Uploaded attachment', attachments: [att.attachmentId] });
  if (listType === 'public') state.hubContent.Shares.push({ text: `Attachment shared: ${att.name} • Approved`, attachments: [att.attachmentId] });
  return att;
}

export function mockPasteAttachment(sourceContext, listType) {
  const att = createAttachment({ type: ATTACHMENT.IMAGE, sourceContext, name: 'pasted-image.png', metadata: { sizeLabel: 'mock 180KB' } });
  if (listType === 'teacher') state.teacherMessages.push({ role: 'user', text: 'Pasted image', attachments: [att.attachmentId] });
  if (listType === 'student') state.studentMessages.push({ role: 'user', text: 'Pasted image', attachments: [att.attachmentId] });
  if (listType === 'public') state.hubContent.Shares.push({ text: `Pasted to public hub: ${att.name} • Approved`, attachments: [att.attachmentId] });
  return att;
}
