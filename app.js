import { initBoardObjects } from './js/model.js';
import { applyI18n, createRenderAll, initUi } from './js/ui.js';

function initApp() {
  initBoardObjects();
  applyI18n();
  const renderAll = createRenderAll();
  initUi(renderAll);
  renderAll();
}

// TODO(next): wire real media stream and clipboard APIs once backend/realtime channels are available.
// TODO(next): persist attachments, snapshots, and media-linked whiteboard artifacts server-side.
initApp();
