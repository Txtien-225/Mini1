import './style.css';
import { addSurvey, clearDraft, getDraft, getSurveys, saveDraft } from './db';
import { onNetworkChange, takePhoto } from './native';
import { registerSync, syncQueue } from './sync';
import { CATEGORIES, type Draft, type Survey } from './types';

const empty: Draft = { building: '', floor: '', room: '', category: 'Hardware', rating: 0, notes: '' };
let form: Draft = { ...empty };
let step = 1;
let online = navigator.onLine;
let photoPreview: string | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

function render() {
  app.innerHTML = `<header class="topbar"><div class="brand"><span class="brand-mark">✓</span><div><strong>VKU Field Survey</strong><small>Campus inspection system</small></div></div><span class="status ${online ? 'online' : 'offline'}"><i></i>${online ? 'Online' : 'Offline mode'}</span></header>
  <main><section class="hero"><div><p class="eyebrow">FIELD OPERATIONS</p><h1>Facility inspection</h1><p class="muted">Capture reliable observations anywhere on campus, even without connectivity.</p></div><div class="hero-icon">⌖</div></section>
  <section class="stats"><div><span class="stat-number" id="pending-count">—</span><span>Pending sync</span></div><div><span class="stat-number" id="total-count">—</span><span>Total surveys</span></div><div><span class="stat-number">100%</span><span>Offline ready</span></div></section>
  <section class="card"><div class="stepper"><div class="step ${step >= 1 ? 'active' : ''}"><b>1</b><span>Location</span></div><div class="line ${step > 1 ? 'active' : ''}"></div><div class="step ${step >= 2 ? 'active' : ''}"><b>2</b><span>Condition</span></div><div class="line ${step > 2 ? 'active' : ''}"></div><div class="step ${step >= 3 ? 'active' : ''}"><b>3</b><span>Evidence</span></div></div>${stepContent()}</section>
  <section class="card recent"><div class="section-heading"><div><p class="eyebrow">LOCAL RECORDS</p><h2>Recent surveys</h2></div><button class="text-button" id="sync-now">Sync now ↻</button></div><div id="survey-list"><div class="empty">Loading local records…</div></div></section></main><footer>VKU Field Survey <span>•</span> Data is stored securely on this device</footer>`;
  bind(); updateStats();
}

function stepContent() {
  if (step === 1) return `<div class="form-section"><p class="step-kicker">STEP 1 OF 3</p><h2>Where is the issue?</h2><p class="muted">Start with the exact location of the facility being inspected.</p><div class="grid"><label>Building<input id="building" placeholder="e.g. Main Building" value="${esc(form.building)}"></label><label>Floor<input id="floor" placeholder="e.g. 2" value="${esc(form.floor)}"></label><label class="full">Room number<input id="room" placeholder="e.g. A203" value="${esc(form.room)}"></label></div></div><div class="actions"><span class="save-hint">✓ Draft saves automatically</span><button class="primary" id="next">Continue <span>→</span></button></div>`;
  if (step === 2) return `<div class="form-section"><p class="step-kicker">STEP 2 OF 3</p><h2>What is the condition?</h2><p class="muted">Classify the facility and rate its current condition.</p><label>Facility category<select id="category">${CATEGORIES.map(category => `<option ${form.category === category ? 'selected' : ''}>${category}</option>`).join('')}</select></label><div class="rating-label"><span>Condition rating</span><strong>${form.rating ? `${form.rating}/5` : 'Not rated'}</strong></div><div class="stars" role="radiogroup">${[1, 2, 3, 4, 5].map(number => `<button class="star ${form.rating >= number ? 'selected' : ''}" data-rating="${number}" aria-label="${number} stars">★</button>`).join('')}</div><label>Defect notes<textarea id="notes" rows="5" placeholder="Describe damage, fault, or maintenance needed…">${esc(form.notes)}</textarea></label></div><div class="actions"><button class="secondary" id="back">← Back</button><button class="primary" id="next">Continue <span>→</span></button></div>`;
  return `<div class="form-section"><p class="step-kicker">STEP 3 OF 3</p><h2>Add visual evidence</h2><p class="muted">A photo helps the maintenance team understand the issue faster.</p><button class="photo-box" id="photo">${photoPreview ? `<img src="${photoPreview}" alt="Inspection evidence"><span>Retake photo</span>` : '<span class="camera">⌁</span><strong>Take a photo</strong><small>Use camera or choose from device</small>'}</button><div class="summary"><span>Location</span><strong>${esc(form.building)} · Floor ${esc(form.floor)} · Room ${esc(form.room)}</strong><span>Assessment</span><strong>${form.category} · ${form.rating}/5 stars</strong></div></div><div class="actions"><button class="secondary" id="back">← Back</button><button class="primary" id="submit">Save inspection <span>✓</span></button></div>`;
}

