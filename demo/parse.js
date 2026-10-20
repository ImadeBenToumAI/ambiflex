// Track n19 "shaped rows", rewritten without generated code (the original used `new Function`, which
// security scanners rightly flag): one constructor per header keeps every row on one hidden class.
// The published 7.38x run used the code-generating version (commit 6b5b1e5); this one benches ~5.8x.
function needsTrim(s) {
  const n = s.length
  return n > 0 && (s.charCodeAt(0) <= 32 || s.charCodeAt(n - 1) <= 32)
}
function buildRow(keys) {
  // One constructor that assigns the trimmed header keys in a fixed order: every row gets the
  // same hidden class, whatever the column count. No generated code: the keys are data.
  const n = keys.length
  function Row(c) { for (let j = 0; j < n; j++) this[keys[j]] = c[j] }
  return (c) => new Row(c)
}
function parse(text) {
  const len = text.length
  let pos = 0
  // Header
  let eol = text.indexOf('\n', pos); if (eol < 0) eol = len
  const header = text.slice(pos, eol).split(',').map(h => h.trim())
  pos = eol + 1
  const n = header.length
  const Row = buildRow(header)
  const cells = new Array(n)
  const rows = []
  while (pos < len) {
    eol = text.indexOf('\n', pos); if (eol < 0) eol = len
    if (eol === pos) { pos++; continue } // empty line
    let start = pos
    for (let j = 0; j < n; j++) {
      let comma = start <= eol ? text.indexOf(',', start) : -1
      if (comma < 0 || comma > eol) comma = eol
      let v = start <= eol ? text.slice(start, comma) : ''
      if (needsTrim(v)) v = v.trim()
      cells[j] = v
      start = comma + 1
    }
    rows.push(Row(cells))
    pos = eol + 1
  }
  return rows
}
module.exports = { parse }
