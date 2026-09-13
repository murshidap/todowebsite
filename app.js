const { SUPABASE_URL = '', SUPABASE_ANON_KEY = '' } = window.FOCUSLIST_CONFIG || {};
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
const client = hasSupabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const seedLists = [
  {
    id: 'launch', title: 'Launch my side project', deadline: '2026-09-30', description: 'A clear path from rough idea to first release.',
    phases: [{ id: 'p1', title: 'Shape the idea', deadline: '2026-09-15', tracks: [{ id: 't1', title: 'Define the direction', deadline: '2026-09-12', steps: [
      { id: 's1', title: 'Write the one-sentence pitch', deadline: '2026-09-10', description: 'Make the idea easy to repeat and hard to misunderstand.', linkText: 'Product brief', linkUrl: 'https://developer.mozilla.org/' , completed: true },
      { id: 's2', title: 'Talk to three potential users', deadline: '2026-09-14', description: 'Ask what they do today and where the friction lives.', linkText: 'Research notes', linkUrl: 'https://developer.mozilla.org/', completed: false }
    ]}, { id: 't2', title: 'Make the first shape', deadline: '2026-09-21', steps: [
      { id: 's3', title: 'Sketch the core flow', deadline: '2026-09-18', description: 'Keep the first version small enough to finish.', linkText: '', linkUrl: '', completed: true }
    ]}]},
    { id: 'p2', title: 'Build the first release', deadline: '2026-09-30', tracks: [{ id: 't3', title: 'Create the foundation', deadline: '2026-09-25', steps: [
      { id: 's4', title: 'Set up the project', deadline: '2026-09-23', description: '', linkText: '', linkUrl: '', completed: false },
      { id: 's5', title: 'Ship a tiny beta', deadline: '2026-09-30', description: '', linkText: '', linkUrl: '', completed: false }
    ]}]}
    ]
  },
  { id: 'piano', title: 'Learn piano', deadline: '2026-10-18', description: 'A gentle practice rhythm for the next piece.', phases: [] },
  { id: 'home', title: 'Reset the home studio', deadline: '2026-09-20', description: 'Make space for focused work and better weekends.', phases: [] }
];

let lists = JSON.parse(localStorage.getItem('focuslist-data') || 'null') || seedLists;
let activeView = location.hash.startsWith('#list/') ? 'detail' : 'home';
let activeId = location.hash.split('/')[1] || lists[0]?.id;
let currentUser = hasSupabase ? null : { initials: 'ME', demo: true };
let toastTimer;

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const icon = name => ({ pencil: '✎', trash: '<span class="bin-icon" aria-hidden="true"></span>', plus: '+', back: '←', dots: '⋮' }[name] || '');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
const dateValue = value => value ? new Date(`${value}T23:59:59`) : null;
const dateLabel = value => value ? dateValue(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No deadline';

function statusOf(entity) {
  const done = entity.completed;
  const deadline = dateValue(entity.deadline);
  if (done) return deadline && entity.completedAt && new Date(entity.completedAt) > deadline ? 'orange' : 'green';
  if (!deadline) return 'white';
  const days = (deadline - new Date()) / 86400000;
  if (days < 0) return 'red';
  if (days <= 3) return 'yellow';
  return 'white';
}
function completionFor(entity, children) {
  if (!children.length) return false;
  return children.every(child => child.completed);
}
function derive(list) {
  list.phases.forEach(phase => {
    phase.tracks.forEach(track => {
      track.completed = completionFor(track, track.steps);
      track.completedAt = track.completed ? (track.completedAt || new Date().toISOString()) : null;
      track.steps.forEach(step => { if (!step.completed) step.completedAt = null; });
    });
    phase.completed = completionFor(phase, phase.tracks);
    phase.completedAt = phase.completed ? (phase.completedAt || new Date().toISOString()) : null;
  });
  list.completed = completionFor(list, list.phases);
  list.completedAt = list.completed ? (list.completedAt || new Date().toISOString()) : null;
  return list;
}
function allDerived() { lists.forEach(derive); }
async function persist() { allDerived(); localStorage.setItem('focuslist-data', JSON.stringify(lists)); if (client && currentUser) { const rows = lists.map(list => ({ id: list.id, owner_id: currentUser.id, title: list.title, deadline: list.deadline || null, description: list.description || '', structure: list })); const { error } = await client.from('todo_lists').upsert(rows); if (error) showToast(error.message); } }
function getList() { return lists.find(list => list.id === activeId) || lists[0]; }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600); }
function navigate(hash) { location.hash = hash; }

