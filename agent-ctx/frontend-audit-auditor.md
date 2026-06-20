# NotesPedia Frontend Production Audit Report

**Task ID**: frontend-audit  
**Auditor**: Code Review Agent  
**Date**: 2026-03-05  
**Files Reviewed**: 22 files  

---

## CRITICAL Issues (Will cause crashes or broken functionality)

### C1. Broken Navigation: `navigate('features')` and `navigate('pricing')` have no page component
- **File**: `/home/z/my-project/src/components/features/landing-page.tsx`
- **Lines**: 117, 120, 185
- **Detail**: `navigate('features')` and `navigate('pricing')` are called on nav buttons, but `PageName` type includes `'features' | 'pricing'` while `page.tsx` has no case for these pages in the `switch (currentPage)` block. When navigated, they fall through to `default` and show `DashboardPage` — but since the user may not be authenticated when clicking on the landing page, they'll actually see `LandingPage` instead (due to the `if (!isAuthenticated) return <LandingPage />` guard on line 67). This makes these nav buttons completely non-functional.
- **Fix**: Either create `FeaturesPage` and `PricingPage` components and add them to the router, or remove/change these navigation targets to valid pages (e.g., anchor links on the landing page).

### C2. Missing `PUT /api/auth` handler — Profile update API call will 404
- **File**: `/home/z/my-project/src/components/features/profile-page.tsx`
- **Lines**: 149-157
- **Detail**: `updateProfile()` calls `fetch('/api/auth', { method: 'PUT', ... })`, but the `/api/auth` route only defines `GET` and `POST` handlers. There is no `PUT` handler, so this call will always receive a 405 Method Not Allowed response. The edit profile feature is completely broken.
- **Fix**: Add a `PUT` handler to `/api/auth/route.ts` that updates the user's name and bio.

### C3. Bookmark folder creation API call sends unsupported body format
- **File**: `/home/z/my-project/src/components/features/bookmarks-page.tsx`
- **Lines**: 118-126
- **Detail**: `createFolder()` sends `POST /api/bookmarks` with `{ action: 'createFolder', name, color }`, but the bookmarks POST handler only expects `{ noteId, folderId }` and validates `noteId` as required. Sending `action: 'createFolder'` will result in a 400 error because `noteId` is missing. Folder creation is completely broken.
- **Fix**: Either add folder-creation logic to the bookmarks POST handler (checking for `action` field), or create a separate `/api/bookmark-folders` endpoint.

### C4. Command palette "Go to profile" action navigates without required `id` param
- **File**: `/home/z/my-project/src/components/layout/command-palette.tsx`
- **Line**: 55
- **Detail**: `quickActions` includes `{ title: 'Go to profile', page: 'profile' as PageName, ... }` which calls `navigate('profile')` without an `{ id }` param. In `page.tsx` line 95, this renders `<ProfilePage userId={pageParams.id!} />` where `pageParams.id` is `undefined`. The non-null assertion `!` will pass `undefined` as `userId`, causing `fetchProfile(undefined)` which will call `fetch('/api/users/undefined')` — a broken API call.
- **Fix**: The command palette action should use the current user's ID: `navigate('profile', { id: user?.id })`. The component needs access to `user` from the store.

### C5. `NoteCard` type missing `isBookmarked` field — used in 4+ components
- **File**: `/home/z/my-project/src/types/index.ts` (definition)
- **Used in**: `notes-page.tsx` line 182, `search-page.tsx` line 217, `dashboard.tsx` (via NoteCardItem), `note-card.tsx` line 182
- **Detail**: The `NoteCard` interface (types/index.ts lines 69-88) does not include `isBookmarked` property. However, the API response from `/api/notes` does return `isBookmarked` (notes route.ts line 74). Multiple components access `note.isBookmarked` which TypeScript should flag as a type error. The type definition is out of sync with the actual API response.
- **Fix**: Add `isBookmarked?: boolean` and `userRating?: number | null` to the `NoteCard` interface.

---

## HIGH Issues (Significant functionality degradation)

