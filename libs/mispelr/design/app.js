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

  // Mark changed words when the word count survives respelling
  var render = function (src, out) {
    var a = src.split(/(\s+)/)
    var b = out.split(/(\s+)/)
    if (a.length !== b.length) {
      output.textContent = out
      return
    }
    output.innerHTML = b
      .map(function (t, i) {
        return t !== a[i] && /\S/.test(t) ? '<mark>' + esc(t) + '</mark>' : esc(t)
      })
      .join('')
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
