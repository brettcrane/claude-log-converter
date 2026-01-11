# Gotchas & Common Issues

## Virtual Environment

### Always Use Absolute Paths
When running Python commands, always use the full path or ensure you're in the project root:

```bash
# WRONG - fails if you're in frontend/ or other subdirectory
source .venv/bin/activate

# RIGHT - always works
cd /home/brett-crane/code/claude-log-converter && source .venv/bin/activate
```

### No pip in venv
This venv was created with `uv` and doesn't have pip installed. Use `uv pip` instead:

```bash
# WRONG
pip install package

# RIGHT
uv pip install package
```

## Port Already in Use

If you see `[Errno 98] Address already in use` when starting the server:

```bash
# Kill the process using port 8000
lsof -ti:8000 | xargs -r kill -9
```

## Frontend Build Location

The frontend builds to `static/` in the **project root**, not inside `frontend/`:

```bash
cd frontend && npm run build   # Outputs to ../static/
```

If you're in `frontend/` and run `source .venv/bin/activate`, it will fail because the venv is at the project root.

## Timezone Issues

Session timestamps can be timezone-naive or timezone-aware (UTC). When sorting or comparing:
- Use `_get_sort_time()` helper in `session_indexer.py`
- Always normalize to UTC for comparisons

## Cache Delays

New sessions may not appear immediately due to 5-minute TTL cache. Use the Refresh button in the UI, or call:

```bash
curl -X POST http://localhost:8000/api/sessions/cache/clear
```

## Ruff Linting

**Ruff is installed in the venv** - you must activate it first:

```bash
# WRONG - ruff not found
ruff check app/

# RIGHT - activate venv first
source .venv/bin/activate && ruff check app/

# Or from any directory
cd /home/brett-crane/code/claude-log-converter && source .venv/bin/activate && ruff check app/
```

B008 warnings about `Query()` in function defaults are expected with FastAPI - they're ignored in `ruff.toml`.

Use `--fix` to auto-fix most issues.
