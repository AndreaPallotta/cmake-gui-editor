(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const byId = id => document.getElementById(id);

  // ── Element refs ──────────────────────────────────────────────────────────
  const projName      = byId('projName');
  const minCMake      = byId('minCMake');
  const cxxStd        = byId('cxxStd');
  const targetSelect  = byId('targetSelect');
  const kindBadge     = byId('kindBadge');
  const linkLibs      = byId('linkLibs');
  const includeDirs   = byId('includeDirs');
  const sourcesList   = byId('sourcesList');
  const srcCount      = byId('srcCount');
  const unsupportedCode = byId('unsupportedCode');
  const applyBtn      = byId('applyBtn');
  const statusMsg     = byId('statusMsg');
  const noTargetState = byId('noTargetState');
  const targetFields  = byId('targetFields');

  // ── State ─────────────────────────────────────────────────────────────────
  let model        = null;
  let chosenTarget = null;
  let origValues   = {};   // snapshot of values at seed/setTarget time

  // ── Dirty tracking ────────────────────────────────────────────────────────
  const FIELDS = [
    { el: projName,    fEl: byId('fProjName'),    key: 'projName'    },
    { el: minCMake,    fEl: byId('fMinCMake'),    key: 'minCMake'    },
    { el: cxxStd,      fEl: byId('fCxxStd'),      key: 'cxxStd'      },
    { el: linkLibs,    fEl: byId('fLinkLibs'),    key: 'linkLibs'    },
    { el: includeDirs, fEl: byId('fIncludeDirs'), key: 'includeDirs' },
  ];

  function snapshot() {
    for (const f of FIELDS) {
      origValues[f.key] = f.el.value;
    }
    updateDirty();
  }

  function updateDirty() {
    let anyDirty = false;
    for (const f of FIELDS) {
      const dirty = f.el.value !== origValues[f.key];
      if (dirty) anyDirty = true;
      if (f.fEl) f.fEl.classList.toggle('dirty', dirty);
    }
    applyBtn.classList.toggle('dirty', anyDirty);
  }

  for (const f of FIELDS) {
    f.el.addEventListener('input',  updateDirty);
    f.el.addEventListener('change', updateDirty);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function currentTarget() {
    return (model?.targets || []).find(x => x.name === chosenTarget);
  }

  let statusTimer = null;
  function showStatus(text, kind = '', duration = 3500) {
    clearTimeout(statusTimer);
    statusMsg.textContent = text;
    statusMsg.className = 'status visible' + (kind ? ' ' + kind : '');
    if (duration > 0) {
      statusTimer = setTimeout(() => statusMsg.classList.remove('visible'), duration);
    }
  }

  function basename(p) {
    return p.replace(/^.*[\\/]/, '');
  }

  function splitFilename(filename) {
    const dot = filename.lastIndexOf('.');
    if (dot <= 0) return { stem: filename, ext: '' };
    return { stem: filename.slice(0, dot), ext: filename.slice(dot) };
  }

  // ── Seed (full model refresh) ─────────────────────────────────────────────
  function seed(m, targets, chosen) {
    model        = m;
    chosenTarget = chosen || (targets && targets[0]) || null;

    projName.value = m.projectName || '';
    minCMake.value = m.minVersion  || '';
    // Bug 3 fix: only set cxxStd to a real value when the file has one,
    // otherwise default to '' ("— unchanged —") so we don't spuriously insert
    // a set(CMAKE_CXX_STANDARD …) block the user didn't ask for.
    cxxStd.value   = m.cxxStandard || '';

    // Rebuild target dropdown
    targetSelect.innerHTML = '';
    if (targets && targets.length > 0) {
      for (const name of targets) {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        if (name === chosenTarget) opt.selected = true;
        targetSelect.appendChild(opt);
      }
      noTargetState.style.display = 'none';
      targetFields.style.display  = 'flex';
    } else {
      noTargetState.style.display = 'flex';
      targetFields.style.display  = 'none';
    }

    setTarget(chosenTarget);

    // Unsupported preview
    const u = (m.unsupportedPreview || '').trim();
    unsupportedCode.textContent = u || 'None 🎉  — all commands in this file are modelled.';

    snapshot();
  }

  // ── Set active target ─────────────────────────────────────────────────────
  function setTarget(name) {
    chosenTarget = name;
    const t = currentTarget();

    // Kind badge
    if (t) {
      kindBadge.textContent  = t.kind === 'executable' ? 'EXECUTABLE' : 'LIBRARY';
      kindBadge.className    = 'badge ' + (t.kind === 'executable' ? 'badge-exe' : 'badge-lib');
    } else {
      kindBadge.textContent = '';
      kindBadge.className   = 'badge badge-none';
    }

    // Source chips
    const srcs = t?.sources || [];
    srcCount.textContent = srcs.length;
    sourcesList.innerHTML = '';
    if (srcs.length) {
      for (const s of srcs) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.title     = s;
        const base = basename(s);
        const { stem, ext } = splitFilename(base);
        chip.innerHTML = `${stem}<span class="chip-ext">${ext}</span>`;
        sourcesList.appendChild(chip);
      }
    } else {
      sourcesList.innerHTML = '<span class="empty-hint">No sources detected in add_executable / add_library</span>';
    }

    // Libs
    linkLibs.value    = (t?.linkLibs    || []).join('\n');
    // Include dirs
    includeDirs.value = (t?.includeDirs || []).join('\n');

    snapshot();
  }

  // ── Extension → webview messages ──────────────────────────────────────────
  window.addEventListener('message', e => {
    const msg = e.data;
    if (!msg) return;
    if (msg.type === 'init') {
      seed(msg.model, msg.targets, msg.chosenTarget);
    }
  });

  // ── Target selector ───────────────────────────────────────────────────────
  targetSelect.addEventListener('change', () => setTarget(targetSelect.value));

  // ── Apply ─────────────────────────────────────────────────────────────────
  applyBtn.addEventListener('click', () => {
    if (!chosenTarget && model?.targets?.length > 0) {
      showStatus('Select a target first.', 'warn');
      return;
    }
    const libs = linkLibs.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const dirs = includeDirs.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const payload = {
      projectName: projName.value.trim()  || undefined,
      minVersion:  minCMake.value.trim()  || undefined,
      cxxStandard: cxxStd.value           || undefined,  // '' means no change
      targetName:  chosenTarget,
      linkLibs:    libs,
      includeDirs: dirs,
    };
    vscode.postMessage({ type: 'apply', payload });
    showStatus('Proposing diff…', '', 0);
  });

})();