function renderAuth() {
  app.innerHTML = `<main class="auth-shell"><section class="auth-card">
    <button class="brand" type="button"><span class="brand-mark">✓</span> focuslist</button>
    <h1>Make room<br>for progress.</h1><p>Your private space for the things that matter next.</p>
    <form id="login-form"><label class="form-field">Username or email<input name="email" type="email" autocomplete="username" required placeholder="you@example.com"></label><label class="form-field">Password<input name="password" type="password" autocomplete="current-password" required placeholder="••••••••"></label><button class="primary-button" type="submit">Sign in <span>→</span></button></form>
    <div class="auth-note">Private workspace · Supabase Auth</div>
  </section></main>`;
  document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) { currentUser = { initials: 'ME', demo: true }; render(); showToast('Preview mode active'); return; }
    const form = new FormData(event.currentTarget);
    const { data, error } = await client.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
    if (error) return showToast(error.message);
    currentUser = data.user; render();
  });
}
function header() { return `<header class="topbar"><button class="brand" data-action="home"><span class="brand-mark">✓</span> focuslist</button><div class="top-actions"><button class="text-button" data-action="signout">Sign out</button><span class="avatar">${esc(currentUser?.user_metadata?.initials || currentUser?.email?.slice(0, 2).toUpperCase() || 'ME')}</span></div></header>`; }
function legend() { return `<div class="legend"><span class="legend-title">Status</span><span class="legend-item"><i class="dot white"></i>Due</span><span class="legend-item"><i class="dot yellow"></i>Due soon</span><span class="legend-item"><i class="dot red"></i>Overdue</span><span class="legend-item"><i class="dot green"></i>Done</span><span class="legend-item"><i class="dot orange"></i>Done late</span></div>`; }
function sidebar() { return `<aside class="sidebar"><div class="sidebar-inner"><div class="sidebar-heading"><h2>To Do</h2><button class="sidebar-add" data-action="new-list">+ Add</button></div><ul class="sidebar-list">${lists.map(list => `<li class="sidebar-list-item status-${statusOf(list)} ${activeView === 'detail' && activeId === list.id ? 'selected' : ''}" data-list-id="${list.id}"><button class="sidebar-list-link" data-action="open-list" data-id="${list.id}">${esc(list.title)}</button><span class="sidebar-item-tools"><button class="icon-button" data-action="edit-list" data-id="${list.id}" aria-label="Rename ${esc(list.title)}">${icon('pencil')}</button><button class="icon-button" data-action="delete-list" data-id="${list.id}" aria-label="Delete ${esc(list.title)}">${icon('trash')}</button></span></li>`).join('')}</ul></div></aside>`; }
function workspaceFrame(content, pageClass = '') { const width = Number(localStorage.getItem('focuslist-sidebar-width')) || 270; return `<div class="app-shell">${header()}<div class="workspace">${sidebar().replace('<aside class="sidebar">', `<aside class="sidebar" style="width:${Math.max(220, Math.min(width, window.innerWidth * .48))}px">`)}<span class="sidebar-resizer" role="separator" aria-label="Resize sidebar" tabindex="0"></span><main class="workspace-main"><div class="page ${pageClass}">${content}</div></main></div></div>`; }
function card(list, index) { const done = list.phases.flatMap(p => p.tracks.flatMap(t => t.steps)).filter(s => s.completed).length; const total = list.phases.flatMap(p => p.tracks.flatMap(t => t.steps)).length; const percent = total ? Math.round(done / total * 100) : 0; const status = statusOf(list); return `<article class="list-card status-${status}" data-list-id="${list.id}" tabindex="0"><div class="list-card-top"><h3>${esc(list.title)}</h3><div class="menu-wrap"><button class="icon-button" data-action="menu" data-id="${list.id}" aria-label="List settings">${icon('dots')}</button><div class="context-menu" hidden><button data-action="edit-list" data-id="${list.id}">Edit</button><button data-action="delete-list" data-id="${list.id}">Delete</button><button data-action="deadline-list" data-id="${list.id}">Set deadline</button></div></div></div><div><div class="card-meta"><span>${done} / ${total || 0} steps</span><span>${dateLabel(list.deadline)}</span></div><div class="card-progress"><i style="width:${percent}%"></i></div></div></article>`; }
function renderHome() { allDerived(); app.innerHTML = workspaceFrame(`<section class="main-empty"><h1>BE<br>PRODUCTIVE</h1>${legend()}<button class="primary-button" data-action="new-list"><span>+</span> Add list</button></section>`); }
function deadline(entity, withEdit = true) { return `<div class="deadline status-${statusOf(entity)}"><i class="status-dot"></i><span>${dateLabel(entity.deadline)}</span>${withEdit ? `<button class="deadline-edit" data-action="deadline" data-type="${entity._type}" data-id="${entity.id}" aria-label="Edit deadline">${icon('pencil')}</button>` : ''}</div>`; }
function controls(entity, addLabel, includeDeadline = false, includeEdit = true, includeDelete = true) { return `<div class="entity-actions small">${includeDeadline ? deadline(entity) : ''}${includeEdit ? `<button class="icon-button" data-action="edit" data-type="${entity._type}" data-id="${entity.id}" aria-label="Edit">${icon('pencil')}</button>` : ''}${includeDelete ? `<button class="icon-button" data-action="delete" data-type="${entity._type}" data-id="${entity.id}" aria-label="Delete">${icon('trash')}</button>` : ''}${addLabel ? `<button class="action-button add" data-action="add-child" data-type="${entity._type}" data-id="${entity.id}">${addLabel === 'Phase' ? '+' : icon('plus')} ${addLabel}</button>` : ''}</div>`; }
function renderStep(step) { step._type = 'step'; return `<div class="entity step ${step.completed ? 'completed' : ''} status-${statusOf(step)}"><div class="entity-head"><div class="entity-title"><input class="step-check" type="checkbox" data-action="toggle-step" data-id="${step.id}" ${step.completed ? 'checked' : ''} aria-label="Mark ${esc(step.title)} complete"><h3>${esc(step.title)}</h3>${deadline(step)}</div>${controls(step, '', false, false)}</div><div class="entity-body">${step.description || step.linkText ? `<p class="step-description">${esc(step.description)}${step.linkText ? ` <a href="${esc(step.linkUrl || '#')}" target="_blank" rel="noreferrer">${esc(step.linkText)}</a>` : ''}</p>` : ''}</div></div>`; }
function childButton(entity, label) { return `<div class="entity-add-row"><button class="action-button add" data-action="add-child" data-type="${entity._type}" data-id="${entity.id}">+ ${label}</button></div>`; }
function renderTrack(track) { track._type = 'track'; return `<div class="entity track ${track.completed ? 'completed' : ''} status-${statusOf(track)}"><div class="entity-head"><div><div class="entity-title"><h3>${esc(track.title)}</h3>${deadline(track)}</div>${childButton(track, 'Step')}</div>${controls(track, '', false, false, false)}</div><div class="entity-body">${track.steps.map(renderStep).join('')}</div></div>`; }
function renderPhase(phase) { phase._type = 'phase'; return `<div class="entity phase ${phase.completed ? 'completed' : ''} status-${statusOf(phase)}"><div class="entity-head"><div><div class="entity-title"><h3>${esc(phase.title)}</h3>${deadline(phase)}</div>${childButton(phase, 'Track')}</div>${controls(phase, '', false, false, false)}</div><div class="entity-body">${phase.tracks.map(renderTrack).join('')}</div></div>`; }
function renderDetail() { const list = getList(); if (!list) return renderHome(); list._type = 'list'; allDerived(); app.innerHTML = workspaceFrame(`<section class="detail-head"><div><h1 class="status-${statusOf(list)}">${esc(list.title)}</h1><div class="detail-meta-row">${deadline(list, false)}<div class="entity-actions"><button class="icon-button" data-action="edit" data-type="list" data-id="${list.id}" aria-label="Edit list">${icon('pencil')}</button><button class="icon-button" data-action="delete" data-type="list" data-id="${list.id}" aria-label="Delete list">${icon('trash')}</button></div></div></div></section><div class="detail-add-row"><button class="action-button add" data-action="add-child" data-type="list" data-id="${list.id}">+ Phase</button></div><section class="tree">${list.phases.length ? list.phases.map(renderPhase).join('') : '<div class="empty-state">No phases yet. Add one to give this list its first shape.</div>'}</section>`, 'detail-page'); }
function render() { activeView === 'detail' ? renderDetail() : renderHome(); bindEvents(); }

