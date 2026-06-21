import { create } from 'zustand';
import type { PageName, PageParams, AuthUser } from '@/types';

interface AppState {
  // Navigation
  currentPage: PageName;
  pageParams: PageParams;
  navigate: (page: PageName, params?: PageParams) => void;

  // Auth
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;

  // UI State
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Notifications (shared state to avoid duplicate polling)
  unreadNotificationCount: number;
  setUnreadNotificationCount: (count: number) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AUTH_SIGNAL_KEY = 'notespedia_auth_signal';

// Track whether the last auth change was from a local action (login/logout in this tab)
// vs an external event (token expiry, cross-tab, etc.)
let lastAuthActionWasLocal = false;

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'landing',
  pageParams: {},
  navigate: (page, params = {}) => set({ currentPage: page, pageParams: params }),

  // Auth
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => {
    set({ user, isAuthenticated: !!user, isLoading: false });
    // Signal other tabs that auth state changed
    try {
      localStorage.setItem(AUTH_SIGNAL_KEY, JSON.stringify({
        action: user ? 'login' : 'logout',
        userId: user?.id || null,
        timestamp: Date.now(),
      }));
    } catch {
      // localStorage not available
    }
    // Track that this was a local action (not cross-tab)
    lastAuthActionWasLocal = true;
    setTimeout(() => { lastAuthActionWasLocal = false; }, 1000);
  },
  setLoading: (isLoading) => set({ isLoading }),

  // UI State
  sidebarOpen: true,
  commandPaletteOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Notifications
  unreadNotificationCount: 0,
  setUnreadNotificationCount: (unreadNotificationCount) => set({ unreadNotificationCount }),

  // Search
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));

/**
 * Re-validate auth by reading the cookie via /api/auth.
 * Used when tab regains focus or when another tab signals an auth change.
 * Shows a toast if the user was unexpectedly logged out (session expired).
 */
export async function revalidateAuth() {
  const wasAuthenticated = useAppStore.getState().isAuthenticated;
  const wasLocal = lastAuthActionWasLocal;
  try {
    const res = await fetch('/api/auth');
    const data = await res.json();
    if (data.success && data.user) {
      useAppStore.getState().setUser(data.user);
    } else {
      useAppStore.getState().setUser(null);
      // Show "Session expired" toast only if:
      // 1. User was previously authenticated, AND
      // 2. This was NOT triggered by a local logout action
      if (wasAuthenticated && !wasLocal) {
        import('sonner').then(({ toast }) => {
          toast.error('Session expired. Please log in again.', { duration: 5000 });
        });
      }
    }
  } catch {
    useAppStore.getState().setUser(null);
  }
}

/**
 * Sets up cross-tab auth synchronization.
 * Call once in the root layout/page.
 *
 * Mechanisms:
 * 1. `storage` event — fires in Tab B when Tab A writes to localStorage
 * 2. `visibilitychange` — fires when user switches back to a tab
 * 3. Periodic check — safety net every 30 seconds
 */
export function setupCrossTabAuthSync() {
  if (typeof window === 'undefined') return;

  // 1. Listen for localStorage changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === AUTH_SIGNAL_KEY && e.newValue) {
      try {
        const signal = JSON.parse(e.newValue);
        const currentState = useAppStore.getState();

        // If the signal is from a different auth state, re-validate
        if (
          (signal.action === 'logout' && currentState.isAuthenticated) ||
          (signal.action === 'login' && !currentState.isAuthenticated) ||
          (signal.action === 'login' && currentState.user?.id !== signal.userId)
        ) {
          revalidateAuth();
        }
      } catch {
        revalidateAuth();
      }
    }
  };
  window.addEventListener('storage', handleStorageChange);

  // 2. Re-validate when tab regains focus
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      revalidateAuth();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 3. Periodic re-validation every 30s (safety net)
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      revalidateAuth();
    }
  }, 30000);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(interval);
  };
}
