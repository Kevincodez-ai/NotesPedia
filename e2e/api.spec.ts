/**
 * API Route E2E Tests
 * Covers: all API endpoints, auth, CRUD operations, error handling, security
 */
import { test, expect } from '@playwright/test';

let studentToken: string;
let adminToken: string;
let studentId: string;
let adminId: string;
let testNoteId: string;

test.describe('API Tests', () => {
  test.describe('Auth API', () => {
    test('POST /api/auth - signup', async ({ request }) => {
      const res = await request.post('/api/auth', {
        data: {
          action: 'signup',
          name: 'API Test User',
          email: `api-test-${Date.now()}@test.com`,
          password: 'testpass123',
        },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.name).toBe('API Test User');
      expect(data.user.role).toBe('student');
      expect(data.token).toBeDefined();
    });

    test('POST /api/auth - login with valid credentials', async ({ request }) => {
      const res = await request.post('/api/auth', {
        data: {
          action: 'login',
          email: 'arjun@iitb.ac.in',
          password: 'password123',
        },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('arjun@iitb.ac.in');
      studentToken = data.token;
      studentId = data.user.id;
    });

    test('POST /api/auth - login with invalid credentials', async ({ request }) => {
      const res = await request.post('/api/auth', {
        data: {
          action: 'login',
          email: 'arjun@iitb.ac.in',
          password: 'wrongpassword',
        },
      });
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    test('POST /api/auth - signup with duplicate email', async ({ request }) => {
      const res = await request.post('/api/auth', {
        data: {
          action: 'signup',
          name: 'Duplicate',
          email: 'arjun@iitb.ac.in',
          password: 'test123',
        },
      });
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    test('POST /api/auth - signup with short password', async ({ request }) => {
      const res = await request.post('/api/auth', {
        data: {
          action: 'signup',
          name: 'Short PW',
          email: 'short@test.com',
          password: '12',
        },
      });
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(res.status()).toBe(400);
    });

    test('GET /api/auth - get current user', async ({ request }) => {
      // First login
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const loginData = await loginRes.json();
      const token = loginData.token;

      const res = await request.get('/api/auth', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.email).toBe('arjun@iitb.ac.in');
    });

    test('PUT /api/auth - update profile', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.put('/api/auth', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: { name: 'Arjun Updated', bio: 'Updated bio from API test' },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.name).toBe('Arjun Updated');

      // Revert
      await request.put('/api/auth', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: { name: 'Arjun Sharma' },
      });
    });

    test('PUT /api/auth - unauthenticated should fail', async ({ request }) => {
      const res = await request.put('/api/auth', {
        data: { name: 'Hacker' },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe('Notes API', () => {
    test('GET /api/notes - list notes', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/notes?limit=5', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.notes).toBeDefined();
      expect(data.notes.length).toBeGreaterThan(0);
      expect(data.total).toBeGreaterThan(0);
    });

    test('GET /api/notes - unauthenticated should fail', async ({ request }) => {
      const res = await request.get('/api/notes');
      expect(res.status()).toBe(401);
    });

    test('GET /api/notes - filter by subject', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Get subjects first
      const subjectsRes = await request.get('/api/subjects?limit=1', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const subjectsData = await subjectsRes.json();
      if (subjectsData.subjects?.length > 0) {
        const subjectId = subjectsData.subjects[0].id;
        const res = await request.get(`/api/notes?subjectId=${subjectId}&limit=5`, {
          headers: { Cookie: `notespedia_token=${token}` },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });

    test('GET /api/notes - sort by downloads', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/notes?sortBy=downloads&limit=5', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      if (data.notes.length > 1) {
        expect(data.notes[0].downloadCount).toBeGreaterThanOrEqual(data.notes[1].downloadCount);
      }
    });

    test('POST /api/notes - create note', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.post('/api/notes', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: {
          title: 'API Test Note',
          description: 'Created by automated API test',
          fileType: 'txt',
          semester: 5,
          tags: ['test', 'api', 'automated'],
        },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.note.title).toBe('API Test Note');
      testNoteId = data.note.id;
    });

    test('GET /api/notes/[id] - get note detail', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Get any note ID
      const listRes = await request.get('/api/notes?limit=1', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const listData = await listRes.json();
      const noteId = listData.notes[0]?.id;

      if (noteId) {
        const res = await request.get(`/api/notes/${noteId}`, {
          headers: { Cookie: `notespedia_token=${token}` },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.note.id).toBe(noteId);
        expect(data.note.title).toBeDefined();
      }
    });

    test('GET /api/notes/[id] - nonexistent note should 404', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/notes/nonexistent-id-12345', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      expect(res.status()).toBe(404);
    });
  });

  test.describe('Search API', () => {
    test('GET /api/search - keyword search', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/search?q=Machine', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.notes).toBeDefined();
      expect(data.total).toBeGreaterThanOrEqual(0);
    });

    test('GET /api/search - empty query', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/search', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test('GET /api/search - no results for gibberish', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/search?q=xyznonexistent12345', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.total).toBe(0);
    });
  });

  test.describe('Bookmarks API', () => {
    test('POST /api/bookmarks - create folder', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.post('/api/bookmarks', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: { action: 'createFolder', name: 'API Test Folder', color: '#10b981' },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.folder.name).toBe('API Test Folder');
    });

    test('GET /api/bookmarks - list bookmarks', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/bookmarks', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/bookmarks - toggle bookmark on note', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Get a note ID first
      const notesRes = await request.get('/api/notes?limit=1', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const notesData = await notesRes.json();
      const noteId = notesData.notes[0]?.id;

      if (noteId) {
        const res = await request.post('/api/bookmarks', {
          headers: { Cookie: `notespedia_token=${token}` },
          data: { noteId },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });
  });

  test.describe('Ratings API', () => {
    test('POST /api/ratings - rate someone else note', async ({ request }) => {
      // Login as admin (who didn't create most notes)
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'admin@notespedia.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Get notes and find one not uploaded by admin
      const notesRes = await request.get('/api/notes?limit=10', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const notesData = await notesRes.json();
      const note = notesData.notes?.find((n: { uploader: { id: string } }) => n.uploader?.id !== 'admin-id');

      if (note) {
        const res = await request.post('/api/ratings', {
          headers: { Cookie: `notespedia_token=${token}` },
          data: { noteId: note.id, value: 4 },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });

    test('POST /api/ratings - cannot rate own note', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Get Arjun's own notes
      const notesRes = await request.get('/api/notes?uploaderId=me&limit=1', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const notesData = await notesRes.json();
      const noteId = notesData.notes?.[0]?.id;

      if (noteId) {
        const res = await request.post('/api/ratings', {
          headers: { Cookie: `notespedia_token=${token}` },
          data: { noteId, value: 5 },
        });
        const data = await res.json();
        expect(data.success).toBe(false);
      }
    });

    test('POST /api/ratings - invalid rating value', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.post('/api/ratings', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: { noteId: 'some-id', value: 10 },
      });
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  test.describe('Comments API', () => {
    test('POST /api/comments - add comment', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const notesRes = await request.get('/api/notes?limit=1', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const notesData = await notesRes.json();
      const noteId = notesData.notes[0]?.id;

      if (noteId) {
        const res = await request.post('/api/comments', {
          headers: { Cookie: `notespedia_token=${token}` },
          data: { noteId, content: 'Great notes! - API Test' },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });

    test('GET /api/comments - get comments for note', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const notesRes = await request.get('/api/notes?limit=1', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const notesData = await notesRes.json();
      const noteId = notesData.notes[0]?.id;

      if (noteId) {
        const res = await request.get(`/api/comments?noteId=${noteId}`, {
          headers: { Cookie: `notespedia_token=${token}` },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });
  });

  test.describe('Admin API', () => {
    test('GET /api/admin - admin access', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'admin@notespedia.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/admin', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalUsers).toBeGreaterThan(0);
      expect(data.stats.totalNotes).toBeGreaterThan(0);
    });

    test('GET /api/admin - non-admin should be denied', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/admin', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      expect(res.status()).toBe(403);
    });
  });

  test.describe('Leaderboard API', () => {
    test('GET /api/leaderboard - returns rankings', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/leaderboard', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.leaderboard.length).toBeGreaterThan(0);
      expect(data.leaderboard[0].rank).toBe(1);
    });
  });

  test.describe('Colleges API', () => {
    test('GET /api/colleges - list colleges', async ({ request }) => {
      const res = await request.get('/api/colleges?limit=10');
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.colleges.length).toBeGreaterThan(0);
    });
  });

  test.describe('Subjects API', () => {
    test('GET /api/subjects - list subjects', async ({ request }) => {
      const res = await request.get('/api/subjects?limit=10');
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.subjects.length).toBeGreaterThan(0);
    });
  });

  test.describe('Notifications API', () => {
    test('GET /api/notifications - list notifications', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/notifications', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Study Groups API', () => {
    test('GET /api/study-groups - list groups', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/study-groups', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test('POST /api/study-groups - create group', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.post('/api/study-groups', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: {
          name: 'API Test Study Group',
          description: 'Created by automated test',
          isPublic: true,
          maxMembers: 10,
        },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.group.name).toBe('API Test Study Group');
    });
  });

  test.describe('Upload API', () => {
    test('POST /api/upload - upload text file', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.post('/api/upload', {
        headers: { Cookie: `notespedia_token=${token}` },
        multipart: {
          file: {
            name: 'test-upload.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('Test content for upload API test.\nLine 2.\nLine 3.'),
          },
        },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.filePath).toBeDefined();
    });

    test('POST /api/upload - unauthenticated should fail', async ({ request }) => {
      const res = await request.post('/api/upload', {
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('test'),
          },
        },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe('Users API', () => {
    test('GET /api/users/[id] - get user profile', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token, user } = await loginRes.json();

      const res = await request.get(`/api/users/${user.id}`, {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.profile).toBeDefined();
    });

    test('GET /api/users/[id] - email should be visible only to self', async ({ request }) => {
      // Login as Arjun
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Get Priya's profile (different user)
      const priyaLogin = await request.post('/api/auth', {
        data: { action: 'login', email: 'priya@aiims.edu', password: 'password123' },
      });
      const priyaData = await priyaLogin.json();
      const priyaId = priyaData.user?.id;

      if (priyaId) {
        const res = await request.get(`/api/users/${priyaId}`, {
          headers: { Cookie: `notespedia_token=${token}` },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
        // Email should NOT be in the response for other users
        expect(data.profile?.email).toBeUndefined();
      }
    });

    test('GET /api/users/[id] - nonexistent user should 404', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.get('/api/users/nonexistent-id', {
        headers: { Cookie: `notespedia_token=${token}` },
      });
      expect(res.status()).toBe(404);
    });
  });

  test.describe('Seed API Security', () => {
    test('POST /api/seed - unauthenticated should fail', async ({ request }) => {
      const res = await request.post('/api/seed', { data: {} });
      expect(res.status()).toBe(401);
    });

    test('POST /api/seed - non-admin should be forbidden', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      const res = await request.post('/api/seed', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: {},
      });
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });
  });

  test.describe('AI Processing Security', () => {
    test('POST /api/ai/process - IDOR prevention', async ({ request }) => {
      // Login as Arjun
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Try to process a note that belongs to another user
      const res = await request.post('/api/ai/process', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: { noteId: 'cmqmahjjm002pnwvx9t8xe9kc' }, // Priya's note
      });
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    test('POST /api/ai/process - admin can process any note', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'admin@notespedia.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Admin should be able to process any note (but we won't actually trigger it to save time)
      // Just verify the auth check passes
      const res = await request.post('/api/ai/process', {
        headers: { Cookie: `notespedia_token=${token}` },
        data: { noteId: 'nonexistent-note-id' },
      });
      const data = await res.json();
      // Should fail because note doesn't exist, but NOT because of IDOR
      expect(data.error).not.toContain('Forbidden');
    });

    test('POST /api/ai/process - unauthenticated should fail', async ({ request }) => {
      const res = await request.post('/api/ai/process', {
        data: { noteId: 'some-note-id' },
      });
      expect(res.status()).toBe(401);
    });
  });

  test.describe('Follows API', () => {
    test('POST /api/follows - follow a user', async ({ request }) => {
      const loginRes = await request.post('/api/auth', {
        data: { action: 'login', email: 'arjun@iitb.ac.in', password: 'password123' },
      });
      const { token } = await loginRes.json();

      // Get Priya's ID
      const priyaLogin = await request.post('/api/auth', {
        data: { action: 'login', email: 'priya@aiims.edu', password: 'password123' },
      });
      const priyaData = await priyaLogin.json();
      const priyaId = priyaData.user?.id;

      if (priyaId) {
        const res = await request.post('/api/follows', {
          headers: { Cookie: `notespedia_token=${token}` },
          data: { type: 'user', followingId: priyaId },
        });
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });
  });
});
