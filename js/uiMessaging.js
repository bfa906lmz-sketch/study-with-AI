import { messages, state } from './model.js';
import { renderAttachmentCard } from './attachments.js';

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

function buildAttachmentCards(attachmentIds = []) {
  return attachmentIds
    .map((id) => state.attachments.find((a) => a.attachmentId === id))
    .filter(Boolean)
    .map((att) => renderAttachmentCard(att))
    .join('');
}

function buildMessageHtml({ text, attachments = [] }, role = 'ai') {
  const hasAtt = attachments.length > 0;
  return `<div class="chat-message ${role === 'user' ? 'user' : 'ai'} ${hasAtt ? 'with-attachments' : ''}"><div>${text}</div>${hasAtt ? buildAttachmentCards(attachments) : ''}</div>`;
}

export function renderChat(logId, list) {
  const log = document.getElementById(logId);
  log.innerHTML = '';
  list.slice(-4).forEach((msg) => {
    const bubble = document.createElement('div');
    bubble.innerHTML = buildMessageHtml(msg, msg.role);
    log.appendChild(bubble.firstElementChild);
  });
}

export function wireChat(formId, inputId, list, logId) {
  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  form.onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    list.push({ role: 'user', text, attachments: [] });
    list.push({ role: 'ai', text: 'Mock AI reply captured for future backend wiring.', attachments: [] });
    input.value = '';
    renderChat(logId, list);
  };
}

function normalizeHubEntry(entry) {
  if (typeof entry === 'string') return { text: entry, attachments: [] };
  return { text: entry.text || '', attachments: entry.attachments || [] };
}

export function renderHub() {
  renderButtons('hubTabs', messages.hubTabs, 'segment-btn', state.activeHubTab, (tab) => {
    state.activeHubTab = tab;
    renderHub();
  });

  const root = document.getElementById('hubActiveList');
  root.innerHTML = '';
  (state.hubContent[state.activeHubTab] || []).forEach((entry) => {
    const normalized = normalizeHubEntry(entry);
    const li = document.createElement('li');
    li.className = 'hub-entry';
    li.innerHTML = buildMessageHtml(normalized, 'ai');
    root.appendChild(li);
  });
}
