import dotenv from 'dotenv'
dotenv.config()

const config = {
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  accessToken: process.env.TOKEN,
  accessSecret: process.env.TOKEN_SECRET,

  postLive: (process.env.POST_LIVE.toLowerCase() === `true`),

  transform: true
}

export default config
