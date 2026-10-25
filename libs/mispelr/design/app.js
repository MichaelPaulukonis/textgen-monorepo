// Shared wiring for the design mockups: same controls, different skins.
;(function () {
  var input = document.getElementById('input')
  var output = document.getElementById('output')

  var method = function () {
    var r = document.querySelector('input[name=spelltype]:checked')
    return r ? r.value : 'random'
  }

  var esc = function (s) {
    return s.replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]
    })
  }

  // Live readout (only in variants that have one)
  var roMethod = document.getElementById('ro-method')
  var roChanged = document.getElementById('ro-changed')

  var readout = function (changed, total) {
    if (!roMethod) return
    var r = document.querySelector('input[name=spelltype]:checked')
    roMethod.textContent = r ? r.nextElementSibling.textContent : '—'
    roChanged.textContent =
      changed === null
        ? '? of ' + total + ' words'
        : changed + ' of ' + total + ' words (' + Math.round((100 * changed) / total) + '%)'
  }

  // Mark changed words when the word count survives respelling
  var render = function (src, out) {
    var a = src.split(/(\s+)/)
    var b = out.split(/(\s+)/)
    var total = src.split(/\s+/).filter(Boolean).length
    if (a.length !== b.length) {
      output.textContent = out
      readout(null, total)
      return
    }
    var changed = 0
    output.innerHTML = b
      .map(function (t, i) {
        if (t !== a[i] && /\S/.test(t)) {
          changed++
          return '<mark>' + esc(t) + '</mark>'
        }
        return esc(t)
      })
      .join('')
    readout(changed, total)
  }

  var run = function () {
    var text = input.value.trim()
    if (text) render(text, mispelr.respell(text, method()))
  }

  document.getElementById('respell').addEventListener('click', run)
  document.querySelectorAll('input[name=spelltype]').forEach(function (r) {
    r.addEventListener('change', run)
  })
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
  })

  var title = document.querySelector('[data-respell]')
  if (title) {
    title.addEventListener('click', function () {
      title.textContent = mispelr.respell(title.dataset.respell, 'random')
    })
  }

  run()
})()
