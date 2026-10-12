/* vcf-studio shared logic: parse / convert / merge. No DOM. UMD-ish attach. */
(function (root) {
'use strict';
var uidSeq = 1;
function newId() { return 'c' + (uidSeq++) + '_' + Date.now().toString(36); }

/* ---------- tiny helpers ---------- */
function csvQuote(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function trunc(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) + '…' : s; }
function escT(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
    .replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}
function unescT(s) {
  return String(s).replace(/\\[nN]/g, '\n').replace(/\\([\\;,])/g, '$1').trim();
}
function escSemi(s) { // structured values where ';' is a separator (ORG/ADR/GEO)
  return String(s).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n');
}
function escComma(s) { // multi-value lists where ',' separates and ';' is literal (CATEGORIES)
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/\r\n|\r|\n/g, '\\n');
}
function splitUnescaped(s, sep) {
  var out = [], cur = '', i, c;
  for (i = 0; i < s.length; i++) {
    c = s[i];
    if (c === '\\' && i + 1 < s.length) { cur += c + s[i + 1]; i++; continue; }
    if (c === sep) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur); return out;
}
/* ---------- encoding helpers ---------- */
function bytesToStr(bytes, cs) {
  try { return new TextDecoder(cs).decode(bytes); } catch (e) {}
  try { return new TextDecoder('utf-8').decode(bytes); } catch (e) {}
  var s = '', i; for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return s;
}
function qpDecode(s) {
  s = String(s).replace(/=\r?\n/g, '');
  var out = '', bytes = [], i, ch;
  function flush() { if (bytes.length) { out += bytesToStr(new Uint8Array(bytes), 'utf-8'); bytes = []; } }
  for (i = 0; i < s.length; i++) {
    ch = s[i];
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) { bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
    else { flush(); out += ch; }
  }
  flush(); return out;
}

/* ---------- format detection + CSV parsing ---------- */
function detectFormat(text) {
  var t = String(text).replace(/^\uFEFF/, '');
  if (/BEGIN\s*:\s*VCARD/i.test(t)) return 'vcf';
  if (t.trim() === '') return null;
  return 'csv';
}
function detectDelimiter(text) {
  var counts = { ',': 0, ';': 0, '\t': 0, '|': 0 }, inQ = false, i, c, k, best = ',', bestN = 0;
  for (i = 0; i < text.length; i++) {
    c = text[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (!inQ && counts[c] !== undefined) counts[c]++;
  }
  for (k in counts) if (counts[k] > bestN) { bestN = counts[k]; best = k; }
  return best;
}
function parseCSV(text, delim) {
  text = String(text).replace(/^\uFEFF/, '');
  var rows = [], row = [], field = '', i = 0, inQ = false, c;
  while (i < text.length) {
    c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === delim) { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { if (text[i + 1] === '\n') i++; row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  row.push(field); rows.push(row);
  return rows.filter(function (r) { return r.some(function (f) { return String(f).trim() !== ''; }); });
}
/* ---------- CSV rows → contact model ---------- */
function unwrapFormula(f) {
  var t = String(f).trim(), m = t.match(/^="([\s\S]*)"$/);
  return m ? m[1] : t;
}
function looksLikePhone(s) {
  var t = String(s).trim(), d;
  if (t.length < 3) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return false;
  d = t.match(/\d/g) || [];
  if (d.length < 3) return false;
  return /^[+()\-.\s/\d]+$/.test(t);
}
function looksLikeEmail(s) {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(String(s).trim());
}
var HEADER_NAMES = ['name', 'nom', 'full name', 'fullname', 'display name', 'contact', 'contact name',
  'isim', 'ad', 'ad soyad', 'adi', 'nama', 'nombre', 'nome'];
function isHeaderRow(fields) {
  var n = String(fields[0] || '').trim().toLowerCase(), i, rest, all;
  if (HEADER_NAMES.indexOf(n) >= 0) return true;
  rest = fields.slice(1).map(function (f) { return String(f).trim().toLowerCase(); });
  if (rest.length) {
    all = true;
    for (i = 0; i < rest.length; i++) {
      if (!/^(phone|phones|tel|telephone|mobile|mob|cell|number|num|email|e-?mail|mail|contact|type|label)$/.test(rest[i])) { all = false; break; }
    }
    if (all) return true;
  }
  return false;
}
var SCHEMA_KEYS = ['NICKNAME', 'BDAY', 'TITLE', 'ROLE', 'ORG', 'URL', 'TZ', 'GEO',
  'NOTE', 'CATEGORIES', 'ADR', 'SORT-STRING', 'AGENT', 'MAILER', 'CLASS'];
function makeContact(o) {
  o = o || {};
  return {
    id: o.id || newId(),
    name: o.name || '',
    nParts: o.nParts || null,
    phones: (o.phones || []).slice(),
    emails: (o.emails || []).slice(),
    extras: (o.extras || []).slice(),
    schema: o.schema ? Object.assign({}, o.schema) : {},
    raw: o.raw || '',
    source: o.source || ''
  };
}
function rowsToContacts(rows, opts) {
  var merge = !opts || opts.merge !== false, contacts = [], merged = [], i;
  rows.forEach(function (row, idx) {
    var name = '', rest = [], fields, c, m, ci, phones, emails, extras;
    if (!row || row.every(function (f) { return String(f).trim() === ''; })) return;
    fields = row.map(unwrapFormula);
    if (idx === 0 && isHeaderRow(fields)) return;
    if (fields.length === 1) {
      c = String(fields[0]).trim();
      if (!c) return;
      m = c.match(/^(.*),="([\s\S]*)"$/);
      if (m) { name = m[1].trim(); rest = [m[2]]; }
      else {
        ci = c.indexOf(',');
        if (ci >= 0) { name = c.slice(0, ci).replace(/^"|"$/g, '').trim(); rest = [c.slice(ci + 1).replace(/^"|"$/g, '').trim()]; }
        else { name = c.replace(/^"|"$/g, '').trim(); rest = []; }
      }
    } else {
      name = String(fields[0] || '').trim();
      rest = fields.slice(1).map(function (f) { return String(f).trim(); });
    }
    phones = []; emails = []; extras = [];
    rest.forEach(function (f, j) {
      if (!f) return;
      if (looksLikeEmail(f)) emails.push(f);
      else if (looksLikePhone(f)) phones.push(f);
      else extras.push({ key: 'column ' + (j + 2), value: f });
    });
    contacts.push(makeContact({ name: name, phones: phones, emails: emails, extras: extras, raw: row.map(csvQuote).join(',') }));
  });
  if (!merge) return contacts;
  for (i = 0; i < contacts.length; i++) {
    var cur = contacts[i], prev = merged[merged.length - 1];
    if (prev && cur.name && prev.name.toLowerCase() === cur.name.toLowerCase()) {
      prev.phones = prev.phones.concat(cur.phones);
      prev.emails = prev.emails.concat(cur.emails);
      prev.extras = prev.extras.concat(cur.extras);
      prev.raw += '\n' + cur.raw;
    } else merged.push(cur);
  }
  return merged;
}
/* ---------- vCard parser ---------- */
function unfold(text) {
  return String(text).replace(/\r\n[ \t]|\n[ \t]|\r[ \t]/g, '');
}
function nameFromN(n) {
  if (!n || !n.length) return '';
  var fam = n[0] || '', giv = n[1] || '', add = n[2] || '', pre = n[3] || '', suf = n[4] || '';
  return [pre, giv, add, fam, suf].filter(function (x) { return !!x; }).join(' ').trim();
}
function finalizeCard(c) {
  return makeContact({
    name: c.fn || nameFromN(c.n) || '', nParts: c.n,
    phones: c.phones, emails: c.emails, extras: c.extras, schema: c.schema, raw: c.raw.join('\n')
  });
}
function parseVCF(text, sourceLabel) {
  var lines = unfold(String(text).replace(/^\uFEFF/, '')).split(/\r\n|\n|\r/);
  var contacts = [], cur = null, i, line, t, ci, head, value, parts, key, params, v, k;
  function start() { return { fn: '', n: null, phones: [], emails: [], extras: [], schema: {}, raw: [] }; }
  for (i = 0; i < lines.length; i++) {
    line = lines[i]; t = line.trim();
    if (/^BEGIN\s*:\s*VCARD$/i.test(t)) { cur = start(); cur.raw.push(line); continue; }
    if (/^END\s*:\s*VCARD$/i.test(t)) {
      if (cur) { cur.raw.push(line); var f = finalizeCard(cur); f.source = sourceLabel || ''; contacts.push(f); cur = null; }
      continue;
    }
    if (!cur) continue;
    cur.raw.push(line);
    if (!t) continue;
    ci = line.indexOf(':');
    if (ci < 0) continue;
    head = line.slice(0, ci); value = line.slice(ci + 1);
    parts = head.split(';');
    key = parts.shift().split('.').pop().toUpperCase();
    params = parts;
    v = value;
    for (k = 0; k < params.length; k++) {
      if (/^ENCODING=QUOTED-PRINTABLE$/i.test(params[k])) { v = qpDecode(v); break; }
    }
    if (key === 'FN') { cur.fn = unescT(v); }
    else if (key === 'N') { cur.n = splitUnescaped(v, ';').map(unescT); }
    else if (key === 'TEL') { if (v.trim()) cur.phones.push(v.trim()); }
    else if (key === 'EMAIL') { if (v.trim()) cur.emails.push(v.trim()); }
    else if (key === 'PHOTO' || key === 'LOGO' || key === 'SOUND' || key === 'KEY') { /* binary */ }
    else if (key === 'VERSION' || key === 'PRODID' || key === 'REV' || key === 'BEGIN' || key === 'END') { /* meta */ }
    else if (SCHEMA_KEYS.indexOf(key) >= 0) { cur.schema[key] = unescT(v); }
    else if (v.trim()) { cur.extras.push({ key: key, value: v.trim() }); }
  }
  if (cur) { var g = finalizeCard(cur); g.source = sourceLabel || ''; contacts.push(g); }
  return contacts;
}
function parseInput(text, opts) {
  opts = opts || {};
  if (!String(text).trim()) return [];
  if (detectFormat(text) === 'vcf') return parseVCF(text, opts.source || '');
  var list = rowsToContacts(parseCSV(text, detectDelimiter(text)), { merge: opts.merge !== false });
  if (opts.source) list.forEach(function (c) { c.source = opts.source; });
  return list;
}
/* ---------- writers ---------- */
function contactsToCSV(contacts, opts) {
  var perPhone = !opts || opts.perPhone !== false, lines = [], i, j, name, phones, list;
  for (i = 0; i < contacts.length; i++) {
    name = String(contacts[i].name || '').trim();
    phones = (contacts[i].phones || []).map(function (p) { return String(p).trim(); })
      .filter(function (p) { return !!p; });
    if (!name && !phones.length) continue;
    if (!phones.length) { lines.push(csvQuote(name + ',=""')); continue; }
    list = perPhone ? phones : [phones[0]];
    for (j = 0; j < list.length; j++) lines.push(csvQuote(name + ',="' + list[j] + '"'));
  }
  return lines.join('\r\n');
}
function foldLine(line) {
  var enc = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
  function blen(s) { return enc ? enc.encode(s).length : String(s).length; }
  if (blen(line) <= 74) return line;
  var parts = [], cur = '', size = 0, limit = 74, i, ch, b;
  for (i = 0; i < line.length; i++) {
    ch = line[i]; b = blen(ch);
    if (cur !== '' && size + b > limit) { parts.push(cur); cur = ch; size = b; limit = 73; }
    else { cur += ch; size += b; }
  }
  if (cur) parts.push(cur);
  return parts.join('\r\n ');
}
function splitName(full) {
  var parts = String(full).trim().split(/\s+/).filter(function (x) { return !!x; });
  if (parts.length >= 2) { var family = parts.pop(); return { family: family, given: parts.join(' ') }; }
  return { family: '', given: parts[0] || '' };
}
function contactsToVCF(contacts) {
  var cards = [], i, lines, name, phones, emails, np, s, c;
  for (i = 0; i < contacts.length; i++) {
    c = contacts[i];
    name = String(c.name || '').trim();
    phones = (c.phones || []).map(function (p) { return String(p).trim(); }).filter(function (p) { return !!p; });
    emails = (c.emails || []).map(function (e) { return String(e).trim(); }).filter(function (e) { return !!e; });
    if (!name && !phones.length && !emails.length) continue;
    lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    if (name) {
      lines.push('FN:' + escT(name));
      np = c.nParts;
      if (np && (np[0] || np[1])) {
        lines.push('N:' + escT(np[0] || '') + ';' + escT(np[1] || '') + ';' + escT(np[2] || '') + ';' + escT(np[3] || '') + ';' + escT(np[4] || ''));
      } else {
        s = splitName(name);
        lines.push('N:' + escT(s.family) + ';' + escT(s.given) + ';;;');
      }
    }
    phones.forEach(function (p) { lines.push('TEL;TYPE=CELL:' + escT(p)); });
    emails.forEach(function (e) { lines.push('EMAIL;TYPE=INTERNET:' + escT(e)); });
    if (c.schema) {
      SCHEMA_KEYS.forEach(function (k) {
        var val = c.schema[k];
        if (val && String(val).trim()) {
          var esc = (k === 'ORG' || k === 'GEO' || k === 'ADR') ? escSemi
            : (k === 'CATEGORIES' ? escComma : escT);
          lines.push(k + ':' + esc(val));
        }
      });
    }
    lines.push('END:VCARD');
    cards.push(lines.map(foldLine).join('\r\n'));
  }
  return cards.join('\r\n') + '\r\n';
}

/* ---------- merge / dedupe ---------- */
function normPhone(p) { return String(p || '').replace(/[^\d+]/g, ''); }
function mergeContacts(a, b) {
  var seen = {}, phones, emails, extraKeys = {}, extras;
  phones = (a.phones || []).concat(b.phones || []).filter(function (p) {
    p = String(p).trim(); if (!p) return false;
    var k = 'p:' + normPhone(p); if (seen[k]) return false; seen[k] = 1; return true;
  });
  emails = (a.emails || []).concat(b.emails || []).filter(function (e) {
    e = String(e).trim(); if (!e) return false;
    var k = 'e:' + e.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true;
  });
  extras = (a.extras || []).concat(b.extras || []).filter(function (x) {
    var k = 'x:' + x.key + '=' + x.value; if (extraKeys[k]) return false; extraKeys[k] = 1; return true;
  });
  return makeContact({
    name: a.name || b.name, nParts: a.nParts || b.nParts,
    phones: phones, emails: emails, extras: extras,
    schema: Object.assign({}, (b && b.schema) || {}, (a && a.schema) || {}),
    raw: (a.raw ? a.raw + '\n' : '') + (b.raw || ''),
    source: a.source || b.source
  });
}
function dedupeContacts(list) {
  // merges contacts sharing a name OR sharing any normalized phone number
  var byName = {}, byPhone = {}, root = [], i, c, key, found, j;
  function find(slot, k) { return slot[k] || null; }
  for (i = 0; i < list.length; i++) {
    c = makeContact(list[i]);
    key = (c.name || '').trim().toLowerCase();
    found = key ? find(byName, key) : null;
    if (!found) {
      for (j = 0; j < c.phones.length; j++) {
        var pk = 'p:' + normPhone(c.phones[j]);
        if (pk.length > 2 && byPhone[pk]) { found = byPhone[pk]; break; }
      }
    }
    if (!found) {
      var merged = c;
      if (key) byName[key] = merged;
      c.phones.forEach(function (p) { var pk = 'p:' + normPhone(p); if (pk.length > 2) byPhone[pk] = merged; });
      root.push(merged);
    } else {
      var m2 = mergeContacts(found, c);
      var ix = root.indexOf(found);
      if (ix >= 0) root[ix] = m2;
      var nk = (m2.name || '').trim().toLowerCase();
      if (nk) byName[nk] = m2;
      m2.phones.forEach(function (p) { var pk = 'p:' + normPhone(p); if (pk.length > 2) byPhone[pk] = m2; });
      // old references to `found` stay but `found` is replaced in root; chained dupes still merge via byName/byPhone
    }
  }
  return root;
}

/* ---------- export ---------- */
var API = {
  newId: newId, makeContact: makeContact, esc: esc, trunc: trunc, csvQuote: csvQuote,
  detectFormat: detectFormat, detectDelimiter: detectDelimiter, parseCSV: parseCSV,
  rowsToContacts: rowsToContacts, parseVCF: parseVCF, parseInput: parseInput,
  contactsToCSV: contactsToCSV, contactsToVCF: contactsToVCF,
  mergeContacts: mergeContacts, dedupeContacts: dedupeContacts, normPhone: normPhone,
  SCHEMA_KEYS: SCHEMA_KEYS,
  HEADER_NAMES: HEADER_NAMES
};
root.VCFStudio = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
