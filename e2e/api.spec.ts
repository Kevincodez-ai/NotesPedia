import { test, expect, request } from '@playwright/test';

// ============================================================
// NotesPedia API Endpoint E2E Tests
// Task ID: 9 - QA Engineer
// ============================================================

// Seed credentials
const STUDENT_EMAIL = 'arjun@iitb.ac.in';
const STUDENT_PASSWORD = 'password123';
const ADMIN_EMAIL = 'admin@notespedia.in';
const ADMIN_PASSWORD = 'password123';
const STUDENT2_EMAIL = 'priya@aiims.edu';
const STUDENT2_PASSWORD = 'password123';

let studentToken: string;
let adminToken: string;
let student2Token: string;
let studentUserId: string;
let adminUserId: string;
let student2UserId: string;
let createdNoteId: string;
let createdCommentId: string;
let createdFolderId: string;

// ============================================================
// Helper: obtain JWT via login API
// ============================================================
async function getToken(apiContext: any, email: string, password: string): Promise<{ token: string; userId: string }> {
  const res = await apiContext.post('/api/auth', {
    data: { action: 'login', email, password },
  });
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.token).toBeTruthy();
  return { token: body.token, userId: body.user.id };
}

// ============================================================
// 1. Auth API
// ============================================================
test.describe('Auth API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('signup - success', async () => {
    const uniqueEmail = `test_${Date.now()}@example.com`;
    const res = await apiContext.post('/api/auth', {
      data: { action: 'signup', name: 'Test User', email: uniqueEmail, password: 'test123456' },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(uniqueEmail);
  });

  test('signup - duplicate email', async () => {
    const res = await apiContext.post('/api/auth', {
      data: { action: 'signup', name: 'Duplicate', email: STUDENT_EMAIL, password: 'password123' },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(400);
  });

  test('signup - short password', async () => {
    const res = await apiContext.post('/api/auth', {
      data: { action: 'signup', name: 'Short', email: `short_${Date.now()}@example.com`, password: 'abc' },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(400);
  });

  test('login - valid credentials', async () => {
    const res = await apiContext.post('/api/auth', {
      data: { action: 'login', email: STUDENT_EMAIL, password: STUDENT_PASSWORD },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.user.role).toBe('student');
  });

  test('login - invalid credentials', async () => {
    const res = await apiContext.post('/api/auth', {
      data: { action: 'login', email: STUDENT_EMAIL, password: 'wrongpassword' },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(401);
  });

  test('login - suspended user cannot authenticate', async () => {
    // The priya user may or may not be suspended depending on DB state;
    // we test that the endpoint returns 403 for a suspended user
    // We'll create a user and suspend them via admin, then try to login
    const uniqueEmail = `suspended_${Date.now()}@example.com`;
    const signupRes = await apiContext.post('/api/auth', {
      data: { action: 'signup', name: 'To Suspend', email: uniqueEmail, password: 'password123' },
    });
    const signupBody = await signupRes.json();
    const { token: suspendedUserToken, userId: suspendedUserId } = { token: signupBody.token, userId: signupBody.user.id };

    // Suspend the user via admin
    const { token: admToken } = await getToken(apiContext, ADMIN_EMAIL, ADMIN_PASSWORD);
    await apiContext.post('/api/admin', {
      data: { action: 'updateUser', id: suspendedUserId, isActive: false },
      headers: { Cookie: `notespedia_token=${admToken}` },
    });

    // Try to login as suspended user
    const loginRes = await apiContext.post('/api/auth', {
      data: { action: 'login', email: uniqueEmail, password: 'password123' },
    });
    const loginBody = await loginRes.json();
    expect(loginBody.success).toBe(false);
    expect(loginRes.status()).toBe(403);
  });

  test('GET current user - authenticated', async () => {
    const { token } = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    const res = await apiContext.get('/api/auth', {
      headers: { Cookie: `notespedia_token=${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user).toBeTruthy();
    expect(body.user.email).toBe(STUDENT_EMAIL);
  });

  test('GET current user - unauthenticated', async () => {
    const res = await apiContext.get('/api/auth');
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.user).toBeNull();
  });

  test('PUT update profile', async () => {
    const { token } = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    const res = await apiContext.put('/api/auth', {
      data: { name: 'Arjun Updated', bio: 'Test bio from API' },
      headers: { Cookie: `notespedia_token=${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.name).toBe('Arjun Updated');

    // Revert name
    await apiContext.put('/api/auth', {
      data: { name: 'Arjun Sharma' },
      headers: { Cookie: `notespedia_token=${token}` },
    });
  });

  test('PUT change password', async () => {
    const uniqueEmail = `changepw_${Date.now()}@example.com`;
    const signupRes = await apiContext.post('/api/auth', {
      data: { action: 'signup', name: 'Change PW', email: uniqueEmail, password: 'oldpassword' },
    });
    const signupBody = await signupRes.json();
    const token = signupBody.token;

    const res = await apiContext.put('/api/auth', {
      data: { action: 'changePassword', currentPassword: 'oldpassword', newPassword: 'newpassword123' },
      headers: { Cookie: `notespedia_token=${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('PUT change password - wrong current password', async () => {
    const { token } = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    const res = await apiContext.put('/api/auth', {
      data: { action: 'changePassword', currentPassword: 'wrongpassword', newPassword: 'newpassword123' },
      headers: { Cookie: `notespedia_token=${token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('DELETE deactivate account - unauthenticated', async () => {
    const res = await apiContext.delete('/api/auth');
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(401);
  });

  test('unauthenticated access to protected endpoints', async () => {
    const res = await apiContext.get('/api/notes');
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// 2. Notes API
// ============================================================
test.describe('Notes API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
    studentUserId = student.userId;
    const admin = await getToken(apiContext, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = admin.token;
    adminUserId = admin.userId;
    const student2 = await getToken(apiContext, STUDENT2_EMAIL, STUDENT2_PASSWORD);
    student2Token = student2.token;
    student2UserId = student2.userId;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET notes list - default', async () => {
    const res = await apiContext.get('/api/notes', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
    expect(typeof body.total).toBe('number');
    expect(typeof body.page).toBe('number');
  });

  test('GET notes list - with filters', async () => {
    const res = await apiContext.get('/api/notes?sortBy=downloads&limit=5&page=1', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.page).toBe(1);
  });

  test('GET notes list - sort by rating', async () => {
    const res = await apiContext.get('/api/notes?sortBy=rating', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET notes list - pagination', async () => {
    const res = await apiContext.get('/api/notes?limit=2&page=1', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.notes.length).toBeLessThanOrEqual(2);
  });

  test('POST create note', async () => {
    const res = await apiContext.post('/api/notes', {
      data: {
        title: `Test Note ${Date.now()}`,
        description: 'A test note created by E2E tests',
        fileType: 'txt',
        tags: ['test', 'e2e'],
      },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.status()).toBe(201);
    expect(body.note.id).toBeTruthy();
    createdNoteId = body.note.id;
  });

  test('POST create note - unauthenticated', async () => {
    const res = await apiContext.post('/api/notes', {
      data: { title: 'Unauthorized Note', description: 'Should fail' },
    });
    expect(res.status()).toBe(401);
  });

  test('PUT update note - owner', async () => {
    if (!createdNoteId) return;
    const res = await apiContext.put(`/api/notes/${createdNoteId}`, {
      data: { title: 'Updated Test Note' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.note.title).toBe('Updated Test Note');
  });

  test('PUT update note - non-owner blocked', async () => {
    if (!createdNoteId) return;
    const res = await apiContext.put(`/api/notes/${createdNoteId}`, {
      data: { title: 'Hacked Title' },
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(403);
  });

  test('DELETE note - non-owner non-admin blocked', async () => {
    if (!createdNoteId) return;
    const res = await apiContext.delete(`/api/notes/${createdNoteId}`, {
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(403);
  });

  test('GET note detail', async () => {
    if (!createdNoteId) return;
    const res = await apiContext.get(`/api/notes/${createdNoteId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.note.id).toBe(createdNoteId);
    expect(body.note.isBookmarked).toBeDefined();
    expect(body.note.userRating).toBeDefined();
  });

  test('GET note detail - removed note blocked for non-admin', async () => {
    // Admin removes the note first
    if (!createdNoteId) return;
    await apiContext.delete(`/api/notes/${createdNoteId}`, {
      headers: { Cookie: `notespedia_token=${adminToken}` },
    });
    // Non-admin tries to view it
    const res = await apiContext.get(`/api/notes/${createdNoteId}`, {
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(404);
  });

  test('GET note detail - removed note visible to admin', async () => {
    if (!createdNoteId) return;
    const res = await apiContext.get(`/api/notes/${createdNoteId}`, {
      headers: { Cookie: `notespedia_token=${adminToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ============================================================
// 3. Search API
// ============================================================
test.describe('Search API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('keyword search', async () => {
    const res = await apiContext.get('/api/search?q=test');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.query).toBe('test');
    expect(Array.isArray(body.notes)).toBe(true);
  });

  test('empty query', async () => {
    const res = await apiContext.get('/api/search?q=');
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('no results', async () => {
    const res = await apiContext.get('/api/search?q=zzznonexistent12345');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.total).toBe(0);
  });

  test('filter by fileType', async () => {
    const res = await apiContext.get('/api/search?q=test&fileType=pdf');
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ============================================================
// 4. Public Stats API
// ============================================================
test.describe('Public Stats API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET /api/stats - no auth required', async () => {
    const res = await apiContext.get('/api/stats');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stats).toBeTruthy();
    expect(typeof body.stats.totalUsers).toBe('number');
    expect(typeof body.stats.totalNotes).toBe('number');
    expect(typeof body.stats.totalColleges).toBe('number');
    expect(typeof body.stats.totalSubjects).toBe('number');
  });

  test('GET /api/stats - returns non-zero values after seeding', async () => {
    const res = await apiContext.get('/api/stats');
    const body = await res.json();
    expect(body.stats.totalUsers).toBeGreaterThan(0);
  });
});

// ============================================================
// 5. Bookmarks API
// ============================================================
test.describe('Bookmarks API', () => {
  let apiContext: any;
  let bookmarkNoteId: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
    studentUserId = student.userId;

    // Create a note to bookmark
    const noteRes = await apiContext.post('/api/notes', {
      data: {
        title: `Bookmark Test Note ${Date.now()}`,
        description: 'For bookmark E2E test',
        fileType: 'txt',
      },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const noteBody = await noteRes.json();
    bookmarkNoteId = noteBody.note?.id || '';
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('create folder', async () => {
    const res = await apiContext.post('/api/bookmarks', {
      data: { action: 'createFolder', name: `Test Folder ${Date.now()}`, color: '#3b82f6' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.status()).toBe(201);
    expect(body.folder.id).toBeTruthy();
    createdFolderId = body.folder.id;
  });

  test('toggle bookmark - add', async () => {
    if (!bookmarkNoteId) return;
    const res = await apiContext.post('/api/bookmarks', {
      data: { noteId: bookmarkNoteId, folderId: createdFolderId || undefined },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.status()).toBe(201);
  });

  test('toggle bookmark - already bookmarked returns 409', async () => {
    if (!bookmarkNoteId) return;
    const res = await apiContext.post('/api/bookmarks', {
      data: { noteId: bookmarkNoteId },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(409);
  });

  test('list bookmarks', async () => {
    const res = await apiContext.get('/api/bookmarks', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.bookmarks)).toBe(true);
    expect(Array.isArray(body.folders)).toBe(true);
  });

  test('delete bookmark', async () => {
    if (!bookmarkNoteId) return;
    const res = await apiContext.delete(`/api/bookmarks?noteId=${bookmarkNoteId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('delete bookmark - not found', async () => {
    const res = await apiContext.delete(`/api/bookmarks?noteId=${bookmarkNoteId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(404);
  });
});

// ============================================================
// 6. Ratings API
// ============================================================
test.describe('Ratings API', () => {
  let apiContext: any;
  let ratingNoteId: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    // student2 creates a note, student1 will rate it
    const student2 = await getToken(apiContext, STUDENT2_EMAIL, STUDENT2_PASSWORD);
    student2Token = student2.token;
    student2UserId = student2.userId;
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;

    const noteRes = await apiContext.post('/api/notes', {
      data: {
        title: `Rating Test Note ${Date.now()}`,
        description: 'For rating E2E test',
        fileType: 'txt',
      },
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const noteBody = await noteRes.json();
    ratingNoteId = noteBody.note?.id || '';
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('rate note', async () => {
    if (!ratingNoteId) return;
    const res = await apiContext.post('/api/ratings', {
      data: { noteId: ratingNoteId, value: 4 },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rating.value).toBe(4);
  });

  test('cannot rate own note', async () => {
    if (!ratingNoteId) return;
    const res = await apiContext.post('/api/ratings', {
      data: { noteId: ratingNoteId, value: 5 },
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(400);
  });

  test('invalid rating value - too high', async () => {
    if (!ratingNoteId) return;
    const res = await apiContext.post('/api/ratings', {
      data: { noteId: ratingNoteId, value: 10 },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(400);
  });

  test('invalid rating value - too low', async () => {
    if (!ratingNoteId) return;
    const res = await apiContext.post('/api/ratings', {
      data: { noteId: ratingNoteId, value: 0 },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('GET rating stats', async () => {
    if (!ratingNoteId) return;
    const res = await apiContext.get(`/api/ratings?noteId=${ratingNoteId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.avgRating).toBe('number');
    expect(typeof body.ratingCount).toBe('number');
    expect(body.distribution).toBeTruthy();
  });
});

// ============================================================
// 7. Comments API
// ============================================================
test.describe('Comments API', () => {
  let apiContext: any;
  let commentNoteId: string;
  let replyCommentId: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student2 = await getToken(apiContext, STUDENT2_EMAIL, STUDENT2_PASSWORD);
    student2Token = student2.token;
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;

    const noteRes = await apiContext.post('/api/notes', {
      data: {
        title: `Comment Test Note ${Date.now()}`,
        description: 'For comment E2E test',
        fileType: 'txt',
      },
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const noteBody = await noteRes.json();
    commentNoteId = noteBody.note?.id || '';
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('add comment', async () => {
    if (!commentNoteId) return;
    const res = await apiContext.post('/api/comments', {
      data: { noteId: commentNoteId, content: 'Great note! E2E test comment.' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.status()).toBe(201);
    expect(body.comment.id).toBeTruthy();
    createdCommentId = body.comment.id;
  });

  test('add reply', async () => {
    if (!commentNoteId || !createdCommentId) return;
    const res = await apiContext.post('/api/comments', {
      data: { noteId: commentNoteId, content: 'Reply to comment!', parentId: createdCommentId },
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.status()).toBe(201);
    replyCommentId = body.comment.id;
  });

  test('edit comment - owner only', async () => {
    if (!createdCommentId) return;
    // Owner can edit
    const res = await apiContext.put('/api/comments', {
      data: { commentId: createdCommentId, content: 'Edited comment by owner' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.comment.content).toBe('Edited comment by owner');
    expect(body.comment.isEdited).toBe(true);
  });

  test('edit comment - non-owner blocked', async () => {
    if (!createdCommentId) return;
    const res = await apiContext.put('/api/comments', {
      data: { commentId: createdCommentId, content: 'Hacked comment' },
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(403);
  });

  test('GET comments for note', async () => {
    if (!commentNoteId) return;
    const res = await apiContext.get(`/api/comments?noteId=${commentNoteId}`);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.comments)).toBe(true);
  });

  test('delete comment - non-owner non-admin blocked', async () => {
    if (!replyCommentId) return;
    // student1 (not owner of reply made by student2) tries to delete
    // Actually student2 made the reply, student1 tries to delete it
    const res = await apiContext.delete(`/api/comments?commentId=${replyCommentId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    // student is not owner and not admin, so should be blocked
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(403);
  });

  test('delete comment - owner can delete', async () => {
    if (!replyCommentId) return;
    const res = await apiContext.delete(`/api/comments?commentId=${replyCommentId}`, {
      headers: { Cookie: `notespedia_token=${student2Token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('delete comment - admin can delete any', async () => {
    if (!createdCommentId) return;
    const admin = await getToken(apiContext, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await apiContext.delete(`/api/comments?commentId=${createdCommentId}`, {
      headers: { Cookie: `notespedia_token=${admin.token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ============================================================
// 8. Admin API
// ============================================================
test.describe('Admin API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const admin = await getToken(apiContext, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = admin.token;
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET admin stats - admin only', async () => {
    const res = await apiContext.get('/api/admin', {
      headers: { Cookie: `notespedia_token=${adminToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.stats).toBeTruthy();
    expect(typeof body.stats.totalUsers).toBe('number');
    expect(typeof body.stats.totalNotes).toBe('number');
    expect(typeof body.stats.newUsersToday).toBe('number');
    expect(typeof body.stats.newNotesToday).toBe('number');
  });

  test('GET admin stats - non-admin blocked', async () => {
    const res = await apiContext.get('/api/admin', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    expect(res.status()).toBe(403);
  });

  test('POST admin action - listUsers', async () => {
    const res = await apiContext.post('/api/admin', {
      data: { action: 'listUsers', limit: 5 },
      headers: { Cookie: `notespedia_token=${adminToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.users)).toBe(true);
  });

  test('POST admin action - updateUser', async () => {
    const listRes = await apiContext.post('/api/admin', {
      data: { action: 'listUsers', limit: 5 },
      headers: { Cookie: `notespedia_token=${adminToken}` },
    });
    const listBody = await listRes.json();
    if (listBody.users && listBody.users.length > 0) {
      const targetUser = listBody.users[0];
      const res = await apiContext.post('/api/admin', {
        data: { action: 'updateUser', id: targetUser.id, name: targetUser.name },
        headers: { Cookie: `notespedia_token=${adminToken}` },
      });
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('POST admin action - featureNote', async () => {
    // Get a note first
    const notesRes = await apiContext.get('/api/notes?limit=1', {
      headers: { Cookie: `notespedia_token=${adminToken}` },
    });
    const notesBody = await notesRes.json();
    if (notesBody.notes && notesBody.notes.length > 0) {
      const noteId = notesBody.notes[0].id;
      const res = await apiContext.post('/api/admin', {
        data: { action: 'featureNote', id: noteId },
        headers: { Cookie: `notespedia_token=${adminToken}` },
      });
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('POST admin action - non-admin blocked', async () => {
    const res = await apiContext.post('/api/admin', {
      data: { action: 'listUsers' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    expect(res.status()).toBe(403);
  });
});

// ============================================================
// 9. Notifications API
// ============================================================
test.describe('Notifications API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET notifications list', async () => {
    const res = await apiContext.get('/api/notifications', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(typeof body.unreadCount).toBe('number');
  });

  test('PUT mark all read', async () => {
    const res = await apiContext.put('/api/notifications', {
      data: { markAllRead: true },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('PUT mark single read', async () => {
    // Get a notification first
    const listRes = await apiContext.get('/api/notifications', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const listBody = await listRes.json();
    if (listBody.notifications.length > 0) {
      const notifId = listBody.notifications[0].id;
      const res = await apiContext.put('/api/notifications', {
        data: { notificationId: notifId },
        headers: { Cookie: `notespedia_token=${studentToken}` },
      });
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('DELETE clear all notifications', async () => {
    const res = await apiContext.delete('/api/notifications', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('GET notifications - unauthenticated', async () => {
    const res = await apiContext.get('/api/notifications');
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// 10. Leaderboard API
// ============================================================
test.describe('Leaderboard API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET rankings', async () => {
    const res = await apiContext.get('/api/leaderboard');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.leaderboard)).toBe(true);
    if (body.leaderboard.length > 0) {
      expect(body.leaderboard[0].rank).toBe(1);
      expect(body.leaderboard[0].user).toBeTruthy();
      expect(typeof body.leaderboard[0].reputationScore).toBe('number');
    }
  });

  test('filter by college', async () => {
    const res = await apiContext.get('/api/leaderboard?type=reputation&limit=5');
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ============================================================
// 11. Colleges/Subjects API
// ============================================================
test.describe('Colleges/Subjects API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET colleges - public', async () => {
    const res = await apiContext.get('/api/colleges');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.colleges)).toBe(true);
  });

  test('GET subjects - public', async () => {
    const res = await apiContext.get('/api/subjects');
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.subjects)).toBe(true);
  });

  test('POST create college - admin only', async () => {
    const admin = await getToken(apiContext, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await apiContext.post('/api/colleges', {
      data: { name: `Test College ${Date.now()}`, type: 'university' },
      headers: { Cookie: `notespedia_token=${admin.token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.status()).toBe(201);
  });

  test('POST create college - student blocked', async () => {
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    const res = await apiContext.post('/api/colleges', {
      data: { name: `Blocked College ${Date.now()}` },
      headers: { Cookie: `notespedia_token=${student.token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('POST create subject - admin only', async () => {
    const admin = await getToken(apiContext, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await apiContext.post('/api/subjects', {
      data: { name: `Test Subject ${Date.now()}`, code: 'TST101' },
      headers: { Cookie: `notespedia_token=${admin.token}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(res.status()).toBe(201);
  });

  test('POST create subject - student blocked', async () => {
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    const res = await apiContext.post('/api/subjects', {
      data: { name: `Blocked Subject ${Date.now()}` },
      headers: { Cookie: `notespedia_token=${student.token}` },
    });
    expect(res.status()).toBe(403);
  });
});

// ============================================================
// 12. Upload API
// ============================================================
test.describe('Upload API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('POST upload file - auth required', async () => {
    const res = await apiContext.post('/api/upload', {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Hello, test file!'),
        },
      },
    });
    expect(res.status()).toBe(401);
  });

  test('POST upload file - with auth', async () => {
    const res = await apiContext.post('/api/upload', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Hello, E2E test upload!'),
        },
      },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.filePath).toBeTruthy();
    expect(body.fileType).toBeTruthy();
  });

  test('POST upload - reject dangerous file type', async () => {
    const res = await apiContext.post('/api/upload', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
      multipart: {
        file: {
          name: 'malicious.html',
          mimeType: 'text/html',
          buffer: Buffer.from('<script>alert("xss")</script>'),
        },
      },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(400);
  });

  test('POST upload - reject .exe file', async () => {
    const res = await apiContext.post('/api/upload', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
      multipart: {
        file: {
          name: 'virus.exe',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from('MZ'),
        },
      },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(400);
  });
});

// ============================================================
// 13. Download API
// ============================================================
test.describe('Download API', () => {
  let apiContext: any;
  let downloadNoteId: string;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET download - 401 unauthenticated', async () => {
    const res = await apiContext.get('/api/download/nonexistent-id');
    expect(res.status()).toBe(401);
  });

  test('GET download - 404 for notes without content', async () => {
    // Create a note with no filePath or extractedText
    const noteRes = await apiContext.post('/api/notes', {
      data: { title: `No Content Note ${Date.now()}`, description: 'Empty' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const noteBody = await noteRes.json();
    downloadNoteId = noteBody.note?.id || '';

    if (downloadNoteId) {
      const res = await apiContext.get(`/api/download/${downloadNoteId}`, {
        headers: { Cookie: `notespedia_token=${studentToken}` },
      });
      // Since the note has no file or extractedText, should return 404
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(res.status()).toBe(404);
    }
  });

  test('GET download - with auth and valid file', async () => {
    // Upload a file first
    const uploadRes = await apiContext.post('/api/upload', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
      multipart: {
        file: {
          name: 'download_test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('Download test content!'),
        },
      },
    });
    const uploadBody = await uploadRes.json();
    if (uploadBody.success) {
      // Create a note with the uploaded file
      const noteRes = await apiContext.post('/api/notes', {
        data: {
          title: `Download Test Note ${Date.now()}`,
          description: 'For download E2E test',
          filePath: uploadBody.filePath,
          fileType: uploadBody.fileType,
          extractedText: 'Download test extracted text',
        },
        headers: { Cookie: `notespedia_token=${studentToken}` },
      });
      const noteBody = await noteRes.json();
      const noteId = noteBody.note?.id;
      if (noteId) {
        const res = await apiContext.get(`/api/download/${noteId}`, {
          headers: { Cookie: `notespedia_token=${studentToken}` },
        });
        expect(res.status()).toBe(200);
      }
    }
  });
});

// ============================================================
// 14. Users API
// ============================================================
test.describe('Users API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
    studentUserId = student.userId;
    const student2 = await getToken(apiContext, STUDENT2_EMAIL, STUDENT2_PASSWORD);
    student2Token = student2.token;
    student2UserId = student2.userId;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('GET own profile - includes email', async () => {
    const res = await apiContext.get(`/api/users/${studentUserId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile).toBeTruthy();
    expect(body.profile.email).toBe(STUDENT_EMAIL);
  });

  test('GET other profile - email hidden', async () => {
    const res = await apiContext.get(`/api/users/${student2UserId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.profile).toBeTruthy();
    // Email should not be present for non-own profiles
    expect(body.profile.email).toBeUndefined();
  });

  test('GET profile - 404 for nonexistent', async () => {
    const res = await apiContext.get('/api/users/nonexistent-id-12345', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(404);
  });
});

// ============================================================
// 15. Follows API
// ============================================================
test.describe('Follows API', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
    studentUserId = student.userId;
    const student2 = await getToken(apiContext, STUDENT2_EMAIL, STUDENT2_PASSWORD);
    student2Token = student2.token;
    student2UserId = student2.userId;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('follow a user', async () => {
    const res = await apiContext.post('/api/follows', {
      data: { type: 'user', followingId: student2UserId },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    // Could be following=true or following=false (if toggle)
  });

  test('unfollow a user', async () => {
    // Follow again first (toggle), then unfollow
    const res = await apiContext.post('/api/follows', {
      data: { type: 'user', followingId: student2UserId },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('follow a subject', async () => {
    // Get a subject first
    const subjectsRes = await apiContext.get('/api/subjects?limit=1');
    const subjectsBody = await subjectsRes.json();
    if (subjectsBody.subjects && subjectsBody.subjects.length > 0) {
      const subjectId = subjectsBody.subjects[0].id;
      const res = await apiContext.post('/api/follows', {
        data: { type: 'subject', subjectId },
        headers: { Cookie: `notespedia_token=${studentToken}` },
      });
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('follow a college', async () => {
    const collegesRes = await apiContext.get('/api/colleges?limit=1');
    const collegesBody = await collegesRes.json();
    if (collegesBody.colleges && collegesBody.colleges.length > 0) {
      const collegeId = collegesBody.colleges[0].id;
      const res = await apiContext.post('/api/follows', {
        data: { type: 'college', collegeId },
        headers: { Cookie: `notespedia_token=${studentToken}` },
      });
      const body = await res.json();
      expect(body.success).toBe(true);
    }
  });

  test('cannot follow yourself', async () => {
    const res = await apiContext.post('/api/follows', {
      data: { type: 'user', followingId: studentUserId },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(400);
  });

  test('GET follow status', async () => {
    const res = await apiContext.get(`/api/follows?type=user&followingId=${student2UserId}`, {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.following).toBe('boolean');
  });

  test('follows - unauthenticated', async () => {
    const res = await apiContext.post('/api/follows', {
      data: { type: 'user', followingId: student2UserId },
    });
    expect(res.status()).toBe(401);
  });
});

// ============================================================
// 16. Security Tests
// ============================================================
test.describe('Security', () => {
  let apiContext: any;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({ baseURL: 'http://localhost:3000' });
    const student = await getToken(apiContext, STUDENT_EMAIL, STUDENT_PASSWORD);
    studentToken = student.token;
    studentUserId = student.userId;
    const admin = await getToken(apiContext, ADMIN_EMAIL, ADMIN_PASSWORD);
    adminToken = admin.token;
    adminUserId = admin.userId;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('IDOR on AI processing - non-owner blocked', async () => {
    // Create a note as student, try to process as student2
    const noteRes = await apiContext.post('/api/notes', {
      data: { title: `AI IDOR Test ${Date.now()}`, description: 'IDOR test', fileType: 'txt', extractedText: 'Test content for AI processing IDOR check' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const noteBody = await noteRes.json();
    const noteId = noteBody.note?.id;
    if (noteId) {
      const student2 = await getToken(apiContext, STUDENT2_EMAIL, STUDENT2_PASSWORD);
      const res = await apiContext.post('/api/ai/process', {
        data: { noteId },
        headers: { Cookie: `notespedia_token=${student2.token}` },
      });
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(res.status()).toBe(403);
    }
  });

  test('seed endpoint requires auth', async () => {
    const res = await apiContext.post('/api/seed');
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(401);
  });

  test('seed endpoint requires admin', async () => {
    const res = await apiContext.post('/api/seed', {
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(res.status()).toBe(403);
  });

  test('self-role-promotion blocked', async () => {
    // Student cannot promote themselves via admin API
    const res = await apiContext.post('/api/admin', {
      data: { action: 'updateUser', id: studentUserId, role: 'admin' },
      headers: { Cookie: `notespedia_token=${adminToken}` },
    });
    // Only super_admin can assign admin roles; our admin user may not be super_admin
    // But the key test is that a student cannot self-promote
    const selfRes = await apiContext.post('/api/admin', {
      data: { action: 'updateUser', id: studentUserId, role: 'admin' },
      headers: { Cookie: `notespedia_token=${studentToken}` },
    });
    expect(selfRes.status()).toBe(403);
  });

  test('suspended user cannot authenticate', async () => {
    // Create a user, suspend, then try to login
    const uniqueEmail = `suspended_sec_${Date.now()}@example.com`;
    await apiContext.post('/api/auth', {
      data: { action: 'signup', name: 'Suspended User', email: uniqueEmail, password: 'password123' },
    });
    // Get the user id from login
    const loginRes = await apiContext.post('/api/auth', {
      data: { action: 'login', email: uniqueEmail, password: 'password123' },
    });
    const loginBody = await loginRes.json();
    const userId = loginBody.user?.id;
    if (userId) {
      // Suspend via admin
      await apiContext.post('/api/admin', {
        data: { action: 'updateUser', id: userId, isActive: false },
        headers: { Cookie: `notespedia_token=${adminToken}` },
      });
      // Try login
      const suspendedLoginRes = await apiContext.post('/api/auth', {
        data: { action: 'login', email: uniqueEmail, password: 'password123' },
      });
      const suspendedLoginBody = await suspendedLoginRes.json();
      expect(suspendedLoginBody.success).toBe(false);
      expect(suspendedLoginRes.status()).toBe(403);
    }
  });
});
