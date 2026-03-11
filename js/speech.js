import { state } from './model.js';

export function toggleSpeech(roleKey) {
  const speechState = state.speech[roleKey];
  speechState.recording = !speechState.recording;
  if (!speechState.recording) {
    const transcript = roleKey === 'teacher' ? "Can you summarize today's momentum activity?" : 'Please explain the selected region step by step.';
    speechState.transcript = transcript;
    const input = document.getElementById(roleKey === 'teacher' ? 'teacherChatInput' : 'studentChatInput');
    input.value = transcript;
  }
}
