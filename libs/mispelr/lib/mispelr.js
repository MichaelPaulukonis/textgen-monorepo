'use strict'

var Mispelr = function (config) {
  if (!(this instanceof Mispelr)) {
    return new Mispelr(config)
  }

  // pos/lexer, not pos: the package index also loads the 4MB tagger lexicon
  var Lexer = require('pos/lexer'),
    lexer = new Lexer(),
    maledict = require('../data/maledict'),
    homophones = require('../data/homophones')

  var spelltype = {
    random: 'random',
    maledict: 'maledict',
    awfowell: 'awfowell',
    constonantSorrow: 'constonantSorrow',
    maxmister: 'maxmister',
    homophilia: 'homophilia'
  }

  this.spelltype = spelltype

  config = config || {
    log: false,
    type: spelltype.random
  }

  var logger = function (msg, priority) {
    if (config.log || priority) console.log(msg) // eslint-disable-line no-console
  }

  // all randomness goes through rand; respell swaps in opts.rng for its duration
  var rand = Math.random

  var pick = function (arr) {
    return arr[Math.floor(rand() * arr.length)]
  }

  var getRandom = function (min, max) {
    if (arguments.length == 1) {
      max = min
      min = 0
    }

    return Math.floor(rand() * (max - min) + min)
  }

  // return true or false
  // 50-50 chance (unless override)
  var coinflip = function (chance) {
    if (!chance) {
      chance = 0.5
    }
    return rand() < chance
  }

  // TODO: we should _match_ capitalization
  // if all caps, all-caps it!
  var isFirstLetterUpperCase = function (str) {
    return str.charAt(0).toUpperCase() == str.charAt(0)
  }

  var capitalizeWord = function (word) {
    return word.charAt(0).toUpperCase() + word.slice(1)
  }

  var isVowell = function (letter) {
    return /^[aeiou]/i.test(letter)
  }

  // "maledict" is the name of the dictionary-object
  var maledictor = function (word) {
    var wrod = word
    logger('MALEDICT')
    var found = maledict[word.toLowerCase()]
    if (found) {
      wrod = pick(found)
      if (isFirstLetterUpperCase(word)) {
        wrod = capitalizeWord(wrod)
      }
    }
    return wrod
  }

  var homophilia = function (word) {
    var wrod = word
    logger('HOMOPHILIA')
    var found = homophones[word.toLowerCase()]
    if (found) {
      wrod = pick(found)
      if (isFirstLetterUpperCase(word)) {
        wrod = capitalizeWord(wrod)
      }
    }
    return wrod
  }

  var awfowell = function (word) {
    var wrod = ''
    for (var l = 0; l < word.length; l++) {
      if (isVowell(word[l]) && coinflip(0.3)) {
        // how crazy do we want to be ... more than 3 vowells?
        wrod += word[l] + word[l]
        if (coinflip(0.2)) wrod += word[l]
      } else {
        wrod += word[l]
      }
    }
    logger('AWFOWELL')
    return wrod
  }

  var constonantsorrow = function (word) {
    var wrod = ''
    for (var l = 0; l < word.length; l++) {
      if (!isVowell(word[l]) && coinflip(0.3)) {
        // how crazy do we want to be ... more than 3 consonants?
        wrod += word[l] + word[l]
        if (coinflip(0.2)) wrod += word[l]
      } else {
        wrod += word[l]
      }
    }
    logger('AWFOWELL')
    return wrod
  }

  var maxmister = function (word) {
    var wrod = word
    logger('MAXMISTER')
    if (word.length > 2) {
      // must be at least length 3
      // don't use the first char (too oCnfusing)
      // one less than last char, since we do n+1
      var pos1 = getRandom(word.length - 2) + 1
      wrod =
        word.substr(0, pos1) +
        word[pos1 + 1] +
        word[pos1] +
        word.substr(pos1 + 2)
    }
    return wrod
  }

  var isAlpha = function (text) {
    return /^[a-z]+/i.test(text)
  }

  var randomRespell = function (word) {
    // var isAlpha = /^[a-z]+/i.test(word);
    var wrod = word

    // overall chance of mis-spelling
    // if (isAlpha && coinflip(.2)) {
    if (isAlpha(word)) {
      var found = maledict[word.toLowerCase()] != undefined

      // pick a strategy
      // if found, use the mis-spelling in most cases
      if (found && coinflip(0.75)) {
        wrod = maledictor(word)
      } else if (coinflip()) {
        wrod = awfowell(word)
      } else if (coinflip()) {
        wrod = constonantsorrow(word)
      } else if (coinflip()) {
        wrod = homophilia(word)
      } else {
        // 4-letter+ words ("in" and "and" are too annoying mixed up)
        if (word.length > 3) {
          wrod = maxmister(word)
        } else {
          logger('NOTHING')
          wrod = word
        }
      }
    }

    return wrod
  }

  var getTextArray = function (text) {
    var words = lexer.lex(text)

    logger('lexed: ' + words)

    return words
  }

  // FNV-1a + murmur3 fmix32, 32-bit: deterministic per-word gate that draws
  // nothing from rand. fmix32 is needed: plain FNV-1a barely moves the high
  // bits when only the trailing index differs, so h / 2^32 clustered ~0.58.
  var hash = function (str) {
    var h = 0x811c9dc5
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    h ^= h >>> 16
    h = Math.imul(h, 0x85ebca6b)
    h ^= h >>> 13
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 16
    return h >>> 0
  }

  var respellWord = function (word, method) {
    switch (method) {
      case spelltype.maledict:
        return maledictor(word)
      case spelltype.awfowell:
        return awfowell(word)
      case spelltype.constonantSorrow:
        return constonantsorrow(word)
      case spelltype.maxmister:
        return maxmister(word)
      case spelltype.homophilia:
        return homophilia(word)
      default:
        return randomRespell(word)
    }
  }

  // a selected word that comes back unchanged is re-rolled this many times
  var MAX_TRIES = 10

  // creative respellings
  // http://security.stackexchange.com/questions/80392/never-spell-a-word-the-same-way-twice
  // http://rickconner.net/spamweb/tricks.html#misspelling
  // https://github.com/dariusk/NaNoGenMo/issues/2
  //
  // opts.rng: () => [0, 1), defaults to Math.random
  // opts.chance: probability each word comes back misspelled. Only words
  //   count (not punctuation). Omitted = 0.0.x behavior: every token goes
  //   through the respeller once, and some come back unchanged.
  //   Given, every word gets a candidate (re-rolled until it differs, same
  //   rng draws at any chance), then a hash of salt:wordIndex picks which
  //   candidates to use - so raising chance only adds misspellings, and the
  //   same rng gives the same misspellings at any chance. Words that can't
  //   be misspelled (not in the dictionary, too short) are made up for by
  //   the rest, as far as possible.
  // opts.salt: fixes the mask; defaults to one rng draw after respelling
  var respell = function (phrase, method, opts) {
    method = method != undefined ? method : spelltype.random
    opts = opts || {}
    var gated = opts.chance != undefined

    var prevRand = rand
    rand = opts.rng || Math.random
    try {
      var words = getTextArray(phrase)

      logger(words)

      var wrods = words.map(function (word) {
        if (!gated) return respellWord(word, method)
        if (!isAlpha(word)) return word
        var wrod = respellWord(word, method)
        for (var t = 1; t < MAX_TRIES && wrod === word; t++) {
          wrod = respellWord(word, method)
        }
        return wrod
      })

      // p: per-respellable-word odds that put chance * wordCount misspellings
      // across all words (capped at 1 when too few can change)
      var salt = null
      var p = 1
      if (gated) {
        var wordCount = 0
        var respellable = 0
        words.forEach(function (word, i) {
          if (!isAlpha(word)) return
          wordCount++
          if (wrods[i] !== word) respellable++
        })
        p = respellable
          ? Math.min(1, (opts.chance * wordCount) / respellable)
          : 0
        if (p < 1) {
          salt = opts.salt != undefined ? String(opts.salt) : String(rand())
        }
      }

      var redone = phrase
      var cursor = 0
      var wordIndex = -1
      for (var i = 0; i < words.length; i++) {
        var word = words[i]
        var wrod = wrods[i]

        if (!isAlpha(word)) continue
        wordIndex++
        if (salt !== null && hash(salt + ':' + wordIndex) / 4294967296 >= p) {
          wrod = word
        }

        logger('replacing "' + word + '" with "' + wrod + '"')
        // search from the cursor, so repeated words map to their own position
        try {
          var re = new RegExp('\\b' + word + '\\b', 'g')
          re.lastIndex = cursor
          var m = re.exec(redone)
          if (m) {
            redone =
              redone.slice(0, m.index) +
              wrod +
              redone.slice(m.index + word.length)
            cursor = m.index + wrod.length
          }
        } catch (ex) {
          console.log(ex) // eslint-disable-line no-console
        }
      }

      return redone
    } finally {
      rand = prevRand
    }
  }

  this.respell = respell
  this.random = function (text) {
    return respell(text, spelltype.random)
  }
  this.maledict = function (text) {
    return respell(text, spelltype.maledict)
  }
  this.awfowell = function (text) {
    return respell(text, spelltype.awfowell)
  }
  this.constonantSorrow = function (text) {
    return respell(text, spelltype.constonantSorrow)
  }
  this.maxmister = function (text) {
    return respell(text, spelltype.maxmister)
  }
  this.homophilia = function (text) {
    return respell(text, spelltype.homophilia)
  }
}

module.exports = Mispelr
