# PoeticalBot Documentation

This directory contains comprehensive documentation for the PoeticalBot project, an automated poetry generation system that creates and publishes algorithmic poetry to Tumblr.

## Documentation Overview

### 📋 [Analysis Report](analysis.md)
Complete repository analysis covering:
- Project overview and technology stack
- Architecture and system design
- Feature analysis and capabilities
- Development setup and workflows
- Documentation assessment and gaps
- Technical debt and health metrics
- Prioritized recommendations and roadmap

### 🏗️ [Architecture Documentation](architecture.md)
Detailed technical architecture including:
- System design and component relationships
- Data flow and processing pipelines
- Deployment architectures (local, Lambda, Heroku)
- Security and error handling patterns
- Performance characteristics and scalability considerations

### 🎯 [Recommendations & Action Plan](recommendations.md)
Actionable improvement roadmap with:
- Prioritized critical issues and fixes
- Documentation improvement plans
- Code quality enhancement strategies
- Feature development suggestions
- Infrastructure modernization plans

## Additional Documentation

### 📁 [plans/](plans/)
- **[NPF Migration Plan](plans/npf-migration-plan.md)**: Detailed migration to Tumblr's Neue Post Format

### 📁 [reference/](reference/)
- **[Sample Metadata](reference/metadata.sample.00.json)**: Example poem metadata structure
- **[Sample HTML Post](reference/post.sample.html.00.txt)**: Example Tumblr post HTML

### 🔧 [Tumblr Configuration](tumblr-config.md)
Complete guide for setting up Tumblr API authentication and configuration.

## Quick Start

For new contributors or maintainers:

1. **Read the [Analysis Report](analysis.md)** for project overview
2. **Review [Architecture](architecture.md)** for technical understanding
3. **Follow [Recommendations](recommendations.md)** for improvement priorities
4. **Check [Tumblr Config](tumblr-config.md)** for API setup

## Documentation Standards

### File Organization
- Use descriptive filenames with `.md` extension
- Group related documents in subdirectories
- Include table of contents for documents >5 sections

### Content Guidelines
- Use consistent Markdown formatting
- Include code examples where relevant
- Add last-updated timestamps to living documents
- Cross-reference related documentation

### Templates
When creating new documentation, reference existing files for:
- Header structure and formatting
- Code block usage and syntax highlighting
- Table and list formatting
- Cross-linking patterns

## Contributing to Documentation

### Process
1. Identify documentation gaps from [analysis](analysis.md) or [recommendations](recommendations.md)
2. Create or update documents following established patterns
3. Ensure cross-references are updated
4. Test any included code examples
5. Update this README if adding new top-level documents

### Standards
- Keep language clear and accessible
- Use active voice and present tense
- Include practical examples and code snippets
- Maintain consistent terminology throughout

## Related Resources

- **Main README**: `../README.md` - Basic project information
- **Repository**: https://github.com/MichaelPaulukonis/napogenmo2016
- **Live Demo**: https://poeticalbot.tumblr.com/
- **Tumblr API Docs**: https://www.tumblr.com/docs/en/api/v2

---

**Last Updated**: September 22, 2025
**Documentation Version**: 1.0