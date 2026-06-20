# NotesPedia API Production Audit Report

**Task ID:** api-audit  
**Date:** 2026-03-04  
**Auditor:** audit-agent  
**Scope:** All 19 API route files in `/src/app/api/`

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 6 |
| HIGH | 14 |
| MEDIUM | 16 |
| LOW | 10 |

**Top 3 Critical Issues:**
1. Missing API handlers (`PUT /api/auth`, `DELETE /api/auth`) called by frontend — settings page is completely broken
2. No auth on `/api/seed` — anyone can re-seed/destroy production data
3. IDOR in `/api/ai/process` — any user can trigger expensive AI processing on any note

---

## Detailed File-by-File Audit

---

### 1. `/api/auth/route.ts`

**Handlers:** POST (signup/login/logout), GET (current user)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | **CRITICAL** | — | Missing `PUT` handler — settings page calls `PUT /api/auth` for profile updates and password changes | Add `PUT` handler with `action: 'updateProfile'` and `action: 'changePassword'` |
| 2 | **CRITICAL** | — | Missing `DELETE` handler — settings page calls `DELETE /api/auth` for account deletion | Add `DELETE` handler that deactivates/deletes the user account |
| 3 | HIGH | 100-103 | Logout uses dynamic `import()` for `removeAuthCookie` even though it's already statically imported at line 3 | Use the static import directly: `await removeAuthCookie()` |
| 4 | MEDIUM | — | No rate limiting on signup — allows brute-force account creation | Add rate limiting middleware or per-IP throttling |
| 5 | MEDIUM | — | No email verification flow — users can sign up with any email | Add email verification step before account activation |
| 6 | LOW | 6 | JWT secret fallback `'notespedia-secret-key-change-in-production'` in `/lib/auth.ts` line 6 — if `JWT_SECRET` env var is missing, all tokens use a known secret | Throw error at startup if `JWT_SECRET` is not set |
| 7 | LOW | 116-129 | GET handler doesn't check `user.isActive` — suspended users still appear as authenticated | Add `isActive` check in `getAuthUser()` or in the GET handler |

---

### 2. `/api/notes/route.ts`

**Handlers:** GET (list), POST (create)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | **CRITICAL** | 148 | `fetch(\`/api/ai/process?noteId=${note.id}\`)` — relative URL in server-side code will fail. In Next.js server components/routes, `fetch` with relative URLs does NOT work; it needs an absolute URL | Use the full URL: `fetch(\`http://localhost:3000/api/ai/process?noteId=${note.id}\`)` or invoke the AI processing logic directly |
| 2 | HIGH | 98-99 | No Zod validation on POST body — `title`, `description`, `tags`, `filePath`, etc. accept any input | Add Zod schema for note creation |
| 3 | HIGH | 121 | `tags` array accepts any strings without length/character validation — could inject very long tags or XSS payloads | Validate tags: max length per tag, max number of tags, sanitize content |
| 4 | MEDIUM | 5-10 | GET requires auth to list notes, but `/api/search` allows unauthenticated access to similar data — inconsistent access control | Decide on consistent policy: either both require auth or both allow anonymous |
| 5 | MEDIUM | 117 | `semester: semester \|\| null` — if `semester` is `0` (a valid semester), it becomes `null` due to falsy check | Use `semester ?? null` or explicit `semester !== undefined ? semester : null` |
| 6 | LOW | 13-14 | `parseInt` on page/limit without NaN check — `?page=abc` becomes `NaN`, causing skip=NaN | Add `Math.max(1, parseInt(...) \|\| 1)` pattern |
| 7 | LOW | — | No maximum `limit` parameter — client could request `?limit=99999` and load entire table | Cap `limit` at e.g. 50 |

---

### 3. `/api/notes/[id]/route.ts`

**Handlers:** GET only

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | HIGH | — | Missing `PUT` handler — no way to edit/update a note | Add `PUT` handler with ownership check |
| 2 | HIGH | — | Missing `DELETE` handler — no way to delete a note | Add `DELETE` handler with ownership/admin check |
| 3 | HIGH | 13-40 | No access control — any user (even anonymous) can view notes of any status (`processing`, `flagged`, `removed`, `draft`) by ID | Add status/visibility filter: non-owners should only see `active` + `isPublic: true` notes |
| 4 | MEDIUM | 46-49 | View count increments on every GET — no throttling. Bots, page refreshes, and prefetching all count | Add IP-based or session-based view throttling (e.g., 1 view per user per 24h) |
| 5 | MEDIUM | 78-79 | `note.bookmarks as unknown as unknown[]` and `note.ratings as { value: number }[]` — unsafe type casts indicate Prisma include types aren't properly inferred | Use proper conditional include typing or type assertion with a defined interface |
| 6 | LOW | — | No `updatedAt` field in response | Include `updatedAt` for edit detection |

