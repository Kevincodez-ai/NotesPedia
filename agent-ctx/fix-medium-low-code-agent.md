# Task: fix-medium-low - Fix MEDIUM and LOW severity issues in NotesPedia

## Summary of Changes

All 11 fixes (6 MEDIUM + 5 LOW) have been applied and verified with `bun run lint` (0 errors, 0 warnings).

### MEDIUM FIX 1: Fix share button URL in note-detail-page.tsx
- Changed share handler from `navigator.clipboard.writeText(window.location.href)` to copy a meaningful message: `Check out '{note.title}' on NotesPedia!`
- Added `toast.success('Link copied to clipboard!')` and `toast.error('Failed to copy')` feedback via sonner
- Added `import { toast } from 'sonner'`

### MEDIUM FIX 2: Fix fake upload progress in upload-page.tsx
- Removed `uploadProgress` state and all `setUploadProgress` calls
- Replaced `<Progress value={uploadProgress}>` with an indeterminate pulsing bar animation
- The pulsing bar uses `animate-pulse` with a 1/3 width bar sliding inside a muted track

### MEDIUM FIX 3: Fix "Forgot password?" button in login-page.tsx
- Added `onClick` handler that calls `toast.info('Password reset functionality coming soon')`
- Added `import { toast } from 'sonner'`

### MEDIUM FIX 4: Remove duplicate utility functions across components
- Added `fileTypeColor` alias export to `note-card.tsx` (aliasing `fileTypeColorBar`)
- Updated `notes-page.tsx`: removed local `formatRelativeTime`, `fileTypeIcon`, `fileTypeLabel`; added import from note-card; replaced inline file type color bar with `fileTypeColor()`
- Updated `search-page.tsx`: removed local `formatRelativeTime`, `fileTypeIcon`, `fileTypeLabel`; added import from note-card; replaced inline file type color bar with `fileTypeColor()`
- Updated `note-detail-page.tsx`: replaced local `formatRelativeTime` with import from note-card
- Updated `dashboard.tsx`: removed local `formatRelativeTime`, `fileTypeIcon`; added import from note-card (kept local `formatDate` since it's dashboard-specific)
- Updated `bookmarks-page.tsx`: removed local `formatRelativeTime`, `fileTypeIcon`, `fileTypeLabel`; added import from note-card; replaced inline file type color bar with `fileTypeColor()`

### MEDIUM FIX 5: Fix bookmarks page view count
- Added `viewCount?: number` to `BookmarkNote` interface
- Changed hardcoded `0` to `{note.viewCount ?? note.downloadCount}` (falls back to download count if viewCount is unavailable)

### MEDIUM FIX 6: Fix unused imports
- Removed `Input` import from `app-shell.tsx`
- Removed `AnimatePresence` import from `command-palette.tsx`
- Removed `ArrowUp` import from `leaderboard-page.tsx`

### LOW FIX 1: Add aria-labels to star rating buttons
- Added `aria-label={`Rate ${star} stars`}` and `type="button"` to each star rating button in `RatingWidget`

### LOW FIX 2: Add keyboard accessibility to notification items
- Added `role="button"` and `tabIndex={0}` to the `<Card>` element in `NotificationItem`

### LOW FIX 3: Fix footer buttons in landing-page.tsx
- Changed all non-functional footer `<button>` elements to `<span>` elements (both in footer link lists and bottom privacy/terms/cookies)

### LOW FIX 4: Add type="button" to MCQ option buttons
- Added `type="button"` to `<motion.button>` elements in `MCQQuiz` component to prevent form submission

### LOW FIX 5: Fix non-null assertions in page.tsx
- Replaced `pageParams.id!` with proper undefined checks using block-scoped `case` statements
- If `id` is missing, navigates back to dashboard as a fallback

## Verification
- `bun run lint` passes with 0 errors and 0 warnings
- Dev server compiles successfully (confirmed from dev.log)
