import { ATTACHMENT, state } from './model.js';
import { createAttachment } from './attachments.js';

export function captureSurfaceSnapshot() {
  const surface = state.surface.surfaces.find((s) => s.surfaceId === state.surface.activeSurfaceId);
  return createAttachment({ type: ATTACHMENT.SCREEN_CAPTURE, sourceContext: 'shared-surface', name: `${surface.title} Snapshot`, sourceSurfaceId: surface.surfaceId, metadata: { sizeLabel: 'mock 340KB', previewText: surface.title } });
}

export const togglePresentationMode = () => {
  state.surface.presentationMode = !state.surface.presentationMode;
};
