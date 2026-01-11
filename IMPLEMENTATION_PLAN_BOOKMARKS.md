# Session Bookmarks Implementation Plan - SQLite First

## Overview
Mark important moments in Claude Code sessions with categories and notes. Find and jump to bookmarked events across all sessions.

## Database Architecture

### Schema
```sql
CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_index INTEGER NOT NULL,

    -- Denormalized session/event metadata (for fast queries without file reads)
    project_name TEXT,
    git_branch TEXT,
    event_timestamp TIMESTAMP,        -- When the event happened in session
    event_type TEXT,                  -- user/assistant/tool_use/etc

    -- User data
    category TEXT DEFAULT 'general',
    note TEXT,

    -- Bookmark metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(session_id, event_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_session_id ON bookmarks(session_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_event_timestamp ON bookmarks(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_project_name ON bookmarks(project_name);
```

### Database Location
`~/.claude-log-converter/bookmarks.db`

### Configuration
- WAL mode for better concurrency
- 5 second timeout for write locks
- Connection-per-request pattern
- Initialize on app startup

## Categories (Fixed List)
- `general` - Default
- `important` - "Come back to this"
- `question` - Need clarification
- `bug` - Error or issue
- `reference` - Useful code/pattern

## API Endpoints

```
POST   /api/bookmarks                   Create bookmark
GET    /api/bookmarks                   List with filters and sorting
GET    /api/bookmarks/{id}              Get specific bookmark
PUT    /api/bookmarks/{id}              Update (category, note)
DELETE /api/bookmarks/{id}              Delete bookmark
GET    /api/bookmarks/session/{id}      Get all bookmarks for session
DELETE /api/bookmarks/session/{id}      Delete all bookmarks for session
```

### List Bookmarks Query Parameters
- `session_id` - Filter by session
- `project` - Filter by project name
- `category` - Filter by category
- `search` - Search in notes (LIKE query)
- `offset` - Pagination offset (default: 0)
- `limit` - Pagination limit (default: 50, max: 200)
- `order_by` - Sort field: `created_at` (default), `event_timestamp`, `updated_at`
- `order` - Sort direction: `desc` (default), `asc`

### Sorting Behavior
**Default:** `order_by=created_at&order=desc` (newest bookmarks first)
- Shows what you most recently marked as important
- Useful for "what did I bookmark today?"

**Event Time Sort:** `order_by=event_timestamp&order=desc` (newest events first)
- Shows bookmarks in chronological order of when events happened
- Useful for "show bookmarks from this session in timeline order"

**User Control:** Dropdown in UI to switch between sort modes

## Request/Response Models

### BookmarkCreate
```python
class BookmarkCreate(BaseModel):
    session_id: str
    event_id: str
    event_index: int
    project_name: str | None = None
    git_branch: str | None = None
    event_timestamp: datetime | None = None
    event_type: str | None = None
    category: str = "general"
    note: str | None = None
```

### Bookmark
```python
class Bookmark(BaseModel):
    id: int
    session_id: str
    event_id: str
    event_index: int
    project_name: str | None = None
    git_branch: str | None = None
    event_timestamp: datetime | None = None
    event_type: str | None = None
    category: str
    note: str | None = None
    created_at: datetime
    updated_at: datetime
```

### PaginatedBookmarksResponse
```python
class PaginatedBookmarksResponse(BaseModel):
    data: list[Bookmark]
    total: int
    offset: int
    limit: int
    has_more: bool
```

## Backend Implementation

### File Structure
```
app/
├── models/bookmark.py              # NEW: Pydantic models
├── services/database.py            # NEW: DB connection + init
├── services/bookmark_service.py    # NEW: CRUD operations
├── api/routes/bookmarks.py         # NEW: API endpoints
├── config.py                       # UPDATE: Add bookmark_db_path
└── main.py                         # UPDATE: Init DB + register router
```

### Key Functions

**database.py:**
- `init_database()` - Create tables and indexes on startup
- `get_db_connection()` - Context manager for connections
- `get_db()` - FastAPI dependency

