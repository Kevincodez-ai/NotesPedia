'use client';

import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { useAppStore, revalidateAuth, setupCrossTabAuthSync } from '@/store/app-store';
import { useToast } from '@/hooks/use-toast';

// Lazy-load all page components so each page is a separate JS chunk.
// This cuts the initial bundle by ~250 KB — only the landing/login/signup
// pages load upfront; every other page is fetched on first navigation.
const LandingPage         = lazy(() => import('@/components/features/landing-page').then(m => ({ default: m.LandingPage })));
const DashboardPage       = lazy(() => import('@/components/features/dashboard').then(m => ({ default: m.DashboardPage })));
const LoginPage           = lazy(() => import('@/components/features/login-page').then(m => ({ default: m.LoginPage })));
const SignupPage          = lazy(() => import('@/components/features/signup-page').then(m => ({ default: m.SignupPage })));
const NotesPage           = lazy(() => import('@/components/features/notes-page').then(m => ({ default: m.NotesPage })));
const NoteDetailPage      = lazy(() => import('@/components/features/note-detail-page').then(m => ({ default: m.NoteDetailPage })));
const UploadPage          = lazy(() => import('@/components/features/upload-page').then(m => ({ default: m.UploadPage })));
const BookmarksPage       = lazy(() => import('@/components/features/bookmarks-page').then(m => ({ default: m.BookmarksPage })));
const NotificationsPage   = lazy(() => import('@/components/features/notifications-page').then(m => ({ default: m.NotificationsPage })));
const LeaderboardPage     = lazy(() => import('@/components/features/leaderboard-page').then(m => ({ default: m.LeaderboardPage })));
const SearchPage          = lazy(() => import('@/components/features/search-page').then(m => ({ default: m.SearchPage })));
const AdminPage           = lazy(() => import('@/components/features/admin-page').then(m => ({ default: m.AdminPage })));
const SettingsPage        = lazy(() => import('@/components/features/settings-page').then(m => ({ default: m.SettingsPage })));
const ProfilePage         = lazy(() => import('@/components/features/profile-page').then(m => ({ default: m.ProfilePage })));
const ForgotPasswordPage  = lazy(() => import('@/components/features/forgot-password-page').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage   = lazy(() => import('@/components/features/reset-password-page').then(m => ({ default: m.ResetPasswordPage })));
const AppShell            = lazy(() => import('@/components/layout/app-shell').then(m => ({ default: m.AppShell })));
const CommandPalette      = lazy(() => import('@/components/layout/command-palette').then(m => ({ default: m.CommandPalette })));

export default function Home() {
  const { currentPage, pageParams, isAuthenticated, isLoading, navigate } = useAppStore();
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
    <Suspense fallback={<LoadingScreen />}>
      <CommandPalette />
      {needsShell
        ? <AppShell>{renderPage()}</AppShell>
        : renderPage()
      }
    </Suspense>
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
