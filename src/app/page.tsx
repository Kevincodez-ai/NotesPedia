'use client';

import React, { useEffect, useRef } from 'react';
import { useAppStore, revalidateAuth, setupCrossTabAuthSync } from '@/store/app-store';
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
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const { currentPage, pageParams, isAuthenticated, isLoading, setUser, setLoading, navigate } = useAppStore();
  const { toast } = useToast();

  // Cross-tab auth sync cleanup ref
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Check auth status on load
    revalidateAuth();

    // Set up cross-tab auth synchronization
    cleanupRef.current = setupCrossTabAuthSync();

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    // Handle URL query params for password reset and email verification
    const params = new URLSearchParams(window.location.search);

    // Password reset flow: redirect to reset-password page with token
    const isResetPassword = params.get('reset-password');
    const resetToken = params.get('token');
    if (isResetPassword === 'true' && resetToken) {
      navigate('reset-password', { id: resetToken });
      // Clean up URL
      window.history.replaceState({}, '', '/');
      return;
    }

    // Email verification feedback
    const verification = params.get('verification');
    if (verification) {
      if (verification === 'success') {
        toast({ title: 'Email verified!', description: 'Your email has been verified successfully.' });
      } else if (verification === 'expired') {
        toast({ title: 'Link expired', description: 'This verification link has expired. Please request a new one.', variant: 'destructive' });
      } else if (verification === 'failed') {
        toast({ title: 'Verification failed', description: 'Email verification failed. Please try again.', variant: 'destructive' });
      }
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [navigate, toast]);

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
