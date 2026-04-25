# Contributing to HookLens

Thank you for your interest in contributing to HookLens! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/Vansh-Sharma27/hooklens/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Your environment (Node version, OS, browser)
   - Screenshots if applicable

### Suggesting Features

1. Check existing issues and discussions
2. Create a new issue with:
   - Clear use case description
   - Why this feature would be useful
   - Proposed implementation (if you have ideas)

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/Vansh-Sharma27/hooklens.git
cd hooklens

# Install dependencies
npm install

# Start development server
npm run dev
```

## Code Style

- Use 2-space indentation
- Use semicolons
- Use single quotes for strings
- Comment complex logic
- Keep functions small and focused
- Follow existing code patterns

## Project Structure

- `server/` - Backend code (Node.js/Express)
- `client/` - Frontend code (Vanilla JS)
- Keep server and client code separate
- Use ES6+ features
- No build step required

## Testing

```bash
npm test
```

The suite lives in `tests/` and uses the built-in `node:test` runner, so there
is nothing extra to install. It runs against the in-memory store on an ephemeral
port and does not touch `data/`.

For a change that fixes a bug, add a test that fails before the fix and passes
after. For a new feature, cover the expected behaviour plus the validation and
failure paths.

The server side is covered by tests; the browser UI is not. Before submitting a
PR, also check manually:

1. Real-time updates arrive over the WebSocket
2. Response configuration is applied
3. Copy and export actions work
4. Behaviour on a narrow viewport

Performance-sensitive changes to the capture path should be measured with the
harness in `bench/`; see `bench/README.md` for the recorded baseline.

## Commit Messages

Use clear, descriptive commit messages:

```
Add request forwarding feature
Fix WebSocket reconnection issue
Update README with deployment instructions
```

## Questions?

Feel free to ask questions in:
- GitHub Issues
- Pull Request comments
- Discussions tab

Thank you for contributing!
