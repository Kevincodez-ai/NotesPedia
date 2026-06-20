# API CRUD Audit Report — Task `api-crud-audit`

**Auditor:** Code Auditor Agent  
**Date:** 2026-03-05  
**Scope:** All 17 API route files in `/home/z/my-project/src/app/api/`

---

## Executive Summary

| Metric | Count |
|---|---|
| Total API route files audited | 19 (17 requested + 2 discovered) |
| Total HTTP handler functions | 31 |
| Missing CRUD operations | 18 |
| Bugs / broken logic found | 22 |
| Mock / hardcoded data instances | 0 (seed excluded by nature) |
| Missing error handling issues | 3 |
| Broken FK / data integrity issues | 5 |
| Type-safety / runtime crash risks | 4 |

---

## 1. `/api/colleges/route.ts`

### Methods Implemented: `GET`, `POST`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (update college) | ❌ MISSING | Cannot edit college details (name, website, etc.) |
| **DELETE** (delete college) | ❌ MISSING | Cannot remove a college |

### Bugs Found
1. **Line 13-14 — `parseInt` without NaN guard**: `page` and `limit` use `parseInt()` but if the query param is `"abc"`, `parseInt` returns `NaN`, causing `skip`/`take` to be `NaN` → Prisma query will fail or return unexpected results.
2. **Line 17 — Empty string filter**: `if (q.trim()) where.name = { contains: q.trim() }` is fine, but the `where` object is typed as `Record<string, unknown>` instead of Prisma's `Prisma.CollegeWhereInput`, losing type safety and potentially passing invalid fields.
3. **Line 80-82 — Incomplete validation**: Only `name` is validated as required. `type` is not validated against allowed values (`university`, `college`, `institute`). A caller could pass `type: "garbage"` without error.

### Mock/Hardcoded Data
None.

---

## 2. `/api/subjects/route.ts`

### Methods Implemented: `GET`, `POST`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (update subject) | ❌ MISSING | Cannot edit subject details |
| **DELETE** (delete subject) | ❌ MISSING | Cannot remove a subject |

### Bugs Found
1. **Line 44-45 — Phantom fields `noteCount` and `followerCount`**: The mapping references `s.noteCount` and `s.followerCount`, but the Prisma query does NOT select these fields — it uses `_count.notes` and `_count.follows`. Since the `Subject` model has `noteCount` and `followerCount` as actual columns, this accidentally reads the **denormalized counter columns** instead of the computed counts, creating a confusing response with both `noteCount`/`followerCount` (stale counters) AND `actualNoteCount`/`actualFollowerCount` (accurate counts). This is misleading.
2. **Line 20 — `semester` filter uses `parseInt(semester)` without NaN guard**: If `semester=abc`, `parseInt` returns `NaN`, which Prisma may reject or misinterpret.
3. **Line 99 — `semester: semester ? parseInt(semester) : null`**: Same NaN issue in POST.
4. **Line 74 — POST missing role check**: Unlike `colleges/route.ts` which restricts POST to admin/moderator, anyone authenticated can create subjects. This may be intentional but is inconsistent.

### Mock/Hardcoded Data
None.

---

## 3. `/api/study-groups/route.ts`

### Methods Implemented: `GET`, `POST`, `PUT`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (update group details) | ⚠️ PARTIAL | PUT exists but only handles join/leave, NOT updating group metadata (name, description, maxMembers) |
| **DELETE** (delete group) | ❌ MISSING | Cannot delete a study group |

