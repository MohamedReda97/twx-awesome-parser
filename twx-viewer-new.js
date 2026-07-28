/* ── TWX Viewer — Production UI ────────────────────────────── */
'use strict';

// ── State ──────────────────────────────────────────────────────
const state = {
  activeTab: 'summary',
  drawerOpen: false,
  drawerObject: null,
  drawerSubTab: 'info',
  currentObjects: {},
  selectedType: null,
  selectedTypeData: null,
  toolkitToggle: false,
  byTypeExpanded: null,
  byTypeSelectedItem: null,
  byTypeSection3SubTab: 'info',
  searchResults: [],
  searchTerm: '',
  searchLoading: false,
  summaryData: null,
  metadata: null,
  dependencies: [],
  parsedFile: null,
  isParsing: false,
  quickFilter: '',
  searchSearched: false,
  searchIncludeToolkits: false,
  // Toolkits tab breadcrumb state
  toolkitsLevel: 0,
  toolkitsSelectedToolkit: null,
  toolkitsExpandedType: null,
  toolkitsSection3Object: null,
  toolkitsSection3SubTab: 'info',
};

// ── Icons (inline SVG 16px line) ──────────────────────────────
const I = {
  summary: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  byType: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  toolkits: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  deps: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  cloud: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
  empty: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  box: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>',
  chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronDown: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
  chevronRight14: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
};

// ── Utils ──────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const esc = text => { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; };
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TYPES = ['coach-view','cshs','managed-asset','participant','process','business-process-definition','business-object'];

const DISPLAY_NAMES = {
  'process': 'Services', 'coach-view': 'Coach Views', 'cshs': 'CSHS',
  'business-process-definition': 'Business Process Definitions', 'participant': 'Participants',
  'managed-asset': 'Managed Assets', 'business-object': 'Business Objects',
};
function getDisplayName(type) { return DISPLAY_NAMES[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Unknown'); }

function findObjectById(id) {
  for (const [type, data] of Object.entries(state.currentObjects)) {
    if (data && data.objects) { const o = data.objects.find(obj => obj.id === id); if (o) return { type, object: o }; }
  }
  return null;
}

function getFilteredObjects(objects) {
  if (!objects) return [];
  return state.toolkitToggle ? objects : objects.filter(o => o.source !== 'toolkit');
}

function getTypeCounts(objectData) {
  if (!objectData || !objectData.objects) return { app: 0, toolkit: 0, total: 0 };
  let app = 0, tk = 0;
  objectData.objects.forEach(o => { if (o.source === 'toolkit') tk++; else app++; });
  if (objectData.applicationCount !== undefined) app = objectData.applicationCount;
  if (objectData.toolkitCount !== undefined) tk = objectData.toolkitCount;
  return { app, toolkit: tk, total: state.toolkitToggle ? (app + tk) : app };
}

// ── API ────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function parseFile(file) {
  state.isParsing = true;
  const pb = $('progress-bar'), pf = $('progress-fill');
  pb.classList.add('visible', 'indeterminate'); pb.classList.remove('error');
  try {
    const fd = new FormData(); fd.append('twxFile', file);
    const r = await fetch('/api/parse', { method: 'POST', body: fd });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `Parse failed: ${r.status}`); }
    const result = await r.json();
    pb.classList.remove('indeterminate'); pf.style.width = '100%';
    state.parsedFile = { name: result.fileName || file.name, count: result.objectCount };
    setTimeout(() => { pb.classList.remove('visible'); pf.style.width = '0%'; }, 800);
    await loadAllData();
    renderAll();
  } catch (err) {
    pb.classList.remove('indeterminate'); pb.classList.add('error');
    pf.style.width = '100%';
    state.parseError = err.message;
    setTimeout(() => { pb.classList.remove('visible', 'error'); pf.style.width = '0%'; }, 3000);
    renderAll();
  } finally { state.isParsing = false; }
}

async function loadAllData() {
  // Prefer combined files (app + toolkit) from output/ directory
  for (const t of TYPES) {
    try { state.currentObjects[t] = await fetchJSON(`output/combined-objects-${t}.json`); } catch (_) {}
  }
  // Fall back to /api/objects (app-only)
  if (Object.keys(state.currentObjects).length === 0) {
    try {
      const r = await fetch('/api/objects');
      if (r.ok) {
        const apiData = await r.json();
        if (Object.keys(apiData).length > 0) { state.currentObjects = apiData; }
      }
    } catch (_) {}
  }
  // Last resort: individual object files
  if (Object.keys(state.currentObjects).length === 0) {
    for (const t of TYPES) {
      try { state.currentObjects[t] = await fetchJSON(`objects-${t}.json`); } catch (_) {}
    }
  }
  // Load summary
  try { state.summaryData = await fetchJSON('output/twx-summary.json'); } catch (_) {}
  // Load metadata
  try { state.metadata = await fetchJSON('output/metadata.json'); } catch (_) {}
  // Load dependencies (root-level for static serving)
  try { state.dependencies = await fetchJSON('dependencies.json'); } catch (_) {}
}

async function performServerSearch(term) {
  const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
  if (!r.ok) throw new Error(`Search failed: ${r.status}`);
  return r.json();
}

function performClientSearch(term) {
  const results = [];
  const lower = term.toLowerCase();
  for (const [type, data] of Object.entries(state.currentObjects)) {
    if (!data || !data.objects) continue;
    for (const obj of data.objects) {
      if (!state.searchIncludeToolkits && obj.source === 'toolkit') continue;
      const matches = [];
      if (obj.name && obj.name.toLowerCase().includes(lower)) matches.push({ field: 'name', snippet: obj.name });
      if (obj.details) {
        ['scripts', 'inlineScripts'].forEach(k => {
          (obj.details[k] || []).forEach(s => {
            const text = s.script || s.scriptBlock || '';
            if (text.toLowerCase().includes(lower)) matches.push({ field: k === 'scripts' ? 'script' : 'inlineScript', value: s.name, snippet: snippet(text, term) });
          });
        });
        if (obj.details.variables) {
          ['input', 'output', 'private'].forEach(vt => {
            (obj.details.variables[vt] || []).forEach(v => {
              if (v.name && v.name.toLowerCase().includes(lower)) matches.push({ field: 'variable', value: `${vt}: ${v.name}`, snippet: v.name });
            });
          });
        }
        if (obj.details.schema && obj.details.schema.properties) {
          obj.details.schema.properties.forEach(p => {
            if (p.name && p.name.toLowerCase().includes(lower)) matches.push({ field: 'property', value: p.name, snippet: `${p.name} (${p.type})` });
          });
        }
        if (obj.details.loadJsFunction && obj.details.loadJsFunction.toLowerCase().includes(lower)) {
          matches.push({ field: 'loadJsFunction', snippet: snippet(obj.details.loadJsFunction, term) });
        }
      }
      if (obj.id && obj.id.toLowerCase().includes(lower)) matches.push({ field: 'id', snippet: obj.id });
      if (matches.length > 0) {
        results.push({ objectId: obj.id, objectName: obj.name, objectType: obj.type || type, typeName: obj.typeName || type, source: obj.source || 'application', toolkitInfo: obj.toolkitInfo, matches, matchCount: matches.length, preview: matches[0].snippet });
      }
    }
  }
  return results;
}