function bind() {
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('#building, #floor, #room, #category, #notes').forEach(element => element.addEventListener('input', () => { form[element.id as keyof Draft] = element.value as never; saveDraft(form); }));
  document.querySelectorAll<HTMLButtonElement>('[data-rating]').forEach(button => button.onclick = () => { form.rating = Number(button.dataset.rating); saveDraft(form); render(); });
  document.querySelector('#next')?.addEventListener('click', () => { if (step === 1 && (!form.building || !form.floor || !form.room)) return toast('Please complete the location fields.'); if (step === 2 && !form.rating) return toast('Please select a condition rating.'); step++; render(); });
  document.querySelector('#back')?.addEventListener('click', () => { step--; render(); });
  document.querySelector('#photo')?.addEventListener('click', async () => { photoPreview = await takePhoto(); if (photoPreview) render(); });
  document.querySelector('#submit')?.addEventListener('click', submitSurvey);
  document.querySelector('#sync-now')?.addEventListener('click', async () => { const count = await syncQueue(); toast(count ? `${count} survey(s) synced.` : 'Nothing to sync right now.'); render(); });
  document.querySelector('#survey-list')?.addEventListener('click', event => {
    const row = (event.target as HTMLElement).closest<HTMLElement>('[data-survey-id]');
    if (row) showSurveyDetails(row.dataset.surveyId!);
  });
}

async function submitSurvey() { const survey: Survey = { ...form, id: crypto.randomUUID(), photo: photoPreview, createdAt: new Date().toISOString(), status: 'PENDING_SYNC' }; await addSurvey(survey); await clearDraft(); await registerSync(); form = { ...empty }; step = 1; photoPreview = undefined; toast('Inspection saved securely on this device.'); render(); }
async function updateStats() { const surveys = await getSurveys(); const pending = surveys.filter(survey => survey.status === 'PENDING_SYNC' || survey.status === 'FAILED').length; document.querySelector('#pending-count')!.textContent = String(pending); document.querySelector('#total-count')!.textContent = String(surveys.length); const list = document.querySelector('#survey-list')!; list.innerHTML = surveys.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(survey => `<button class="survey-row" data-survey-id="${survey.id}" aria-label="View details for ${esc(survey.category)} survey"><div class="survey-dot">${survey.category.slice(0, 1)}</div><div class="survey-main"><strong class="survey-title">${esc(survey.category)} · ${esc(survey.building)}</strong><small>Room ${esc(survey.room)} · ${new Date(survey.createdAt).toLocaleString()}</small><em>Click to view details</em></div><span class="badge ${survey.status.toLowerCase()}">${survey.status === 'SYNCED' ? 'Synced' : 'Pending'}</span><span class="row-arrow">›</span></button>`).join('') || '<div class="empty">No inspections saved yet.</div>'; }
async function showSurveyDetails(id: string) { const survey = (await getSurveys()).find(item => item.id === id); if (!survey) return; const modal = document.createElement('div'); modal.className = 'modal-backdrop'; modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="survey-detail-title"><div class="modal-header"><div><p class="eyebrow">SURVEY DETAILS</p><h2 id="survey-detail-title">${esc(survey.category)} inspection</h2></div><button class="modal-close" aria-label="Close">×</button></div><div class="detail-grid"><span>Building</span><strong>${esc(survey.building)}</strong><span>Floor</span><strong>${esc(survey.floor)}</strong><span>Room number</span><strong>${esc(survey.room)}</strong><span>Category</span><strong>${esc(survey.category)}</strong><span>Condition rating</span><strong class="detail-rating">${'★'.repeat(survey.rating)}${'☆'.repeat(5 - survey.rating)} <small>${survey.rating}/5</small></strong><span>Saved at</span><strong>${new Date(survey.createdAt).toLocaleString()}</strong><span>Sync status</span><strong><span class="badge ${survey.status.toLowerCase()}">${survey.status === 'SYNCED' ? 'Synced' : 'Pending sync'}</span></strong></div><div class="detail-notes"><span>Defect notes</span><p>${survey.notes ? esc(survey.notes) : 'No defect notes provided.'}</p></div>${survey.photo ? `<img class="detail-photo" src="${survey.photo}" alt="Inspection evidence">` : '<div class="no-photo">No photo attached</div>'}</section>`; document.body.append(modal); const close = () => modal.remove(); modal.querySelector('.modal-close')?.addEventListener('click', close); modal.addEventListener('click', event => { if (event.target === modal) close(); }); }
function toast(message: string) { const element = document.createElement('div'); element.className = 'toast'; element.textContent = message; document.body.append(element); setTimeout(() => element.remove(), 3000); }

getDraft().then(draft => { if (draft) form = { ...empty, ...draft }; render(); });
onNetworkChange(value => { online = value; if (value) syncQueue().then(() => render()); else render(); });
navigator.serviceWorker?.addEventListener('message', event => { if (event.data?.type === 'SYNC_REQUEST') syncQueue().then(() => render()); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