function findEntity(type, id) { const list = getList(); if (type === 'list') return list; for (const phase of list.phases) { if (type === 'phase' && phase.id === id) return phase; for (const track of phase.tracks) { if (type === 'track' && track.id === id) return track; const step = track.steps.find(item => item.id === id); if (type === 'step' && step) return step; } } return null; }
function openModal(title, entity, type, onSave) { const isStep = type === 'step'; const modal = document.createElement('div'); modal.className = 'modal-backdrop'; modal.innerHTML = `<section class="modal" role="dialog" aria-modal="true"><h2>${title}</h2><p>${isStep ? 'Keep the next action concrete and easy to return to.' : 'Name this part of the path and give it a finish line.'}</p><form><label class="form-field">Title<input name="title" required value="${esc(entity?.title || '')}"></label>${isStep ? '<label class="form-field">Description<textarea name="description" rows="3">' + esc(entity?.description || '') + '</textarea></label><label class="form-field">Link label<input name="linkText" value="' + esc(entity?.linkText || '') + '"></label><label class="form-field">Link URL<input name="linkUrl" type="url" value="' + esc(entity?.linkUrl || '') + '"></label>' : ''}<label class="form-field">Deadline<input name="deadline" type="date" value="${esc(entity?.deadline || '')}"></label><div class="modal-actions"><button type="button" class="modal-delete" data-delete>Delete</button><button type="button" class="action-button" data-close>Cancel</button><button class="primary-button" type="submit">Save</button></div></form></section>`; document.body.append(modal); modal.querySelector('[data-close]').onclick = () => modal.remove(); modal.querySelector('[data-delete]').onclick = () => { modal.remove(); deleteEntity(type, entity.id); }; modal.querySelector('form').onsubmit = event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); onSave(data); modal.remove(); persist(); render(); showToast('Saved'); }; modal.querySelector('input').focus(); }
function newEntity(type, parentId) { const title = type[0].toUpperCase() + type.slice(1); const entity = { title: '', deadline: '', ...(type === 'step' ? { description: '', linkText: '', linkUrl: '', completed: false } : {}), ...(type === 'list' ? { description: '', phases: [] } : {}), ...(type === 'phase' ? { tracks: [] } : {}), ...(type === 'track' ? { steps: [] } : {}) }; openModal(`New ${title}`, entity, type, data => { Object.assign(entity, data); entity.id = `${type}-${Date.now()}`; if (type === 'list') lists.push(entity); else if (type === 'phase') getList().phases.push(entity); else if (type === 'track') findEntity('phase', parentId).tracks.push(entity); else findEntity('track', parentId).steps.push(entity); if (type === 'list') { activeId = entity.id; navigate(`#list/${entity.id}`); } }); }
function deleteEntity(type, id) { if (!confirm('Delete this item and everything inside it?')) return; if (type === 'list') { lists = lists.filter(list => list.id !== id); activeId = lists[0]?.id; navigate('#'); } else { const list = getList(); list.phases = list.phases.filter(phase => phase.id !== id); list.phases.forEach(phase => { phase.tracks = phase.tracks.filter(track => track.id !== id); trackSteps: phase.tracks.forEach(track => { track.steps = track.steps.filter(step => step.id !== id); }); }); } persist(); render(); showToast('Deleted'); }
function bindEvents() { app.querySelectorAll('[data-action]').forEach(element => element.addEventListener('click', event => { const target = event.currentTarget; const action = target.dataset.action; const type = target.dataset.type; const id = target.dataset.id; if (action === 'home') { activeView = 'home'; navigate('#'); } else if (action === 'signout') { if (client) client.auth.signOut(); currentUser = null; render(); } else if (action === 'open-list') { activeId = id; activeView = 'detail'; navigate(`#list/${id}`); } else if (action === 'menu' || action === 'sidebar-menu') { event.stopPropagation(); const menu = target.nextElementSibling; app.querySelectorAll('.context-menu').forEach(item => { if (item !== menu) item.hidden = true; }); menu.hidden = !menu.hidden; } else if (action === 'new-list') newEntity('list'); else if (action === 'edit-list') { const entity = lists.find(item => item.id === id); openModal('Rename list', entity, 'list', data => Object.assign(entity, data)); } else if (action === 'deadline-list') { const entity = lists.find(item => item.id === id); openModal('Set deadline', entity, 'list', data => entity.deadline = data.deadline); } else if (action === 'delete-list') deleteEntity('list', id); else if (action === 'edit') { const entity = findEntity(type, id); openModal(`Edit ${type}`, entity, type, data => Object.assign(entity, data)); } else if (action === 'deadline') { const entity = findEntity(type, id); openModal('Set deadline', entity, type, data => entity.deadline = data.deadline); } else if (action === 'delete') deleteEntity(type, id); else if (action === 'add-child') newEntity(type === 'list' ? 'phase' : type === 'phase' ? 'track' : 'step', id); else if (action === 'toggle-step') { event.stopPropagation(); const step = findEntity('step', id); step.completed = target.checked; step.completedAt = target.checked ? new Date().toISOString() : null; persist(); render(); showToast(target.checked ? 'Step complete' : 'Step reopened'); } }));
  const resizer = app.querySelector('.sidebar-resizer');
  if (resizer) resizer.addEventListener('pointerdown', event => { event.preventDefault(); resizer.classList.add('dragging'); const sidebarElement = app.querySelector('.sidebar'); const move = moveEvent => { const width = Math.max(220, Math.min(moveEvent.clientX, window.innerWidth * .48)); sidebarElement.style.width = `${width}px`; localStorage.setItem('focuslist-sidebar-width', String(Math.round(width))); }; const stop = () => { resizer.classList.remove('dragging'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop); });
  app.querySelectorAll('.list-card').forEach(cardElement => { cardElement.addEventListener('click', event => { if (event.target.closest('[data-action="menu"]') || event.target.closest('.context-menu')) return; activeId = cardElement.dataset.listId; activeView = 'detail'; navigate(`#list/${activeId}`); }); cardElement.addEventListener('keydown', event => { if (event.key === 'Enter') { activeId = cardElement.dataset.listId; activeView = 'detail'; navigate(`#list/${activeId}`); } }); }); }

window.addEventListener('hashchange', () => { activeView = location.hash.startsWith('#list/') ? 'detail' : 'home'; activeId = location.hash.split('/')[1] || activeId; render(); });
(async function init() { if (client) { const { data } = await client.auth.getSession(); if (!data.session) return renderAuth(); currentUser = data.session.user; const { data: rows, error } = await client.from('todo_lists').select('structure').order('created_at'); if (error) return showToast(error.message); if (rows?.length) lists = rows.map(row => row.structure); } render(); })();
