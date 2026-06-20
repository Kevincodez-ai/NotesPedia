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

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'landing',
  pageParams: {},
  navigate: (page, params = {}) => set({ currentPage: page, pageParams: params }),

  // Auth
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  // UI State
  sidebarOpen: true,
  commandPaletteOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Search
  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
