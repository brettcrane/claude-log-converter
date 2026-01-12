# Navigation Redesign - Implementation Plan
## Claude Log Converter - Detailed Technical Specification

**Date**: January 12, 2026
**Status**: Implementation Ready
**Dependencies**: React 18, TypeScript, Tailwind CSS, Headless UI, @tanstack/react-virtual
**Target**: Transform to reading-optimized navigation with world-class UX polish

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [New Component Specifications](#new-component-specifications)
4. [UX Polish & Micro-interactions](#ux-polish--micro-interactions)
5. [Progressive Migration Strategy](#progressive-migration-strategy)
6. [Implementation Phases](#implementation-phases)
7. [Testing & Quality Assurance](#testing--quality-assurance)
8. [Performance Optimization](#performance-optimization)
9. [Accessibility Requirements](#accessibility-requirements)
10. [Rollout & Monitoring](#rollout--monitoring)

---

## Executive Summary

### Goals

Transform the Claude Log Converter from **application-style navigation** to **reading-optimized navigation**:

- **Reclaim screen space**: Remove 224px sidebar, gain 15-20% reading width
- **Add document navigation**: Sticky right-side table of contents for within-session navigation
- **Consolidate navigation**: Single source of truth (top header + right TOC)
- **Enhance UX polish**: Smooth animations, progressive disclosure, keyboard shortcuts
- **Maintain functionality**: Zero feature regression, all current capabilities preserved

### Success Metrics

- ✅ **Screen utilization**: +15-20% content width on desktop
- ✅ **Navigation efficiency**: Reduce clicks to navigate within session (baseline: scroll only → target: 1-click TOC navigation)
- ✅ **Performance**: No degradation in render time, smooth 60fps scrolling
- ✅ **Accessibility**: WCAG 2.1 AA compliance maintained
- ✅ **User satisfaction**: Positive feedback from internal testing

---

## Current Architecture Analysis

### Component Tree

```
App (React Router)
└─ Layout
   ├─ Header (56px fixed)
   │  └─ Primary nav: Sessions | Upload
   ├─ Sidebar (224px / 40px collapsed)
   │  ├─ Navigation section
   │  │  └─ Bookmarks link (w/ count badge)
   │  └─ Projects section
   │     ├─ "All Projects" option
   │     └─ Project list (FolderOpen icons, session counts)
   └─ Main content (Outlet)
      ├─ HomePage → SessionList
      ├─ SessionDetailPage
      │  ├─ Session header (metadata, export buttons)
      │  ├─ Tab navigation (Timeline / Files / Summary)
      │  └─ Tab panels
      │     └─ Timeline
      │        ├─ Virtual scrolling (@tanstack/react-virtual)
      │        ├─ TimelineEvent / EventGroup components
      │        ├─ FloatingContextBadge (right-center)
      │        └─ FloatingNav (bottom-right)
      ├─ UploadPage
      └─ BookmarksPage
```

### State Management (Zustand)

**sessionStore**:
- `sessions: SessionSummary[]` - Current session list
- `currentSession: SessionDetail | null` - Active session
- `projects: Project[]` - All projects
- `filters: SessionFilters` - Current filters (project, search, date)
- `sidebarCollapsed: boolean` - Sidebar visibility state
- `loading`, `error`, `total`, `hasMore` - UI state

**Actions**:
- `setFilters()` - Update filters, trigger refetch
- `fetchSessions()`, `fetchSession()`, `fetchProjects()`
- `toggleSidebar()` - Collapse/expand sidebar
- `refreshSessions()` - Clear cache, re-sync

### Current Scroll Detection (Hybrid Approach)

```typescript
// Timeline.tsx uses dual scroll detection:
const containerCanScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;

if (containerCanScroll && scrollContainer.scrollTop > 0) {
  // Container scrolling - use scrollTop
  targetPosition = scrollTop + clientHeight / 2;
} else {
  // Window scrolling - calculate relative to container
  const containerRect = scrollContainer.getBoundingClientRect();
  targetPosition = (window.innerHeight / 2) - containerRect.top;
}
```

This pattern is critical for TOC active state detection.

---

## New Component Specifications

### 1. Enhanced Header Component

**File**: `frontend/src/components/layout/Header.tsx`

#### Visual Design

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Terminal] Claude Log Viewer     Sessions | Upload | Bookmarks      │
│                                   [Projects ▼]  [Search]  [Settings] │
└─────────────────────────────────────────────────────────────────────┘
    Logo + Title                    Primary Nav    Utility Nav
```

#### Component Structure

```tsx
<header className="sticky top-0 z-50 border-b bg-white dark:bg-gray-800 transition-transform duration-300">
  {/* Left: Logo + App Name */}
  <div className="flex items-center gap-2">
    <Terminal /> {/* Icon */}
    <Link to="/">Claude Log Viewer</Link>
  </div>

  {/* Center: Primary Navigation */}
  <nav className="flex items-center gap-1">
    <NavLink to="/" icon={FolderOpen}>Sessions</NavLink>
    <NavLink to="/upload" icon={Upload}>Upload</NavLink>
    <NavLink to="/bookmarks" icon={Bookmark}>Bookmarks</NavLink>
  </nav>

  {/* Right: Project Dropdown + Search + Settings */}
  <div className="flex items-center gap-3">
    <ProjectDropdown />
    <GlobalSearch />
    <SettingsMenu />
  </div>
</header>
```

#### Props Interface

```typescript
interface HeaderProps {
  /** Auto-hide on scroll down (default: false) */
  autoHide?: boolean;
  /** Scroll threshold for auto-hide (default: 100px) */
  autoHideThreshold?: number;
}
```

#### State Management

```typescript
const [isHidden, setIsHidden] = useState(false);
const [lastScrollY, setLastScrollY] = useState(0);

useEffect(() => {
  if (!autoHide) return;

  const handleScroll = () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY < autoHideThreshold) {
      setIsHidden(false); // Always show when near top
    } else if (currentScrollY > lastScrollY && currentScrollY > autoHideThreshold) {
      setIsHidden(true); // Scrolling down - hide
    } else if (currentScrollY < lastScrollY) {
      setIsHidden(false); // Scrolling up - show
    }

    setLastScrollY(currentScrollY);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, [autoHide, autoHideThreshold, lastScrollY]);
```

#### Styling

```tsx
className={`
  sticky top-0 z-50
  border-b border-gray-200 dark:border-gray-700
  bg-white/95 dark:bg-gray-800/95
  backdrop-blur-sm
  transition-transform duration-300 ease-in-out
  ${isHidden ? '-translate-y-full' : 'translate-y-0'}
`}
```

**Key details**:
- **Sticky positioning**: `sticky top-0 z-50` stays visible while scrolling
- **Backdrop blur**: Semi-transparent with blur (`bg-white/95 backdrop-blur-sm`) for modern glass effect
- **Smooth transitions**: `transition-transform duration-300 ease-in-out`
- **Auto-hide**: Slides up (`-translate-y-full`) on scroll down, reappears on scroll up
- **Z-index**: `z-50` ensures it stays above content but below modals (z-50 < z-[100])

---

### 2. ProjectDropdown Component

**File**: `frontend/src/components/navigation/ProjectDropdown.tsx`

#### Visual Design

```
┌─────────────────────────┐
│ [Folder] All Projects ▼ │  ← Button (closed state)
└─────────────────────────┘

┌─────────────────────────────────────┐
│ ╔═══════════════════════════════╗   │
│ ║ [Search projects...]          ║   │  ← Search input (if >10 projects)
│ ╚═══════════════════════════════╝   │
│ ┌─────────────────────────────────┐ │
│ │ [Folder] All Projects      [✓] │ │  ← Active indicator
│ ├─────────────────────────────────┤ │
│ │ [Folder] claude-log-convert  12│ │
│ │ [Folder] my-app               5│ │
│ │ [Folder] website              8│ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
         Dropdown (open state)
```

#### Component Implementation

```typescript
import { Menu, Transition } from '@headlessui/react';
import { FolderOpen, ChevronDown, Check, Search } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export function ProjectDropdown() {
  const { projects, filters, setFilters } = useSessionStore();
  const [searchQuery, setSearchQuery] = useState('');

  const selectedProject = projects.find(p => p.encoded_name === filters.project);
  const displayName = selectedProject?.name || 'All Projects';

  // Filter projects based on search
  const filteredProjects = searchQuery
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : projects;

  const handleSelectProject = (encodedName: string | null) => {
    setFilters({ project: encodedName || undefined });
    setSearchQuery(''); // Reset search on selection
  };

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          {/* Trigger Button */}
          <Menu.Button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-white">{displayName}</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </Menu.Button>

          {/* Dropdown Menu */}
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 mt-2 w-64 origin-top-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg focus:outline-none z-50">
              {/* Search Input (if many projects) */}
              {projects.length > 10 && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()} // Prevent menu close
                    />
                  </div>
                </div>
              )}

              {/* Project List */}
              <div className="py-1 max-h-80 overflow-y-auto">
                {/* All Projects Option */}
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleSelectProject(null)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } ${
                        !filters.project ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">All Projects</span>
                      {!filters.project && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  )}
                </Menu.Item>

                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

                {/* Individual Projects */}
                {filteredProjects.map((project) => (
                  <Menu.Item key={project.encoded_name}>
                    {({ active }) => (
                      <button
                        onClick={() => handleSelectProject(project.encoded_name)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                          active ? 'bg-gray-50 dark:bg-gray-700' : ''
                        } ${
                          filters.project === project.encoded_name
                            ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                        title={project.decoded_path}
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{project.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{project.session_count}</span>
                        {filters.project === project.encoded_name && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        )}
                      </button>
                    )}
                  </Menu.Item>
                ))}

                {/* No Results */}
                {filteredProjects.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No projects found
                  </div>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}
```

#### UX Polish Details

1. **Chevron rotation**: Rotates 180° when menu opens (`transition-transform duration-200`)
2. **Search auto-focus**: If >10 projects, search input auto-focuses when menu opens
3. **Keyboard navigation**:
   - Arrow keys navigate projects
   - Enter selects
   - Escape closes
   - Type to search (when search visible)
4. **Active state**: Check icon + indigo color for selected project
5. **Hover states**: Gray background on hover (`hover:bg-gray-50`)
6. **Smooth transitions**: Scale + opacity animation (100ms enter, 75ms leave)
7. **Truncation**: Long project names truncate with ellipsis, full path shown in tooltip

---

### 3. TimelineTOC Component (NEW)

**File**: `frontend/src/components/navigation/TimelineTOC.tsx`

This is the **most critical new component** - provides within-document navigation.

#### Visual Design

```
┌────────────────────────────────┐
│ Timeline                       │  ← Header
│ ──────────────────────────     │  ← Collapse button
│                                │
│ • 👤 User: "Fix the bug..."    │  ← User message
│   12:34 PM                     │
│                                │
│ • 🤖 Assistant: Response       │  ← Assistant message
│   12:35 PM                     │
│                                │
│ • 🔧 Read, Edit (3)           │  ← Tool group (collapsed)
│   12:36 PM                     │
│   └─ Read file.tsx             │  ← Expanded group
│   └─ Edit file.tsx             │
│   └─ Result                    │
│                                │
│ • 🤖 Assistant: "I've fixed"  │  ◄─ Active (highlighted)
│   12:37 PM                     │
│                                │
│ • 👤 User: "Thanks!"           │
│   12:38 PM                     │
│                                │
│ [↑ Back to top]                │  ← Scroll to top button
└────────────────────────────────┘
```

#### Component Implementation

```typescript
import { useRef, useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, ArrowUp, User, Bot, Wrench, X } from 'lucide-react';
import type { TimelineEvent, SessionDetail } from '@/services/types';
import { formatTime } from '@/utils/formatters';

interface TOCItem {
  id: string;
  type: 'user' | 'assistant' | 'tool_group';
  title: string;
  timestamp: string;
  eventIndex: number; // Index in original events array
  children?: TOCItem[]; // For tool groups
}

interface TimelineTOCProps {
  events: TimelineEvent[];
  session: SessionDetail;
  selectedTypes: Set<string>;
  /** Active event index (from scroll position) */
  activeItemIndex: number | null;
  /** Callback when user clicks TOC item */
  onNavigate: (eventIndex: number) => void;
  /** Initial collapsed state */
  initialCollapsed?: boolean;
}

export function TimelineTOC({
  events,
  session,
  selectedTypes,
  activeItemIndex,
  onNavigate,
  initialCollapsed = false,
}: TimelineTOCProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Generate TOC items from events
  const tocItems = useMemo(() => {
    const items: TOCItem[] = [];
    let i = 0;

    const filteredEvents = events.filter(e => selectedTypes.has(e.type));

    while (i < filteredEvents.length) {
      const event = filteredEvents[i];

      // Group consecutive tool events
      if (event.type === 'tool_use') {
        const toolName = event.tool_name || 'Tool';
        const groupChildren: TOCItem[] = [];
        const groupIndex = i;

        // Collect tool_use + tool_result pairs
        while (i < filteredEvents.length && (filteredEvents[i].type === 'tool_use' || filteredEvents[i].type === 'tool_result')) {
          const e = filteredEvents[i];
          groupChildren.push({
            id: `event-${i}`,
            type: e.type === 'tool_use' ? 'tool_group' : 'tool_group',
            title: e.type === 'tool_use' ? `${e.tool_name || 'Tool'}` : 'Result',
            timestamp: formatTime(e.timestamp),
            eventIndex: i,
          });
          i++;
        }

        items.push({
          id: `group-${groupIndex}`,
          type: 'tool_group',
          title: `${toolName} (${groupChildren.length})`,
          timestamp: formatTime(event.timestamp),
          eventIndex: groupIndex,
          children: groupChildren,
        });
      } else if (event.type === 'user' || event.type === 'assistant') {
        // Extract first line or N characters as title
        let title = '';
        if (event.type === 'user' && event.content) {
          title = event.content.substring(0, 50);
        } else if (event.type === 'assistant' && event.content) {
          title = event.content.substring(0, 50);
        }

        if (title.length >= 50) title += '...';
        if (!title) title = event.type === 'user' ? 'User message' : 'Assistant message';

        items.push({
          id: `event-${i}`,
          type: event.type,
          title,
          timestamp: formatTime(event.timestamp),
          eventIndex: i,
        });
        i++;
      } else {
        i++; // Skip other types (thinking, etc.)
      }
    }

    return items;
  }, [events, selectedTypes]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const scrollToTop = () => {
    onNavigate(0);
  };

  if (isCollapsed) {
    return (
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Show table of contents"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Timeline</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Hide table of contents"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* TOC Items */}
      <div className="flex-1 overflow-y-auto p-2">
        <nav>
          <ul className="space-y-1">
            {tocItems.map((item) => (
              <TOCItemComponent
                key={item.id}
                item={item}
                isActive={item.eventIndex === activeItemIndex}
                isExpanded={expandedGroups.has(item.id)}
                onToggle={() => toggleGroup(item.id)}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </nav>
      </div>

      {/* Scroll to Top */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={scrollToTop}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
          Back to top
        </button>
      </div>
    </aside>
  );
}

function TOCItemComponent({
  item,
  isActive,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  item: TOCItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: (index: number) => void;
}) {
  const getIcon = () => {
    switch (item.type) {
      case 'user':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'assistant':
        return <Bot className="w-4 h-4 text-purple-500" />;
      case 'tool_group':
        return <Wrench className="w-4 h-4 text-gray-500" />;
    }
  };

  const hasChildren = item.children && item.children.length > 0;

  return (
    <li>
      <div
        className={`
          flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer
          transition-all duration-150
          ${isActive
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        onClick={() => onNavigate(item.eventIndex)}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">{item.title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</div>
        </div>

        {/* Expand/Collapse (if group) */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Children (if expanded) */}
      {hasChildren && isExpanded && (
        <ul className="ml-6 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
          {item.children!.map((child) => (
            <TOCItemComponent
              key={child.id}
              item={child}
              isActive={child.eventIndex === activeItemIndex}
              isExpanded={false}
              onToggle={() => {}}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
```

#### UX Polish Details

1. **Active state highlighting**:
   - Active item: `bg-indigo-100 dark:bg-indigo-900/30` with indigo text
   - Smooth transition: `transition-all duration-150`

2. **Smooth scroll to item**:
   ```typescript
   const onNavigate = (eventIndex: number) => {
     const element = document.querySelector(`[data-event-index="${eventIndex}"]`);
     element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
   };
   ```

3. **Collapse/expand animation**:
   - Children slide in/out with height animation
   - Chevron rotates 90°

4. **Sticky header**: TOC header stays visible when scrolling TOC content

5. **Overflow handling**:
   - TOC content scrolls independently
   - Virtual scrolling if >100 items (using @tanstack/react-virtual)

6. **Responsive behavior**:
   - Desktop: Fixed 320px width (w-80)
   - Tablet: Overlay drawer (slides in from right)
   - Mobile: Hidden (or bottom sheet on swipe up)

---

### 4. Breadcrumbs Component (NEW)

**File**: `frontend/src/components/navigation/Breadcrumbs.tsx`

#### Visual Design

```
Home > claude-log-converter > Session #abc123 > Timeline
 ↑         ↑                      ↑                ↑
Link   Project filter        Session link      Current tab
```

#### Component Implementation

```typescript
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export function Breadcrumbs() {
  const location = useLocation();
  const { sessionId } = useParams();
  const { currentSession, filters } = useSessionStore();

  const segments: { label: string; href?: string; icon?: React.ReactNode }[] = [
    { label: 'Home', href: '/', icon: <Home className="w-3 h-3" /> },
  ];

  // Add project if filtered
  if (filters.project) {
    const project = useSessionStore.getState().projects.find(p => p.encoded_name === filters.project);
    if (project) {
      segments.push({ label: project.name, href: `/?project=${filters.project}` });
    }
  }

  // Add session if viewing session detail
  if (sessionId && currentSession) {
    segments.push({
      label: `Session #${sessionId.slice(0, 8)}`,
      href: `/session/${sessionId}`,
    });

    // Add current tab (Timeline, Files, Summary)
    const tab = new URLSearchParams(location.search).get('tab') || 'Timeline';
    segments.push({ label: tab });
  }

  // Add upload page
  if (location.pathname === '/upload') {
    segments.push({ label: 'Upload' });
  }

  // Add bookmarks page
  if (location.pathname === '/bookmarks') {
    segments.push({ label: 'Bookmarks' });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
      {segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}

          {segment.href ? (
            <Link
              to={segment.href}
              className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {segment.icon}
              {segment.label}
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-gray-900 dark:text-white font-medium">
              {segment.icon}
              {segment.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

#### UX Polish Details

1. **Hover states**: Links change to indigo on hover
2. **Current page**: No link, bold text
3. **Icons**: Home icon for root, optional icons for other segments
4. **Responsive**: On mobile, show only last 2 segments with ellipsis

---

### 5. Updated SessionDetailPage Layout

**File**: `frontend/src/pages/SessionDetailPage.tsx`

#### New Layout Structure

```tsx
<div className="flex flex-col h-full">
  {/* Breadcrumbs */}
  <Breadcrumbs />

  {/* Session Header (metadata, export buttons, tabs) */}
  <SessionHeader session={currentSession} />

  {/* Main Content Area */}
  <div className="flex-1 flex min-h-0">
    {/* Left: Tab Content (70-75% width) */}
    <div className="flex-1 min-h-0 overflow-hidden">
      <Tab.Panels className="h-full">
        <Tab.Panel className="h-full">
          <Timeline
            events={currentSession.events}
            session={currentSession}
            selectedTypes={selectedTypes}
            onActiveIndexChange={setActiveItemIndex}
          />
        </Tab.Panel>
        <Tab.Panel className="h-full">
          <FilesTab session={currentSession} />
        </Tab.Panel>
        <Tab.Panel className="h-full">
          <SummaryTab session={currentSession} />
        </Tab.Panel>
      </Tab.Panels>
    </div>

    {/* Right: TOC (only on Timeline tab) */}
    {currentTab === 'timeline' && (
      <TimelineTOC
        events={currentSession.events}
        session={currentSession}
        selectedTypes={selectedTypes}
        activeItemIndex={activeItemIndex}
        onNavigate={handleNavigateToEvent}
      />
    )}
  </div>
</div>
```

#### Navigation Handler

```typescript
const handleNavigateToEvent = (eventIndex: number) => {
  // Find the virtual item for this event
  const element = document.querySelector(`[data-event-index="${eventIndex}"]`);

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center', // Center in viewport
      inline: 'nearest',
    });

    // Optional: Flash highlight on target event
    element.classList.add('highlight-flash');
    setTimeout(() => element.classList.remove('highlight-flash'), 1000);
  }
};
```

#### Highlight Flash Animation

```css
/* In global CSS or Tailwind config */
@keyframes highlight-flash {
  0%, 100% { background-color: transparent; }
  50% { background-color: rgba(99, 102, 241, 0.1); }
}

.highlight-flash {
  animation: highlight-flash 1s ease-in-out;
}
```

---

### 6. Updated Layout Component

**File**: `frontend/src/components/layout/Layout.tsx`

#### New Structure (Sidebar Removed)

```tsx
import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header autoHide={false} /> {/* Enable later in Phase 5 */}

      <main className="flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
}
```

**Changes**:
- Removed `<Sidebar />` component
- Full-width main content
- Simplified flex layout

---

## UX Polish & Micro-interactions

### Animation Timing Standards

Use consistent timing for all animations:

```typescript
const ANIMATION_TIMING = {
  instant: 0,          // Immediate feedback (e.g., checkbox)
  fast: 150,           // Quick transitions (e.g., hover states)
  normal: 200,         // Standard transitions (e.g., dropdown open/close)
  slow: 300,           // Deliberate transitions (e.g., page transitions, auto-hide header)
  crawl: 500,          // Attention-grabbing (e.g., highlight flash)
};

const EASING = {
  linear: 'linear',
  easeOut: 'ease-out',     // Decelerating (most transitions)
  easeIn: 'ease-in',       // Accelerating (closing/hiding)
  easeInOut: 'ease-in-out', // Smooth start & end (complex animations)
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Bouncy (playful interactions)
};
```

### Hover States

All interactive elements must have hover states:

```tsx
// Buttons
className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"

// Links
className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150"

// Cards
className="hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 transition-all duration-200"
```

### Focus States

Keyboard navigation must be first-class:

```tsx
// All focusable elements
className="focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"

// Skip to content link (for accessibility)
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] bg-white px-4 py-2 rounded shadow-lg"
>
  Skip to main content
</a>
```

### Loading States

Show skeleton loaders during data fetching:

```tsx
// Skeleton card
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
</div>

// Spinner (for long operations)
<Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
```

### Empty States

Graceful handling of no data:

```tsx
// No sessions
<div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
  <FolderOpen className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
  <p className="text-lg font-medium">No sessions found</p>
  <p className="text-sm">Try adjusting your filters or search query</p>
</div>

// No TOC items
<div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
  <FileText className="w-8 h-8 mb-2" />
  <p className="text-sm">No events to display</p>
</div>
```

### Transitions Between States

Use Headless UI Transition for smooth state changes:

```tsx
<Transition
  show={isOpen}
  as={Fragment}
  enter="transition ease-out duration-200"
  enterFrom="opacity-0 scale-95"
  enterTo="opacity-100 scale-100"
  leave="transition ease-in duration-150"
  leaveFrom="opacity-100 scale-100"
  leaveTo="opacity-0 scale-95"
>
  {/* Content */}
</Transition>
```

### Scroll Behavior

Smooth scrolling everywhere:

```tsx
// Global CSS
html {
  scroll-behavior: smooth;
}

// JS scroll (preferred for control)
element.scrollIntoView({
  behavior: 'smooth',
  block: 'center',
  inline: 'nearest',
});
```

### Keyboard Shortcuts

Implement global keyboard shortcuts:

```typescript
// frontend/src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K: Open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Open search modal
      }

      // T: Toggle TOC
      if (e.key === 't' && !isInputFocused()) {
        // Toggle TOC visibility
      }

      // Escape: Close modals, go back
      if (e.key === 'Escape') {
        // Close any open modals
        // Or navigate back if no modals open
      }

      // [ and ]: Previous/next session
      if (e.key === '[' && !isInputFocused()) {
        // Navigate to previous session
      }
      if (e.key === ']' && !isInputFocused()) {
        // Navigate to next session
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

function isInputFocused() {
  const active = document.activeElement;
  return active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.hasAttribute('contenteditable');
}
```

---

## Progressive Migration Strategy

### Phase-by-Phase Approach

**Goal**: Zero downtime, no big-bang releases, iterative improvements with user feedback.

### Phase 1: Foundation (Week 1)

**Scope**: Add new components without removing old ones

**Tasks**:
1. Create `ProjectDropdown` component
2. Add to Header (alongside existing nav)
3. Create `Breadcrumbs` component
4. Add below Header on all pages
5. Update `sessionStore` to support both sidebar and dropdown
6. Add feature flag: `USE_NEW_NAVIGATION` (default: false)

**User-facing changes**:
- Breadcrumbs appear on all pages
- Project dropdown appears in header (redundant with sidebar for now)
- Sidebar still present and functional

**Testing**:
- Verify project filter works from dropdown
- Verify breadcrumbs update correctly
- Verify no regressions in existing navigation

**Rollout**:
- Deploy to production with feature flag OFF
- Enable for internal users only (feature flag ON)
- Collect feedback for 2-3 days

---

### Phase 2: Timeline TOC (Week 2)

**Scope**: Add right-side table of contents for session detail pages

**Tasks**:
1. Create `TimelineTOC` component
2. Update `Timeline` component to expose active event index
3. Add TOC to `SessionDetailPage` (only on Timeline tab)
4. Implement scroll-to-event navigation
5. Add collapse/expand state (persisted in localStorage)
6. Add keyboard shortcut (T) to toggle TOC

**User-facing changes**:
- Right sidebar appears on session detail pages (Timeline tab only)
- Clicking TOC items scrolls to events
- Active event highlights in TOC as user scrolls
- Can collapse TOC to reclaim width

**Testing**:
- Verify TOC items match timeline events
- Verify active state updates on scroll
- Verify click navigation works smoothly
- Verify collapse state persists across sessions
- Test with large sessions (500+ events)

**Rollout**:
- Deploy to production with feature flag OFF
- Enable for internal users
- Collect feedback, measure usage (clicks on TOC items)

---

### Phase 3: Sidebar Removal (Week 3)

**Scope**: Remove left sidebar, make new navigation primary

**Tasks**:
1. Update `Layout.tsx` to remove `<Sidebar />`
2. Move Bookmarks link from sidebar to Header
3. Remove `sidebarCollapsed` state from sessionStore
4. Update CSS to use full width for main content
5. Set feature flag `USE_NEW_NAVIGATION` to default: true

**User-facing changes**:
- Left sidebar gone
- 15-20% more reading width
- All navigation via header + TOC
- Bookmarks link in header nav

**Testing**:
- Verify all pages render correctly without sidebar
- Verify no broken navigation flows
- Verify responsive behavior (mobile, tablet)

**Rollout**:
- Deploy to production with feature flag ON (gradual rollout: 10% → 50% → 100%)
- Monitor for issues (error rate, bounce rate)
- Collect user feedback via in-app survey

---

### Phase 4: Floating Elements Cleanup (Week 4)

**Scope**: Remove FloatingNav and FloatingContextBadge

**Tasks**:
1. Remove `FloatingNav` component usage from Timeline
2. Remove `FloatingContextBadge` component usage
3. Delete component files (or move to archive/)
4. Add "Scroll to top" button to TOC footer
5. Active context is now shown in TOC (no separate badge)

**User-facing changes**:
- No more floating buttons obstructing content
- Cleaner reading experience
- Scroll to top via TOC button

**Testing**:
- Verify scroll to top still works
- Verify no visual regressions
- Test on mobile (ensure scroll to top accessible)

**Rollout**:
- Deploy to production (no feature flag needed)
- Monitor user feedback

---

### Phase 5: Progressive Disclosure & Polish (Week 5)

**Scope**: Auto-hide header, keyboard shortcuts, final polish

**Tasks**:
1. Enable auto-hide header on scroll (opt-in setting)
2. Implement global keyboard shortcuts hook
3. Add keyboard shortcuts help modal (? key)
4. Add smooth transitions to all state changes
5. Optimize TOC rendering (virtual scrolling if >100 events)
6. Add animations to breadcrumbs (slide in on page change)
7. Polish loading states, empty states, error states

**User-facing changes**:
- Header auto-hides on scroll down (can disable in settings)
- Keyboard shortcuts work (Cmd+K search, T toggle TOC, etc.)
- Help modal shows all shortcuts (? key)
- Smoother animations throughout

**Testing**:
- Verify auto-hide feels natural (not jarring)
- Test all keyboard shortcuts
- Performance test with large sessions
- Cross-browser testing (Chrome, Firefox, Safari)

**Rollout**:
- Deploy to production
- Announce new features (keyboard shortcuts, auto-hide)
- Collect feedback via survey

---

### Phase 6: Advanced Features (Week 6+, Optional)

**Scope**: Nice-to-have enhancements

**Tasks**:
1. Command palette (Cmd+K) for fuzzy search + quick actions
2. TOC minimap (visual representation like VS Code)
3. Reading progress indicator (% of session read)
4. Session comparison view (side-by-side)
5. Advanced TOC filters (show only errors, only bookmarks, etc.)

**Rollout**:
- Deploy incrementally
- Measure usage, gather feedback
- Iterate based on user needs

---

## Testing & Quality Assurance

### Unit Tests

**Test Coverage Requirements**: 80%+ for new components

#### ProjectDropdown Tests

```typescript
// frontend/src/components/navigation/__tests__/ProjectDropdown.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectDropdown } from '../ProjectDropdown';

describe('ProjectDropdown', () => {
  it('renders "All Projects" by default', () => {
    render(<ProjectDropdown />);
    expect(screen.getByText('All Projects')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<ProjectDropdown />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
  });

  it('filters projects on search', () => {
    render(<ProjectDropdown />);
    fireEvent.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'claude' } });

    expect(screen.getByText('claude-log-converter')).toBeInTheDocument();
    expect(screen.queryByText('other-project')).not.toBeInTheDocument();
  });

  it('selects project and updates filter', () => {
    const setFilters = jest.fn();
    render(<ProjectDropdown />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('claude-log-converter'));

    expect(setFilters).toHaveBeenCalledWith({ project: 'claude-log-converter' });
  });
});
```

#### TimelineTOC Tests

```typescript
// frontend/src/components/navigation/__tests__/TimelineTOC.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineTOC } from '../TimelineTOC';

describe('TimelineTOC', () => {
  const mockEvents = [
    { type: 'user', content: 'Hello', timestamp: '2024-01-01T12:00:00Z' },
    { type: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T12:01:00Z' },
    { type: 'tool_use', tool_name: 'Read', timestamp: '2024-01-01T12:02:00Z' },
  ];

  it('renders TOC items from events', () => {
    render(<TimelineTOC events={mockEvents} selectedTypes={new Set(['user', 'assistant'])} />);

    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    expect(screen.getByText(/Hi there/)).toBeInTheDocument();
  });

  it('highlights active item', () => {
    render(<TimelineTOC events={mockEvents} activeItemIndex={0} />);

    const activeItem = screen.getByText(/Hello/).closest('div');
    expect(activeItem).toHaveClass('bg-indigo-100');
  });

  it('calls onNavigate when item clicked', () => {
    const onNavigate = jest.fn();
    render(<TimelineTOC events={mockEvents} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText(/Hello/));
    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it('collapses to icon-only mode', () => {
    render(<TimelineTOC events={mockEvents} initialCollapsed={true} />);

    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
    expect(screen.getByTitle('Show table of contents')).toBeInTheDocument();
  });
});
```

### Integration Tests

**Test User Flows**:

1. **Browse sessions and open detail**:
   - Filter by project (dropdown)
   - Click session card
   - Verify session loads
   - Verify TOC appears
   - Verify breadcrumbs correct

2. **Navigate within session using TOC**:
   - Click TOC item
   - Verify smooth scroll to event
   - Verify active state updates
   - Verify highlight flash animation

3. **Keyboard navigation**:
   - Press T to toggle TOC
   - Press Cmd+K to open search
   - Press Escape to close
   - Press [ / ] for prev/next session

4. **Mobile responsive behavior**:
   - Resize viewport to mobile
   - Verify header adapts (hamburger menu)
   - Verify TOC becomes overlay/drawer
   - Verify touch gestures work

### Performance Tests

**Benchmarks**:

| Metric | Baseline | Target |
|--------|----------|--------|
| Initial page load | 1.2s | <1.5s |
| Session detail load | 800ms | <1s |
| TOC render (100 events) | N/A | <100ms |
| TOC render (500 events) | N/A | <200ms |
| Scroll performance | 60fps | 60fps |
| Memory usage (long session) | 150MB | <200MB |

**Tools**:
- Chrome DevTools Performance tab
- Lighthouse CI
- React DevTools Profiler

### Accessibility Tests

**Requirements**:
- WCAG 2.1 AA compliance
- Keyboard navigation (all features accessible)
- Screen reader support (tested with NVDA, JAWS)
- Color contrast ratios (4.5:1 text, 3:1 UI)
- Focus indicators visible

**Tools**:
- axe DevTools
- Lighthouse accessibility audit
- Manual screen reader testing

---

## Performance Optimization

### Virtual Scrolling

Use `@tanstack/react-virtual` for large lists:

```typescript
// TimelineTOC with virtual scrolling
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: tocItems.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 40, // Estimated height of each TOC item
  overscan: 5, // Render 5 extra items above/below viewport
});

// In render:
<div ref={parentRef} className="flex-1 overflow-auto">
  <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
    {virtualizer.getVirtualItems().map((virtualItem) => (
      <div
        key={virtualItem.key}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualItem.size}px`,
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        <TOCItem item={tocItems[virtualItem.index]} />
      </div>
    ))}
  </div>
</div>
```

### Debouncing & Throttling

```typescript
// Debounce search input
import { debounce } from 'lodash';

const handleSearchChange = debounce((value: string) => {
  setSearchQuery(value);
}, 300);

// Throttle scroll event handlers
import { throttle } from 'lodash';

const handleScroll = throttle(() => {
  updateActiveItem();
}, 100);
```

### Code Splitting

```typescript
// Lazy load TOC component
const TimelineTOC = lazy(() => import('@/components/navigation/TimelineTOC'));

// In component:
<Suspense fallback={<TOCSkeleton />}>
  <TimelineTOC {...props} />
</Suspense>
```

### Memoization

```typescript
// Memoize expensive computations
const tocItems = useMemo(() => {
  return generateTOCItems(events, selectedTypes);
}, [events, selectedTypes]);

// Memoize callbacks
const handleNavigate = useCallback((eventIndex: number) => {
  scrollToEvent(eventIndex);
}, []);
```

---

## Accessibility Requirements

### Semantic HTML

```tsx
// Use proper landmarks
<header>...</header>
<nav aria-label="Primary navigation">...</nav>
<nav aria-label="Breadcrumb">...</nav>
<aside aria-label="Table of contents">...</aside>
<main id="main-content">...</main>
<footer>...</footer>
```

### ARIA Labels

```tsx
// Buttons without visible text
<button aria-label="Close table of contents">
  <X className="w-4 h-4" />
</button>

// Expandable sections
<button
  aria-expanded={isExpanded}
  aria-controls={`group-${groupId}`}
>
  {isExpanded ? <ChevronDown /> : <ChevronRight />}
</button>

<div id={`group-${groupId}`} aria-hidden={!isExpanded}>
  {/* Children */}
</div>
```

### Keyboard Navigation

```tsx
// Trap focus in modal
import { FocusTrap } from '@headlessui/react';

<FocusTrap>
  <Modal>...</Modal>
</FocusTrap>

// Skip links
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### Screen Reader Announcements

```tsx
// Live region for dynamic updates
<div role="status" aria-live="polite" className="sr-only">
  {`Navigated to ${currentEvent.title}`}
</div>

// Loading state
<div role="status" aria-busy={loading} aria-live="polite">
  {loading ? 'Loading session...' : 'Session loaded'}
</div>
```

---

## Rollout & Monitoring

### Feature Flags

Use environment variables for gradual rollout:

```typescript
// frontend/src/config/featureFlags.ts
export const FEATURE_FLAGS = {
  NEW_NAVIGATION: import.meta.env.VITE_NEW_NAVIGATION === 'true',
  AUTO_HIDE_HEADER: import.meta.env.VITE_AUTO_HIDE_HEADER === 'true',
  TOC_MINIMAP: import.meta.env.VITE_TOC_MINIMAP === 'true',
};

// In components:
import { FEATURE_FLAGS } from '@/config/featureFlags';

{FEATURE_FLAGS.NEW_NAVIGATION && <TimelineTOC {...props} />}
```

### User Feedback Collection

```tsx
// Feedback widget (bottom-right corner)
<div className="fixed bottom-4 right-4 z-40">
  <button
    onClick={() => setShowFeedbackModal(true)}
    className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all"
  >
    <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
  </button>
</div>

// Feedback modal
<Modal open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)}>
  <h2>How's the new navigation?</h2>
  <div className="flex gap-2">
    <button onClick={() => submitFeedback('positive')}>👍 Great</button>
    <button onClick={() => submitFeedback('negative')}>👎 Not great</button>
  </div>
  <textarea placeholder="Tell us more (optional)" />
  <button onClick={submitFeedback}>Submit</button>
</Modal>
```

### Analytics Tracking

```typescript
// Track navigation events
const trackEvent = (category: string, action: string, label?: string) => {
  // Send to analytics service (e.g., Plausible, Google Analytics)
  window.plausible?.('Navigation', {
    props: { category, action, label },
  });
};

// Examples:
trackEvent('TOC', 'item_clicked', eventType);
trackEvent('ProjectDropdown', 'project_selected', projectName);
trackEvent('Header', 'auto_hide_triggered');
```

### Error Monitoring

```typescript
// Sentry or similar
import * as Sentry from '@sentry/react';

try {
  // Navigation logic
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'TimelineTOC' },
    extra: { eventIndex, tocItems },
  });
}
```

### Monitoring Dashboard

Track key metrics:

1. **Engagement**:
   - TOC usage rate (% of session views with TOC interactions)
   - Avg TOC clicks per session
   - Project dropdown usage vs. manual navigation

2. **Performance**:
   - Page load time (p50, p95, p99)
   - TOC render time
   - Scroll performance (frame rate)

3. **Errors**:
   - JavaScript error rate
   - Failed navigation attempts
   - Broken TOC links

4. **User Satisfaction**:
   - Feedback widget responses (positive/negative ratio)
   - Session completion rate (did user finish reading?)
   - Bounce rate on session detail pages

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `ProjectDropdown` component
- [ ] Create `Breadcrumbs` component
- [ ] Update `Header` to include new components
- [ ] Add feature flag `USE_NEW_NAVIGATION`
- [ ] Write unit tests for new components
- [ ] Deploy with feature flag OFF
- [ ] Enable for internal users
- [ ] Collect feedback (2-3 days)

### Phase 2: Timeline TOC
- [ ] Create `TimelineTOC` component
- [ ] Update `Timeline` to expose active index
- [ ] Implement scroll-to-event navigation
- [ ] Add collapse/expand functionality
- [ ] Add keyboard shortcut (T key)
- [ ] Write unit tests
- [ ] Deploy with feature flag OFF
- [ ] Enable for internal users
- [ ] Collect feedback + usage metrics

### Phase 3: Sidebar Removal
- [ ] Update `Layout.tsx` (remove Sidebar)
- [ ] Move Bookmarks to Header
- [ ] Remove `sidebarCollapsed` from store
- [ ] Test all pages without sidebar
- [ ] Deploy with gradual rollout (10% → 50% → 100%)
- [ ] Monitor errors and feedback

### Phase 4: Floating Elements Cleanup
- [ ] Remove `FloatingNav` usage
- [ ] Remove `FloatingContextBadge` usage
- [ ] Add scroll-to-top to TOC
- [ ] Delete/archive old component files
- [ ] Test scroll-to-top functionality
- [ ] Deploy to production

### Phase 5: Progressive Disclosure & Polish
- [ ] Implement auto-hide header
- [ ] Create keyboard shortcuts hook
- [ ] Add keyboard shortcuts help modal
- [ ] Optimize TOC rendering (virtual scrolling)
- [ ] Polish loading/empty/error states
- [ ] Cross-browser testing
- [ ] Deploy to production
- [ ] Announce new features

### Phase 6: Advanced Features (Optional)
- [ ] Command palette (Cmd+K)
- [ ] TOC minimap
- [ ] Reading progress indicator
- [ ] Session comparison view
- [ ] Advanced TOC filters

---

## Success Criteria

### Must-Have (Phases 1-4)

✅ **Functional**:
- All existing navigation flows work
- Project filtering works from dropdown
- TOC navigation works smoothly
- No feature regressions

✅ **Performance**:
- No increase in page load time
- Smooth 60fps scrolling
- TOC renders in <200ms (500 events)

✅ **Accessibility**:
- WCAG 2.1 AA compliance maintained
- Keyboard navigation works
- Screen reader compatible

✅ **UX**:
- +15-20% reading width reclaimed
- Positive user feedback (>70%)
- No increase in bounce rate

### Nice-to-Have (Phase 5-6)

✅ **Polish**:
- Auto-hide header feels natural
- Keyboard shortcuts widely used
- Animations smooth and delightful

✅ **Advanced**:
- Command palette implemented
- TOC minimap functional
- Reading progress tracked

---

## Conclusion

This implementation plan provides a **detailed, world-class roadmap** for transforming the Claude Log Converter's navigation from application-style to reading-optimized.

### Key Strengths

1. **Phased approach**: Minimizes risk, allows iteration based on feedback
2. **UX-first**: Every interaction designed for delight and efficiency
3. **Performance-conscious**: Virtual scrolling, memoization, code splitting
4. **Accessible**: WCAG compliant, keyboard-first, screen reader support
5. **Well-tested**: Unit tests, integration tests, performance benchmarks
6. **Measurable**: Analytics, feedback collection, monitoring dashboard

### Next Steps

1. Review this plan with stakeholders
2. Create high-fidelity mockups (Figma)
3. Build prototype (Phases 1-2)
4. User testing with 5-10 users
5. Iterate based on feedback
6. Execute phased rollout (Phases 3-6)

**Estimated Timeline**: 5-6 weeks for Phases 1-5, ongoing for Phase 6.

---

**Document Version**: 1.0
**Last Updated**: January 12, 2026
**Next Review**: After Phase 2 completion