---

### 4. `/api/search/route.ts`

**Handlers:** GET

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | MEDIUM | — | No auth required (intentional for public search) but no rate limiting — could be abused for scraping | Add rate limiting |
| 2 | MEDIUM | 23-29 | `contains` search is basic substring match — no relevance ranking, no full-text search | Consider Prisma full-text search or external search service for production |
| 3 | LOW | 11 | Same `parseInt` without NaN check as other routes | Add validation |
| 4 | LOW | 86-87 | Same unsafe type casts for bookmarks/ratings as `/api/notes/[id]` | Fix type inference |

---

### 5. `/api/ai/process/route.ts`

**Handlers:** POST (trigger processing), GET (check status)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | **CRITICAL** | 38-57 | IDOR: Any authenticated user can trigger AI processing on any note (not just their own). Expensive AI calls can be triggered maliciously. | Add ownership check: `if (note.uploaderId !== user.id) return 403` |
| 2 | HIGH | 226-257 | GET status endpoint has NO auth — anyone can check any note's AI processing status | Add auth check or at minimum verify note ownership/public status |
| 3 | HIGH | — | No rate limiting on AI processing — extremely expensive operation (3 AI API calls per request) | Add per-user rate limit (e.g., max 5 processing requests per hour) |
| 4 | MEDIUM | 211-217 | On AI failure, note status is set to `'active'` regardless of original status — if note was `'draft'` or `'flagged'`, original status is lost | Save original status before setting `'processing'`, restore on failure |
| 5 | MEDIUM | — | No concurrency protection — same note could be processed simultaneously by multiple requests | Add a lock/check: if note.status is already `'processing'`, reject the request |
| 6 | MEDIUM | 92-101 | JSON parse failure fallback creates a summary from raw AI response (line 96) — could contain unsafe content | Sanitize the fallback content |
| 7 | LOW | 66 | Truncation at 8000 chars is arbitrary and not documented | Make configurable or document the limit |

---

### 6. `/api/bookmarks/route.ts`

**Handlers:** GET (list), POST (add), DELETE (remove)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | MEDIUM | 175-178 | `bookmarkCount: { decrement: 1 }` can go negative if counters are out of sync | Use `Math.max(0, ...)` or use `UPDATE ... SET bookmarkCount = GREATEST(bookmarkCount - 1, 0)` via raw query, or recalculate from count |
| 2 | LOW | — | No Zod validation on POST body | Add schema validation |
| 3 | LOW | 14 | `parseInt` without NaN check | Add validation |

---

### 7. `/api/ratings/route.ts`

**Handlers:** POST (rate), GET (get ratings)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | MEDIUM | 59 | `rating.createdAt === rating.updatedAt` — relies on timestamp equality to detect new vs updated ratings. This is fragile and may not work correctly across all DB engines/timezones. | Track explicitly: use a separate `isNew` flag or check existence before upsert |
| 2 | MEDIUM | 123-126 | GET ratings distribution loads ALL ratings into memory then counts in JS — inefficient for notes with many ratings | Use `db.rating.groupBy({ by: ['value'], _count: true, where: { noteId } })` |
| 3 | LOW | — | No Zod validation on POST body | Add schema validation |
| 4 | LOW | — | No rate limiting on rating submissions | Add throttling |

---

### 8. `/api/comments/route.ts`

**Handlers:** GET (list), POST (add)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | HIGH | — | Missing `PUT` handler — no way to edit comments (the `isEdited` field exists but can never be set to `true`) | Add `PUT` handler with ownership check |
| 2 | HIGH | — | Missing `DELETE` handler — comments use soft delete (`isDeleted`) but there's no API to delete them | Add `DELETE` handler that sets `isDeleted: true` with ownership/admin check; also decrement `commentCount` |
| 3 | MEDIUM | 85-88 | No content length validation — could post extremely long comments (MBs of text) | Add max length validation (e.g., 2000 characters) |
| 4 | MEDIUM | — | No rate limiting on comment creation | Add throttling |
| 5 | LOW | 154-158 | Redundant DB query — parent comment is fetched twice (lines 99-104 and 154-158) | Cache the first query result and reuse it |
| 6 | LOW | — | No Zod validation on POST body | Add schema validation |