function snippet(text, term) {
  if (!text || !term) return '';
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text.substring(0, 100) + '...';
  const s = Math.max(0, idx - 50), e = Math.min(text.length, idx + term.length + 50);
  let snip = text.substring(s, e);
  if (s > 0) snip = '...' + snip;
  if (e < text.length) snip += '...';
  return snip;
}

function highlightTerm(text, term) {
  if (!term) return esc(text);
  return esc(text).replace(new RegExp(`(${escRe(term)})`, 'gi'), '<span class="highlight">$1</span>');
}

// ── Render: Sidebar ───────────────────────────────────────────
function renderSidebar() {
  const nav = $('sidebar-nav');
  const tabs = [
    { section: 'BROWSE', items: [
      { id: 'summary', label: 'Summary', icon: I.summary },
      { id: 'byType', label: 'By Type', icon: I.byType },
      { id: 'toolkits', label: 'Toolkits', icon: I.toolkits },
    ]},
    { section: 'ANALYZE', items: [
      { id: 'search', label: 'Search', icon: I.search },
      { id: 'deps', label: 'Dependencies', icon: I.deps },
    ]},
    { section: 'APP', items: [
      { id: 'settings', label: 'Settings', icon: I.settings },
    ]},
  ];
  nav.innerHTML = tabs.map(g => `
    <div class="nav-section-label">${g.section}</div>
    ${g.items.map(t => `<button class="nav-item${state.activeTab===t.id?' active':''}" data-tab="${t.id}">${t.icon}<span>${t.label}</span></button>`).join('')}
  `).join('');
}

// ── Render: Topbar ────────────────────────────────────────────
function renderTopbar() {
  const parsed = state.parsedFile;
  $('topbar-title').innerHTML = parsed
    ? esc(parsed.name)
    : '<button class="btn btn-primary" id="topbar-upload-btn" style="height:28px;font-size:13px">Upload .twx</button>';
  $('topbar-subtitle').textContent = parsed
    ? `${parsed.count} objects parsed`
    : 'Upload a .twx file to begin';

}

// ── Render: Content ───────────────────────────────────────────
function hasData() { return Object.keys(state.currentObjects).length > 0; }

function renderContent() {
  const el = $('content');
  if (!hasData() && state.activeTab !== 'search' && state.activeTab !== 'deps' && state.activeTab !== 'settings') {
    el.innerHTML = viewGlobalEmpty(); return;
  }
  switch (state.activeTab) {
    case 'summary': el.innerHTML = viewSummary(); break;
    case 'byType': el.innerHTML = viewByType(); setupByTypeListeners(); break;
    case 'toolkits': el.innerHTML = viewToolkits(); break;
    case 'search': el.innerHTML = viewSearch(); break;
    case 'deps': el.innerHTML = viewDeps(); break;
    case 'settings': el.innerHTML = viewSettings(); break;
    default: el.innerHTML = viewEmptyState('Select a tab from the sidebar.');
  }
}

function viewGlobalEmpty() {
  return `<div class="upload-zone" style="max-width:400px;margin:60px auto;">
    ${I.cloud}
    <div class="empty-state-heading">No TWX file loaded</div>
    <div class="empty-state-caption">Upload a .twx file to browse its objects</div>
    <button class="btn btn-primary btn-large" id="upload-btn-main" ${state.isParsing?'disabled':''}>${state.isParsing?'Parsing…':'Upload .twx'}</button>
    ${state.parseError ? `<div class="error-message" style="margin-top:12px;justify-content:center;">Parse failed: ${esc(state.parseError)} <a class="link" id="retry-upload">Retry</a></div>` : ''}
  </div>`;
}

function viewEmptyState(msg, icon) {
  return `<div class="empty-state">${icon || I.empty}<p class="empty-state-caption">${msg || 'Nothing to show here yet.'}</p></div>`;
}

// ── Summary Tab ────────────────────────────────────────────────
function viewSummary() {
  if (!hasData()) return viewEmptyState('No data available. Parse a .twx file to begin.');
  if (!state.summaryData && Object.keys(state.currentObjects).length === 0) {
    return `<div class="kpi-grid">${Array(4).fill('<div class="kpi-card skeleton skeleton-card"></div>').join('')}</div>`;
  }
  const stats = state.summaryData ? state.summaryData.statistics || state.summaryData : {};
  const kpis = [
    { label: 'Total Objects', value: stats.totalObjects || countAllObjects().total, delta: 'Across all types' },
    { label: 'Application Objects', value: stats.applicationObjects || countAllObjects().app, delta: 'Application scope' },
    { label: 'Toolkit Objects', value: stats.toolkitObjects || countAllObjects().toolkit, delta: 'From toolkits' },
    { label: 'Object Types', value: stats.objectTypes || TYPES.filter(t => state.currentObjects[t]).length, delta: `${stats.toolkits || countToolkits() || 0} toolkits` },
  ];
  const recentObjects = getRecentObjects(8);
  return `
    <div class="kpi-grid">${kpis.map(k => `<div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div><div class="kpi-delta">${k.delta}</div></div>`).join('')}</div>
    <div class="card">
      <div class="card-header"><span class="card-title">Recent Objects</span><a class="link" data-nav="byType">View all →</a></div>
      <table><thead><tr><th>Name</th><th>Type</th><th>Source</th><th>ID</th><th class="num">Version</th></tr></thead>
      <tbody>${recentObjects.map(o => `<tr class="clickable-row" data-obj-id="${esc(o.id)}" data-obj-type="${esc(o.type)}"><td class="col-name">${esc(o.name||'Unnamed')}</td><td class="col-type">${esc(o.typeName||getDisplayName(o.type))}</td><td>${sourceBadge(o)}</td><td class="col-id">${esc((o.id||'').substring(0,40))}</td><td class="col-num">${esc(o.versionId||'')}</td></tr>`).join('')}</tbody></table>
    </div>`;
}

function countAllObjects() {
  let total = 0, app = 0, tk = 0;
  for (const d of Object.values(state.currentObjects)) {
    if (!d || !d.objects) continue;
    d.objects.forEach(o => { total++; if (o.source === 'toolkit') tk++; else app++; });
  }
  return { total, app, toolkit: tk };
}

function countToolkits() {
  const set = new Set();
  for (const d of Object.values(state.currentObjects)) {
    if (!d || !d.objects) continue;
    d.objects.forEach(o => { if (o.toolkitInfo && o.toolkitInfo.shortName) set.add(o.toolkitInfo.shortName); });
  }
  return set.size;
}

function getRecentObjects(n) {
  const all = [];
  for (const d of Object.values(state.currentObjects)) {
    if (!d || !d.objects) continue;
    all.push(...d.objects.map(o => ({ ...o, type: o.type || d.type })));
  }
  return all.slice(0, n);
}

function sourceBadge(o) {
  if (o.source === 'toolkit' && o.toolkitInfo) return `<span class="source-badge toolkit">${esc(o.toolkitInfo.shortName)}</span>`;
  return `<span class="source-badge app">APP</span>`;
}

