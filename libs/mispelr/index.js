// 0.0.1 call style: a ready instance, mispelr.respell(text, type).
// The constructor is also exported for callers that want their own config.
const Mispelr = require('./lib/mispelr')

const mispelr = new Mispelr()

module.exports = {
  respell: mispelr.respell,
  spelltypes: mispelr.spelltype,
  Mispelr
}
