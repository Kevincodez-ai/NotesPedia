# Task: fix-critical-api

## Agent: Main

## Summary

Applied all 6 critical fixes to the NotesPedia API routes.

## Fixes Applied

### CRITICAL FIX 1: /api/auth/route.ts
- Added `PUT` handler for profile updates (name, bio, avatarUrl, collegeId, departmentId, semester)
- Added `DELETE` handler for account deactivation (sets `isActive = false`, removes auth cookie)
- Updated imports to include `getAuthUser` and `removeAuthCookie` directly (removed dynamic imports)
- Added `updateProfileSchema` with Zod validation

### CRITICAL FIX 2: /api/users/[id]/route.ts
- Fixed email privacy leak: email is now only included in response when requester is the same user (`isOwnProfile` check)
- Fixed dead code (lines 125-128): replaced broken `findFirst({ where: { id } })` with proper `isFollowing` check using `db.follow.findFirst`
- Added `uploader` and `viewCount` to the `recentNotes` query
- Added `isFollowing` boolean to the response

### CRITICAL FIX 3: /api/notes/route.ts
- Replaced broken server-side relative fetch (`fetch('/api/ai/process?noteId=...')`) with direct database update
- Note status is now set to 'active' immediately after creation
- AI processing can be triggered separately via POST /api/ai/process

### CRITICAL FIX 4: /api/seed/route.ts
- Added authentication check at the top of POST handler
- Added admin role check using `hasRole(user.role, ['admin'])`
- Returns 401 if not authenticated, 403 if not admin

### CRITICAL FIX 5: /api/ai/process/route.ts
- Added IDOR protection: checks `note.uploaderId === user.id` OR `hasRole(user.role, ['admin', 'moderator'])`
- Returns 403 if user is neither the owner nor an admin/moderator
- Added `hasRole` import

### CRITICAL FIX 6: /api/bookmarks/route.ts
- Added `action: 'createFolder'` handling - creates BookmarkFolder with name, color, icon
- Added `action: 'deleteFolder'` handling - deletes BookmarkFolder after verifying ownership
- Default (no action) retains existing bookmark toggle behavior

## Verification
- ESLint passes with no errors
- Dev server compiles and runs successfully
