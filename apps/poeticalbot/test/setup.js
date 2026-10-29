// Loaded by .mocharc.json before every test file. Tests use dirty-chai's
// call style (expect(x).to.exist()); loading it here, not per file, keeps a
// file working when run on its own (textgen-monorepo-50s).
const chai = require('chai')
chai.use(require('dirty-chai'))