**bookmark_service.py:**
- `create_bookmark(conn, data)` - Insert bookmark, handle duplicates
- `get_bookmark(conn, bookmark_id)` - Fetch by ID
- `list_bookmarks(conn, filters...)` - Query with filters, sorting, pagination
- `update_bookmark(conn, bookmark_id, data)` - Update category/note
- `delete_bookmark(conn, bookmark_id)` - Delete by ID
- `get_session_bookmarks(conn, session_id)` - All bookmarks for session
- `delete_session_bookmarks(conn, session_id)` - Bulk delete

**bookmarks.py (routes):**
- Map HTTP requests to service functions
- Handle FastAPI dependency injection
- Return proper status codes (201, 404, 409)

## Frontend Implementation

### File Structure
```
frontend/src/
├── stores/bookmarkStore.ts                      # NEW: State management
├── services/api.ts                              # UPDATE: Add bookmark functions
├── services/types.ts                            # UPDATE: Add Bookmark types
├── components/bookmarks/
│   ├── BookmarkButton.tsx                       # NEW: Toggle in timeline
│   ├── BookmarkBadge.tsx                        # NEW: Visual indicator
│   ├── BookmarkDialog.tsx                       # NEW: Create/edit modal
│   ├── BookmarkCard.tsx                         # NEW: Individual bookmark
│   └── BookmarkList.tsx                         # NEW: Virtual scrolling list
├── pages/BookmarksPage.tsx                      # NEW: Main bookmarks view
├── components/timeline/TimelineEvent.tsx        # UPDATE: Add button
└── App.tsx                                      # UPDATE: Add /bookmarks route
```

### Bookmark Store (Zustand)

```typescript
interface BookmarkState {
  bookmarks: Bookmark[];
  sessionBookmarks: Map<string, Set<string>>;  // session_id -> event_ids
  loading: boolean;
  error: string | null;

  // Filters and sorting
  filters: BookmarkFilters;
  sortBy: 'created_at' | 'event_timestamp';
  sortOrder: 'asc' | 'desc';

  // Actions
  fetchBookmarks: () => Promise<void>;
  fetchSessionBookmarks: (sessionId: string) => Promise<void>;
  createBookmark: (data: BookmarkCreate) => Promise<void>;
  updateBookmark: (id: number, data: BookmarkUpdate) => Promise<void>;
  deleteBookmark: (id: number) => Promise<void>;
  toggleBookmark: (event, session) => Promise<void>;
  isBookmarked: (sessionId: string, eventId: string) => boolean;
  setSortBy: (sortBy: 'created_at' | 'event_timestamp') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
}
```

### UI Components

**BookmarkButton** (in TimelineEvent)
- Icon: `Bookmark` (empty) or `BookmarkCheck` (filled)
- Shows on hover over event header
- Click opens BookmarkDialog
- Color: yellow when bookmarked

**BookmarkDialog**
- Category dropdown (5 fixed categories)
- Note textarea (500 char limit with counter)
- Context preview (auto-filled, first 300 chars, read-only)
- Save/Cancel buttons

**BookmarksPage**
- Header with filters: category chips, project dropdown, search input
- **Sort dropdown:**
  - Bookmarked (newest) - default
  - Bookmarked (oldest)
  - Event time (newest)
  - Event time (oldest)
- Virtual scrolling list of BookmarkCards
- Empty state: "No bookmarks yet. Start bookmarking important moments!"

**BookmarkCard**
- Category badge with color
- Truncated note (with "Show more")
- Session metadata: project, branch, timestamp
- "Jump to event" button → `/session/:id#event-:eventId`
- Edit/Delete actions

**BookmarkBadge** (in TimelineEvent)
- Small colored badge on bookmarked events
- Category-specific colors
- Shows category icon
- Click to open edit dialog

### Deep Linking
Format: `/session/:sessionId#event-:eventId`
- Timeline scrolls to event using `virtualizer.scrollToIndex(event_index)`
- Brief highlight flash (yellow background fade)

## Implementation Phases

### Phase 1: Backend Foundation (Day 1)
- [ ] Create `app/services/database.py` with schema and init
- [ ] Create `app/models/bookmark.py` with Pydantic models
- [ ] Create `app/services/bookmark_service.py` with CRUD
- [ ] Create `app/api/routes/bookmarks.py` with endpoints
- [ ] Update `app/config.py` with bookmark_db_path
- [ ] Update `app/main.py` to init DB and register router
- [ ] Test API with curl/Postman

