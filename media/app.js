(function(){
  const vscode = acquireVsCodeApi();
  const $ = sel => document.querySelector(sel);

  const projName = $('#projName');
  const minCMake = $('#minCMake');
  const cxxStd   = $('#cxxStd');
  const targetSelect = $('#targetSelect');
  const targetName = $('#targetName');
  const linkLibs = $('#linkLibs');
  const unsupported = $('#unsupported');

  let model = null;
  let chosenTarget = null;

  function seed(m, targets, chosen) {
    model = m;
    chosenTarget = chosen || (targets && targets[0]) || null;

    projName.value = m.projectName || '';
    minCMake.value = m.minVersion || '';
    cxxStd.value = (m.cxxStandard || '17');

    targetSelect.innerHTML = '';
    for (const t of (targets || [])) {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      if (t === chosenTarget) {
        opt.selected = true;
      }
      targetSelect.appendChild(opt);
    }
    setTarget(chosenTarget);

    const u = (m.unsupportedPreview || '').trim();
    unsupported.textContent = u ? u : 'None 🎉';
  }

  function setTarget(name) {
    chosenTarget = name;
    targetName.textContent = name || '(none)';
    const t = (model?.targets || []).find(x => x.name === name);
    linkLibs.value = (t?.linkLibs || []).join('\n');
  }

  window.addEventListener('message', e => {
    if (e.data?.type === 'init') {
      seed(e.data.model, e.data.targets, e.data.chosenTarget);
    }
  });

  targetSelect.addEventListener('change', () => setTarget(targetSelect.value));

  $('#apply').addEventListener('click', () => {
    const libs = linkLibs.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const payload = {
      projectName: projName.value.trim() || undefined,
      minVersion:  minCMake.value.trim() || undefined,
      cxxStandard: cxxStd.value.trim() || undefined,
      targetName:  chosenTarget,
      linkLibs:    libs
    };
    vscode.postMessage({ type: 'apply', payload });
  });
})();
