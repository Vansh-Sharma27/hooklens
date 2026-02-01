# Git Setup Guide for HookLens

This guide provides step-by-step Git commands to initialize your repository and push to GitHub.

## Prerequisites

1. **Git installed**: Verify with `git --version`
2. **GitHub account**: Create one at https://github.com if you don't have one
3. **Git configured**: Set your identity if not already done:
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## Step-by-Step Git Commands

### 1. Initialize Git Repository

Open Git Bash in the `hooklens` directory and run:

```bash
# Navigate to project directory (if not already there)
cd "c:/Users/trash/Webhook Debugger/hooklens"

# Initialize git repository
git init

# Verify .gitignore exists (should already be there)
cat .gitignore
```

### 2. Stage All Files

```bash
# Add all files to staging area
git add .

# Check status to see what will be committed
git status
```

Expected output should show:
- `server/` directory with all backend files
- `client/` directory with all frontend files
- `package.json` and `package-lock.json`
- `.env.example`
- `.gitignore`
- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

Note: `node_modules/` and `.env` should NOT appear (they're in .gitignore)

### 3. Create Initial Commit

```bash
# Commit with descriptive message
git commit -m "Initial commit: HookLens v1.0.0

- Complete webhook debugger implementation
- Real-time request capture with WebSocket
- Configurable response settings
- Dark theme UI with Tailwind CSS
- In-memory storage with 24h endpoint expiration
- Full API documentation
- MIT License"
```

### 4. Create GitHub Repository

**Option A: Via GitHub Website**
1. Go to https://github.com/new
2. Repository name: `hooklens`
3. Description: `Webhook debugger - capture, inspect, and debug HTTP requests in real-time`
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

**Option B: Via GitHub CLI** (if you have `gh` installed)
```bash
# Install GitHub CLI first if needed: https://cli.github.com/

# Login to GitHub
gh auth login

# Create repository
gh repo create hooklens --public --source=. --remote=origin --description="Webhook debugger - capture, inspect, and debug HTTP requests in real-time"
```

### 5. Add Remote Origin

If you created the repo via website (Option A), add the remote:

```bash
# Add your GitHub repository as remote origin
git remote add origin https://github.com/Vansh-Sharma27/hooklens.git

# Verify remote was added
git remote -v
```

Expected output:
```
origin  https://github.com/Vansh-Sharma27/hooklens.git (fetch)
origin  https://github.com/Vansh-Sharma27/hooklens.git (push)
```

### 6. Push to GitHub

```bash
# Rename branch to main (if it's currently master)
git branch -M main

# Push to GitHub
git push -u origin main
```

You may be prompted to authenticate:
- **HTTPS**: Enter your GitHub username and Personal Access Token (not password)
- **SSH**: Ensure your SSH key is set up with GitHub

### 7. Verify Upload

Visit your repository:
```
https://github.com/Vansh-Sharma27/hooklens
```

You should see:
- All your files and folders
- README.md rendered on the homepage
- License badge
- Repository description

## Create a Release (Optional but Recommended)

```bash
# Create a git tag for v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0: Initial stable release

Features:
- Real-time webhook capture
- Request inspection with JSON highlighting
- Configurable responses
- Developer utilities (cURL export, etc.)
- Dark theme UI
- WebSocket real-time updates"

# Push the tag to GitHub
git push origin v1.0.0
```

Then on GitHub:
1. Go to your repository
2. Click "Releases" (right sidebar)
3. Click "Draft a new release"
4. Choose tag: `v1.0.0`
5. Release title: `HookLens v1.0.0 - Initial Release`
6. Copy description from CHANGELOG.md
7. Click "Publish release"

## Add Topics/Tags (Recommended)

On your GitHub repository page:
1. Click the gear icon next to "About"
2. Add topics:
   - `webhook`
   - `debugger`
   - `developer-tools`
   - `nodejs`
   - `express`
   - `websocket`
   - `real-time`
   - `testing`
   - `debugging`
3. Add website URL (if deployed): `https://your-domain.com`
4. Click "Save changes"

## Set Up GitHub Pages for Documentation (Optional)

If you want to host documentation:

```bash
# Create a docs branch
git checkout -b gh-pages

# Add documentation (or keep README)
# Commit and push
git push -u origin gh-pages

# Switch back to main
git checkout main
```

Then on GitHub:
1. Settings → Pages
2. Source: Deploy from branch
3. Branch: `gh-pages` / `root`
4. Save

## Future Workflow

### Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, then stage and commit
git add .
git commit -m "Add your feature description"

# Push to GitHub
git push -u origin feature/your-feature-name

# Create Pull Request on GitHub
# After merging, switch back to main and pull
git checkout main
git pull origin main
```

### Updating Version

When releasing a new version:

```bash
# Update version in package.json
# Update CHANGELOG.md

# Commit changes
git add package.json CHANGELOG.md
git commit -m "Bump version to v1.1.0"

# Create tag
git tag -a v1.1.0 -m "Release v1.1.0"

# Push commits and tags
git push origin main
git push origin v1.1.0

# Create release on GitHub
```

## Useful Git Commands

```bash
# Check status
git status

# View commit history
git log --oneline

# View changes
git diff

# Undo uncommitted changes
git checkout -- filename

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View branches
git branch -a

# Delete local branch
git branch -d branch-name

# Pull latest changes
git pull origin main
```

## Troubleshooting

### Authentication Issues

If push fails with authentication error:

**For HTTPS:**
```bash
# Generate a Personal Access Token on GitHub:
# Settings → Developer settings → Personal access tokens → Generate new token
# Permissions: repo (full control)

# Use token as password when prompted
```

**For SSH:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Copy public key
cat ~/.ssh/id_ed25519.pub

# Add to GitHub: Settings → SSH and GPG keys → New SSH key

# Change remote to SSH
git remote set-url origin git@github.com:Vansh-Sharma27/hooklens.git
```

### Large Files Error

If you accidentally committed `node_modules/`:

```bash
# Remove from git tracking
git rm -r --cached node_modules/

# Ensure .gitignore includes node_modules/
echo "node_modules/" >> .gitignore

# Commit the fix
git add .gitignore
git commit -m "Remove node_modules from tracking"
```

### Wrong Commit Message

```bash
# Amend last commit message (only if not pushed yet)
git commit --amend -m "New commit message"
```

## Summary of Commands (Quick Reference)

```bash
# 1. Initialize and commit
cd "c:/Users/trash/Webhook Debugger/hooklens"
git init
git add .
git commit -m "Initial commit: HookLens v1.0.0"

# 2. Add remote
git remote add origin https://github.com/Vansh-Sharma27/hooklens.git

# 3. Push to GitHub
git branch -M main
git push -u origin main

# 4. Create release tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

**You're all set!** Your HookLens project is now version-controlled and on GitHub.
