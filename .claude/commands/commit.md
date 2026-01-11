# Commit Changes

Before committing, perform these verification steps:

## 1. Build Frontend
```bash
cd frontend && npm run build
```
This must pass. If it fails, fix the errors before proceeding.

## 2. Review Changes
```bash
git status
git diff --stat
```
Understand what's being committed.

## 3. Check TODO.md
If any completed work relates to TODO items:
- Update TODO.md FIRST
- Move completed items to the "Completed" section with today's date
- Add a brief summary of what was done

## 4. Create Commit
Use conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `docs:` - Documentation only
- `chore:` - Maintenance tasks

Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` in commit message.

## 5. Push
```bash
git push
```

---

**Never skip the build verification step.** The frontend must build successfully before committing.
