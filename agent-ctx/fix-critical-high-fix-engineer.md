# Task ID: fix-critical-high
# Agent: Critical & High Issue Fix Engineer

## Summary
Fixed all 6 CRITICAL and 3 HIGH issues from the complete audit.

## Fixes Applied

### CRITICAL (6)
1. **Download Button 404** - Created `/api/download/[id]` route with auth, file serving, download tracking, reputation awards. Updated note-detail-page.tsx.
2. **Admin Tabs Broken** - Added listUsers/listNotes/listReports/listColleges actions to POST /api/admin. Updated admin-page.tsx fetchers to POST instead of GET.
3. **Change Password Silently Fails** - Added password change handling to PUT /api/auth before Zod schema parsing.
4. **Notifications markAllRead** - Fixed `{ markAll: true }` → `{ markAllRead: true }` in notifications-page.tsx.
5. **Notes Page Search & Filters** - Added `q` (title/description search) and `fileType` params to GET /api/notes.
6. **Dashboard My Uploads Always 0** - Fixed `uploaderId=me` → actual user ID from store.

### HIGH (3)
1. **Remove Study Groups** - Removed from page.tsx, types, app-shell, command-palette. Deleted study-groups-page.tsx and API route.
2. **Landing Page Stats** - Made dynamic by fetching from /api/admin instead of hardcoded "10K+" etc.
3. **Admin Role Check** - Added moderator to allowed roles in admin-page.tsx gate.

## Files Modified
- `/src/app/api/download/[id]/route.ts` (created)
- `/src/app/api/admin/route.ts`
- `/src/app/api/auth/route.ts`
- `/src/app/api/notes/route.ts`
- `/src/components/features/note-detail-page.tsx`
- `/src/components/features/admin-page.tsx`
- `/src/components/features/notifications-page.tsx`
- `/src/components/features/dashboard.tsx`
- `/src/components/features/landing-page.tsx`
- `/src/components/layout/app-shell.tsx`
- `/src/components/layout/command-palette.tsx`
- `/src/app/page.tsx`
- `/src/types/index.ts`

## Files Deleted
- `/src/components/features/study-groups-page.tsx`
- `/src/app/api/study-groups/route.ts`

## Verification
- Lint: PASS (0 errors)
- Dev server: Compiling successfully