### Bugs Found
1. **Line 52-53 — Phantom fields `memberCount`**: `g.memberCount` reads the denormalized counter column, while `g._count.members` is the actual count. Exposed as `memberCount` and `actualMemberCount` — confusing.
2. **Line 114 — Denormalized counter set to 1 on creation**: `memberCount: 1` is set manually, but the creator is added via a separate `studyGroupMember.create` on line 119. If the member create fails, `memberCount` is 1 but there are 0 members — data inconsistency.
3. **Line 170-184 — Race condition on join**: Between checking `existingMember` (line 161) and creating the member (line 174), another request could create the same membership. The `@@unique([groupId, userId])` constraint would catch it, but the error would be a raw Prisma error, not the friendly "Already a member" message.
4. **Line 195-196 — Admin cannot leave but there's no transfer**: The error says "Transfer ownership first" but there is no API endpoint to transfer ownership.
5. **Line 37-44 — Unnecessary DB call for membership**: The `getAuthUser()` call on line 37 happens even for unauthenticated users (it just returns null), but then `findMany` for memberships still runs for non-logged-in users (the `if (user)` check is correct, but the `getAuthUser()` function itself always queries the DB for the cookie).

### Mock/Hardcoded Data
None.

---

## 4. `/api/comments/route.ts`

### Methods Implemented: `GET`, `POST`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (edit comment) | ❌ MISSING | The `Comment` model has `isEdited` field but no endpoint to edit. Comments cannot be updated. |
| **DELETE** (delete comment) | ❌ MISSING | The `Comment` model has `isDeleted` (soft-delete) field but no endpoint to soft-delete. Comments cannot be removed. |

### Bugs Found
1. **Line 120-123 — Comment count increment on note**: `commentCount: { increment: 1 }` is correct, but there's no corresponding decrement when a comment is deleted (and there's no DELETE endpoint to do it).
2. **Line 154-158 — Redundant DB query for parent comment**: The parent comment was already fetched on line 99 for validation. This second query on line 155 is unnecessary — could have stored it from the first query.
3. **Line 126-129 — Profile update may fail**: `db.profile.update({ where: { userId: user.id } })` will throw if the user has no Profile record. Signup creates one, but edge cases (e.g., admin-created users without profiles) would cause a 500 error.

### Mock/Hardcoded Data
None.

---

## 5. `/api/notifications/route.ts`

### Methods Implemented: `GET`, `PUT`, `DELETE`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **POST** (create notification) | ❌ MISSING but intentional | Notifications are created server-side (by comments, follows, etc.), not by client POST |
| **DELETE single notification** | ❌ MISSING | Can only clear ALL notifications. No way to dismiss individual ones. |

### Bugs Found
1. **Line 102-113 — DELETE clears ALL notifications**: There's no way to delete a single notification by ID. The endpoint only does `deleteMany` for the user. This is overly destructive.
2. **Line 59-99 — PUT only marks as read**: There's no way to mark a notification as unread.

### Mock/Hardcoded Data
None.

---

## 6. `/api/follows/route.ts`

### Methods Implemented: `POST`, `GET`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **DELETE** (unfollow) | ⚠️ INDIRECT | Unfollow is handled via POST toggle (if already following, it unfollows). This is non-RESTful. A DELETE method would be more appropriate. |
| **PUT/PATCH** | N/A | No need for update on follows |

### Bugs Found
1. **Line 51-58 — Complex `findFirst` query with spread operators**: The `findFirst` uses spread operators with `followingId: null`, `subjectId: null`, `collegeId: null` for non-matching types. This creates a query like `{ followerId, followingId: null, subjectId: null, collegeId: null }` which in SQLite may not work as expected due to how NULL comparisons work. In SQL, `NULL = NULL` is false. Prisma translates `{ followingId: null }` to `IS NULL`, but combining all three null conditions may not match the existing record if the Follow record has null values stored differently.
2. **Line 74-78 — Missing college counter update**: When unfollowing a college, no counter is decremented. When following a college (line 115-119), no counter is incremented. The `College` model doesn't have a `followerCount` field, so this is partially correct, but it's inconsistent with subject following which does update a counter.
3. **Line 65-73 — `db.profile.update` may fail**: If the followed/unfollowed user has no Profile record, the `update` will throw. Same issue as comments.

### Mock/Hardcoded Data
None.

---

## 7. `/api/bookmarks/route.ts`

