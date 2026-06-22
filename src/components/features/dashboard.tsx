'use client';

import React, { useCallback } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import {
  FileText,
  Upload,
  Search,
  TrendingUp,
  Bookmark,
  Star,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteCard, NoteCardGridSkeleton } from '@/components/features/note-card';
import type { NoteCard as NoteCardType } from '@/types';

// ── Animation variants ──────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ── Helpers ─────────────────────────────────────────────────────

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function fetchNotes(params: string) {
  const res = await fetch(`/api/notes?${params}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  subtitle?: string;
  color: string;
}) {
  return (
    <motion.div variants={item}>
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className={`rounded-xl p-2.5 ${color}`}>
              <Icon className="size-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Stat Card Skeleton ──────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="rounded-xl size-10" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty State ─────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }: { icon: React.ElementType; title: string; description: string; action?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-2xl bg-muted/60 p-4 mb-4">
        <Icon className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

// ── Error State with Retry ──────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
        <FileText className="size-8 text-destructive" />
      </div>
      <h3 className="font-semibold text-sm">Something went wrong</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{message}</p>
      <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRetry}>
        <RefreshCw className="size-3.5" /> Try Again
      </Button>
    </motion.div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────
export function DashboardPage() {
  const { user, navigate } = useAppStore();
  const queryClient = useQueryClient();

  // Fetch trending notes — keepPreviousData so the grid doesn't flash on refetch
  const { data: trendingData, isLoading: trendingLoading, isError: trendingError } = useQuery({
    queryKey: ['notes', 'trending'],
    queryFn: () => fetchNotes('sortBy=downloads&limit=6'),
    placeholderData: keepPreviousData,
    staleTime: 3 * 60 * 1000, // 3 min — trending changes slowly
  });

  // Fetch recent notes
  const { data: recentData, isLoading: recentLoading, isError: recentError } = useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => fetchNotes('sortBy=date&limit=6'),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 min — recent changes often
  });

  // Fetch user's uploaded notes — only when user is authenticated
  const { data: myNotesData } = useQuery({
    queryKey: ['notes', 'my-uploads', user?.id],
    queryFn: () => fetchNotes(`uploaderId=${user!.id}&limit=100`),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's profile for reputationScore
  const { data: profileData } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/users/${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch bookmarks count
  const { data: bookmarksData } = useQuery({
    queryKey: ['bookmarks-count'],
    queryFn: async () => {
      const res = await fetch('/api/bookmarks?limit=1');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const trendingNotes: NoteCardType[] = trendingData?.notes ?? [];
  const recentNotes: NoteCardType[] = recentData?.notes ?? [];
  const myUploadsCount = myNotesData?.total ?? 0;
  const bookmarksCount = bookmarksData?.total ?? 0;
  const totalNotes = trendingData?.total ?? 0;

  // Use reputation from user profile API response
  const reputationScore = profileData?.profile?.reputationScore ?? 0;

  const retryTrending = useCallback(() => queryClient.invalidateQueries({ queryKey: ['notes', 'trending'] }), [queryClient]);
  const retryRecent = useCallback(() => queryClient.invalidateQueries({ queryKey: ['notes', 'recent'] }), [queryClient]);

  const handleNoteClick = useCallback((noteId: string) => navigate('note-detail', { id: noteId }), [navigate]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Welcome Header ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, <span className="text-primary">{user?.name?.split(' ')[0] || 'Student'}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDate()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('upload')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
          >
            <Upload className="size-4" /> Upload Note
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('notes')}
            className="gap-2"
          >
            <Search className="size-4" /> Browse
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Cards ────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {trendingLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard title="Total Notes" value={totalNotes} icon={FileText} subtitle="Across platform" color="bg-emerald-500" />
            <StatCard title="My Uploads" value={myUploadsCount} icon={Upload} subtitle="Contributed by you" color="bg-teal-500" />
            <StatCard title="Bookmarks" value={bookmarksCount} icon={Bookmark} subtitle="Saved notes" color="bg-amber-500" />
            <StatCard title="Reputation" value={reputationScore} icon={Star} subtitle="Contribution score" color="bg-rose-500" />
          </>
        )}
      </motion.div>

      {/* ── Trending Notes ─────────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Trending Notes</h2>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('notes')}>
            View all <ArrowRight className="size-3" />
          </Button>
        </motion.div>

        {trendingLoading ? (
          <NoteCardGridSkeleton count={6} />
        ) : trendingError ? (
          <ErrorState message="Failed to load trending notes" onRetry={retryTrending} />
        ) : trendingNotes.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No trending notes yet"
            description="Be the first to upload and start the trend!"
            action={
              <Button size="sm" onClick={() => navigate('upload')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Upload className="size-3.5" /> Upload Now
              </Button>
            }
          />
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingNotes.map((note) => (
              <motion.div key={note.id} variants={item}>
                <NoteCard note={note} onClick={() => handleNoteClick(note.id)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ── Recent Notes ───────────────────────────────── */}
      <section>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Recent Notes</h2>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('notes')}>
            View all <ArrowRight className="size-3" />
          </Button>
        </motion.div>

        {recentLoading ? (
          <NoteCardGridSkeleton count={6} />
        ) : recentError ? (
          <ErrorState message="Failed to load recent notes" onRetry={retryRecent} />
        ) : recentNotes.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No recent notes"
            description="Upload your first note to see it here."
          />
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNotes.map((note) => (
              <motion.div key={note.id} variants={item}>
                <NoteCard note={note} onClick={() => handleNoteClick(note.id)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* ── Quick Actions & AI Feature Teaser ──────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-sm">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-emerald-600" />
                  <h2 className="text-lg font-semibold">AI-Powered Learning</h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Upload your notes and let our AI automatically generate summaries, flashcards, and MCQ quizzes to supercharge your study sessions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('upload')} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
                  <Upload className="size-4" /> Upload &amp; Generate
                </Button>
                <Button variant="outline" onClick={() => navigate('notes')} className="gap-2">
                  <BookOpen className="size-4" /> Explore Notes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
