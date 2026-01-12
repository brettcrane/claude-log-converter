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

## Floating Context Badge / Active Event Detection

**CRITICAL RECURRING ISSUE**: The floating badge and left-border active indicator in the Timeline component break easily during refactors.

### Root Cause
The scroll detection code in `Timeline.tsx` needs to handle TWO different scroll scenarios:

1. **Container scrolling** - When the Timeline's `parentRef` div has `overflow-auto` and is actually scrolling
2. **Window scrolling** - When the page/window scrolls (can happen with certain layout/Headless UI configurations)

### The Fix (MUST use hybrid approach)
```typescript
const updateActiveItem = () => {
  const containerCanScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;

  let targetPosition: number;

  if (containerCanScroll && scrollContainer.scrollTop > 0) {
    // Container is scrolling - use container scroll position
    targetPosition = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
  } else {
    // Window is scrolling - calculate position relative to container
    const containerRect = scrollContainer.getBoundingClientRect();
    const viewportMiddle = window.innerHeight / 2;
    targetPosition = viewportMiddle - containerRect.top;
  }
  // ... rest of detection logic
};

// Listen to BOTH scroll sources
scrollContainer.addEventListener('scroll', updateActiveItem, { passive: true });
window.addEventListener('scroll', updateActiveItem, { passive: true });
```

### Why This Breaks
- IntersectionObserver doesn't work with virtual scrolling (elements created/destroyed)
- Headless UI Tab components can break CSS height chains, causing window scroll instead of container scroll
- Using only `scrollContainer.scrollTop` fails when window is scrolling
- Using only `getBoundingClientRect()` fails when container is scrolling

### Related Commits
- `968a02d` - Fix floating context badge scroll detection (original fix)
- `8e487c7` - Fix: Restore floating badge (attempted fix that broke again)
- Check git history for "floating badge" or "active event" for full context
