# Task: fix-high-frontend - Fix HIGH severity issues in NotesPedia

## Summary

All 8 HIGH severity fixes have been successfully applied. Lint passes cleanly.

## Fixes Applied

### HIGH FIX 1: Fix NoteCard type - add isBookmarked and userRating
- **File**: `src/types/index.ts`
- Added `isBookmarked?: boolean` and `userRating?: number | null` to `NoteCard` interface
- Added `versions: { id: string; version: number; changeLog?: string; createdAt: string }[]` to `NoteDetail` interface

### HIGH FIX 2: Fix command palette profile navigation
- **File**: `src/components/layout/command-palette.tsx`
- Added `user` from store: `const { commandPaletteOpen, setCommandPaletteOpen, navigate, user } = useAppStore()`
- Changed profile quick action to pass user ID: `navigate('profile', { id: user?.id })`

### HIGH FIX 3: Fix duplicate Ctrl+K keyboard shortcut
- **File**: `src/app/page.tsx`
- Removed the entire `useEffect` with keydown listener for Ctrl+K (command-palette.tsx already handles it)
- Left a comment noting Ctrl+K is handled by CommandPalette component

### HIGH FIX 4: Fix notes-page search query not sent to API
- **File**: `src/components/features/notes-page.tsx`
- Added `if (searchQuery) queryParams.q = searchQuery;` to queryParams construction
- Added a search input in the filter area with Search icon, clear button, and proper state binding

### HIGH FIX 5: Fix leaderboard time period filter not sent to API
- **File**: `src/components/features/leaderboard-page.tsx`
- Added `if (timePeriod && timePeriod !== 'all') queryParams.timePeriod = timePeriod;` to queryParams construction

### HIGH FIX 6: Fix landing page features/pricing navigation
- **File**: `src/components/features/landing-page.tsx`
- Changed Features button from `navigate('features')` to `document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })`
- Changed Pricing button similarly (scrolls to features section for MVP)
- Changed "Learn More" hero button similarly
- Added `id="features"` to the features section element

### HIGH FIX 7: Fix dashboard dead fetch and hardcoded reputation
- **File**: `src/components/features/dashboard.tsx`
- Removed the `fetchUserStats()` function that called `GET /api/auth` but never used the result
- Changed hardcoded `reputationScore = 42` to read from user store data: `(user as Record<string, unknown>).reputationScore as number ?? 0`

### HIGH FIX 8: Fix bookmark mutations not invalidating related caches
- **File**: `src/components/features/notes-page.tsx`
  - Added `useQueryClient` import and usage
  - Added cache invalidation for `['notes']`, `['search']`, and `['bookmarks']` in bookmark handler
- **File**: `src/components/features/search-page.tsx`
  - Added `queryClient.invalidateQueries({ queryKey: ['notes'] })` and `queryClient.invalidateQueries({ queryKey: ['bookmarks'] })` alongside existing `['search']` invalidation

## Verification
- `bun run lint` passes with no errors