---

### 9. `/api/notifications/route.ts`

**Handlers:** GET (list), PUT (mark read), DELETE (clear all)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | MEDIUM | 109-111 | `deleteMany` with only `userId` filter — no confirmation, no soft delete. All notifications are permanently destroyed. | Consider soft delete or require explicit confirmation param |
| 2 | LOW | — | No Zod validation on PUT body | Add schema validation |
| 3 | LOW | — | No pagination limit cap | Cap at reasonable max |

---

### 10. `/api/colleges/route.ts`

**Handlers:** GET (list), POST (create — admin only)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | MEDIUM | — | No duplicate college name check on POST — could create multiple "IIT Bombay" entries | Add uniqueness check before creation |
| 2 | LOW | — | No Zod validation on POST body | Add schema validation |
| 3 | LOW | — | GET has no auth (intentional for browsing) | OK as-is |

---

### 11. `/api/subjects/route.ts`

**Handlers:** GET (list), POST (create)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | **HIGH** | 66-116 | POST has NO role check — any authenticated user (even `guest`) can create subjects. This should be admin/moderator only like `/api/colleges`. | Add role check: `if (!['admin', 'super_admin', 'moderator'].includes(user.role)) return 403` |
| 2 | MEDIUM | — | No duplicate subject check (same name + code + collegeId combination) | Add uniqueness check |
| 3 | LOW | — | No Zod validation on POST body | Add schema validation |

---

### 12. `/api/follows/route.ts`

**Handlers:** POST (follow/unfollow toggle), GET (check status)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | HIGH | 50-62 | Race condition in follow/unfollow toggle — two concurrent requests could both find no existing follow and create duplicates | Use `upsert` or unique constraint + `create` with catch for `P2002` error |
| 2 | MEDIUM | 79, 115-119 | College follow doesn't update any counter — unlike user follows (follower/following counts) and subject follows (followerCount), college follows have no counter update | Add `college.profileCount` or similar counter update, or document that college follows don't affect counters |
| 3 | MEDIUM | 141-143 | GET handler returns `{ success: true, following: false }` for unauthenticated users — this is misleading since the user isn't "not following", they just aren't logged in | Return a different structure: `{ authenticated: false, following: null }` |
| 4 | LOW | — | No Zod validation on POST body | Add schema validation |
| 5 | LOW | — | No rate limiting on follow/unfollow | Add throttling |

---

### 13. `/api/leaderboard/route.ts`

**Handlers:** GET

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | MEDIUM | — | No caching — expensive query with joins/aggregation run on every request | Add in-memory cache with TTL (e.g., 5 minutes) |
| 2 | LOW | — | No auth required (intentional for public leaderboard) | OK as-is, but consider rate limiting |
| 3 | LOW | 10 | Same `parseInt` without NaN check | Add validation |

---

### 14. `/api/study-groups/route.ts`

**Handlers:** GET (list), POST (create), PUT (join/leave)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | HIGH | 40-44 | N+1-style query: fetches ALL user memberships (`findMany` with no group filter) instead of just for the groups on the current page. If user is in 100 groups but page shows 12, all 100 memberships are loaded. | Query memberships filtered by group IDs from the current page: `where: { userId: user.id, groupId: { in: groups.map(g => g.id) } }` |
| 2 | MEDIUM | 113 | `maxMembers: maxMembers \|\| 50` — `maxMembers: 0` becomes 50. If someone wants to cap at 0 (disabled group), this breaks. | Use `maxMembers ?? 50` |
| 3 | MEDIUM | — | No Zod validation on POST/PUT bodies | Add schema validation |
| 4 | LOW | — | No role check for creating study groups — any user can create unlimited groups | Consider rate limiting or role requirement |
| 5 | LOW | — | PUT uses same endpoint for both join and leave — could be confusing | Consider separate endpoints or at least clearer API design |

---

### 15. `/api/users/[id]/route.ts`

