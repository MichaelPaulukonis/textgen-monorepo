'use strict';

const fs = require(`fs`),
    path = require(`path`),
    iconv = require(`iconv-lite`),
    debreak = require(`./lib/debreak`),
    textutil = require(`./lib/textutil`);

let Corpora = function(options = {}) {

  if(!(this instanceof Corpora)) {
    return new Corpora(options);
  }

  const config = {
    maxCacheSize: options.maxCacheSize || 10,
    ...options
  };

  // Corpus text ships uncompressed, copied verbatim into the Lambda layer
  // (see build:layer:prepare) — this path resolves the same way whether
  // __dirname is node_modules/common-corpus (local) or the /opt layer mount.
  const root = process.env.CORPUS_PATH || path.join(__dirname, `./corpus`);

  // https://gist.github.com/VinGarcia/ba278b9460500dad1f50
  // List all files in a directory in Node.js recursively in a synchronous fashion
  let walkSync = function(dir, filelist) {

    if (dir[dir.length-1] != `/`) { dir = dir.concat(`/`); }

    filelist = filelist || [];
    try {
      var files = fs.readdirSync(dir);
      if (dir.indexOf(`###`) === -1) {
        files.forEach(function(file) {
          const fullPath = dir + file;
          try {
            if (fs.statSync(fullPath).isDirectory()) {
              filelist = walkSync(fullPath + `/`, filelist);
            } else {
              filelist.push(fullPath);
            }
          } catch (error) {
            console.warn(`Skipping file ${fullPath}: ${error.message}`);
          }
        });
      }
    } catch (error) {
      console.warn(`Cannot read directory ${dir}: ${error.message}`);
    }
    return filelist;
  };

  let cleanName = (name) => name.replace(/\.(txt|js)$/gi, ``)
        .replace(root, ``)
        .replace(/^[/\\]/, ``),

      gettext = function(filename) {
        try {
          let text = fs.readFileSync(filename),
              book = iconv.decode(Buffer.from(text), `ISO8859-1`);
          // discard windows encoding thingy
          if (book.charCodeAt(0) === 0xFEFF) {
            book = book.slice(1);
          }
          return debreak(book);
        } catch (error) {
          console.error(`Error reading file ${filename}:`, error.message);
          throw new Error(`Failed to read text file: ${path.basename(filename)}`);
        }
      };

  let textCache = new Map();

  let getCachedText = function(filename) {
    const cacheKey = path.basename(filename);

    if (textCache.has(cacheKey)) {
      return textCache.get(cacheKey);
    }

    const text = gettext(filename);

    if (textCache.size >= config.maxCacheSize) {
      const firstKey = textCache.keys().next().value;
      textCache.delete(firstKey);
    }

    textCache.set(cacheKey, text);
    return text;
  };

  let books = walkSync(root),
      texts = [];

  for(let i = 0, len = books.length; i < len; i++) {
    let filename = books[i];
    if (filename.indexOf(`sentences`) > -1) {
      texts.push({name: cleanName(filename),
        text: () => {
          try {
            return require(filename).join(`\n`);
          } catch (error) {
            console.error(`Error loading sentences from ${filename}:`, error.message);
            return ``;
          }
        },
        sentences: () => {
          try {
            return require(filename);
          } catch (error) {
            console.error(`Error loading sentences from ${filename}:`, error.message);
            return [];
          }
        }});
    } else {
      texts.push({name: cleanName(filename),
        text: () => getCachedText(filename),
        sentences: () => textutil.sentencify(getCachedText(filename))});
    }
  }

  this.texts = texts;
  this.config = config;

  // include: string, or regex
  // exclude: filter(/^(?!.*literature|sentence.*).*$/)
  this.filter = function(filter) {
    try {
      let r = new RegExp(filter, `i`);
      return texts.filter(m => m.name.match(r) !== null);
    } catch (error) {
      console.error(`Invalid filter pattern "${filter}":`, error.message);
      return [];
    }
  };

  this.readFile = gettext;
  this.cleanName = cleanName;

  this.getCacheStats = function() {
    return {
      cacheSize: textCache.size,
      maxCacheSize: config.maxCacheSize,
      cachedTexts: Array.from(textCache.keys())
    };
  };

  this.clearCache = function() {
    textCache.clear();
  };

  this.getConfig = function() {
    return { ...config };
  };

};

module.exports = Corpora;
