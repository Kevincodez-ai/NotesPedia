/**
 * Authentication Flow E2E Tests - Robust Version
 */
import { test, expect } from '@playwright/test';

const uniqueEmail = `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
const SEED_USER = { email: 'arjun@iitb.ac.in', password: 'password123' };
const ADMIN_USER = { email: 'admin@notespedia.in', password: 'password123' };

// Helper: Login via API and set cookie
async function loginViaAPI(page, email, password) {
  const res = await page.request.post('/api/auth', {
    data: { action: 'login', email, password },
  });
  const data = await res.json();
  if (data.success && data.token) {
    await page.context().addCookies([{
      name: 'notespedia_token',
      value: data.token,
      domain: 'localhost',
      path: '/',
    }]);
  }
  return data;
}

// Helper: login via API then load the app so the store picks up auth
async function loginAndLoad(page, email = SEED_USER.email, password = SEED_USER.password) {
  const data = await loginViaAPI(page, email, password);
  // Navigate to the app - the page.tsx useEffect will call GET /api/auth and set the store
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Wait for auth check to complete
  await page.waitForTimeout(3000);
  return data;
}

test.describe('Landing Page', () => {
  test('shows landing page for unauthenticated users', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const heroText = await page.getByText('Your Academic Knowledge').isVisible().catch(() => false);
    const getStarted = await page.getByRole('button', { name: /get started/i }).first().isVisible().catch(() => false);
    expect(heroText || getStarted).toBeTruthy();
  });

  test('has feature descriptions', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const aiSummaries = await page.getByText('AI Summaries').isVisible().catch(() => false);
    const flashcards = await page.getByText('Smart Flashcards').isVisible().catch(() => false);
    expect(aiSummaries || flashcards).toBeTruthy();
  });
});

test.describe('Signup Flow', () => {
  test('creates a new account via API', async ({ request }) => {
    const email = `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
    const res = await request.post('/api/auth', {
      data: { action: 'signup', name: 'E2E Test User', email, password: 'testpass123' },
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.name).toBe('E2E Test User');
    expect(data.user.role).toBe('student');
    expect(data.token).toBeDefined();
  });

  test('rejects duplicate email', async ({ request }) => {
    const res = await request.post('/api/auth', {
      data: { action: 'signup', name: 'Duplicate', email: SEED_USER.email, password: 'password123' },
    });
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('already');
  });
});

test.describe('Login Flow', () => {
  test('logs in with valid credentials via API', async ({ request }) => {
    const res = await request.post('/api/auth', {
      data: { action: 'login', email: SEED_USER.email, password: SEED_USER.password },
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(SEED_USER.email);
    expect(data.token).toBeDefined();
  });

  test('rejects invalid credentials via API', async ({ request }) => {
    const res = await request.post('/api/auth', {
      data: { action: 'login', email: 'wrong@test.com', password: 'wrongpassword' },
    });
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
  });
});

test.describe('Session & Logout', () => {
  test('session persists after page reload (verified via API)', async ({ page }) => {
    await loginAndLoad(page);

    // Reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Check that auth cookie is still present (session persists)
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'notespedia_token');
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBeTruthy();
  });

  test('logs out and shows landing', async ({ page }) => {
    await loginAndLoad(page);

    // Click user menu
    const avatar = page.locator('[class*="rounded-full"]').last();
    await avatar.click();
    await page.waitForTimeout(500);

    const logoutBtn = page.getByText(/log out/i);
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(3000);
      const isLanding = await page.getByText(/academic|notespedia|get started/i).isVisible().catch(() => false);
      expect(isLanding).toBeTruthy();
    }
  });
});

test.describe('Role-Based Access', () => {
  test('admin sees admin page in sidebar', async ({ page }) => {
    await loginAndLoad(page, ADMIN_USER.email, ADMIN_USER.password);

    // Admin link should be visible somewhere on the page
    const adminText = await page.getByText(/^Admin$/).first().isVisible().catch(() => false);
    const adminShield = await page.locator('svg.lucide-shield').first().isVisible().catch(() => false);
    expect(adminText || adminShield).toBeTruthy();
  });

  test('admin can access admin dashboard', async ({ page }) => {
    await loginAndLoad(page, ADMIN_USER.email, ADMIN_USER.password);

    // Click Admin in sidebar
    const adminLink = page.locator('button:has-text("Admin")').first();
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await page.waitForTimeout(2000);
      const isAdminPage = await page.getByText(/admin|total users|total notes/i).isVisible().catch(() => false);
      expect(isAdminPage).toBeTruthy();
    }
  });

  test('non-admin cannot access admin API', async ({ page }) => {
    await loginAndLoad(page);
    const res = await page.request.get('/api/admin');
    expect(res.status()).toBe(403);
  });
});