**Handlers:** GET

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | **CRITICAL** | 125-128 | Dead code! Queries `db.user.findFirst({ where: { id } })` (same ID as the profile being viewed) and then `void currentUser`. This was clearly intended to check if the current logged-in user follows this profile, but the implementation is completely wrong — it fetches the same user again and discards the result. | Fix: Get the current auth user, then check `db.follow.findFirst({ where: { followerId: currentUser.id, followingId: id } })` and return `isFollowing` in the response |
| 2 | HIGH | 14 | `email: true` in select — exposes user email to anyone who knows the user ID. Major privacy issue. | Remove email from public profile, or only include it if the requester is the profile owner |
| 3 | MEDIUM | — | Missing `PUT` handler — no way for users to update their profile via this endpoint | Add `PUT` handler with ownership check |
| 4 | LOW | — | No auth required to view any user profile | Consider requiring auth or restricting fields for anonymous users |

---

### 16. `/api/upload/route.ts`

**Handlers:** POST

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | HIGH | 40-57 | Extension validation is incomplete — line 55-56 checks if extension matches MIME type but the `if` block is empty (just a comment). An attacker could upload a `.exe` renamed to `.pdf` if they also set the Content-Type to `application/pdf`. | Reject the file if extension doesn't match MIME type, or validate file content (magic bytes) |
| 2 | MEDIUM | 76-81 | `buffer.toString('utf-8')` for text extraction could cause memory issues with large files — the 50MB limit means 50MB could be read into a string | Stream the file instead of loading entire buffer into memory, or set a lower limit for text files |
| 3 | MEDIUM | — | No cleanup mechanism for orphaned files — if note creation fails after upload, the file remains on disk | Add a cleanup job or tie file lifecycle to note creation |
| 4 | LOW | 61 | `Math.random()` for filename — not cryptographically secure, could theoretically be predicted | Use `crypto.randomUUID()` or `crypto.randomBytes()` |
| 5 | LOW | — | No file content scanning for malware | Add virus scanning for production |

---

### 17. `/api/admin/route.ts`

**Handlers:** GET (stats only)

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | HIGH | — | Only has GET handler — no admin action endpoints (ban user, remove note, resolve report, etc.). The admin dashboard can view stats but can't perform any actions. | Add POST/PUT handlers for admin actions (ban, suspend, remove, resolve reports) with audit logging |
| 2 | MEDIUM | 44, 129-131 | Inconsistent download metrics: `totalDownloads` (line 44) counts rows in `Download` table, but `downloadSum` (line 129) sums the denormalized `downloadCount` on notes. These can diverge. | Use one consistent source, or label them clearly as different metrics |
| 3 | LOW | — | Very large parallel query — 17 queries + 2 more after = 19 total DB queries per request. Could be slow. | Consider caching stats or using a materialized view |

---

### 18. `/api/seed/route.ts`

**Handlers:** POST

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | **CRITICAL** | — | **No authentication or authorization check** — anyone can call `POST /api/seed` to seed (or potentially corrupt) the database. This endpoint should NOT be accessible in production. | Add admin role check AND disable in production via environment check |
| 2 | HIGH | — | No protection against partial re-seed — only checks `college.count() > 0` but notes, users, etc. could exist | Check all models or use a database transaction |
| 3 | HIGH | — | Very long-running operation (creates dozens of records with AI processing) — no timeout protection | Add timeout and consider running seed as a script, not an API endpoint |
| 4 | MEDIUM | — | Not disabled in production — endpoint is always available | Add `if (process.env.NODE_ENV === 'production') return 403` |
| 5 | LOW | — | Uses plain text passwords in seed data (`password123`) | Document that these are test-only credentials |

---

### 19. `/api/route.ts`

**Handlers:** GET

| # | Severity | Line(s) | Issue | Recommended Fix |
|---|----------|---------|-------|-----------------|
| 1 | LOW | — | Returns `{ message: "Hello, world!" }` — serves no purpose | Remove or replace with API documentation/health check endpoint |

---

## Cross-Cutting Issues

### Missing API Routes (Frontend Calls Non-Existent Endpoints)

