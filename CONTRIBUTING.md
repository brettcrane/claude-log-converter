# Contributing to Claude Log Converter

Thank you for your interest in contributing to Claude Log Converter! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Testing Your Changes](#testing-your-changes)
- [Common Issues](#common-issues)
- [Questions](#questions)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and constructive in all communications
- Welcome newcomers and help them get started
- Focus on what is best for the community and the project
- Show empathy towards other community members

We're all here to build something useful together.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-log-converter.git
   cd claude-log-converter
   ```
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following the guidelines below
5. **Submit a pull request** back to the main repository

## Development Setup

### Prerequisites

- Python 3.12 or higher
- Node.js 18 or higher
- npm (comes with Node.js)

### Quick Setup

If a setup script is available:
```bash
git clone https://github.com/YOUR_USERNAME/claude-log-converter.git
cd claude-log-converter
./setup.sh
```

### Manual Setup

**Backend (Python/FastAPI):**
```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

**Frontend (React/TypeScript):**
```bash
cd frontend
npm install
cd ..
```

### Running the App

**Production mode:**
```bash
source .venv/bin/activate
cd frontend && npm run build && cd ..
python run.py
```

The app will be available at http://localhost:8000

**Development mode (with hot reload):**

```bash
# Terminal 1: Backend
source .venv/bin/activate
python run.py

# Terminal 2: Frontend dev server
cd frontend
npm run dev
```

The frontend dev server runs on http://localhost:5173 with hot module replacement (HMR), automatically proxying API requests to the backend on port 8000. This provides instant feedback when making frontend changes.

## Code Style

### Python

We use [ruff](https://github.com/astral-sh/ruff) for Python linting and formatting.

```bash
# Check for linting issues
ruff check app/

# Auto-fix issues where possible
ruff check app/ --fix
```

Key guidelines:
- Follow PEP 8 conventions
- Use type hints for function signatures
- Write docstrings for public functions and classes
- Keep functions focused and reasonably sized

### TypeScript/React

- Use TypeScript strict mode
- Follow existing component patterns in the codebase
- Prefer functional components with hooks
- Use Tailwind CSS for styling (no custom CSS unless necessary)
- Keep components focused on a single responsibility

Key guidelines:
- Use meaningful variable and function names
- Destructure props for clarity
- Handle loading and error states appropriately
- Use Zustand stores for shared state

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Run all checks:**
   ```bash
   # Python linting
   ruff check app/

   # Build frontend
   cd frontend && npm run build && cd ..

   # Verify app starts
   python run.py
   ```

4. **Commit with clear messages:**
   ```bash
   git commit -m "feat: add new feature description"
   ```
   We follow [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `refactor:` for code refactoring
   - `style:` for formatting changes
   - `test:` for adding tests
   - `chore:` for maintenance tasks

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Submit a PR** with a clear description of your changes

### PR Guidelines

- **Keep PRs focused** on a single feature or fix
- **Write a clear description** explaining what and why
- **Update documentation** if your changes affect user-facing behavior
- **Add tests** for new functionality when applicable
- **Ensure backwards compatibility** when possible
- **Respond to review feedback** promptly and constructively

### Review Process

- PRs will be reviewed by maintainers
- Feedback will be provided through GitHub comments
- Once approved, your PR will be merged into `main`

## Project Structure

```
claude-log-converter/
├── app/                      # FastAPI backend
│   ├── api/routes/           # API endpoint handlers
│   ├── services/             # Business logic
│   │   ├── log_parser.py     # JSONL file parsing
│   │   ├── session_db.py     # SQLite database operations
│   │   └── session_indexer.py # Search indexing with FTS5
│   ├── models/               # Pydantic schemas
│   └── mcp_server.py         # MCP server for Claude Code integration
│
├── frontend/                 # React frontend source
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route page components
│   │   ├── stores/           # Zustand state management
│   │   └── services/         # API client
│   ├── package.json
│   └── vite.config.ts
│
├── static/                   # Built frontend (gitignored)
├── archive/                  # Legacy/unmaintained code
├── .claude/                  # Claude Code configuration
│   ├── commands/             # Custom slash commands
│   └── skills/               # Domain knowledge docs
│
├── run.py                    # Application entry point
├── requirements.txt          # Python dependencies
├── CLAUDE.md                 # Claude Code instructions
├── TODO.md                   # Pending work items
└── README.md                 # Project documentation
```

### Key Files

| File | Purpose |
|------|---------|
| `run.py` | Single entry point for the web application |
| `app/services/log_parser.py` | Parses JSONL session files |
| `app/services/session_db.py` | SQLite database for fast search |
| `frontend/src/stores/` | Zustand stores for state management |

## Testing Your Changes

### Manual Testing Checklist

Before submitting a PR, verify:

1. **App starts without errors:**
   ```bash
   python run.py
   ```

2. **Frontend builds successfully:**
   ```bash
   cd frontend && npm run build
   ```

3. **Python linting passes:**
   ```bash
   ruff check app/
   ```

4. **Key functionality works:**
   - Session list loads correctly
   - Search returns expected results
   - Session detail view displays properly
   - Export functionality works

### Testing with Sample Data

Sessions are read from `~/.claude/projects/` by default. You can configure an alternative path:
```bash
export CLAUDE_LOG_CLAUDE_PROJECTS_DIR=/path/to/test/data
python run.py
```

## Common Issues

### Virtual Environment Not Activated

If you see import errors, ensure the virtual environment is activated:
```bash
source .venv/bin/activate
```

### Port Already in Use

If port 8000 is occupied:
```bash
# Find and kill the process using the port
lsof -i :8000
kill -9 <PID>
```

### Frontend Changes Not Reflecting

Remember to rebuild the frontend after making changes:
```bash
cd frontend && npm run build
```

Or use the dev server for automatic hot reload:
```bash
cd frontend && npm run dev
```

### SQLite Index Issues

If you encounter database issues, you can safely delete and rebuild:
```bash
rm ~/.claude-log-converter/sessions.db
python run.py  # Index rebuilds automatically
```

For more troubleshooting tips, see `.claude/skills/gotchas.md`.

## Questions?

- **Bug reports:** Open an issue with steps to reproduce
- **Feature requests:** Open an issue describing the use case
- **Questions:** Start a discussion in the repository
- **Security issues:** Please report privately to maintainers

---

Thank you for contributing to Claude Log Converter!
