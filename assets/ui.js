/* vcf-studio shared contacts table: selection, edit, delete, add, pagination. Needs VCFStudio (lib.js). */
(function (root) {
'use strict';
var L = root.VCFStudio;

function toast(msg) {
  var el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
}

function ContactTable(opts) {
  // opts: tbody, searchBox, statsBadge, selCount, btns {selectAll, clearSel, deleteSel, mergeSel, add},
  //       pager {prev,next,info,perPage}, onChange, showSource
  this.o = opts;
  this.contacts = [];
  this.selected = {};      // id -> true
  this.expanded = {};      // id -> true
  this.q = '';
  this.page = 1;
  this.perPage = 25;
  this.dupFilter = 'none';  // 'none' | 'name' | 'phone'
  this._editingPhone = null; // {id, index (-1 = new), value}
  this._wire();
}
/* alphabetical by name (stable, unnamed last), case-insensitive */
function byName(a, b) {
  var an = (a.name || '').trim().toLowerCase(), bn = (b.name || '').trim().toLowerCase();
  if (an === '' && bn !== '') return 1;
  if (bn === '' && an !== '') return -1;
  if (an < bn) return -1;
  if (an > bn) return 1;
  return 0;
}
/* Conflict detection.
   'name'  = same name, but the contacts do not share a number (e.g. two "Tarek Khalil" with different numbers)
   'phone' = same number, but the contacts have different names (e.g. "Lena Fischer" and "Jonas Weber" on one number)
   Pairs that match on BOTH name and number are real duplicates and are handled by auto-merge instead. */
ContactTable.prototype.dupMapFor = function (list) {
  var dup = {}, i, j, a, b, nameA, nameB, sameName, sharedNumber, numsA, numsB;
  for (i = 0; i < list.length; i++) {
    for (j = i + 1; j < list.length; j++) {
      a = list[i]; b = list[j];
      nameA = (a.name || '').trim().toLowerCase();
      nameB = (b.name || '').trim().toLowerCase();
      numsA = a.phones.map(L.normPhone).filter(function (p) { return p.length >= 3; });
      numsB = b.phones.map(L.normPhone).filter(function (p) { return p.length >= 3; });
      sharedNumber = numsA.some(function (p) { return numsB.indexOf(p) >= 0; });
      sameName = !!nameA && nameA === nameB;
      if (sameName && !sharedNumber) { dup[a.id] = dup[a.id] || 'name'; dup[b.id] = dup[b.id] || 'name'; }
      else if (sharedNumber && !sameName) { dup[a.id] = dup[a.id] || 'phone'; dup[b.id] = dup[b.id] || 'phone'; }
    }
  }
  return dup;
};
ContactTable.prototype._wire = function () {
  var self = this, o = this.o;
  if (o.searchBox) o.searchBox.addEventListener('input', function () { self.q = o.searchBox.value.trim().toLowerCase(); self.page = 1; self.render(); });
  if (o.btns) {
    if (o.btns.selectAll) o.btns.selectAll.addEventListener('click', function () { self.selectFiltered(true); });
    if (o.btns.clearSel) o.btns.clearSel.addEventListener('click', function () { self.selected = {}; self.render(); self.changed(); });
    if (o.btns.deleteSel) o.btns.deleteSel.addEventListener('click', function () { self.deleteSelected(); });
    if (o.btns.mergeSel) o.btns.mergeSel.addEventListener('click', function () { self.mergeSelected(); });
    if (o.btns.add) o.btns.add.addEventListener('click', function () { self.openEditor(null); });
  }
  if (o.pager) {
    if (o.pager.prev) o.pager.prev.addEventListener('click', function () { if (self.page > 1) { self.page--; self.render(); } });
    if (o.pager.next) o.pager.next.addEventListener('click', function () {
      if (self.page < self.totalPages()) { self.page++; self.render(); }
    });
    if (o.pager.perPage) o.pager.perPage.addEventListener('change', function () {
      self.perPage = parseInt(o.pager.perPage.value, 10) || 25; self.page = 1; self.render();
    });
  }
  o.tbody.addEventListener('click', function (e) { self._onClick(e); });
  o.tbody.addEventListener('change', function (e) {
    var cb = e.target.closest ? e.target.closest('input[data-sel]') : null;
    if (cb) { if (cb.checked) self.selected[cb.getAttribute('data-sel')] = true; else delete self.selected[cb.getAttribute('data-sel')]; self.render(); self.changed(); return; }
  });
  o.tbody.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.id === 'pill-input') {
      if (e.key === 'Enter') { e.preventDefault(); self._commitPill(t); }
      else if (e.key === 'Escape') { self._editingPhone = null; self._renderCanceling(); }
    } else if (t.id === 'nm-input') {
      if (e.key === 'Enter') { e.preventDefault(); self._commitName(t); }
      else if (e.key === 'Escape') { self._renderCanceling(); }
    }
  });
  o.tbody.addEventListener('focusout', function (e) {
    var t = e.target;
    if (t.id === 'pill-input') self._commitPill(t);
    else if (t.id === 'nm-input') self._commitName(t);
  });
  if (o.dupBtns) {
    if (o.dupBtns.name) o.dupBtns.name.addEventListener('click', function () {
      self.dupFilter = self.dupFilter === 'name' ? 'none' : 'name';
      self.page = 1; self.render();
    });
    if (o.dupBtns.phone) o.dupBtns.phone.addEventListener('click', function () {
      self.dupFilter = self.dupFilter === 'phone' ? 'none' : 'phone';
      self.page = 1; self.render();
    });
  }
};
ContactTable.prototype._find = function (id) {
  var c = null;
  this.contacts.forEach(function (x) { if (x.id === id) c = x; });
  return c;
};
ContactTable.prototype._startNameEdit = function (id) {
  var span = this.o.tbody.querySelector('.nm-text[data-nm="' + id + '"]');
  var c = this._find(id);
  if (!span || !c || span.querySelector('input')) return;
  span.innerHTML = '<input type="text" id="nm-input" class="nm-input" data-nmid="' + id + '" value="' + L.esc(c.name) + '" placeholder="Name…">';
  var inp = span.querySelector('input');
  inp.focus(); inp.select();
};
ContactTable.prototype._commitName = function (input) {
  if (this._canceling) return; // render() destroyed the editor (Esc) — never commit the draft
  var id = input.getAttribute('data-nmid');
  var c = this._find(id);
  var v = input.value.trim();
  if (c && c.name !== v) {
    c.name = v; this.render(); this.changed(); toast('Name updated');
  } else this.render();
};
ContactTable.prototype._renderCanceling = function () {
  // A render() while an inline editor is focused destroys the input; Chromium
  // fires focusout during the innerHTML swap, which would otherwise commit the
  // half-typed draft. Esc means cancel — suppress the commit for this render.
  this._canceling = true;
  try { this.render(); } finally { this._canceling = false; }
};
ContactTable.prototype._commitPill = function (input) {
  if (this._committing || this._canceling) return; // Enter + focusout can both fire; commit once
  this._committing = true;
  try { this._doCommitPill(input); } finally { this._committing = false; }
};
ContactTable.prototype._doCommitPill = function (input) {
  var id = input.getAttribute('data-commitpid');
  var index = parseInt(input.getAttribute('data-commitpi'), 10);
  var value = input.value.trim();
  var c = this._find(id);
  this._editingPhone = null;
  if (!c) { this.render(); return; }
  if (!value) { // empty → remove existing number, cancel a new one
    if (index >= 0) c.phones.splice(index, 1);
    this.render(); this.changed(); toast('Number removed');
    return;
  }
  if (index >= 0) c.phones[index] = value;
  else c.phones.push(value);
  this.render(); this.changed(); toast('Number saved');
};
ContactTable.prototype.setContacts = function (list, keepSelection) {
  var keep = keepSelection ? this.selected : {};
  this.contacts = (list || []).map(function (c) { return L.makeContact(c); });
  if (keepSelection) {
    var alive = {}, self = this;
    this.contacts.forEach(function (c) { if (keep[c.id]) alive[c.id] = true; });
    this.selected = alive;
  } else this.selected = {};
  var pages = this.totalPages(true);
  if (this.page > pages) this.page = pages;
  this.render();
};
ContactTable.prototype.getContacts = function () { return this.contacts; };
ContactTable.prototype.getSelected = function () {
  var self = this;
  return this.contacts.filter(function (c) { return self.selected[c.id]; });
};
ContactTable.prototype.filtered = function () {
  var q = this.q;
  var list = this.contacts.slice().sort(byName); // alphabetical by default
  if (q) list = list.filter(function (c) {
    if ((c.name || '').toLowerCase().indexOf(q) >= 0) return true;
    var hit = false;
    c.phones.forEach(function (p) { if (p.toLowerCase().indexOf(q) >= 0) hit = true; });
    c.emails.forEach(function (e) { if (e.toLowerCase().indexOf(q) >= 0) hit = true; });
    return hit;
  });
  if (this.dupFilter && this.dupFilter !== 'none') {
    var dup = this.dupMapFor(list);
    list = list.filter(function (c) { return dup[c.id] === this.dupFilter; }, this);
  }
  return list;
};
ContactTable.prototype.totalPages = function (ignoreFilter) {
  var n = ignoreFilter ? this.contacts.length : this.filtered().length;
  return Math.max(1, Math.ceil(n / this.perPage));
};
ContactTable.prototype.selectFiltered = function (on) {
  var self = this;
  this.filtered().forEach(function (c) { if (on) self.selected[c.id] = true; else delete self.selected[c.id]; });
  this.render(); this.changed();
};
ContactTable.prototype.deleteSelected = function () {
  var ids = this.getSelected().map(function (c) { return c.id; });
  if (!ids.length) { toast('Nothing selected'); return; }
  if (!window.confirm('Delete ' + ids.length + ' selected contact' + (ids.length > 1 ? 's' : '') + '?')) return;
  var gone = {};
  ids.forEach(function (id) { gone[id] = true; });
  this.contacts = this.contacts.filter(function (c) { return !gone[c.id]; });
  this.selected = {};
  var pages = this.totalPages(true);
  if (this.page > pages) this.page = pages;
  this.render(); this.changed();
  toast('Deleted ' + ids.length);
};
ContactTable.prototype.mergeSelected = function () {
  var sel = this.getSelected();
  if (sel.length < 2) { toast('Select 2 or more rows to merge'); return; }
  var merged = sel.reduce(function (acc, c) { return L.mergeContacts(acc, c); });
  var gone = {}, firstIx = -1, self = this;
  sel.forEach(function (c) { gone[c.id] = true; });
  this.contacts.forEach(function (c, i) { if (gone[c.id] && firstIx < 0) firstIx = i; });
  this.contacts = this.contacts.filter(function (c) { return !gone[c.id]; });
  this.contacts.splice(firstIx < 0 ? 0 : firstIx, 0, merged);
  this.selected = {}; this.selected[merged.id] = true;
  this.render(); this.changed();
  toast('Merged ' + sel.length + ' into "' + (merged.name || 'unnamed') + '"');
};
ContactTable.prototype.deleteById = function (id) {
  this.contacts = this.contacts.filter(function (c) { return c.id !== id; });
  delete this.selected[id];
  var pages = this.totalPages(true);
  if (this.page > pages) this.page = pages;
  this.render(); this.changed();
};
ContactTable.prototype.upsert = function (contact) {
  var ix = -1;
  this.contacts.forEach(function (c, i) { if (c.id === contact.id) ix = i; });
  if (ix >= 0) this.contacts[ix] = contact; else this.contacts.push(contact);
  this.render(); this.changed();
};
ContactTable.prototype.changed = function () { if (this.o.onChange) this.o.onChange(this); };
ContactTable.prototype._onClick = function (e) {
  var t = e.target;
  function closest(sel) { return (t.closest ? t.closest(sel) : null); }
  var ed = closest('[data-edit]'), del = closest('[data-del]');
  if (ed) { this.openEditor(ed.getAttribute('data-edit')); return; }
  if (del) {
    if (!window.confirm('Delete this contact?')) return;
    this.deleteById(del.getAttribute('data-del'));
    toast('Deleted');
    return;
  }
  // inline name edit
  var nm = closest('[data-nm]');
  if (nm) { this._startNameEdit(nm.getAttribute('data-nm')); return; }
  // phone pill actions
  var un = closest('[data-unphone]');
  if (un) {
    var uc = this._find(un.getAttribute('data-unphone'));
    var ui = parseInt(un.getAttribute('data-upi'), 10);
    if (uc) { uc.phones.splice(ui, 1); this.render(); this.changed(); toast('Number removed'); }
    return;
  }
  var add = closest('[data-addphone]');
  if (add) {
    this._editingPhone = { id: add.getAttribute('data-addphone'), index: -1, value: '' };
    this.render();
    return;
  }
  var pill = closest('.pill[data-pid]');
  if (pill) {
    var pc = this._find(pill.getAttribute('data-pid'));
    var pi = parseInt(pill.getAttribute('data-pi'), 10);
    if (pc && pc.phones[pi] !== undefined) {
      this._editingPhone = { id: pc.id, index: pi, value: pc.phones[pi] };
      this.render();
    }
    return;
  }
  // row expansion only — never from interactive controls (checkbox, pills, inline inputs…)
  if (t.closest('input') || t.closest('button') || t.closest('label') || t.closest('select') || t.closest('.pill')) return;
  var row = closest('tr.rowline');
  if (row) {
    var id = row.getAttribute('data-id');
    if (this.expanded[id]) delete this.expanded[id]; else this.expanded[id] = true;
    this.render();
  }
};
ContactTable.prototype.openEditor = function (id) {
  var self = this;
  var c = null;
  if (id) this.contacts.forEach(function (x) { if (x.id === id) c = x; });
  var isNew = !c;
  var draft = c ? L.makeContact({ id: c.id, name: c.name, nParts: c.nParts, phones: c.phones, emails: c.emails, extras: c.extras, schema: c.schema, raw: c.raw, source: c.source }) : L.makeContact({});
  var sc = draft.schema || {};
  function f(key) { return sc[key] ? String(sc[key]) : ''; }
  var veil = document.createElement('div');
  veil.className = 'modal-veil';
  veil.innerHTML =
    '<div class="modal wide" role="dialog" aria-modal="true" aria-label="' + (isNew ? 'Add contact' : 'Full vCard editor') + '">'
    + '<h3>' + (isNew ? 'Add contact' : 'Full vCard editor') + ' <span class="badge">vCard 3.0 · RFC 2426</span></h3>'
    + '<div class="vgrid">'
    + '<div class="vspan">'
    +   '<label for="m-name">FN — Full name</label><input type="text" id="m-name" value="' + L.esc(draft.name) + '" placeholder="e.g. Wissem Baroudi">'
    + '</div>'
    + '<div>'
    +   '<label for="m-phones">TEL — Phones (one per line)</label><textarea id="m-phones" rows="3">' + L.esc(draft.phones.join('\n')) + '</textarea>'
    + '</div>'
    + '<div>'
    +   '<label for="m-emails">EMAIL — Addresses (one per line)</label><textarea id="m-emails" rows="3">' + L.esc(draft.emails.join('\n')) + '</textarea>'
    + '</div>'
    + '<div>'
    +   '<label for="m-nickname">NICKNAME</label><input type="text" id="m-nickname" value="' + L.esc(f('NICKNAME')) + '">'
    + '</div>'
    + '<div>'
    +   '<label for="m-bday">BDAY — Birthday</label><input type="text" id="m-bday" value="' + L.esc(f('BDAY')) + '" placeholder="YYYY-MM-DD">'
    + '</div>'
    + '<div>'
    +   '<label for="m-title">TITLE — Job title</label><input type="text" id="m-title" value="' + L.esc(f('TITLE')) + '">'
    + '</div>'
    + '<div>'
    +   '<label for="m-role">ROLE — Occupation</label><input type="text" id="m-role" value="' + L.esc(f('ROLE')) + '">'
    + '</div>'
    + '<div>'
    +   '<label for="m-org">ORG — Organization</label><input type="text" id="m-org" value="' + L.esc(f('ORG')) + '" placeholder="Company;Department;Team">'
    + '</div>'
    + '<div>'
    +   '<label for="m-url">URL — Website</label><input type="text" id="m-url" value="' + L.esc(f('URL')) + '">'
    + '</div>'
    + '<div>'
    +   '<label for="m-tz">TZ — Time zone</label><input type="text" id="m-tz" value="' + L.esc(f('TZ')) + '" placeholder="+01:00">'
    + '</div>'
    + '<div>'
    +   '<label for="m-geo">GEO — Position</label><input type="text" id="m-geo" value="' + L.esc(f('GEO')) + '" placeholder="37.386013;-122.082932">'
    + '</div>'
    + '<div>'
    +   '<label for="m-categories">CATEGORIES</label><input type="text" id="m-categories" value="' + L.esc(f('CATEGORIES')) + '" placeholder="myContacts,friends">'
    + '</div>'
    + '<div>'
    +   '<label for="m-adr">ADR — Address</label><input type="text" id="m-adr" value="' + L.esc(f('ADR')) + '" placeholder="Street;City;Region;ZIP;Country">'
    + '</div>'
    + '<div class="vspan">'
    +   '<label for="m-note">NOTE</label><textarea id="m-note" rows="2">' + L.esc(f('NOTE')) + '</textarea>'
    + '</div>'
    + '</div>'
    + '<div class="hint">Structured vCard 3.0 fields (RFC 2426). Everything is escaped and written into the exported file.</div>'
    + '<div class="mrow"><button class="ghost" data-x>Cancel</button>'
    + '<button class="primary" data-ok>' + (isNew ? 'Add' : 'Save') + '</button></div></div>';
  document.body.appendChild(veil);
  function close() { document.body.removeChild(veil); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  veil.addEventListener('mousedown', function (e) { if (e.target === veil) close(); });
  veil.querySelector('[data-x]').addEventListener('click', close);
  var nameEl = veil.querySelector('#m-name');
  nameEl.focus();
  veil.querySelector('[data-ok]').addEventListener('click', function () {
    draft.name = nameEl.value.trim();
    draft.phones = veil.querySelector('#m-phones').value.split(/\r\n|\r|\n/).map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
    draft.emails = veil.querySelector('#m-emails').value.split(/\r\n|\r|\n/).map(function (s) { return s.trim(); }).filter(function (s) { return !!s; });
    var schema = {};
    ['NICKNAME', 'BDAY', 'TITLE', 'ROLE', 'ORG', 'URL', 'TZ', 'GEO', 'CATEGORIES', 'ADR', 'NOTE'].forEach(function (k) {
      var v = veil.querySelector('#m-' + k.toLowerCase()).value.trim();
      if (v) schema[k] = v;
    });
    draft.schema = schema;
    // schema now owns these keys — drop them from the free-form extras to avoid doubles
    draft.extras = (draft.extras || []).filter(function (x) { return L.SCHEMA_KEYS.indexOf(x.key) < 0; });
    if (!draft.name && !draft.phones.length && !draft.emails.length && !Object.keys(draft.schema).length) { toast('Empty contact — nothing saved'); return; }
    self.upsert(draft);
    close();
    toast(isNew ? 'Contact added' : 'Contact saved');
  });
};
ContactTable.prototype.render = function () {
  var o = this.o, list = this.filtered(), pages = this.totalPages();
  if (this.page > pages) this.page = pages;
  if (this.page < 1) this.page = 1;
  var start = (this.page - 1) * this.perPage, slice = list.slice(start, start + this.perPage);
  var self = this, showSrc = !!o.showSource;
  var selCount = this.getSelected().length;

  // stats
  if (o.statsBadge) {
    var pN = 0, eN = 0;
    this.contacts.forEach(function (c) { pN += c.phones.length; eN += c.emails.length; });
    o.statsBadge.textContent = this.contacts.length + ' contacts · ' + pN + ' phones · ' + eN + ' emails';
  }
  if (o.selCount) o.selCount.textContent = selCount + ' selected';
  if (o.btns) {
    var off = selCount === 0;
    if (o.btns.clearSel) o.btns.clearSel.disabled = off;
    if (o.btns.deleteSel) o.btns.deleteSel.disabled = off;
    if (o.btns.mergeSel) o.btns.mergeSel.disabled = selCount < 2;
  }
  if (o.dupBtns) {
    if (o.dupBtns.name) o.dupBtns.name.classList.toggle('active', this.dupFilter === 'name');
    if (o.dupBtns.phone) o.dupBtns.phone.classList.toggle('active', this.dupFilter === 'phone');
  }

  // rows
  var dupAll = this.dupMapFor(this.contacts);
  if (!slice.length) {
    var emptyText = this.dupFilter === 'name' ? 'No contacts sharing a name.'
      : (this.dupFilter === 'phone' ? 'No contacts sharing a number.'
      : (this.contacts.length ? 'No match.'
      : (o.emptyText || 'No contacts yet — paste, drop a file or load a sample.')));
    o.tbody.innerHTML = '<tr><td colspan="' + (showSrc ? 8 : 7) + '" class="empty">' + emptyText + '</td></tr>';
  } else {
    o.tbody.innerHTML = slice.map(function (c) {
      var checked = self.selected[c.id] ? ' checked' : '';
      var dup = dupAll[c.id];
      var showTag = dup && (self.dupFilter === dup || self.dupFilter === 'none');
      var pills = c.phones.map(function (p, pi) {
        return '<span class="pill' + (self._editingPhone && self._editingPhone.id === c.id && self._editingPhone.index === pi ? ' pill-editing' : '') + '" data-pid="' + c.id + '" data-pi="' + pi + '" title="Click to edit this number">'
          + '<span class="pill-text">' + L.esc(p) + '</span>'
          + '<button class="pill-x" data-unphone="' + c.id + '" data-upi="' + pi + '" title="Remove this number" aria-label="Remove number">&times;</button>'
          + '</span>';
      }).join('')
        + '<button class="pill pill-add" data-addphone="' + c.id + '" title="Add phone number" aria-label="Add phone number">+</button>';
      if (self._editingPhone && self._editingPhone.id === c.id) {
        var ep = self._editingPhone;
        pills = c.phones.map(function (p, pi) {
          if (pi === ep.index) {
            return '<span class="pill pill-editing"><input type="text" class="pill-input" id="pill-input" value="'
              + L.esc(ep.value) + '" placeholder="Number…" data-commitpid="' + c.id + '" data-commitpi="' + pi + '"></span>';
          }
          return '<span class="pill" data-pid="' + c.id + '" data-pi="' + pi + '" title="Click to edit this number"><span class="pill-text">' + L.esc(p) + '</span>'
            + '<button class="pill-x" data-unphone="' + c.id + '" data-upi="' + pi + '" title="Remove this number" aria-label="Remove number">&times;</button></span>';
        }).join('')
          + '<button class="pill pill-add" data-addphone="' + c.id + '" title="Add phone number" aria-label="Add phone number">+</button>'
          + (ep.index === -1 ? '<span class="pill pill-editing"><input type="text" class="pill-input" id="pill-input" value="'
            + L.esc(ep.value) + '" placeholder="Number…" data-commitpid="' + c.id + '" data-commitpi="-1"></span>' : '');
      }
      var dupBadge = showTag
        ? '<span class="dup-tag" title="' + (dup === 'name' ? 'Another contact shares this name' : 'This number also appears on another contact') + '">'
          + (dup === 'name' ? 'duplicate name' : 'duplicate number') + '</span>'
        : '';
      var emails = c.emails.map(function (x) { return '<span class="chip mail">' + L.esc(x) + '</span>'; }).join('') || '<span class="muted">—</span>';
      var info = L.trunc(c.extras.map(function (x) { return x.value; }).join(' · '), 70);
      var raw = L.trunc(c.raw || '', 4000);
      var srcCell = showSrc ? '<td class="src">' + L.esc(c.source || '—') + '</td>' : '';
      var rowCls = 'rowline' + (self.selected[c.id] ? ' selected' : '');
      var html = '<tr class="' + rowCls + '" data-id="' + c.id + '" title="Click the row for the raw entry">'
        + '<td><input type="checkbox" name="sel" data-sel="' + c.id + '"' + checked + ' aria-label="Select ' + L.esc(c.name || 'contact') + '"></td>'
        + '<td>' + (start + slice.indexOf(c) + 1) + '</td>'
        + '<td class="nm"><span class="nm-text" data-nm="' + c.id + '" title="Click to rename">'
        + (L.esc(c.name) || '<span class="muted">(unnamed)</span>') + '</span>' + dupBadge + '</td>'
        + '<td class="phones-cell">' + pills + '</td>'
        + '<td>' + emails + '</td>'
        + srcCell
        + '<td class="info">' + (info ? L.esc(info) : '—') + '</td>'
        + '<td class="rowbtns"><button class="small" data-edit="' + c.id + '" title="Full vCard editor">Edit</button> '
        + '<button class="small danger" data-del="' + c.id + '" title="Delete">Del</button></td></tr>';
      if (self.expanded[c.id]) {
        html += '<tr class="detail"><td colspan="' + (showSrc ? 8 : 7) + '"><pre>' + L.esc(raw) + '</pre></td></tr>';
      }
      return html;
    }).join('');
    var piEl = document.getElementById('pill-input');
    if (piEl) { piEl.focus(); piEl.select(); }
  }

  // pager
  if (o.pager) {
    var from = list.length ? start + 1 : 0, to = Math.min(start + this.perPage, list.length);
    if (o.pager.info) o.pager.info.textContent = 'Showing ' + from + '–' + to + ' of ' + list.length + ' · page ' + this.page + '/' + pages;
    if (o.pager.prev) o.pager.prev.disabled = this.page <= 1;
    if (o.pager.next) o.pager.next.disabled = this.page >= pages;
    if (o.pager.perPage && String(self.perPage) !== o.pager.perPage.value) o.pager.perPage.value = String(self.perPage);
  }
};
root.ContactTable = ContactTable;
root.toast = toast;
})(typeof window !== 'undefined' ? window : globalThis);