// ── By Type Tab ───────────────────────────────────────────────
function viewByType() {
  if (!hasData()) return viewEmptyState('No object types found. Parse a .twx file to see types.');
  const types = TYPES.filter(t => state.currentObjects[t]);
  return `
    <div class="by-type-layout">
      <div class="by-type-section-2">
        <div class="section-2-header">
          <span class="section-2-header-title">TYPES</span>
          <label class="toolkit-toggle-label" id="toolkit-toggle">
            <span class="toggle-switch${state.toolkitToggle?' on':''}"></span>
            Include toolkits
          </label>
        </div>
        <div class="type-accordion">
          ${types.map(t => {
            const data = state.currentObjects[t];
            const counts = getTypeCounts(data);
            const isExpanded = state.byTypeExpanded === t;
            const chevron = isExpanded ? '▾' : '▸';
            let childrenHtml = '';
            if (isExpanded) {
              const objects = getFilteredObjects(data.objects);
              if (objects.length === 0) {
                childrenHtml = `<div class="type-accordion-children"><div class="accordion-item-row empty" style="color:var(--text-secondary);cursor:default;font-style:italic">No objects in this type</div></div>`;
              } else {
                childrenHtml = `<div class="type-accordion-children">
                  ${objects.map(o => `<div class="accordion-item-row${state.byTypeSelectedItem && state.byTypeSelectedItem.object.id === o.id ? ' selected' : ''}" data-obj-id="${esc(o.id)}" data-obj-type="${t}">
                    <span class="accordion-item-name">${esc(o.name||'Unnamed')}</span>
                    ${sourceBadge(o)}
                    <span class="accordion-item-id">${esc((o.id||'').substring(0,30))}</span>
                  </div>`).join('')}
                </div>`;
              }
            }
            return `<div class="type-accordion-item">
              <div class="type-accordion-header" data-type="${t}">
                <span class="type-accordion-chevron${isExpanded?' open':''}">${chevron}</span>
                <span class="type-accordion-name">${getDisplayName(t)}</span>
                <span class="type-accordion-count">${state.toolkitToggle && counts.app > 0 && counts.toolkit > 0
                  ? `${counts.app} <span class="badge-sm badge-app">APP</span> <span class="badge-sm badge-tk">+${counts.toolkit}</span>`
                  : counts.total}</span>
              </div>
              ${childrenHtml}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="by-type-section-3" id="by-type-section-3">
        ${state.byTypeSelectedItem ? renderSection3(state.byTypeSelectedItem.object, state.byTypeSelectedItem.type) : `
        <div class="section-3-empty">
          ${I.box}
          <p class="empty-state-caption">Select an item to view its details</p>
        </div>`}
      </div>
    </div>`;
}

function renderSection3(obj, type) {
  const tabs = [];
  tabs.push({ id: 'info', label: 'Info' });
  if (obj.details) {
    if (obj.details.variables) tabs.push({ id: 'variables', label: 'Variables' });
    if (Array.isArray(obj.details.scripts) && obj.details.scripts.length > 0 || (obj.details.scripts && !Array.isArray(obj.details.scripts) && (obj.details.scripts.loadJsFunction || obj.details.scripts.unloadJsFunction || obj.details.scripts.viewJsFunction || obj.details.scripts.changeJsFunction || obj.details.scripts.collaborationJsFunction || obj.details.scripts.validateJsFunction || (Array.isArray(obj.details.scripts.inlineScripts) && obj.details.scripts.inlineScripts.length > 0))) || (obj.details.inlineScripts && obj.details.inlineScripts.length > 0) || obj.details.loadJsFunction) tabs.push({ id: 'scripts', label: 'Scripts' });
    if (obj.details.elements) tabs.push({ id: 'elements', label: 'Elements' });
    if (obj.details.schema) tabs.push({ id: 'schema', label: 'Schema' });
  }
  let bodyHtml = '';
  switch (state.byTypeSection3SubTab) {
    case 'info': bodyHtml = drawInfo(obj); break;
    case 'variables': bodyHtml = drawVariables(obj); break;
    case 'scripts': bodyHtml = drawScripts(obj); break;
    case 'elements': bodyHtml = drawElements(obj); break;
    case 'schema': bodyHtml = drawSchema(obj); break;
    default: bodyHtml = viewEmptyMsg('Select a tab above.');
  }
  return `
    <div class="section-3-header">
      <div class="section-3-header-info">
        <span class="section-3-name">${esc(obj.name||'Unnamed')}</span>
        <span class="badge-sm badge-app">${esc(obj.typeName||getDisplayName(type))}</span>
      </div>
      <button class="section-3-close" data-action="close-section-3" aria-label="Close">&times;</button>
    </div>
    <div class="section-3-subnav">
      ${tabs.map(t => `<button class="section-3-subnav-btn${state.byTypeSection3SubTab===t.id?' active':''}" data-section3-subtab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div class="section-3-body">${bodyHtml}</div>`;
}

function setupByTypeListeners() {
  const toggle = $('toolkit-toggle');
  if (toggle) toggle.onclick = () => { state.toolkitToggle = !state.toolkitToggle; renderAll(); };
}

// ── Toolkits Tab ──────────────────────────────────────────────
function getToolkitList() {
  const tkMap = {};
  for (const d of Object.values(state.currentObjects)) {
    if (!d || !d.objects) continue;
    d.objects.forEach(o => {
      if (o.source === 'toolkit' && o.toolkitInfo) {
        const key = o.toolkitInfo.shortName || o.toolkitInfo.name || 'Unknown';
        if (!tkMap[key]) tkMap[key] = { ...o.toolkitInfo, count: 0 };
        tkMap[key].count++;
      }
    });
  }
  return Object.values(tkMap);
}

function getToolkitObjects(shortName) {
  const result = {};
  for (const [type, data] of Object.entries(state.currentObjects)) {
    if (!data || !data.objects) continue;
    const matches = data.objects.filter(o => o.source === 'toolkit' && o.toolkitInfo && o.toolkitInfo.shortName === shortName);
    if (matches.length > 0) result[type] = matches;
  }
  return result;
}

function viewToolkits() {
  if (!hasData()) return viewEmptyState('No data available. Parse a .twx file to see toolkits.');
  const toolkits = getToolkitList();
  if (toolkits.length === 0) return viewEmptyState('This TWX file has no embedded toolkits. Toolkits are separate TWX packages that this app depends on. Upload a toolkit TWX to see it here.', I.box);
  return `
    <div class="toolkits-layout">
      <div class="toolkits-section-2">
        ${renderToolkitsSection2(toolkits)}
      </div>
      <div class="toolkits-section-3" id="toolkits-section-3">
        ${renderToolkitsSection3()}
      </div>
    </div>`;
}

function renderToolkitsSection2(toolkits) {
  // Level 0: toolkit list (all expanded by default)
  if (state.toolkitsLevel === 0 || !state.toolkitsSelectedToolkit) {
    return `<div class="toolkits-section-header">TOOLKITS</div>
      ${toolkits.map(t => `<div class="toolkit-row" data-toolkit="${esc(t.shortName||'')}">
        <span class="toolkit-row-chevron">${I.chevronDown}</span>
        <span class="toolkit-row-name" title="${esc(t.name||'')}">${esc(t.shortName||t.name||'Unknown')}</span>
        <span class="toolkit-row-version">${esc(t.version||'')}</span>
        <span class="toolkit-row-count">${t.count} objects</span>
      </div>`).join('')}`;
  }

  // Level 1 / 2: types in selected toolkit
  const tkObjects = getToolkitObjects(state.toolkitsSelectedToolkit);
  const types = Object.keys(tkObjects).sort();
  if (types.length === 0) return `<a class="toolkit-back-link" data-toolkit-back="true">\u25C0 Back to toolkits</a><div class="toolkits-section-header">TYPES in ${esc(state.toolkitsSelectedToolkit)}</div><div class="empty-state" style="padding:40px 12px"><p class="empty-state-caption">No objects found in this toolkit.</p></div>`;

  let html = `<a class="toolkit-back-link" data-toolkit-back="true">\u25C0 Back to toolkits</a>
    <div class="toolkits-section-header">TYPES in ${esc(state.toolkitsSelectedToolkit)}</div>`;

  types.forEach(type => {
    const items = tkObjects[type];
    const isExpanded = state.toolkitsExpandedType === type;
    html += `<div class="toolkit-type-row${isExpanded ? ' expanded' : ''}" data-toolkit-type="${esc(type)}">
      <span class="toolkit-type-chevron${isExpanded ? ' expanded' : ''}">${isExpanded ? I.chevronDown : I.chevronRight14}</span>
      <span class="toolkit-type-name">${getDisplayName(type)}</span>
      <span class="toolkit-type-count">${items.length}</span>
    </div>`;
    if (isExpanded) {
      html += `<div class="toolkit-items">
        ${items.map(obj => `<div class="toolkit-item-row" data-toolkit-item-json="${esc(JSON.stringify({id: obj.id, type: type}))}">
          <span class="toolkit-item-name">${esc(obj.name || 'Unnamed')}</span>
          <span class="toolkit-item-id">${esc((obj.id || '').substring(0, 35))}</span>
        </div>`).join('')}
      </div>`;
    }
  });
  return html;
}

function renderToolkitsSection3() {
  if (!state.toolkitsSection3Object) {
    return `<div class="empty-state" style="padding:80px 24px">
      <p class="empty-state-caption">Select a toolkit, then a type to view objects</p>
    </div>`;
  }
  const ref = state.toolkitsSection3Object;
  const data = state.currentObjects[ref.type];
  const obj = data && data.objects ? data.objects.find(o => o.id === ref.id) : null;
  if (!obj) return viewEmptyMsg('Object not found.');
  return renderSection3Details(obj);
}

function renderSection3Details(obj) {
  const subTab = state.toolkitsSection3SubTab || 'info';
  return `
    <div class="section-3-header">
      <div class="section-3-header-info">
        <span class="section-3-name">${esc(obj.name || 'Unnamed Object')}</span>
        <span class="badge-sm badge-app">${esc(obj.typeName || getDisplayName(obj.type))}</span>
        <span class="col-id">${esc((obj.id || '').substring(0, 45))}</span>
        <span class="section-3-meta-line">${esc(obj.versionId || '')}</span>
      </div>
    </div>
    <div class="section-3-subnav">
      ${renderSection3SubNav(obj)}
    </div>
    <div class="section-3-body">
      ${renderSection3Body(obj)}
    </div>`;
}

function renderSection3SubNav(obj) {
  const tabs = [{ id: 'info', label: 'Info' }];
  if (obj.details) {
    if (obj.details.variables) tabs.push({ id: 'variables', label: 'Variables' });
    if (Array.isArray(obj.details.scripts) && obj.details.scripts.length > 0 || (obj.details.scripts && !Array.isArray(obj.details.scripts) && (obj.details.scripts.loadJsFunction || obj.details.scripts.unloadJsFunction || obj.details.scripts.viewJsFunction || obj.details.scripts.changeJsFunction || obj.details.scripts.collaborationJsFunction || obj.details.scripts.validateJsFunction || (Array.isArray(obj.details.scripts.inlineScripts) && obj.details.scripts.inlineScripts.length > 0))) || (obj.details.inlineScripts && obj.details.inlineScripts.length > 0) || obj.details.loadJsFunction) tabs.push({ id: 'scripts', label: 'Scripts' });
    if (obj.details.elements) tabs.push({ id: 'elements', label: 'Elements' });
    if (obj.details.schema) tabs.push({ id: 'schema', label: 'Schema' });
  }
  return tabs.map(t => `<button class="section-3-subnav-btn${state.toolkitsSection3SubTab === t.id ? ' active' : ''}" data-toolkits-subtab="${t.id}">${t.label}</button>`).join('');
}

function renderSection3Body(obj) {
  switch (state.toolkitsSection3SubTab) {
    case 'info': return drawInfo(obj);
    case 'variables': return drawVariables(obj);
    case 'scripts': return drawScripts(obj);
    case 'elements': return drawElements(obj);
    case 'schema': return drawSchema(obj);
    default: return '';
  }
}

// ── Search Tab ─────────────────────────────────────────────────
function viewSearch() {
  return `
    <div class="search-toggle-row">
      <label class="toolkit-toggle-label" id="search-toolkit-toggle-label">
        <span class="toggle-switch${state.searchIncludeToolkits?' on':''}" id="search-toolkit-toggle"></span>
        Include toolkits in search
      </label>
    </div>
    <div class="search-tab-input-area">
      <input type="text" class="search-tab-input" id="search-input" placeholder="Enter search term (e.g., variable name, function name)…" value="${esc(state.searchTerm)}">
      <button class="btn btn-primary btn-large" id="search-btn" ${state.searchLoading?'disabled':''}>${state.searchLoading?'Searching…':'Search'}</button>
      <button class="btn btn-secondary btn-large" id="search-clear" ${state.searchLoading?'disabled':''}>Clear</button>
    </div>
    <div id="search-results-area">
      ${state.searchLoading ? searchSkeletons() :
        (state.searchResults.length > 0 ? viewSearchResults() : 
         (state.searchTerm && state.searchSearched ? viewEmptyState(`No results found for "${esc(state.searchTerm)}".`, I.empty) :
          viewEmptyState('Type a term above to search across all objects.', I.empty)))}
    </div>`;
}

function searchSkeletons() {
  return Array(5).fill('<div class="card" style="padding:16px;margin-bottom:8px"><div class="skeleton skeleton-bar" style="width:40%;height:14px"></div><div class="skeleton skeleton-bar" style="width:80%;height:12px"></div><div class="skeleton skeleton-bar" style="width:60%;height:12px"></div></div>').join('');
}

function viewSearchResults() {
  return `<div style="margin-bottom:12px;font-size:13px;color:var(--text-secondary)">Found <strong>${state.searchResults.length}</strong> results for "<strong>${esc(state.searchTerm)}</strong>"</div>
    ${state.searchResults.map(r => `<div class="search-result-card" data-search-obj-id="${esc(r.objectId)}">
      <div class="search-result-header">
        <span class="search-result-name">${esc(r.objectName||'Unnamed')}</span>
        ${sourceBadge(r)}
        <span class="badge-sm badge-app">${esc(r.typeName||getDisplayName(r.objectType))}</span>
        <span class="search-result-count">${r.matchCount} match${r.matchCount!==1?'es':''}</span>
      </div>
      <div class="search-result-snippet">${highlightTerm(r.preview, state.searchTerm)}</div>
    </div>`).join('')}`;
}

// ── Dependencies Tab ──────────────────────────────────────────
function viewDeps() {
  const depsRaw = state.dependencies;
  const deps = Array.isArray(depsRaw) ? depsRaw : (depsRaw?.dependencies || []);
  if (deps.length === 0) return viewEmptyState('No toolkit dependencies in this TWX file.', I.deps);
  return `<div class="card">
    <div class="card-header"><span class="card-title">Dependencies</span><span style="color:var(--text-secondary);font-size:12px">${deps.length} found</span></div>
    <table><thead><tr><th>Name</th><th>Short Name</th><th>Version</th><th style="width:60px"></th></tr></thead>
    <tbody>${deps.map(d => `<tr>
      <td class="col-name" title="${esc(d.id||'')}">${esc(d.name||'Unknown')}</td>
      <td class="col-id">${esc(d.shortName||'')}</td>
      <td class="col-id">${esc(d.version||'')}</td>
      <td><a class="link" data-dep-id="${esc(d.shortName||d.name)}">View toolkit →</a></td>
    </tr>`).join('')}</tbody></table>
  </div>`;
}
function viewSettings() {
  return `<div class="settings-group">
    <div class="settings-group-title">Preferences</div>
    <div class="setting-row"><div><div class="setting-label">Theme</div><div class="setting-desc">Currently only light mode is available.</div></div><span style="font-size:12px;color:var(--text-secondary)">Light</span></div>
    <div class="setting-row"><div><div class="setting-label">Toolkit objects</div><div class="setting-desc">Show toolkit objects by default.</div></div>
    <label class="toolkit-toggle-label"><span class="toggle-switch${state.toolkitToggle?' on':''}" id="settings-toolkit-toggle"></span></label></div>
  </div>
  <div class="error-message" style="justify-content:center;"><span>Settings are stored locally per session.</span></div>`;
}

// ── Drawer ─────────────────────────────────────────────────────
function openDrawer(object, subTab) {
  state.drawerObject = object;
  state.drawerOpen = true;
  state.drawerSubTab = subTab || 'info';
  $('drawer-overlay').classList.add('open');
  $('drawer').classList.add('open');
  renderDrawer();
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  state.drawerOpen = false;
  $('drawer-overlay').classList.remove('open');
  $('drawer').classList.remove('open');
  document.body.style.overflow = '';
  renderAll();
}

function renderDrawer() {
  const obj = state.drawerObject;
  if (!obj) return;
  $('drawer-name').textContent = obj.name || 'Unnamed Object';
  $('drawer-meta').innerHTML = `<span class="badge-sm badge-app">${esc(obj.typeName||getDisplayName(obj.type))}</span> · <span class="col-id">${esc((obj.id||'').substring(0, 45))}</span> · ${esc(obj.versionId||'')}`;
  renderDrawerSubNav(obj);
  renderDrawerBody(obj);
}

function renderDrawerSubNav(obj) {
  const tabs = [{ id: 'info', label: 'Info' }];
  if (obj.details) {
    if (obj.details.variables) tabs.push({ id: 'variables', label: 'Variables' });
    if (Array.isArray(obj.details.scripts) && obj.details.scripts.length > 0 || (obj.details.scripts && !Array.isArray(obj.details.scripts) && (obj.details.scripts.loadJsFunction || obj.details.scripts.unloadJsFunction || obj.details.scripts.viewJsFunction || obj.details.scripts.changeJsFunction || obj.details.scripts.collaborationJsFunction || obj.details.scripts.validateJsFunction || (Array.isArray(obj.details.scripts.inlineScripts) && obj.details.scripts.inlineScripts.length > 0))) || (obj.details.inlineScripts && obj.details.inlineScripts.length > 0) || obj.details.loadJsFunction) tabs.push({ id: 'scripts', label: 'Scripts' });
    if (obj.details.elements) tabs.push({ id: 'elements', label: 'Elements' });
    if (obj.details.schema) tabs.push({ id: 'schema', label: 'Schema' });
  }
  $('drawer-subnav').innerHTML = tabs.map(t => `<button class="drawer-subnav-btn${state.drawerSubTab===t.id?' active':''}" data-subtab="${t.id}">${t.label}</button>`).join('');
}

function renderDrawerBody(obj) {
  const el = $('drawer-body');
  switch (state.drawerSubTab) {
    case 'info': el.innerHTML = drawInfo(obj); break;
    case 'variables': el.innerHTML = drawVariables(obj); break;
    case 'scripts': el.innerHTML = drawScripts(obj); break;
    case 'elements': el.innerHTML = drawElements(obj); break;
    case 'schema': el.innerHTML = drawSchema(obj); break;
    default: el.innerHTML = '';
  }
}

// ── Drawer: Info ──────────────────────────────────────────────
function drawInfo(obj) {
  let rows = [
    ['Name', obj.name || 'N/A'],
    ['ID', obj.id || 'N/A', true],
    ['Version ID', obj.versionId || 'N/A', true],
    ['Type', getDisplayName(obj.type || '') || obj.typeName || 'N/A'],
  ];
  if (obj.subType) rows.push(['Sub Type', obj.subType]);
  if (obj.details) {
    if (obj.details.displayName) rows.push(['Display Name', obj.details.displayName]);
    if (obj.details.description) rows.push(['Description', obj.details.description]);
  }
  rows.push(['Source', obj.source === 'toolkit' ? 'TOOLKIT' : 'APP']);
  if (obj.source === 'toolkit' && obj.toolkitInfo) {
    rows.push(['Toolkit Name', obj.toolkitInfo.name], ['Toolkit Short Name', obj.toolkitInfo.shortName], ['Toolkit ID', obj.toolkitInfo.id], ['Toolkit File', obj.toolkitInfo.fileName]);
    if (obj.toolkitInfo.isSystem) rows.push(['System Toolkit', 'Yes']);
  }
  return `<table class="info-table">${rows.map(([k,v,mono]) => `<tr><td>${esc(k)}</td><td${mono?' style="font-family:var(--font-mono);font-size:12px"':''}>${esc(v)}</td></tr>`).join('')}</table>`;
}

// ── Drawer: Variables ─────────────────────────────────────────
function drawVariables(obj) {
  if (!obj.details || !obj.details.variables) return viewEmptyMsg('No variables defined.');
  const v = obj.details.variables;
  const type = obj.type || '';
  const useBox = type === 'cshs' || type === 'process';
  let html = '';
  const sections = [
    { key: 'input', label: 'Input Variables' },
    { key: 'output', label: 'Output Variables' },
    { key: 'private', label: 'Private Variables' },
  ];
  for (const s of sections) {
    const vars = v[s.key];
    if (!vars || vars.length === 0) continue;
    html += `<div class="detail-section"><div class="detail-section-title">${s.label}</div>`;
    if (useBox) {
      html += `<div class="var-boxes">${vars.map(vr => `<div class="var-box"><span class="var-box-dot${vr.hasDefault?' has-default':''}"></span><span class="var-box-name">${esc(vr.name||'unnamed')}</span></div>`).join('')}</div>`;
    } else {
      html += `<table class="variables-table"><thead><tr><th>Name</th><th>Type</th><th>Default</th></tr></thead><tbody>${vars.map(vr => `<tr><td style="font-weight:500">${esc(vr.name||'unnamed')}</td><td>${esc(vr.type||'')}</td><td>${vr.hasDefault?'✓':'—'}</td></tr>`).join('')}</tbody></table>`;
    }
    html += '</div>';
  }
  return html || viewEmptyMsg('No variables defined.');
}

// ── Drawer: Scripts ────────────────────────────────────────────
function drawScripts(obj) {
  if (!obj.details) return viewEmptyMsg('No scripts found.');
  const scripts = obj.details.scripts;

  // Coach View: new data shape — scripts object with 6 JS function fields + inlineScripts
  if (scripts && !Array.isArray(scripts)) {
    const fnDefs = [
      { key: 'loadJsFunction', label: 'LOAD' },
      { key: 'unloadJsFunction', label: 'UNLOAD' },
      { key: 'viewJsFunction', label: 'VIEW' },
      { key: 'changeJsFunction', label: 'CHANGE' },
      { key: 'collaborationJsFunction', label: 'COLLABORATION' },
      { key: 'validateJsFunction', label: 'VALIDATE' },
    ];
    const nonEmpty = fnDefs.filter(f => scripts[f.key] && scripts[f.key].trim());

    let html = '';

    // Section A — JS Functions
    html += '<div class="detail-section"><div class="detail-section-title">JS Functions</div>';
    if (nonEmpty.length === 0) {
      html += viewEmptyMsg('No JS functions');
    } else {
      html += nonEmpty.map((f, i) => {
        const id = `jsfn-${i}`;
        const escaped = esc(scripts[f.key]).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return `<div class="js-function-card">
          <div class="script-block-header" data-script-id="${id}">
            <span class="js-function-label">${f.label}</span>
            <span class="script-block-chevron">${I.chevron}</span>
          </div>
          <div class="script-block-body"><div class="code-block">${escaped}</div></div>
        </div>`;
      }).join('');
    }
    html += '</div>';

    // Section B — Inline Scripts (from layout)
    if (Array.isArray(scripts.inlineScripts) && scripts.inlineScripts.length > 0) {
      html += '<div class="script-section-divider"></div>';
      html += `<div class="detail-section"><div class="detail-section-title">Inline Scripts (${scripts.inlineScripts.length})</div>`;
      html += scripts.inlineScripts.map((s, i) => {
        const id = `inline-${i}`;
        const escaped = esc(s.script || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return `<div class="inline-script-card">
          <div class="script-block-header" data-script-id="${id}">
            <span class="script-block-name">${esc(s.context || `Inline ${i + 1}`)}</span>
            <span class="script-block-chevron">${I.chevron}</span>
          </div>
          <div class="script-block-body"><div class="code-block">${escaped}</div></div>
        </div>`;
      }).join('');
      html += '</div>';
    }

    return html;
  }

  // Legacy: array-based scripts (non-Coach View)
  let html = '';
  if (Array.isArray(scripts)) {
    scripts.forEach((s, i) => { html += scriptBlock(`script-${i}`, s.name || `Script ${i + 1}`, 'JS', s.script); });
  }
  const inline = obj.details.inlineScripts || [];
  inline.forEach((s, i) => {
    html += scriptBlock(`inline-${i}`, s.name || `Inline ${i + 1}`, s.scriptType || 'JS', s.script || s.scriptBlock);
    if (s.preScript && s.preScript.trim()) html += `<div class="sub-code"><div class="sub-code-label">Pre Script</div><div class="code-block">${esc(s.preScript)}</div></div>`;
    if (s.postScript && s.postScript.trim()) html += `<div class="sub-code"><div class="sub-code-label">Post Script</div><div class="code-block">${esc(s.postScript)}</div></div>`;
  });
  if (obj.details.loadJsFunction) {
    html += scriptBlock('loadJs', 'Load JS Function', 'JS', obj.details.loadJsFunction);
  }
  return html || viewEmptyMsg('No scripts found.');
}

function scriptBlock(id, name, type, code) {
  if (!code) return '';
  const escaped = esc(code).replace(/\r\r\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return `<div class="script-block">
    <div class="script-block-header" data-script-id="${id}"><span class="script-block-name">${esc(name)}</span><span class="script-block-type">${esc(type)}</span><span class="script-block-chevron">${I.chevron}</span></div>
    <div class="script-block-body"><div class="code-block">${escaped}</div></div>
  </div>`;
}

// ── Drawer: Elements ──────────────────────────────────────────
function drawElements(obj) {
  if (!obj.details || !obj.details.elements) return viewEmptyMsg('No process elements found.');
  const e = obj.details.elements;
  let html = '';

  // Group order locked: Script Tasks → Form Tasks → Call Activities → Gateways → Events
  // BPD has: scriptTasks, callActivities, exclusiveGateways, events
  // CSHS has: formTasks, scriptTasks, callActivities, exclusiveGateways
  // Service has: scriptTasks only
  const groups = [
    { key: 'scriptTasks', label: 'Script Tasks' },
    { key: 'formTasks', label: 'Form Tasks' },
    { key: 'callActivities', label: 'Call Activities' },
    { key: 'exclusiveGateways', label: 'Gateways' },
    { key: 'events', label: 'Events' },
  ];

  for (const g of groups) {
    const items = e[g.key];
    if (!items || items.length === 0) continue;
    html += `<div class="detail-section"><div class="detail-section-title">▸ ${g.label} (${items.length})</div>`;
    items.forEach((el, i) => {
      const elId = `${g.key}-${i}`;
      html += renderElementCard(elId, el, g.key);
    });
    html += '</div>';
  }

  return html || viewEmptyMsg('No process elements found.');
}

// ponytail: renders a single element card — script body or call target, plus lane/PRE/POST footer
function renderElementCard(id, el, groupKey) {
  const escaped = el.script ? esc(el.script).replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
  let bodyHtml = '';

  if (groupKey === 'callActivities' && el.callsTarget) {
    bodyHtml = `<div class="element-card-body"><span class="element-calls-target">Calls: ${esc(el.callsTarget)}${el.callsTargetType ? ` (${esc(el.callsTargetType)})` : ''}</span></div>`;
  } else if (escaped) {
    bodyHtml = `<div class="element-card-body"><div class="code-block">${escaped}</div></div>`;
  }

  // Footer: lane (BPD/CSHS), PRE, POST — only render lines that have data
  const hasLane = el.lane;
  const hasPre = el.preAssignment && el.preAssignment.trim();
  const hasPost = el.postAssignment && el.postAssignment.trim();

  let footerHtml = '';
  if (hasLane || hasPre || hasPost) {
    footerHtml = '<div class="element-card-footer">';
    if (hasLane) footerHtml += `<div class="element-card-lane">Lane: ${esc(el.lane)}</div>`;
    if (hasPre) {
      const preEsc = esc(el.preAssignment).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      footerHtml += `<div class="element-card-pre"><span class="pre-post-label">PRE:</span> <span class="pre-post-code">${preEsc}</span></div>`;
    }
    if (hasPost) {
      const postEsc = esc(el.postAssignment).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      footerHtml += `<div class="element-card-post"><span class="pre-post-label">POST:</span> <span class="pre-post-code">${postEsc}</span></div>`;
    }
    footerHtml += '</div>';
  }

  return `<div class="element-card">
    <div class="script-block-header" data-script-id="${id}">
      <span class="element-card-header">${esc(el.name || 'Unnamed')}</span>
      <span class="element-row-id">${esc(el.id || '')}</span>
      <span class="script-block-chevron">${I.chevron}</span>
    </div>
    ${bodyHtml}
    ${footerHtml}
  </div>`;
}

// ── Drawer: Schema ────────────────────────────────────────────
function drawSchema(obj) {
  if (!obj.details || !obj.details.schema) return viewEmptyMsg('No schema information available.');
  const s = obj.details.schema;
  let html = '';
  const total = s.properties ? s.properties.length : 0;
  html += `<div class="schema-summary-bar">
    <div class="schema-stat-pill"><span>Total:</span><span>${total}</span></div>
    <div class="schema-stat-pill"><span>System:</span><span>${s.systemTypesCount||0}</span></div>
    <div class="schema-stat-pill"><span>Custom:</span><span>${s.customTypesCount||0}</span></div>
    ${s.namespace ? `<div class="schema-stat-pill"><span>Namespace:</span><span style="font-family:var(--font-mono)">${esc(s.namespace)}</span></div>` : ''}
  </div>`;
  if (s.error) html += `<div class="schema-error-banner">Schema error: ${esc(s.error)}</div>`;
  if (s.properties && s.properties.length > 0) {
    html += s.properties.map((p, i) => propertyRow(p, i, 0)).join('');
  } else {
    html += viewEmptyMsg('No properties defined.');
  }
  return html;
}

function propertyRow(p, idx, depth) {
  const typeCls = p.isSystemType ? 'system' : 'custom';
  let badges = '';
  if (p.required) badges += '<span class="badge badge-required">Required</span>';
  if (p.isArray) badges += '<span class="badge badge-array">Array</span>';
  if (p.hasDefault) badges += '<span class="badge badge-default">Default</span>';
  if (p.circularReference) badges += '<span class="badge badge-circular">Circular</span>';
  if (p.unresolvedReference) badges += '<span class="badge badge-unresolved">Unresolved</span>';

  let extra = '';
  const nestedId = `prop-${depth}-${idx}`;
  if (p.resolvedType && p.resolvedType.resolved && p.resolvedType.properties && p.resolvedType.properties.length > 0) {
    extra = `<span class="resolved-toggle" data-toggle="${nestedId}">▶ ${esc(p.resolvedType.name)} (${p.resolvedType.properties.length} properties)</span>
      <div class="property-nested" id="${nestedId}" style="display:none">${p.resolvedType.properties.map((np, ni) => propertyRow(np, ni, depth + 1)).join('')}</div>`;
  } else if (p.circularReference && p.resolvedType) {
    extra = `<span class="resolved-toggle" data-toggle="${nestedId}">▶ ${esc(p.resolvedType.name)}</span>
      <div class="property-nested" id="${nestedId}" style="display:none"><div class="circular-note">This type references back to itself or an ancestor.</div></div>`;
  } else if (p.unresolvedReference) {
    extra = `<div class="circular-note" style="font-style:normal;background:var(--error-bg);">Type definition not found in current workspace.</div>`;
  }

  return `<div class="property-row" style="margin-left:${depth*20}px">
    <div class="property-row-main"><span class="property-row-name">${esc(p.name)}</span><span class="property-type-badge ${typeCls}">${esc(p.type)}</span>${badges}${extra}</div>
  </div>`;
}

// ── Drawer helpers ────────────────────────────────────────────
function viewEmptyMsg(msg) { return `<div class="empty-state" style="padding:40px 24px"><p class="empty-state-caption">${msg}</p></div>`; }

// ── Event delegation ──────────────────────────────────────────
function setupGlobalListeners() {
  // Sidebar clicks
  $('sidebar-nav').addEventListener('click', e => {
    const btn = e.target.closest('.nav-item');
    if (btn) {
      state.activeTab = btn.dataset.tab;
      state.selectedType = null;
      state.byTypeExpanded = null;
      state.byTypeSelectedItem = null;
      state.drawerOpen = false;
      closeDrawerSilent();
      // ponytail: reset toolkits breadcrumb state on tab switch
      state.toolkitsLevel = 0;
      state.toolkitsSelectedToolkit = null;
      state.toolkitsExpandedType = null;
      state.toolkitsSection3Object = null;
      state.toolkitsSection3SubTab = 'info';
      renderAll();
    }
  });

  // Topbar upload (click title area)
  $('topbar-title').addEventListener('click', () => { if (!state.parsedFile) triggerFileUpload(); });

  // Topbar settings -> switch to settings tab
  $('topbar-settings-btn').addEventListener('click', () => { state.activeTab = 'settings'; renderAll(); });

  // Quick filter
  let filterTimeout;
  $('quick-search').addEventListener('input', e => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => { state.quickFilter = e.target.value; if (state.activeTab === 'byType') renderAll(); }, 300);
  });

  // Content clicks (delegation)
  $('content').addEventListener('click', e => {
    // Navigation links
    const navLink = e.target.closest('[data-nav]');
    if (navLink) { state.activeTab = navLink.dataset.nav; renderAll(); return; }

    // Upload button in global empty state
    if (e.target.closest('#upload-btn-main')) { triggerFileUpload(); return; }
    if (e.target.closest('#retry-upload')) { state.parseError = null; triggerFileUpload(); return; }

    // ── By Type: script block toggles (in Section 3 body) ──────
    const scrHdr = e.target.closest('.script-block-header');
    if (scrHdr) {
      const block = scrHdr.parentElement.querySelector('.script-block-body');
      const chev = scrHdr.querySelector('.script-block-chevron');
      if (block) { block.classList.toggle('open'); chev.classList.toggle('open'); }
      return;
    }
    // ── By Type: property type toggle ─────────────────────────
    const propToggle = e.target.closest('[data-toggle]');
    if (propToggle) {
      const target = document.getElementById(propToggle.dataset.toggle);
      if (target) {
        const isVisible = target.style.display !== 'none';
        target.style.display = isVisible ? 'none' : 'block';
        propToggle.textContent = propToggle.textContent.replace(isVisible ? '▼' : '▶', isVisible ? '▶' : '▼');
      }
      return;
    }

    // ── By Type: accordion type header click ──────────────────
    const accHdr = e.target.closest('.type-accordion-header');
    if (accHdr) {
      state.byTypeExpanded = state.byTypeExpanded === accHdr.dataset.type ? null : accHdr.dataset.type;
      renderAll();
      return;
    }

    // ── By Type: accordion item click ─────────────────────────
    const accItem = e.target.closest('.accordion-item-row');
    if (accItem && accItem.dataset.objId) {
      const objType = accItem.dataset.objType;
      const data = state.currentObjects[objType];
      if (data && data.objects) {
        const obj = data.objects.find(o => o.id === accItem.dataset.objId);
        if (obj) {
          state.byTypeSelectedItem = { type: objType, object: { ...obj, type: objType } };
          state.byTypeSection3SubTab = 'info';
          const savedScrollTop = $('content').scrollTop;
          renderAll();
          $('content').scrollTop = savedScrollTop;
        }
      }
      return;
    }

    // ── By Type: Section 3 close button ──────────────────────
    if (e.target.closest('[data-action="close-section-3"]')) {
      state.byTypeSelectedItem = null;
      renderAll();
      return;
    }

    // ── By Type: Section 3 sub-tab click ─────────────────────
    const s3tab = e.target.closest('[data-section3-subtab]');
    if (s3tab) {
      state.byTypeSection3SubTab = s3tab.dataset.section3Subtab;
      renderAll();
      return;
    }

    // Object clicks (recent objects table)
    const objRow = e.target.closest('[data-obj-id]');
    if (objRow) { const id = objRow.dataset.objId; const obj = findObjectById(id); if (obj) openDrawer(obj.object); return; }

    // Search result clicks
    const sRow = e.target.closest('[data-search-obj-id]');
    if (sRow) { const id = sRow.dataset.searchObjId; const found = findObjectById(id); if (found) openDrawer(found.object, 'scripts'); return; }

    // Toolkit filter link
    const tkLink = e.target.closest('[data-filter-toolkit]');
    if (tkLink) { state.quickFilter = tkLink.dataset.filterToolkit; state.activeTab = 'byType'; renderAll(); return; }

    // Dependency view-toolkit link
    const depLink = e.target.closest('[data-dep-id]');
    if (depLink) { state.quickFilter = depLink.dataset.depId; state.activeTab = 'byType'; renderAll(); return; }

    // Enable toolkits link
    if (e.target.closest('#enable-toolkits-link')) { $('toolkit-toggle').click(); return; }

    // ── Toolkits tab: 3-level breadcrumb drilldown ────────────
    // Toolkit row click (Level 0 → Level 1)
    const tkRow = e.target.closest('[data-toolkit]');
    if (tkRow) {
      state.toolkitsLevel = 1;
      state.toolkitsSelectedToolkit = tkRow.dataset.toolkit;
      state.toolkitsExpandedType = null;
      renderAll();
      return;
    }

    // Toolkit back link (Level 1/2 → Level 0)
    const tkBack = e.target.closest('[data-toolkit-back]');
    if (tkBack) {
      state.toolkitsLevel = 0;
      state.toolkitsSelectedToolkit = null;
      state.toolkitsExpandedType = null;
      renderAll();
      return;
    }

    // Toolkit type row click (Level 1 → Level 2, toggle expand)
    const tkType = e.target.closest('[data-toolkit-type]');
    if (tkType) {
      const type = tkType.dataset.toolkitType;
      state.toolkitsExpandedType = state.toolkitsExpandedType === type ? null : type;
      state.toolkitsLevel = state.toolkitsExpandedType ? 2 : 1;
      renderAll();
      return;
    }

    // Toolkit item click (populate Section 3)
    const tkItem = e.target.closest('[data-toolkit-item-json]');
    if (tkItem) {
      try {
        state.toolkitsSection3Object = JSON.parse(tkItem.dataset.toolkitItemJson);
        state.toolkitsSection3SubTab = 'info';
        const s3 = $('toolkits-section-3');
        if (s3) { s3.innerHTML = renderToolkitsSection3(); s3.scrollTop = 0; }
      } catch (_) {}
      return;
    }

    // Toolkit Section 3 sub-tab click (targeted update)
    const tkSubTab = e.target.closest('[data-toolkits-subtab]');
    if (tkSubTab) {
      state.toolkitsSection3SubTab = tkSubTab.dataset.toolkitsSubtab;
      const s3 = $('toolkits-section-3');
      if (s3) { s3.innerHTML = renderToolkitsSection3(); s3.scrollTop = 0; }
      return;
    }
  });

  // Search tab events
  $('content').addEventListener('click', e => {
    if (e.target.closest('#search-toolkit-toggle')) { state.searchIncludeToolkits = !state.searchIncludeToolkits; renderContent(); return; }
    if (e.target.closest('#search-btn')) { doSearch(); return; }
    if (e.target.closest('#search-clear')) { state.searchTerm = ''; state.searchResults = []; state.searchSearched = false; renderAll(); return; }
  });
  $('content').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'search-input') { doSearch(); return; }
  });

  // Drawer events
  $('drawer-close').addEventListener('click', closeDrawer);
  $('drawer-overlay').addEventListener('click', closeDrawer);
  $('drawer-subnav').addEventListener('click', e => {
    const btn = e.target.closest('.drawer-subnav-btn');
    if (btn) { state.drawerSubTab = btn.dataset.subtab; renderDrawer(); }
  });
  // Drawer body: script toggle + resolved type toggle
  $('drawer-body').addEventListener('click', e => {
    const hdr = e.target.closest('.script-block-header');
    if (hdr) {
      const id = hdr.dataset.scriptId;
      const block = hdr.parentElement.querySelector('.script-block-body');
      const chev = hdr.querySelector('.script-block-chevron');
      if (block) { block.classList.toggle('open'); chev.classList.toggle('open'); }
      return;
    }
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const target = document.getElementById(toggle.dataset.toggle);
      if (target) {
        const isVisible = target.style.display !== 'none';
        target.style.display = isVisible ? 'none' : 'block';
        toggle.textContent = toggle.textContent.replace(isVisible ? '▼' : '▶', isVisible ? '▶' : '▼');
      }
      return;
    }
  });

  // File input
  $('twx-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.twx')) { state.parseError = 'Please select a valid .twx file'; renderAll(); return; }
      state.parseError = null;
      parseFile(file);
    }
  });

  // Topbar upload button (dynamic)
  document.addEventListener('click', e => {
    if (e.target.closest('#topbar-upload-btn')) { triggerFileUpload(); return; }
  });

  // Keyboard: Esc closes drawer
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.drawerOpen) closeDrawer(); });

  // Settings toolkit toggle
  $('content').addEventListener('click', e => {
    if (e.target.closest('#settings-toolkit-toggle')) { state.toolkitToggle = !state.toolkitToggle; renderAll(); }
  });
}

function triggerFileUpload() { if (!state.isParsing) $('twx-file-input').click(); }

function closeDrawerSilent() {
  state.drawerOpen = false;
  $('drawer-overlay').classList.remove('open');
  $('drawer').classList.remove('open');
  document.body.style.overflow = '';
}

async function doSearch() {
  const term = $('search-input').value.trim();
  if (!term) return;
  state.searchTerm = term;
  state.searchSearched = true;
  state.searchResults = [];
  state.searchLoading = true;
  renderContent();
  try {
    let results = await performServerSearch(term);
    if (!results || results.length === 0) results = performClientSearch(term);
    // ponytail: filter server results by source; lookup from state is O(n) per result, optimize with a prebuilt map if result count grows
    if (results && !state.searchIncludeToolkits) {
      results = results.filter(r => {
        const found = findObjectById(r.objectId);
        return !(found && found.object.source === 'toolkit');
      });
    }
    state.searchResults = results || [];
  } catch (_) {
    state.searchResults = performClientSearch(term);
  }
  state.searchLoading = false;
  renderContent();
}

function renderAll() { renderSidebar(); renderTopbar(); renderContent(); }

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupGlobalListeners();
  renderAll();
  try { await loadAllData(); } catch (_) {}
  renderAll();
});