### Phase 2: Frontend Core (Day 2)
- [ ] Add bookmark API functions to `api.ts`
- [ ] Add Bookmark types to `types.ts`
- [ ] Create `bookmarkStore.ts` with state management
- [ ] Create `BookmarkButton.tsx` component
- [ ] Add button to `TimelineEvent.tsx`
- [ ] Test: Click button, bookmark created, persists on refresh

### Phase 3: Bookmark Dialog & Badge (Day 2)
- [ ] Create `BookmarkDialog.tsx` with category/note form
- [ ] Create `BookmarkBadge.tsx` component
- [ ] Add badge rendering to `TimelineEvent.tsx`
- [ ] Wire up create/update flows
- [ ] Test: Add notes, change categories, see badges

### Phase 4: Bookmarks Page (Day 3)
- [ ] Create `BookmarksPage.tsx` with layout
- [ ] Create `BookmarkCard.tsx` component
- [ ] Create `BookmarkList.tsx` with virtual scrolling
- [ ] Add filtering UI (category, project, search)
- [ ] **Add sort dropdown with 4 options**
- [ ] Add route to `App.tsx`
- [ ] Add sidebar link with count badge
- [ ] Implement deep linking (scroll to event)

### Phase 5: Polish & Edge Cases (Day 3-4)
- [ ] Handle orphaned bookmarks (session not found)
- [ ] Loading and error states
- [ ] Optimistic updates for toggle
- [ ] Empty states
- [ ] Dark mode colors
- [ ] Keyboard shortcut (Ctrl+B)
- [ ] Update TODO.md
- [ ] Build frontend and test full flow

## Edge Cases

### Handled
- **Duplicate bookmarks:** UNIQUE constraint returns 409 error
- **Orphaned bookmarks:** Show "Session not found" in card, disable jump
- **Write locks:** WAL mode + timeout + retry logic
- **Event ID changes:** Use event_index as fallback for scrolling
- **Deleted sessions:** Bookmarks persist, show unavailable state
- **Cross-tab sync:** Optimistic updates + manual refresh pattern

### Not Handled (Future)
- Bulk delete operations
- Export/import bookmarks
- FTS5 full-text search
- Bookmark sharing
- Multi-device sync

## Testing Checklist

### Backend
- [ ] Database initializes on startup
- [ ] Create bookmark succeeds
- [ ] Create duplicate returns 409
- [ ] List bookmarks with no filters
- [ ] List bookmarks with category filter
- [ ] List bookmarks with project filter
- [ ] List bookmarks with search filter
- [ ] **List bookmarks sorted by created_at DESC (default)**
- [ ] **List bookmarks sorted by event_timestamp DESC**
- [ ] **List bookmarks sorted by created_at ASC**
- [ ] **List bookmarks sorted by event_timestamp ASC**
- [ ] Pagination works (offset/limit)
- [ ] Update bookmark changes fields
- [ ] Delete bookmark removes from DB
- [ ] Get session bookmarks returns all

### Frontend
- [ ] Bookmark button appears on hover
- [ ] Click button opens dialog
- [ ] Create bookmark shows badge
- [ ] Badge persists after refresh
- [ ] Bookmarks page loads list
- [ ] Category filter works
- [ ] Project filter works
- [ ] Search filter works
- [ ] **Sort dropdown changes order**
- [ ] **Default sort is "Bookmarked (newest)"**
- [ ] **Switching to "Event time" re-sorts correctly**
- [ ] Jump to event scrolls correctly
- [ ] Edit bookmark updates UI
- [ ] Delete bookmark removes badge
- [ ] Dark mode colors work

## Success Criteria

- User can bookmark any event in < 3 clicks
- Bookmarks persist across app restarts
- Jump to event scrolls to correct position
- List 100 bookmarks loads in < 500ms
- **Default view shows newest bookmarks first**
- **User can switch to chronological event order**
- No data loss (SQLite persistence)
- Clean error handling (no crashes)

## Future Enhancements (Not in Scope)

- Text selection within events (granular bookmarks)
- User-defined categories
- FTS5 full-text search on notes
- Export bookmarks to JSON/Markdown
- Bulk operations (delete multiple)
- Bookmark collections/tags
- Collaboration (share bookmarks)
- WebSocket live updates
