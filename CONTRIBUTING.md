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

Currently, testing is manual. Before submitting a PR:

1. Test endpoint creation
2. Test webhook capture
3. Test real-time updates
4. Test response configuration
5. Test all copy/export functions
6. Test on different browsers
7. Test error scenarios

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
