# listmania

maker of lists (that from a long way off look like flies)

automated output @ <https://leanstooneside.tumblr.com/>

# running

`node src/cli.js`

```
Usage: cli [options]

Options:
  -V, --version                 output the version number
  -c, --corporaFilter [string]  filename substring filter (non-case sensitive)
  -p, --patternMatch [string]   nlp-compromise matchPattern for list elements
  -m, --method [string]         method-type [`matchStrats`, `posStrats`, `posStratAdjs`, `weirdStrats`, `patternStrats`]
```

`method` uses fuzzy matching, so `node src/cli.js -m weird` will match up to `node src/cli.js -m weirdStrats` etc.