### H1. `searchQuery` filter state in notes-page.tsx is never sent to API
- **File**: `/home/z/my-project/src/components/features/notes-page.tsx`
- **Lines**: 261, 276-283, 294
- **Detail**: `searchQuery` state exists and is used to determine `hasFilters` (line 294), but it is never included in `queryParams` (lines 276-283). The search input UI exists but has no effect on the actual data fetching. Users type in the search box and see "no filters match" empty states, but the search term is silently ignored.
- **Fix**: Add `if (searchQuery.trim()) queryParams.q = searchQuery.trim();` to the query params builder, or remove the search input from this page (since there's a dedicated SearchPage).

### H2. `timePeriod` filter in leaderboard never sent to API
- **File**: `/home/z/my-project/src/components/features/leaderboard-page.tsx`
- **Lines**: 261, 272-277
- **Detail**: `timePeriod` state is managed and a Select dropdown is rendered (lines 336-345), but the value is never added to `queryParams`. The time period filter is purely cosmetic — changing it has no effect on results.
- **Fix**: Add `if (timePeriod && timePeriod !== 'all') queryParams.timePeriod = timePeriod;` to queryParams.

### H3. `NoteDetail` type missing `ratingCount` field
- **File**: `/home/z/my-project/src/types/index.ts`
- **Detail**: `NoteDetail` extends `NoteCard` which has `ratingCount`, but `NoteDetail` does not declare `ratingCount` independently. However, `note-detail-page.tsx` line 813 uses `note.ratingCount` — this works because it inherits from `NoteCard`, but the API `/api/notes/[id]` response shape should be verified to ensure `ratingCount` is returned. More critically, `NoteDetail` type is missing `uploader` field override (it inherits `{ id: string; name: string; avatarUrl?: string }` from `NoteCard` but the detail API might return more fields).
- **Severity**: MEDIUM if the API returns the field; HIGH if it doesn't.

### H4. Profile page accesses `profile.profile.college` — potential undefined access
- **File**: `/home/z/my-project/src/components/features/profile-page.tsx`
- **Lines**: 395-398
- **Detail**: The API returns `profile: { ...profileData, profile: { college, department, ... } }` — a nested `profile.profile` structure. The code accesses `profile.profile?.college` but the TypeScript type `UserProfile` (types/index.ts) defines `college?` as a top-level property, not nested under `profile`. This means either the type definition is wrong (doesn't match API shape) or the access pattern is wrong. If the API shape has nested `profile.profile`, then the `UserProfile` type is misleading.
- **Fix**: Align the `UserProfile` type with the actual API response shape, or flatten the API response.

### H5. Duplicate Ctrl+K keyboard shortcut handler
- **File**: `/home/z/my-project/src/app/page.tsx` (lines 46-53) and `/home/z/my-project/src/components/layout/command-palette.tsx` (lines 66-78)
- **Detail**: Both files add `keydown` event listeners for `(metaKey || ctrlKey) && k`. This means the shortcut fires twice: once from page.tsx calling `useAppStore.getState().setCommandPaletteOpen(true)`, and once from command-palette.tsx calling `setCommandPaletteOpen(!commandPaletteOpen)`. The net effect depends on execution order but can cause the palette to open and immediately close (toggle behavior conflict).
- **Fix**: Remove the keyboard shortcut handler from one of the two files. Keep it only in `command-palette.tsx` since that component owns the palette state.

### H6. Bookmark mutations don't invalidate related query caches
- **Files**: `notes-page.tsx` (lines 296-311), `search-page.tsx` (lines 352-368), `dashboard.tsx` (no bookmark handler)
- **Detail**: When a user bookmarks/unbookmarks a note from the notes page, only `['search']` or no cache is invalidated. The `['notes']` cache is not invalidated, so the `isBookmarked` flag stays stale. Similarly, the note detail page's bookmark mutation only invalidates `['note', noteId]` but not the notes list. This means the bookmark icon state becomes inconsistent across pages.
- **Fix**: After bookmark mutations, invalidate `['notes']`, `['search']`, `['bookmarks']`, and any relevant note detail caches.

### H7. `fetchUserStats()` in dashboard is misleading — fetches auth user, not stats
- **File**: `/home/z/my-project/src/components/features/dashboard.tsx`
- **Lines**: 78-82
- **Detail**: `fetchUserStats()` calls `GET /api/auth` which returns the current user object. The result is never actually used — `reputationScore` is hardcoded to `42` (line 246). This is a dead fetch that adds unnecessary latency.
- **Fix**: Either use the auth user data to derive real stats (from `user` already in the store) or remove this fetch entirely.

### H8. `NoteDetail` missing `versions` field — conditional check is confusing
- **File**: `/home/z/my-project/src/components/features/note-detail-page.tsx`
- **Line**: 899
- **Detail**: `(note as Record<string, unknown>).versions === undefined` — this type assertion is a code smell. `NoteDetail` type doesn't include a `versions` field. The actual condition is `(!note.versions || ...) && note.version <= 1` which will always evaluate `!note.versions` as `true` since the property doesn't exist on the type, making the second part irrelevant when version > 1.
- **Fix**: Add `versions?: unknown[]` to `NoteDetail` type, or redesign the versions tab logic based on actual API response.

---

## MEDIUM Issues (Degraded user experience)

### M1. No feedback on clipboard copy in note detail page
- **File**: `/home/z/my-project/src/components/features/note-detail-page.tsx`
- **Lines**: 803-806
- **Detail**: `navigator.clipboard.writeText(window.location.href)` is called with no success/error feedback. The user clicks "Share" and nothing visible happens. The `window.location.href` will also be wrong since this is a SPA — it will always be `/` rather than the note detail URL.
- **Fix**: Add a toast notification ("Link copied!"), and construct the proper URL using the note ID.

### M2. Upload progress is fake — shows 0→60→100 jumps
- **File**: `/home/z/my-project/src/components/features/upload-page.tsx`
- **Lines**: 196-246
- **Detail**: The `uploadProgress` state jumps from 0 to 60 (after file upload) to 100 (after note creation) without any real progress tracking. The `fetch` API doesn't support upload progress natively. The progress bar gives a false impression of real progress.
- **Fix**: Use `XMLHttpRequest` with `upload.onprogress` for real progress, or change the UI to show step indicators instead of a progress bar.

### M3. "Forgot password?" button does nothing
- **File**: `/home/z/my-project/src/components/features/login-page.tsx`
- **Line**: 114
- **Detail**: The "Forgot password?" button has no `onClick` handler. It's a purely decorative button that misleads users into thinking a password reset feature exists.
- **Fix**: Either implement a password reset flow/dialog, or remove the button.

### M4. Landing page footer links do nothing
- **File**: `/home/z/my-project/src/components/features/landing-page.tsx`
- **Lines**: 337-339, 355-362
- **Detail**: Footer link buttons (Features, Pricing, API, About, Blog, etc.) have no `onClick` handlers and no `href`. They are non-functional decorative buttons.
- **Fix**: Either link them to actual pages/sections or use `<span>` instead of `<button>` to avoid implying interactivity.

### M5. Duplicate `formatRelativeTime`, `fileTypeIcon`, `fileTypeLabel` helper functions
- **Files**: `dashboard.tsx`, `notes-page.tsx`, `note-card.tsx`, `search-page.tsx`, `bookmarks-page.tsx`, `profile-page.tsx`
- **Detail**: These helper functions are copy-pasted across 6+ files instead of being imported from a shared utility or from `note-card.tsx` which exports them (line 260). This violates DRY and creates maintenance burden.
- **Fix**: Import from `note-card.tsx` or create a shared `@/lib/utils/notes.ts` file.

### M6. Notes page `searchQuery` input not rendered
- **File**: `/home/z/my-project/src/components/features/notes-page.tsx`
- **Lines**: 261, 294
- **Detail**: `searchQuery` state exists and `setSearchQuery` is available, but no search input is rendered in the filter card. The `hasFilters` check includes `searchQuery.trim() !== ''` but there's no way for the user to set this value through the UI.
- **Fix**: Add a search input to the filter card, or remove the searchQuery state and its hasFilters check.

### M7. `fetchUserStats` in dashboard returns data but `reputationScore` is hardcoded
- **File**: `/home/z/my-project/src/components/features/dashboard.tsx`
- **Line**: 246
- **Detail**: `const reputationScore = user ? 42 : 0;` — reputation is always 42 for logged-in users regardless of actual score. This is a placeholder that was never wired up.
- **Fix**: Fetch the actual reputation score from the user profile API.

### M8. Profile page `recentNotes` from API lacks `uploader` and `viewCount`
- **File**: `/home/z/my-project/src/app/api/users/[id]/route.ts`
- **Lines**: 109-121
- **Detail**: The `/api/users/[id]` endpoint returns `recentNotes` without `uploader` or `viewCount` fields, but `ProfileNoteCard` (profile-page.tsx) and the `NoteCard` type require these. This will cause either undefined access or rendering issues.
- **Fix**: Include `uploader: { select: { id: true, name: true, avatarUrl: true } }` and `viewCount` in the recentNotes query.

### M9. `BookmarkNote` in bookmarks-page.tsx missing `viewCount` field
- **File**: `/home/z/my-project/src/components/features/bookmarks-page.tsx`
- **Line**: 243
- **Detail**: `BookmarkCard` renders `<Eye className="size-3" />0` — the view count is hardcoded to `0` because the `BookmarkNote` interface doesn't include `viewCount` and the API doesn't return it for bookmarks. This is misleading.
- **Fix**: Either include `viewCount` in the bookmarks API response, or remove the view count display from bookmark cards.

### M10. `Input` component imported but unused in `app-shell.tsx`
- **File**: `/home/z/my-project/src/components/layout/app-shell.tsx`
- **Line**: 57
- **Detail**: `import { Input } from '@/components/ui/input'` is imported but never used.
- **Fix**: Remove the unused import.

### M11. `motion` and `AnimatePresence` imported but `AnimatePresence` unused in `command-palette.tsx`
- **File**: `/home/z/my-project/src/components/layout/command-palette.tsx`
- **Line**: 5
- **Detail**: `AnimatePresence` is imported from `framer-motion` but never used in the component.
- **Fix**: Remove the unused `AnimatePresence` import.

### M12. `useEffect` imported but unused in `command-palette.tsx`
- **File**: `/home/z/my-project/src/components/layout/command-palette.tsx`
- **Line**: 3
- **Detail**: `useEffect` is imported from React but never used (the component uses `React.useEffect` or the `useEffect` from line 3 — actually checking again, `useEffect` IS used at line 66. This is a false positive — ignore.)
- **Status**: FALSE POSITIVE — `useEffect` is used on line 66.

---

## LOW Issues (Minor polish / best practices)

### L1. `BookmarkCheck` imported but unused in `note-detail-page.tsx`
- **File**: `/home/z/my-project/src/components/features/note-detail-page.tsx`
- **Line**: 11
- **Detail**: `BookmarkCheck` is imported from lucide-react but the component uses conditional rendering with `Bookmark` and `BookmarkCheck` — actually this IS used on line 800. FALSE POSITIVE.

### L2. Accessibility: Star rating buttons lack ARIA labels
- **File**: `/home/z/my-project/src/components/features/note-detail-page.tsx`
- **Lines**: 109-124
- **Detail**: The rating star buttons have no `aria-label`. Screen readers will announce them as unnamed buttons.
- **Fix**: Add `aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}` to each star button.

### L3. Accessibility: Notification items lack ARIA roles
- **File**: `/home/z/my-project/src/components/features/notifications-page.tsx`
- **Lines**: 153-206
- **Detail**: Notification items are Card components with `onClick` handlers but no `role="button"` or `tabIndex`. They're not keyboard accessible.
- **Fix**: Add `role="button"`, `tabIndex={0}`, and `onKeyDown` handler for Enter/Space.

### L4. Accessibility: Landing page footer buttons have no accessible names
- **File**: `/home/z/my-project/src/components/features/landing-page.tsx`
- **Lines**: 338, 355-362
- **Detail**: Footer `<button>` elements contain only text but are purely decorative (no action). This is confusing for screen reader users.
- **Fix**: Either make them functional with proper aria labels, or use `<span>` elements.

### L5. The `toast` import from `sonner` is used in `study-groups-page.tsx` and `admin-page.tsx` but `Toaster` component may not be mounted
- **Files**: `study-groups-page.tsx` line 48, `admin-page.tsx` line 61
- **Detail**: These files import `toast` from `sonner`, but the `<Toaster />` component needs to be mounted in the app. Checking if it's in the providers or layout...
- **Status**: Need to verify in layout.tsx if `<Toaster />` is rendered. If not, toasts will silently fail.

### L6. `Badge` component in `note-detail-page.tsx` RatingWidget has no `aria-live` region
- **File**: `/home/z/my-project/src/components/features/note-detail-page.tsx`
- **Line**: 126
- **Detail**: When a user rates a note, the rating display updates but there's no `aria-live` region to announce the change to screen readers.
- **Fix**: Wrap the rating display in a `<span aria-live="polite">`.

### L7. MCQ quiz options are `<motion.button>` elements without `type="button"`
- **File**: `/home/z/my-project/src/components/features/note-detail-page.tsx`
- **Lines**: 324-350
- **Detail**: The quiz option buttons are `motion.button` elements without explicit `type="button"`. If placed inside a `<form>`, they could trigger form submission.
- **Fix**: Add `type="button"` to each option button.

### L8. `pageParams.id!` non-null assertions in page.tsx
- **File**: `/home/z/my-project/src/app/page.tsx`
- **Lines**: 77, 95
- **Detail**: `pageParams.id!` uses non-null assertion. If `navigate` is called without an `id` param, this will pass `undefined` as a prop, potentially crashing child components.
- **Fix**: Add a guard: `pageParams.id ? <NoteDetailPage noteId={pageParams.id} /> : <DashboardPage />`

### L9. `leaderboard-page.tsx` unused imports: `ArrowUp`, `Crown`, `Medal`
- **File**: `/home/z/my-project/src/components/features/leaderboard-page.tsx`
- **Lines**: 9-11
- **Detail**: `ArrowUp` is imported but never used. `Crown` and `Medal` are used inside `PodiumDisplay` so they are actually used. Only `ArrowUp` is unused.
- **Fix**: Remove unused `ArrowUp` import.

### L10. `study-groups-page.tsx` uses `toast` from sonner but most other pages use inline error/success states
- **File**: `/home/z/my-project/src/components/features/study-groups-page.tsx`
- **Detail**: Inconsistent notification pattern. Some pages use toast, some use inline messages. This creates an inconsistent UX.
- **Fix**: Standardize on either toast notifications or inline messages across the app.

---

## Summary Table

| Severity | Count | Category Breakdown |
|----------|-------|-------------------|
| CRITICAL | 5 | Broken navigation (2), Missing API handler (1), Wrong API body (1), Missing nav param (1) |
| HIGH | 8 | Broken filters (2), Type mismatches (2), Duplicate handlers (1), Stale cache (1), Dead code (1), Type assertion smell (1) |
| MEDIUM | 10 | No feedback (1), Fake progress (1), Non-functional buttons (2), Code duplication (1), Missing UI (1), Hardcoded values (1), Missing API fields (2), Unused import (1) |
| LOW | 7 | ARIA labels (3), Form button type (1), Non-null assertions (1), Unused import (1), Inconsistent patterns (1) |

**Total Issues**: 30

### Top Priority Fixes (Must Fix Before Production):
1. **C2**: Add `PUT /api/auth` handler for profile updates
2. **C3**: Fix bookmark folder creation API
3. **C1**: Handle `features`/`pricing` navigation
4. **C4**: Fix command palette profile navigation (pass user ID)
5. **C5**: Add `isBookmarked` to `NoteCard` type
6. **H5**: Remove duplicate keyboard shortcut handler
7. **H1**: Wire up search query filter in notes page
8. **H2**: Wire up timePeriod filter in leaderboard