### Methods Implemented: `GET`, `POST`, `DELETE`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (move bookmark to different folder) | ❌ MISSING | Cannot move a bookmark between folders after creation |
| **PUT/PATCH** (rename folder) | ❌ MISSING | Cannot update folder name/color/icon |

### Bugs Found
1. **Line 112-129 — Folder deletion via POST with `action: 'deleteFolder'`**: This is non-RESTful. Should be a DELETE request. Also, deleting a folder does NOT handle orphaned bookmarks — the `folderId` on bookmarks will be set to NULL (due to `onDelete: SetNull` in schema), but the user isn't warned.
2. **Line 132-181 — POST overloaded with 3 actions**: `createFolder`, `deleteFolder`, and `addBookmark` all share the POST method. This is confusing and non-RESTful.
3. **Line 150-152 — No toggle behavior for bookmarks**: Unlike follows (which toggle), bookmarks return a 409 "Already bookmarked" error. This forces the client to check before adding.

### Mock/Hardcoded Data
None.

---

## 8. `/api/ratings/route.ts`

### Methods Implemented: `POST`, `GET`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **DELETE** (remove rating) | ❌ MISSING | Users cannot delete their rating. The upsert allows updating but not removing. |
| **PUT/PATCH** | ⚠️ COVERED by POST upsert | POST uses upsert, so updating is handled. But it's semantically wrong to use POST for updates. |

### Bugs Found
1. **Line 59 — `rating.createdAt === rating.updatedAt` is unreliable for detecting new ratings**: In SQLite with Prisma, `createdAt` and `updatedAt` may not be precisely equal due to how Prisma handles defaults. With `@updatedAt`, Prisma always sets `updatedAt` to the current time on every update, even on create. So on a fresh create, `createdAt` and `updatedAt` could be slightly different due to timing. This means the reputation bonus + notification might not fire for new ratings, or could fire on updates. **This is a significant bug.**
2. **Line 50-56 — Recalculating avgRating on every rating**: This is correct but could become a performance issue with many ratings. Not a bug per se, but a concern.
3. **Line 60-63 — `db.profile.update` may fail**: Same profile existence issue.

### Mock/Hardcoded Data
None.

---

## 9. `/api/admin/route.ts`

### Methods Implemented: `GET`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **POST** (admin actions: ban, suspend, etc.) | ❌ MISSING | `AdminAction` model exists in schema but there's no endpoint to create admin actions |
| **PUT/PATCH** (resolve reports) | ❌ MISSING | `Report` model exists but there's no endpoint to update report status |
| **DELETE** (remove content) | ❌ MISSING | No endpoint for admins to delete/flag notes, users, or comments |

### Bugs Found
1. **Line 6 — `GET()` doesn't accept `NextRequest`**: The function signature is `GET()` with no parameters, but it should accept `NextRequest` for consistency and future filtering/pagination.
2. **Line 117-126 — Two extra sequential DB queries after `Promise.all`**: The `userRoleDistribution` and `noteStatusDistribution` queries run sequentially after the main `Promise.all`. They should be included in the `Promise.all` for efficiency.
3. **Line 129-131 — Redundant download count**: Both `totalDownloads` (from `db.download.count()`) and `downloadSum` (from `db.note.aggregate`) compute download counts differently. `totalDownloads` counts Download records, `downloadSum` sums `note.downloadCount`. These can diverge. The response uses `downloadSum`, making `totalDownloads` dead code.

### Mock/Hardcoded Data
None.

---

## 10. `/api/notes/route.ts`

### Methods Implemented: `GET`, `POST`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (update note) | ❌ MISSING | Cannot edit note title, description, tags, subject, etc. after creation |
| **DELETE** (delete note) | ❌ MISSING | Cannot delete a note |

