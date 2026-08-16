const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') }) // read .env file IF IT EXISTS - which only s/b DEV

const config = {
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.TOKEN,
  accessSecret: process.env.TOKEN_SECRET,

  postLive: (process.env.POST_LIVE || '').toLowerCase() === 'true'
}

module.exports = config
