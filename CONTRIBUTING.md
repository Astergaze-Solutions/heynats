# Contributing to HeyNATS 🤝

First off, thank you for considering contributing to HeyNATS! It's people like you that make HeyNATS such a great tool for the NATS community. 

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [How Can I Contribute?](#-how-can-i-contribute)
- [Development Setup](#-development-setup)
- [Coding Standards](#-coding-standards)
- [Commit Guidelines](#-commit-guidelines)
- [Pull Request Process](#-pull-request-process)
- [Issue Guidelines](#-issue-guidelines)
- [Community](#-community)

## 📖 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful, inclusive, and constructive in all interactions.

### Our Standards

**Examples of behavior that contributes to a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- Harassment, trolling, or discriminatory comments
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## 🚀 Getting Started

### Quick Contribution Checklist

- [ ] Fork the repository
- [ ] Create a feature branch from `develop`
- [ ] Make your changes
- [ ] Add/update tests if needed
- [ ] Run tests and linting
- [ ] Commit with a clear message
- [ ] Push and create a Pull Request

## 🛠️ How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check the [existing issues](https://github.com/Astergaze-Solutions/heynats/issues) to avoid duplicates.

**When filing a bug report, please include:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots (if applicable)
- Environment information:
  - OS and version
  - Browser and version
  - Go version
  - Node.js version
  - NATS server version

### 💡 Suggesting Enhancements

Enhancement suggestions are welcome! Please:
- Use a clear, descriptive title
- Provide detailed description of the proposed feature
- Explain why this enhancement would be useful
- Consider the scope and complexity

### 📝 Improving Documentation

Documentation improvements are always appreciated:
- Fix typos or unclear explanations
- Add examples or use cases
- Improve API documentation
- Add or update screenshots
- Translate documentation

### 💻 Code Contributions

- **Frontend**: React/TypeScript improvements, UI/UX enhancements
- **Backend**: Go API improvements, NATS integration features
- **DevOps**: Docker, CI/CD, deployment improvements
- **Testing**: Unit tests, integration tests, e2e tests

## 🔧 Development Setup

### Prerequisites

```bash
# Required tools
go version    # 1.24.0+
node --version # 18+
pnpm --version

# Required for development (enforces code quality)
lefthook --version # For Git hooks - REQUIRED for conventional commits
commitlint --version # For commit message validation - REQUIRED

# Optional but recommended
air --version     # For Go hot reload
```

> **⚠️ Important**: Lefthook + Commitlint are **required** for development as they enforce:
> - Conventional commit message format (commitlint)
> - Code linting and formatting (lefthook)
> - Pre-commit quality checks (lefthook)
> - Prevents commits that don't meet project standards

### Setup Instructions

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then:
   git clone https://github.com/your-username/heynats.git
   cd heynats
   
   # Add upstream remote
   git remote add upstream https://github.com/Astergaze-Solutions/heynats.git
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies
   make install
   
   # Or manually:
   go mod tidy
   cd client && pnpm install && cd ..
   ```

3. **Setup Development Tools (REQUIRED)**
   ```bash
   # Install commitlint (REQUIRED - validates commit messages)
   npm install -g @commitlint/cli @commitlint/config-conventional
   
   # Install lefthook (REQUIRED - enforces commit standards)
   go install github.com/evilmartians/lefthook@latest
   
   # Install Git hooks - THIS IS MANDATORY
   lefthook install
   
   # Install optional development tools
   go install github.com/air-verse/air@latest  # For Go hot reload
   ```

   > **🔒 What these tools do:**
   > - **Commitlint**: Validates commit message format against conventional commits
   > - **Lefthook**: Orchestrates Git hooks and runs quality checks
   >   - **Pre-commit**: Runs linting, formatting, and tests
   >   - **Commit-msg**: Calls commitlint to validate message format
   >   - **Pre-push**: Runs additional quality checks
   > - **Prevents**: Bad commits from entering the repository

   **After installation, your commits will be automatically validated:**
   ```bash
   # ✅ This will work
   git commit -m "feat(api): add stream deletion endpoint"
   
   # ❌ This will be rejected
   git commit -m "fixed some stuff"
   ```

4. **Start Development**
   ```bash
   # Start both frontend and backend with hot reload
   make dev-full
   
   # Or separately:
   make dev          # Frontend only (React dev server)
   make dev-server   # Backend only (with air hot reload)
   ```

### Development URLs

- **Frontend**: http://localhost:5173 (React dev server)
- **Backend API**: http://localhost:5000 (Go server)
- **Production Build**: http://localhost:5000 (serves both)

### 🔧 Development Tools Troubleshooting

**If commit validation is not working:**
```bash
# Check if commitlint is installed
commitlint --version

# Test commit message validation
echo "feat: add new feature" | commitlint

# Check if lefthook is installed
lefthook version

# Reinstall hooks
lefthook install

# Check hook configuration
lefthook run pre-commit --verbose

# Skip hooks temporarily (NOT recommended)
git commit -m "message" --no-verify
```

**Common validation failures:**
- ❌ **Commit message format**: Must follow `type(scope): description` (validated by commitlint)
- ❌ **Linting errors**: Fix with `make lint` or `pnpm lint`
- ❌ **Test failures**: All tests must pass before commit
- ❌ **Formatting**: Run `gofmt` or `prettier` to fix
- ❌ **Commitlint not found**: Install with `npm install -g @commitlint/cli @commitlint/config-conventional`

## 📏 Coding Standards

### Go Backend

```go
// Use gofmt and goimports
go fmt ./...
goimports -w .

// Follow effective Go guidelines
// Use meaningful names
// Add comments for exported functions
// Handle errors properly

// Example function structure:
// GetStreams retrieves all JetStream streams for a given connection
func (c *Client) GetStreams(ctx context.Context, connectionID string) ([]StreamInfo, error) {
    if connectionID == "" {
        return nil, fmt.Errorf("connection ID is required")
    }
    // Implementation...
}
```

### TypeScript Frontend

```typescript
// Use consistent naming conventions
// PascalCase for components, interfaces, types
// camelCase for variables, functions
// SCREAMING_SNAKE_CASE for constants

// Example component structure:
interface ConnectionCardProps {
  connection: Connection;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConnectionCard({ connection, onEdit, onDelete }: ConnectionCardProps) {
  // Implementation...
}

// Use TypeScript strictly
// No 'any' types unless absolutely necessary
// Prefer interfaces over types for object shapes
```

### General Guidelines

- **Formatting**: Use project's ESLint/Prettier/gofmt configuration
- **Documentation**: Document public APIs and complex logic
- **Testing**: Write tests for new features and bug fixes
- **Performance**: Consider performance implications of changes
- **Security**: Follow security best practices

## 📝 Commit Guidelines

> **🔒 Enforced by Lefthook**: These commit standards are automatically enforced by our Git hooks. Invalid commits will be rejected.

### Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(api): add stream deletion endpoint

Add DELETE /api/streams/:id endpoint to allow users to delete
JetStream streams through the web interface.

Closes #123

fix(ui): resolve connection status indicator flickering

The status indicator was updating too frequently due to
WebSocket reconnection logic. Added debouncing to improve UX.

docs(readme): update installation instructions

Added Docker setup instructions and troubleshooting section.
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update from upstream**
   ```bash
   git fetch upstream
   git checkout develop
   git merge upstream/develop
   git checkout your-feature-branch
   git rebase develop
   ```

2. **Run Tests & Linting**
   ```bash
   # Backend
   go test ./...
   go vet ./...
   
   # Frontend
   cd client
   pnpm test
   pnpm lint
   pnpm type-check
   ```

3. **Build Successfully**
   ```bash
   make build
   ```

### PR Checklist

- [ ] PR title follows commit message format
- [ ] Description explains the what and why
- [ ] Tests added/updated for changes
- [ ] Documentation updated if needed
- [ ] No merge conflicts with `develop`
- [ ] All checks passing
- [ ] Screenshots for UI changes

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Screenshots attached (if UI changes)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template and include:
- **Environment**: OS, browser, versions
- **Reproduction steps**: Clear, step-by-step instructions
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable
- **Logs**: Any relevant error messages

### Feature Requests

Use the feature request template and include:
- **Problem**: What problem does this solve?
- **Solution**: Proposed solution
- **Alternatives**: Other solutions considered
- **Additional context**: Any other relevant information

## 👥 Community

### Getting Help

- **Documentation**: Check [docs/](docs/) directory
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **NATS Community**: Join [NATS Slack](https://nats.io/community/)

### Recognition

Contributors are recognized in our [README](README.md#authors) automatically via contrib.rocks. Active contributors may be invited to become maintainers.

## 🎉 Thank You!

Your contributions make HeyNATS better for everyone in the NATS community. Whether you're fixing a typo, reporting a bug, or adding a major feature, every contribution matters!

---

<div align="center">
  <p>Questions? Feel free to reach out by creating an issue or discussion!</p>
  <p>Happy contributing! 🚀</p>
</div>