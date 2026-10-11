'use strict'

// TODO: wrap this up as its own npm module

// A mid-line gap of 3+ spaces marks a table row (column layout), not
// word-wrapped prose: keep each row as its own paragraph, spacing intact
// (textgen-monorepo-qi5; owner decision: keep the column spacing).
var TABLE_ROW = /\S {3,}\S/

var altmethod = function (text) {
  var lines = text.split(`\n`),
    newlines = [],
    curline = []

  // never emit empty paragraphs: output must have no blank lines, so a
  // second pass (or sentencify) can tell debreaked text from raw text
  var flush = function () {
    var para = curline.join(``).trim()
    if (para.length > 0) newlines.push(para)
    curline = []
  }

  for (let i = 0, lineslength = lines.length; i < lineslength; i++) {
    let line = lines[i].trim()
    if (line.length == 0) {
      flush()
    } else if (TABLE_ROW.test(line)) {
      flush()
      newlines.push(line)
    } else {
      // drop ending hyphen (NOTE: false loss 5% of time, [citation])
      var endsWithHyphen = line.slice(line.length - 1) === `-`
      curline.push(endsWithHyphen ? line.slice(0, line.length - 1) : line + ` `)
    }
  }
  flush()

  return newlines
}

/**
 takes in multi-line, word-wrapped text
 returns paragraphs as single lines
 optionally set blank-lines between paragraphs
 **/
var debreak = function (text, config) {
  var cleanText
  if (config === undefined) {
    config = {
      lineArary: false
    }
  }

  // TODO: rename altmethod, since it's no longer an alternate
  cleanText = altmethod(text).join(`\n`)

  if (config.lineArray) {
    cleanText = cleanText.split(`\n`)
  }

  return cleanText
}

module.exports = debreak
