/* vcf-studio compare controller: up to 4 sources → combined/editable final list. Needs lib.js + ui.js. */
(function (root) {
'use strict';
var L = root.VCFStudio;
var el = function (id) { return document.getElementById(id); };

function initCompare(opts) {
  // opts: {format:'vcf'|'csv', samples:[{name,text}], perPhoneOpt:bool}
  var format = opts.format, MAX = 4;
  var visible = 2; // slots shown side by side; grows via "Add input", never below 2
  var sources = []; // {name, text} or null, index-aligned with slots
  for (var si = 0; si < MAX; si++) sources.push(null);
  var slotsEl = el('slots'), optDedupe = el('optDedupe'), rebuildBtn = el('btnRebuild'),
    cmpMsg = el('cmpMsg'), dst = el('dst'), outBadge = el('outBadge'), outStats = el('outStats'),
    headSel = el('headSel');
  var optPerPhone = el('optPerPhone'); // optional (csv page)
  var outText = '';
  function canonicalOut() {
    var v = dst.value;
    if (outText && outText.replace(/\r\n/g, '\n') === v) return outText;
    return v;
  }

  function setMsg(t, text) { cmpMsg.hidden = false; cmpMsg.className = 'msg ' + t; cmpMsg.textContent = text; }
  function clearMsg() { cmpMsg.hidden = true; cmpMsg.textContent = ''; }

  var table = new ContactTable({
    tbody: el('tbody'), searchBox: el('searchBox'), statsBadge: el('contactStats'),
    selCount: el('selCount'),
    dupBtns: { name: el('dupName'), phone: el('dupPhone') },
    btns: {
      selectAll: el('btnSelectAll'), clearSel: el('btnClearSel'),
      deleteSel: el('btnDelSel'), mergeSel: el('btnMergeSel'), add: el('btnAdd')
    },
    pager: { prev: el('pgPrev'), next: el('pgNext'), info: el('pgInfo'), perPage: el('pgSize') },
    showSource: true,
    emptyText: 'Add sources above to build the combined list.',
    onChange: function () {
      var f = table.filtered();
      headSel.checked = f.length > 0 && f.every(function (c) { return table.selected[c.id]; });
      renderOutput();
    }
  });
  headSel.addEventListener('change', function () { table.selectFiltered(headSel.checked); });

  function renderOutput() {
    var pool = table.getContacts();
    if (!pool.length) {
      dst.value = ''; outText = ''; outBadge.textContent = '—'; outBadge.classList.remove('on'); outStats.textContent = '';
      return;
    }
    try {
      var text = (format === 'vcf')
        ? L.contactsToVCF(pool)
        : L.contactsToCSV(pool, { perPhone: !optPerPhone || optPerPhone.checked });
      dst.value = text; outText = text;
    } catch (e) { setMsg('err', 'Export failed: ' + ((e && e.message) ? e.message : e)); return; }
    outBadge.textContent = format === 'vcf' ? 'vCard 3.0' : 'CSV';
    outBadge.classList.add('on');
    var stats = dst.value.split(/\r\n|\r|\n/).length + ' lines · ' + pool.length + ' contacts';
    if (format === 'csv' && optPerPhone && !optPerPhone.checked) {
      var skipped = pool.reduce(function (n, c) { return n + Math.max(0, (c.phones || []).length - 1); }, 0);
      if (skipped) stats += ' · ' + skipped + ' number' + (skipped > 1 ? 's' : '') + ' omitted';
      outStats.title = '“One row per phone” is off, so contacts with several numbers keep only their first number in the CSV.';
    } else {
      outStats.removeAttribute('title');
    }
    outStats.textContent = stats;
  }

  function flushDrafts() {
    slotsEl.querySelectorAll('[data-ta]').forEach(function (ta) {
      var i = parseInt(ta.getAttribute('data-ta'), 10);
      clearTimeout(slotDeb[i]);
      var v = ta.value;
      var committed = sources[i] ? sources[i].text : '';
      if (v !== committed) updateSource(i, v, sources[i] ? sources[i].name : '');
    });
  }
  function renderSlots() {
    flushDrafts();
    slotsEl.classList.toggle('cols3', visible === 3);
    slotsEl.classList.toggle('cols4', visible >= 4);
    slotsEl.innerHTML = sources.slice(0, visible).map(function (s, i) {
      var fmt = s ? L.detectFormat(s.text) : null;
      var badge = fmt === 'vcf' ? 'vCard' : (fmt === 'csv' ? 'CSV' : 'empty');
      var count = s ? s.count : 0;
      var text = s ? L.esc(s.text) : '';
      return '<div class="slot' + (s ? ' filled' : '') + '" data-slot="' + i + '">'
        + '<h3>Input ' + (i + 1) + ' <span class="badge' + (s ? ' on' : '') + '">' + badge
        + (s ? ' · ' + count : '') + '</span>'
        + '<button class="small ghost x" data-clear="' + i + '" title="Remove this input"' + (s ? '' : ' disabled') + '>&times;</button>'
        + '</h3>'
        + '<textarea class="small" name="slot' + i + '" data-ta="' + i + '" spellcheck="false" placeholder="Paste vCard or CSV here (loads as you type)…">' + text + '</textarea>'
        + '<div class="metarow"><label class="filebtn">&#128193; Choose file<input type="file" name="slotFile' + i + '" data-file="' + i + '" accept=".vcf,.vcard,.csv,.tsv,.txt" hidden></label>'
        + '<span class="muted slotname">' + (s ? L.esc(s.name) : 'empty') + '</span></div>'
        + '</div>';
    }).join('');
    wireSlots();
  }
  function slotEl(i) { return slotsEl.querySelector('[data-slot="' + i + '"]'); }
  function updateSlotChrome(i) {
    var box = slotEl(i); if (!box) return;
    var s = sources[i], fmt = s ? L.detectFormat(s.text) : null;
    var badge = fmt === 'vcf' ? 'vCard' : (fmt === 'csv' ? 'CSV' : 'empty');
    var b = box.querySelector('.badge');
    b.textContent = badge + (s ? ' · ' + s.count : '');
    b.classList.toggle('on', !!s);
    box.classList.toggle('filled', !!s);
    box.querySelector('.slotname').textContent = s ? s.name : 'empty';
    var xb = box.querySelector('[data-clear]');
    if (xb) xb.disabled = !s;
  }
  function updateSource(i, text, name) {
    if (String(text).trim()) sources[i] = { text: text, name: name || ('Input ' + (i + 1)), count: 0 };
    else sources[i] = null;
    updateSlotChrome(i);
    rebuildFinal();
  }
  var slotDeb = {};
  function wireSlots() {
    slotsEl.querySelectorAll('[data-ta]').forEach(function (ta) {
      var i = parseInt(ta.getAttribute('data-ta'), 10);
      ta.addEventListener('input', function () {
        clearTimeout(slotDeb[i]);
        slotDeb[i] = setTimeout(function () { updateSource(i, ta.value, sources[i] ? sources[i].name : ''); }, 350);
      });
    });
    slotsEl.querySelectorAll('[data-file]').forEach(function (fi) {
      var i = parseInt(fi.getAttribute('data-file'), 10);
      fi.addEventListener('change', function () {
        var f = fi.files && fi.files[0];
        fi.value = '';
        if (!f) return;
        var ta = slotsEl.querySelector('[data-ta="' + i + '"]');
        if ((sources[i] || (ta && String(ta.value).trim()))
            && !window.confirm('Input ' + (i + 1) + ' already has data — replace it with ' + f.name + '?')) return;
        readFileInto(i, f);
      });
    });
    slotsEl.querySelectorAll('[data-clear]').forEach(function (x) {
      x.addEventListener('click', function () {
        var i = parseInt(x.getAttribute('data-clear'), 10);
        slotsEl.querySelector('[data-ta="' + i + '"]').value = '';
        updateSource(i, '', '');
        while (visible > 2 && !sources[visible - 1]) visible--;
        renderSlots();
        toast('Input ' + (i + 1) + ' cleared');
      });
    });
  }

  function slotBox(t) {
    while (t && t !== slotsEl) { if (t.classList && t.classList.contains('slot')) return t; t = t.parentNode; }
    return null;
  }
  function readFileInto(i, f) {
    var apply = function (text) {
      var ta = slotsEl.querySelector('[data-ta="' + i + '"]');
      ta.value = text;
      updateSource(i, text, f.name);
      toast('Loaded ' + f.name + ' into input ' + (i + 1));
    };
    if (f.text) f.text().then(apply);
    else { var r = new FileReader(); r.onload = function () { apply(r.result); }; r.readAsText(f, 'UTF-8'); }
  }
  ['dragenter', 'dragover'].forEach(function (ev) {
    slotsEl.addEventListener(ev, function (e) {
      var box = slotBox(e.target); if (!box) return;
      e.preventDefault(); box.classList.add('over');
    });
  });
  slotsEl.addEventListener('dragleave', function (e) {
    var box = slotBox(e.target); if (box && !box.contains(e.relatedTarget)) box.classList.remove('over');
  });
  slotsEl.addEventListener('drop', function (e) {
    var box = slotBox(e.target); if (!box) return;
    e.preventDefault(); box.classList.remove('over');
    var i = parseInt(box.getAttribute('data-slot'), 10);
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    var ta = slotsEl.querySelector('[data-ta="' + i + '"]');
    if ((sources[i] || (ta && String(ta.value).trim()))
        && !window.confirm('Input ' + (i + 1) + ' already has data — replace it with ' + f.name + '?')) return;
    readFileInto(i, f);
  });

  function rebuildFinal() {
    var pool = [], rawCount = 0;
    sources.forEach(function (s) {
      if (!s) return;
      try {
        var list = L.parseInput(s.text, { merge: true, source: s.name });
        s.count = list.length;
        rawCount += list.length;
        pool = pool.concat(list);
      } catch (e) { setMsg('err', 'Could not read ' + s.name + ': ' + ((e && e.message) ? e.message : e)); }
    });
    if (optDedupe && optDedupe.checked) pool = L.dedupeContacts(pool);
    table.setContacts(pool);
    renderOutput();
    var filled = sources.filter(function (s) { return !!s; }).length;
    if (!filled) clearMsg();
    else {
      var mergedAway = rawCount - pool.length;
      if ((optDedupe && optDedupe.checked) && mergedAway > 0)
        setMsg('info', mergedAway + ' duplicate' + (mergedAway > 1 ? 's' : '') + ' merged (same name or same phone number) across ' + filled + ' input' + (filled > 1 ? 's' : '') + '.');
      else clearMsg();
    }
    sources.forEach(function (s, i) { if (s) updateSlotChrome(i); });
  }
  /* ---- toolbar ---- */
  if (optDedupe) optDedupe.addEventListener('change', rebuildFinal);
  if (rebuildBtn) rebuildBtn.addEventListener('click', function () {
    rebuildFinal(); toast('Rebuilt final list from sources');
  });
  if (optPerPhone) optPerPhone.addEventListener('change', renderOutput);

  /* ---- add-input column ---- */
  var addSlotBtn = el('btnAddSlot');
  if (addSlotBtn) addSlotBtn.addEventListener('click', function () {
    if (visible >= MAX) return;
    visible++;
    renderSlots();
    if (visible >= MAX) { addSlotBtn.disabled = true; addSlotBtn.title = 'Maximum of ' + MAX + ' inputs'; }
    toast('Input ' + visible + ' added');
  });

  /* ---- output buttons ---- */
  el('copyBtn').addEventListener('click', function () {
    if (!dst.value.trim()) { toast('Nothing to copy'); return; }
    var text = canonicalOut();
    function done() { toast('Copied to clipboard'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { dst.select(); document.execCommand('copy'); done(); });
    } else { dst.select(); try { document.execCommand('copy'); } catch (e) {} done(); }
  });
  el('dlBtn').addEventListener('click', function () {
    if (!dst.value.trim()) { toast('Nothing to download'); return; }
    var isVcf = format === 'vcf', name = isVcf ? 'merged.vcf' : 'merged.csv';
    var blob = new Blob([canonicalOut()], { type: (isVcf ? 'text/vcard' : 'text/csv') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    toast('Saved ' + name);
  });

  /* ---- samples + theme (page-level ids) ---- */
  var sampleBtn = el('sampleBtn');
  if (sampleBtn && opts.samples) {
    sampleBtn.addEventListener('click', function () {
      opts.samples.forEach(function (sm, i) {
        if (i >= MAX) return;
        var ta = slotsEl.querySelector('[data-ta="' + i + '"]');
        if (ta) ta.value = sm.text;
        sources[i] = { text: sm.text, name: sm.name, count: 0 };
      });
      for (var k = 0; k < opts.samples.length && k < MAX; k++) updateSlotChrome(k);
      rebuildFinal();
      toast('Sample inputs loaded');
    });
  }
  var themeBtn = el('themeBtn');
  if (themeBtn) {
    var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
    function resolvedDark() {
      var d = document.documentElement.dataset ? document.documentElement.dataset.theme : null;
      return d ? (d === 'dark') : (mq ? mq.matches : false);
    }
    function applyTheme() {
      var t = null; try { t = localStorage.getItem('vcfconv-theme'); } catch (e) {}
      if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
      else if (document.documentElement.dataset) delete document.documentElement.dataset.theme;
      themeBtn.textContent = resolvedDark() ? '☾' : '☀';
    }
    themeBtn.addEventListener('click', function () {
      var next = resolvedDark() ? 'light' : 'dark';
      try { localStorage.setItem('vcfconv-theme', next); } catch (e) {}
      applyTheme();
    });
    applyTheme();
  }

  /* ---- init ---- */
  renderSlots();
  rebuildFinal();
}
root.initCompare = initCompare;
})(typeof window !== 'undefined' ? window : globalThis);
