# PoeticalBot Documentation

Automated poetry generation system that creates and publishes algorithmic poetry to Tumblr.

## Documentation

### 🏗️ [Architecture](architecture.md)

System design, generation pipeline, deployment architecture (local CLI + Lambda), Tumblr integration.

### 📁 [plans/](plans/)

- **[NPF Migration Plan](plans/npf-migration-plan.md)**: migration to Tumblr's Neue Post Format

### 📁 [reference/](reference/)

- **[Sample Metadata](reference/metadata.sample.00.json)**: example poem metadata structure
- **[Sample HTML Post](reference/post.sample.html.00.txt)**: example Tumblr post HTML

### 🔧 [Tumblr Configuration](tumblr-config.md)

Setting up Tumblr API authentication and configuration.

### 🧩 [pattern-match.md](pattern-match.md)

Notes on the compromise-based pattern/POS matcher behind the pattern-match REPL and the `pattern` line-reduce strategy.

## Related Resources

- **Main README**: `../README.md`
- **Repository**: <https://github.com/MichaelPaulukonis/textgen-monorepo>
- **Live Demo**: <https://poeticalbot.tumblr.com/>
- **Tumblr API Docs**: <https://www.tumblr.com/docs/en/api/v2>
