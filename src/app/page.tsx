'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { LandingPage } from '@/components/features/landing-page';
import { DashboardPage } from '@/components/features/dashboard';
import { LoginPage } from '@/components/features/login-page';
import { SignupPage } from '@/components/features/signup-page';
import { NotesPage } from '@/components/features/notes-page';
import { NoteDetailPage } from '@/components/features/note-detail-page';
import { UploadPage } from '@/components/features/upload-page';
import { BookmarksPage } from '@/components/features/bookmarks-page';
import { NotificationsPage } from '@/components/features/notifications-page';
import { LeaderboardPage } from '@/components/features/leaderboard-page';
import { SearchPage } from '@/components/features/search-page';
import { AdminPage } from '@/components/features/admin-page';
import { SettingsPage } from '@/components/features/settings-page';
import { ProfilePage } from '@/components/features/profile-page';
import { ForgotPasswordPage } from '@/components/features/forgot-password-page';
import { ResetPasswordPage } from '@/components/features/reset-password-page';
import { AppShell } from '@/components/layout/app-shell';
import { CommandPalette } from '@/components/layout/command-palette';

export default function Home() {
  const { currentPage, pageParams, isAuthenticated, isLoading, setUser, setLoading } = useAppStore();

  useEffect(() => {
    // Check auth status on load
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, [setUser]);

  // Keyboard shortcut Ctrl+K is handled by CommandPalette component

  const renderPage = () => {
    if (isLoading) {
      return <LoadingScreen />;
    }

    // Public pages (no auth required)
    if (currentPage === 'landing' && !isAuthenticated) return <LandingPage />;
    if (currentPage === 'login') return <LoginPage />;
    if (currentPage === 'signup') return <SignupPage />;
    if (currentPage === 'forgot-password') return <ForgotPasswordPage />;
    if (currentPage === 'reset-password') return <ResetPasswordPage />;

    // If not authenticated, show landing
    if (!isAuthenticated) return <LandingPage />;

    // Protected pages
    switch (currentPage) {
      case 'dashboard':
      case 'landing':
        return <DashboardPage />;
      case 'notes':
        return <NotesPage />;
      case 'note-detail': {
        const noteId = pageParams.id;
        if (!noteId) {
          return <DashboardPage />;
        }
        return <NoteDetailPage noteId={noteId} />;
      }
      case 'upload':
        return <UploadPage />;
      case 'bookmarks':
        return <BookmarksPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'search':
        return <SearchPage />;
      case 'admin':
        return <AdminPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile': {
        const userId = pageParams.id;
        if (!userId) {
          return <DashboardPage />;
        }
        return <ProfilePage userId={userId} />;
      }
      default:
        return <DashboardPage />;
    }
  };

  const needsShell = isAuthenticated && !['landing', 'login', 'signup', 'forgot-password', 'reset-password'].includes(currentPage);

  return (
    <>
      <CommandPalette />
      {needsShell ? <AppShell>{renderPage()}</AppShell> : renderPage()}
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading NotesPedia...</p>
      </div>
    </div>
  );
}