| Frontend File | API Call | Status |
|---------------|----------|--------|
| `settings-page.tsx:74` | `PUT /api/auth` (update profile) | **MISSING — 405 error** |
| `settings-page.tsx:87` | `PUT /api/auth` (change password) | **MISSING — 405 error** |
| `settings-page.tsx:100` | `DELETE /api/auth` (delete account) | **MISSING — 405 error** |
| `settings-page.tsx:144` | `GET /api/users/me` | **BROKEN — `me` is treated as a user ID, returns null** |

**Impact:** The entire Settings page is non-functional. Users cannot update profiles, change passwords, or delete accounts.

### API Routes Never Called From Frontend

| Route | Status |
|-------|--------|
| `GET /api/seed` | Never called from frontend — manual-only endpoint |
| `GET /api/ai/process` (status check) | The POST is called from notes route, but GET status endpoint is never used by frontend |
| `GET /api/route.ts` | Not called by any frontend component |

### IDOR Vulnerabilities

| Route | Issue |
|-------|-------|
| `POST /api/ai/process` | Any user can trigger AI processing on any note |
| `GET /api/notes/[id]` | No access control — can view draft/flagged/removed notes |
| `GET /api/users/[id]` | Exposes email and full profile to any requester |

### Missing Zod Validation (ALL Routes Except Auth Signup/Login)

The following routes accept raw `request.json()` without any schema validation:

- `/api/notes` POST
- `/api/ai/process` POST
- `/api/bookmarks` POST
- `/api/ratings` POST
- `/api/comments` POST
- `/api/notifications` PUT
- `/api/colleges` POST
- `/api/subjects` POST
- `/api/follows` POST
- `/api/study-groups` POST, PUT
- `/api/seed` POST

### Counter Desync Risk

Multiple routes manually increment/decrement denormalized counters (`bookmarkCount`, `commentCount`, `followerCount`, etc.) instead of using authoritative counts from the related table. If any operation fails partway (e.g., bookmark created but increment fails), the counter will be permanently out of sync.

**Affected counters:**
- `Note.bookmarkCount` — incremented/decremented in `/api/bookmarks`
- `Note.commentCount` — incremented in `/api/comments` (but never decremented — no delete handler!)
- `Note.downloadCount` — never updated (no download endpoint exists)
- `Note.ratingCount` / `Note.avgRating` — recalculated on each rating (good)
- `Profile.followerCount` / `followingCount` — incremented/decremented in `/api/follows`
- `Profile.uploadCount` — incremented in `/api/notes` POST
- `Subject.followerCount` — incremented/decremented in `/api/follows`
- `StudyGroup.memberCount` — incremented/decremented in `/api/study-groups`

### Race Conditions

| Route | Issue |
|-------|-------|
| `POST /api/follows` | Follow/unfollow toggle is not atomic — two concurrent requests could create duplicate follows |
| `POST /api/ai/process` | No lock on note processing — same note could be processed concurrently |

---

## Priority Remediation Plan

### Phase 1 — Fix Broken Features (CRITICAL)

1. **Add `PUT /api/auth`** — handle profile updates and password changes
2. **Add `DELETE /api/auth`** — handle account deletion
3. **Fix `/api/users/me`** — add a `/api/users/me/route.ts` or handle `me` in the `[id]` route
4. **Fix `/api/notes` POST line 148** — change relative fetch to absolute URL
5. **Add auth to `/api/seed`** — restrict to admin, disable in production
6. **Fix IDOR in `/api/ai/process`** — add ownership check

### Phase 2 — Security Hardening (HIGH)

1. Add role check to `/api/subjects` POST
2. Add access control to `/api/notes/[id]` GET (status/visibility filter)
3. Remove email from `/api/users/[id]` public response
4. Add rate limiting to all mutation endpoints
5. Fix upload file extension validation
6. Add Zod schemas to all POST/PUT handlers

### Phase 3 — Data Integrity (MEDIUM)

1. Fix dead code in `/api/users/[id]` (follow status check)
2. Add counter guards to prevent negative values
3. Add concurrency protection for AI processing
4. Add comment edit/delete handlers
5. Fix the `rating.createdAt === rating.updatedAt` pattern
6. Add note edit/delete handlers

### Phase 4 — Performance & Polish (LOW)

1. Add caching to leaderboard endpoint
2. Optimize study-groups membership query
3. Add view count throttling
4. Clean up `/api/route.ts`
5. Replace `Math.random()` with `crypto.randomUUID()` in upload
6. Add missing `updatedAt` fields to responses