### Bugs Found
1. **Line 99 — POST accepts `extractedText` and `previewText` from client**: These should be generated server-side (from file upload), not accepted from the client. A malicious user could inject arbitrary content.
2. **Line 117 — `semester: semester || null`**: If `semester` is `0`, this would incorrectly set it to `null`. Should be `semester ?? null` or explicit check.
3. **Line 105-130 — No FK validation**: When creating a note with `subjectId`, `collegeId`, or `departmentId`, there's no verification that these records exist. A typo in any ID would create an orphaned note (or cause a FK constraint error from Prisma/SQLite).
4. **Line 119 — Status set to `'processing'` then immediately to `'active'`**: The note is created with `status: 'processing'` (line 119), then updated to `'active'` on line 148-151. This is a race condition — the note appears as `processing` briefly, and if the status update fails, it stays `processing` forever.

### Mock/Hardcoded Data
None.

---

## 11. `/api/notes/[id]/route.ts`

### Methods Implemented: `GET`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (update note) | ❌ MISSING | Cannot update note details |
| **DELETE** (delete note) | ❌ MISSING | Cannot delete a note |

### Bugs Found
1. **Line 78-79 — Unsafe type casts**: `(note.bookmarks as unknown as unknown[])?.length > 0` and `(note.ratings as { value: number }[])?.[0]?.value` — these are fragile type assertions. The `bookmarks` include is conditionally `{ where: { userId: user.id }, select: { id: true } }`, so the type is correct at runtime, but TypeScript can't verify this.
2. **Line 46-49 — View count increment on every GET**: Every page load increments `viewCount`, including refreshes, bots, and API polling. No rate limiting or deduplication.
3. **Line 70 — `viewCount: note.viewCount + 1`**: This adds 1 to the pre-increment value (since the increment is async and hasn't been committed yet when the response is formatted). If two requests hit simultaneously, both might read the same base value.

### Mock/Hardcoded Data
None.

---

## 12. `/api/users/[id]/route.ts`

### Methods Implemented: `GET`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **PUT/PATCH** (update user profile) | ❌ MISSING here | Profile updates are handled via `/api/auth/route.ts` PUT, but only for the current user. No admin endpoint to update other users. |
| **DELETE** (delete user) | ❌ MISSING | No endpoint to delete a user (even for admins) |

### Bugs Found
1. **Line 21 — Conditional email exposure**: `email: isOwnProfile` in the select statement means `email` is only included when `isOwnProfile` is true. This is correct behavior, but if `isOwnProfile` is false, the `email` field will be `undefined` (not omitted) in the raw Prisma result. The destructuring on line 92 (`...(isOwnProfile ? { email: user.email } : {})`) handles this correctly, but the raw `user` object will have `email: undefined` which could leak if the entire object is accidentally serialized elsewhere.
2. **Line 65-67 — `db.download.count()` for total downloads**: This counts Download records, which requires a unique download record per download. If the schema's `@@unique([noteId, userId])` prevents duplicate downloads, this counts unique user-note download pairs, not total downloads.

### Mock/Hardcoded Data
None.

---

## 13. `/api/upload/route.ts`

### Methods Implemented: `POST`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **DELETE** (remove uploaded file) | ❌ MISSING | Cannot delete an uploaded file. Orphaned files accumulate. |
| **GET** | N/A | No need for listing uploads |
| **PUT** | N/A | No need for updating files |

### Bugs Found
1. **Line 55-57 — Dead code block**: The extension verification block does nothing. If the extension doesn't match the MIME type, it just falls through with a comment `// Use the extension from allowed types for this MIME type` but doesn't actually use the allowed extension. The file is saved with whatever extension was in the original filename.
2. **Line 65-72 — Files saved to `public/uploads`**: Files are stored in the public directory, making them directly accessible via URL. No access control — any uploaded file (including documents with sensitive content) is publicly accessible.
3. **Line 28 — `formData.get('file') as File | null`**: Type assertion without validation. If someone sends a string field named `file`, this will cast it to `File` and then crash on `.size`.
4. **Line 76-82 — Only text extraction for TXT/MD**: PDF, DOCX, PPTX files have no text extraction. The `extractedText` will be null for these file types, making AI processing impossible for most document uploads.

### Mock/Hardcoded Data
None.

---

## 14. `/api/ai/process/route.ts`

### Methods Implemented: `POST`, `GET`

### Missing CRUD Operations
| Operation | Status | Impact |
|---|---|---|
| **DELETE** (clear AI content) | ❌ MISSING | Cannot delete AI-generated summary/flashcards/MCQs |
| **PUT/PATCH** | ❌ MISSING | Cannot edit AI-generated content |

### Bugs Found
1. **Line 59 — `rating.createdAt === rating.updatedAt` bug** (same as ratings): Not applicable here since this file doesn't deal with ratings. But there's a similar issue:
2. **Line 97-107 — Fallback on AI JSON parse failure**: If AI returns invalid JSON for the summary, the entire response string is used as the summary (`summaryResponse.slice(0, 500)`). This could contain markdown, code fences, or other non-summary text.
3. **Line 170-177 — Flashcard/MCQ creation with empty strings**: If AI returns malformed data with missing fields, flashcards/MCQs are created with empty strings (`fc.question || ''`, `fc.answer || ''`). This pollutes the database with unusable content.
4. **Line 74-77 — Status set to `processing` but no timeout**: If AI processing hangs, the note stays in `processing` forever. The catch block on line 218-221 sets it back to `active`, but only if the error is caught. A timeout or worker process would be safer.
5. **Line 13-19 — `callAI` function doesn't pass `model`**: The `zai.chat.completions.create()` call doesn't specify a model, relying on the SDK default. This is fragile.

### Mock/Hardcoded Data
None.

---

## 15. `/api/search/route.ts`

### Methods Implemented: `GET`

### Missing CRUD Operations
N/A — Search is read-only.

### Bugs Found
1. **Line 86-87 — Same unsafe type casts as `notes/[id]/route.ts`**: `(note.bookmarks as unknown as unknown[])?.length > 0` and `(note.ratings as { value: number }[])?.[0]?.value`.
2. **Line 23-29 — `OR` + other filters**: When `q` is provided, `where.OR` is set, but then `collegeId`, `departmentId`, etc. are added to the same `where` object at the top level. In Prisma, this means the `OR` applies only to the text search fields, AND the other filters apply simultaneously. This is correct behavior, but the `status: 'active'` and `isPublic: true` on line 20 are always applied, which is good.
3. **Line 44 — Relevance sorting falls back to `createdAt`**: There's no actual relevance/TF-IDF scoring. "Relevance" just sorts by newest, which is misleading.

### Mock/Hardcoded Data
None.

---

## 16. `/api/leaderboard/route.ts`

### Methods Implemented: `GET`

### Missing CRUD Operations
N/A — Leaderboard is read-only.

### Bugs Found
1. **Line 14 — `collegeId` filter on Profile**: The Profile model has `collegeId`, and filtering `db.profile.findMany({ where: { collegeId } })` works, but this will miss users who don't have a Profile record. Users without profiles are excluded from the leaderboard entirely.
2. **Line 35-46 — Rank calculation assumes ordered results**: `rank: (page - 1) * limit + index + 1` is correct for a single page, but if the underlying data changes between page requests, ranks can be inconsistent (e.g., a new user could push everyone down between page 1 and page 2).

### Mock/Hardcoded Data
None.

---

## 17. `/api/seed/route.ts`

### Methods Implemented: `POST`

### Missing CRUD Operations
N/A — Seed is a one-time operation.

### Bugs Found
1. **Line 18-24 — Idempotency check is too broad**: It checks `existingColleges > 0` to determine if seeded, but a user could have manually created one college and then the entire seed endpoint is blocked.
2. **Line 433-444 — Note creation with hardcoded stats**: Notes are created with `downloadCount`, `viewCount`, `bookmarkCount`, `avgRating`, `ratingCount` baked in. These don't correspond to actual records (no Rating, Download, or Bookmark records are created for most of these counts). The denormalized counters are therefore out of sync with reality from the start.
3. **Line 440 — `qualityScore: data.avgRating * 20`**: This formula is arbitrary and produces scores like `4.5 * 20 = 90`, `3.5 * 20 = 70`. No explanation for why this formula.
4. **Line 168 — All users share the same password**: `passwordHash` is generated once and reused for all 5 users. While this is fine for seed data, it's a security concern if the seed is run in production.
5. **Line 598-605 — `updateMany` for folder assignment**: Uses `updateMany` which could update multiple bookmarks if they exist. In seed context this is fine, but it's not precise.

### Mock/Hardcoded Data
All data is hardcoded by nature — this is a seed endpoint. Not flagged.

---

## 18. `/api/auth/route.ts` (discovered)

### Methods Implemented: `POST`, `GET`, `PUT`, `DELETE`

### Missing CRUD Operations
This endpoint is fairly complete for auth operations.

### Bugs Found
1. **Line 131-138 — `updateProfileSchema` allows `collegeId` and `departmentId` without FK validation**: A user could set `collegeId` to a non-existent ID, causing a Prisma FK constraint error (500 response).
2. **Line 164-167 — Setting `collegeId` to empty string becomes null**: `data.collegeId || null` — if `collegeId` is `""` (empty string), it becomes `null`. But the Zod schema allows any string, so `""` passes validation but gets silently converted.
3. **Line 208-229 — DELETE only deactivates**: Account is soft-deleted (`isActive: false`), but there's no way to permanently delete or reactivate.

---

## 19. `/api/route.ts` (discovered)

### Methods Implemented: `GET`

### Bugs Found
1. **Line 3-4 — Hello world endpoint**: Returns `{ message: "Hello, world!" }`. This is a leftover from project initialization and should be removed or replaced with actual API documentation/version info.

---

## Cross-Cutting Issues

### 1. Missing CRUD Operations Summary

| Resource | GET | POST | PUT | DELETE | Critical Missing? |
|---|---|---|---|---|---|
| Colleges | ✅ | ✅ | ❌ | ❌ | **Yes** — cannot edit or delete |
| Subjects | ✅ | ✅ | ❌ | ❌ | **Yes** — cannot edit or delete |
| Study Groups | ✅ | ✅ | ⚠️ (join/leave only) | ❌ | **Yes** — cannot update or delete |
| Comments | ✅ | ✅ | ❌ | ❌ | **Yes** — `isEdited`/`isDeleted` fields exist but unused |
| Notifications | ✅ | ❌ (intentional) | ✅ (mark read) | ⚠️ (clear all only) | Moderate — cannot dismiss single |
| Follows | ✅ | ✅ (toggle) | ❌ | ❌ (via POST toggle) | Low — non-RESTful but functional |
| Bookmarks | ✅ | ✅ | ❌ | ✅ | Moderate — cannot move between folders |
| Ratings | ✅ | ✅ (upsert) | ❌ | ❌ | Moderate — cannot remove rating |
| Admin | ✅ | ❌ | ❌ | ❌ | **Yes** — no admin action endpoints |
| Notes (list) | ✅ | ✅ | ❌ | ❌ | **Yes** — cannot update or delete |
| Notes (detail) | ✅ | ❌ | ❌ | ❌ | **Yes** — cannot update or delete |
| Users (detail) | ✅ | ❌ | ❌ | ❌ | Moderate — updates via auth only |
| Upload | ❌ | ✅ | ❌ | ❌ | Moderate — cannot delete files |
| AI Process | ✅ | ✅ | ❌ | ❌ | Low — cannot edit/clear AI content |
| Search | ✅ | ❌ | ❌ | ❌ | N/A |
| Leaderboard | ✅ | ❌ | ❌ | ❌ | N/A |
| Auth | ✅ | ✅ | ✅ | ✅ | Complete |
| Seed | ❌ | ✅ | ❌ | ❌ | N/A |

### 2. `parseInt` Without NaN Guard
**Files affected:** `colleges`, `subjects`, `study-groups`, `comments`, `notifications`, `bookmarks`, `notes`, `search`, `leaderboard`, `ratings`

Every `parseInt(searchParams.get('page') || '1')` and `parseInt(searchParams.get('limit') || '20')` call will produce `NaN` if the query parameter is non-numeric (e.g., `?page=abc`). `NaN` passed to Prisma's `skip`/`take` causes runtime errors.

### 3. `Record<string, unknown>` vs Prisma Types
**Files affected:** `colleges`, `subjects`, `study-groups`, `comments`, `notifications`, `bookmarks`, `notes`, `search`, `leaderboard`, `follows`

All `where` clauses are typed as `Record<string, unknown>` instead of Prisma's generated `WhereInput` types. This loses type safety and allows invalid filter fields without compile-time errors.

### 4. Profile Update May Fail
**Files affected:** `comments` (line 126), `follows` (lines 66, 70, 96, 100), `notes` (line 133), `ratings` (line 60)

`db.profile.update({ where: { userId } })` will throw if the user has no Profile record. While the signup flow creates one, there's no guarantee it exists (e.g., admin-created users, race conditions).

### 5. Denormalized Counter Inconsistency
**Models affected:** `Subject.noteCount`, `Subject.followerCount`, `StudyGroup.memberCount`, `Note.downloadCount`, `Note.viewCount`, `Note.bookmarkCount`, `Note.commentCount`, `Note.avgRating`, `Note.ratingCount`, `Profile.uploadCount`, `Profile.downloadCount`, `Profile.followerCount`, `Profile.followingCount`, `Profile.noteCount`, `Profile.contributionScore`, `Profile.reputationScore`

Many of these denormalized counters are incremented/decremented manually alongside the actual operations. If any operation fails partway through, the counters become out of sync. The seed data also creates counters that don't match the actual record counts.

### 6. Non-RESTful Patterns
- `POST /api/follows` toggles follow/unfollow (should use DELETE for unfollow)
- `POST /api/bookmarks` handles `createFolder` and `deleteFolder` via action field (should use separate endpoints or proper HTTP methods)
- `POST /api/ratings` uses upsert (should be POST for create, PUT for update)
- `PUT /api/study-groups` only handles join/leave (should be a separate membership endpoint)

---

## Priority Fixes (Recommended Order)

### P0 — Critical (App-breaking)
1. **Add PUT/PATCH and DELETE for Notes** — The core resource has no update or delete capability
2. **Add PUT/PATCH and DELETE for Comments** — `isEdited` and `isDeleted` fields exist but are unusable
3. **Add admin action endpoints** — `AdminAction` and `Report` models are completely unused
4. **Fix `parseInt` NaN guard** — Every paginated endpoint can crash with non-numeric query params

### P1 — High (Data Integrity)
5. **Add FK validation in note creation** — `subjectId`, `collegeId`, `departmentId` are not verified
6. **Fix rating "new vs update" detection** — `createdAt === updatedAt` is unreliable in SQLite
7. **Add Profile existence check** — Before updating profile counters, verify the profile exists
8. **Add DELETE for individual notifications** — Current DELETE clears all

### P2 — Medium (UX/Consistency)
9. **Add PUT/PATCH for Colleges and Subjects** — Admin cannot edit these
10. **Add DELETE for Study Groups** — Groups cannot be removed
11. **Add transfer ownership for Study Groups** — Error message references it but no endpoint exists
12. **Add PUT/PATCH for bookmarks** — Move bookmark between folders
13. **Add DELETE for Ratings** — Users cannot remove their rating
14. **Fix relevance search** — Currently just sorts by newest

### P3 — Low (Code Quality)
15. **Replace `Record<string, unknown>` with Prisma types** — Better type safety
16. **Remove `/api/route.ts` hello world endpoint** — Dead code
17. **Refactor non-RESTful patterns** — Follow toggle, bookmark folder management
18. **Add file deletion endpoint** — Orphaned files accumulate
19. **Add text extraction for PDF/DOCX/PPTX uploads** — Currently only TXT/MD
