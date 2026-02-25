# Contributing

Thanks for your interest in app-store-toolkit. Here's how to get involved.

## Setup

```bash
git clone https://github.com/vishalvshekkar/app-store-toolkit.git
cd app-store-toolkit
cd servers/appstore-connect
npm install
npm run build
```

Test the plugin locally:

```bash
claude --plugin-dir /path/to/app-store-toolkit
```

## Project Structure

```
skills/          Slash command definitions (SKILL.md files)
agents/          Specialized AI agent prompts
servers/         MCP server (TypeScript)
hooks/           PostToolUse and SessionStart hooks
scripts/         Build and validation scripts
.claude-plugin/  Plugin manifest and marketplace config
```

The MCP server lives in `servers/appstore-connect/`. It's TypeScript, built with tsup, and exposes tools over stdio.

## Making Changes

1. Fork the repo and create a branch
2. Make your changes
3. Build and test: `cd servers/appstore-connect && npm run build`
4. Open a pull request with a clear description of what changed and why

For skill or agent changes, test them by loading the plugin locally and running the relevant slash command.

## What to Work On

Check [open issues](https://github.com/vishalvshekkar/app-store-toolkit/issues) labeled `good first issue` or `help wanted`. The [roadmap](ROADMAP.md) lists planned features if you want to tackle something bigger.

## Guidelines

- Keep PRs focused. One feature or fix per PR.
- Follow existing code patterns. The codebase uses TypeScript strict mode.
- Skill files are Markdown with YAML frontmatter. Match the format of existing skills.
- Test with a real App Store Connect account if your change touches the API layer.

## Reporting Issues

Use [GitHub Issues](https://github.com/vishalvshekkar/app-store-toolkit/issues). Pick the right template (bug or feature request). Include enough detail to reproduce bugs.

## Questions

Use [GitHub Discussions](https://github.com/vishalvshekkar/app-store-toolkit/discussions) for questions, ideas, or anything that isn't a bug or feature request.
