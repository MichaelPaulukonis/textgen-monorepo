# Common Corpus

A curated collection of texts for Natural Language Processing (NLP) and Natural Language Generation (NLG) projects.

## Overview

Common Corpus provides easy programmatic access to 100+ carefully selected texts spanning literature, science fiction, film scripts, computer culture, and more. Perfect for researchers, developers, and data scientists working on text analysis, machine learning, and computational linguistics projects.

## Quick Start

### Installation

This package lives inside the `textgen-monorepo` Nx/pnpm workspace and isn't published standalone. Consuming apps (`poeticalbot`, `listmania`) depend on it via:

```json
"common-corpus": "workspace:*"
```

Run `pnpm install` from the repo root; pnpm links the workspace copy in automatically.

### Basic Usage

```javascript
const Corpora = require('common-corpus');
const corpus = new Corpora();

// Get all cyberpunk texts
const cyberpunk = corpus.filter('cyberpunk');
console.log(`Found ${cyberpunk.length} cyberpunk texts`);

// Access text content
const neuromancer = corpus.filter('neuromancer')[0];
const fullText = neuromancer.text();
const sentences = neuromancer.sentences();

console.log(`Neuromancer has ${sentences.length} sentences`);
```

### Command Line Interface

```bash
# List all available texts
node util.js --list

# Filter by category
node util.js --filter "gibson"

# Get specific text
node util.js --text "neuromancer"
```

## Features

- **100+ Curated Texts** across multiple genres and domains
- **Smart Filtering** using regex patterns to find texts by category or author
- **Text Processing** with automatic paragraph reconstruction and sentence extraction
- **Plain-text corpus** — texts ship uncompressed (~89MB); archive/zip support was removed, see [Roadmap](#roadmap)
- **CLI Interface** for exploration and shell integration
- **CORPUS_PATH override** for pointing at a different corpus directory locally or in tests
- **Zero Configuration** - works out of the box

## Text Categories

- **Literature**: Classic novels, poetry, Shakespeare
- **Cyberpunk**: Science fiction (Gibson, Kadrey, etc.)
- **Film Scripts**: Movie screenplays (Blade Runner, 2001, Brazil, etc.)
- **Computer Culture**: Hacker history, technical documentation
- **NASA**: Space program documents and technical reports
- **Quotations**: Famous quotes and sayings collections
- **Spam**: Email spam samples for research
- **Western**: Western genre novels
- **Sentences**: Pre-processed sentence datasets

## Documentation

### Getting Started
- [API Reference](docs/api/README.md) - Complete API documentation
- [Usage Examples](docs/api/examples.md) - Practical code examples
- [Corpus Guide](docs/corpus-guide.md) - Detailed text collection overview

### Development
- [Architecture Overview](docs/architecture/system-design.md) - System design
- [Lambda Deployment Guide](docs/deployment/lambda-deployment.md) - Building and deploying the Lambda layer
- [Deployment Options](docs/deployment/DEPLOYMENT_OPTIONS.md) - Layer vs Full API deployment

### Project Information
- [Project Structure](docs/PROJECT_STRUCTURE.md) - Complete project organization
- [Product Requirements](docs/requirements/PRD.md) - Project goals and requirements
- [Changelog](CHANGELOG.md) - Version history

## Roadmap

### Version 1.0 (Planned)
- **Modern Dependencies**: Migrate from `nlp_compromise` to `compromise`; update mocha/chai/nyc off their long-EOL pinned versions
- **Performance**: Async/await API and caching improvements
- **Security**: Input validation and safe file handling
- **Documentation**: Comprehensive guides and examples

### Decided Against
- **Zip/archive corpus compression** — the original zip-on-disk strategy (unzip-on-first-read, cache to disk) was built for Heroku's persistent, writable dyno filesystem. It cannot work under AWS Lambda: the layer mount (`/opt`) is read-only, so even a single invocation hitting that code path would fail, not just after the dyno's session ended. Corpus now ships as plain text (~89MB, well under Lambda's 250MB unzipped layer limit) and the zip-handling code (`node-zipkit`, `mkdirp`) has been removed.

### Future Enhancements
- **Streaming**: Support for large text processing
- **Metadata**: Rich text information (author, year, genre)
- **Search**: Full-text search capabilities
- **Gitenberg Integration**: Automated text retrieval


## Contributing

This package lives inside the `textgen-monorepo` workspace -- see the [root README's Contributing section](../../README.md#contributing) for the fork/branch/PR process.

## License

MIT License - see [LICENSE](LICENSE) for details.

Individual texts may have different licenses or be in the public domain. Please check source attribution before commercial use.

## Support

- **Issues**: [GitHub Issues](https://github.com/michaelpaulukonis/common-corpus/issues)
- **Documentation**: [docs/](docs/) directory
- **Examples**: [API Examples](docs/api/examples.md)

---

*Built for the NLP/NLG community with ❤️*
