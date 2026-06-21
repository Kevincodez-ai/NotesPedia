'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import {
  FileText,
  Upload,
  Search,
  TrendingUp,
  Bookmark,
  Star,
  Eye,
  Download,
  BookOpen,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { NoteCard } from '@/types';
import { formatRelativeTime, fileTypeIcon } from '@/components/features/note-card';

// ── Animation variants ──────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

// ── Fetchers ────────────────────────────────────────────────────

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

// ── Note Card ───────────────────────────────────────────────────
function NoteCardItem({ note, onClick }: { note: NoteCard; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0 mt-0.5">{fileTypeIcon(note.fileType)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {note.title}
              </h3>
              {note.subject && (
                <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0">
                  {note.subject.name}
                </Badge>
              )}
            </div>
          </div>
          {note.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{note.description}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Avatar className="size-5">
              {note.uploader.avatarUrl && <AvatarImage src={note.uploader.avatarUrl} />}
              <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700">
                {note.uploader.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground truncate">{note.uploader.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{formatRelativeTime(note.createdAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-0.5"><Download className="size-3" />{note.downloadCount}</span>
            <span className="flex items-center gap-0.5"><Star className="size-3 text-amber-500" />{note.avgRating > 0 ? note.avgRating.toFixed(1) : '—'}</span>
            <span className="flex items-center gap-0.5"><Eye className="size-3" />{note.viewCount}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Note Grid Skeleton ──────────────────────────────────────────
function NoteGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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

// ── Main Dashboard ──────────────────────────────────────────────
export function DashboardPage() {
  const { user, navigate } = useAppStore();

  // Fetch trending notes
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['notes', 'trending'],
    queryFn: () => fetchNotes('sortBy=downloads&limit=6'),
  });

  // Fetch recent notes
  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['notes', 'recent'],
    queryFn: () => fetchNotes('sortBy=date&limit=6'),
  });

  // Fetch user's uploaded notes
  const { data: myNotesData } = useQuery({
    queryKey: ['notes', 'my-uploads'],
    queryFn: () => fetchNotes(`uploaderId=${user?.id || ''}&limit=100`),
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
  });

  // Fetch bookmarks count
  const { data: bookmarksData } = useQuery({
    queryKey: ['bookmarks-count'],
    queryFn: async () => {
      const res = await fetch('/api/bookmarks?limit=1');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const trendingNotes: NoteCard[] = trendingData?.notes ?? [];
  const recentNotes: NoteCard[] = recentData?.notes ?? [];
  const myUploadsCount = myNotesData?.total ?? 0;
  const bookmarksCount = bookmarksData?.total ?? 0;
  const totalNotes = trendingData?.total ?? 0;

  // Use reputation from user profile API response
  const reputationScore = profileData?.profile?.reputationScore ?? 0;

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
        <StatCard title="Total Notes" value={totalNotes} icon={FileText} subtitle="Across platform" color="bg-emerald-500" />
        <StatCard title="My Uploads" value={myUploadsCount} icon={Upload} subtitle="Contributed by you" color="bg-teal-500" />
        <StatCard title="Bookmarks" value={bookmarksCount} icon={Bookmark} subtitle="Saved notes" color="bg-amber-500" />
        <StatCard title="Reputation" value={reputationScore} icon={Star} subtitle="Contribution score" color="bg-rose-500" />
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
          <NoteGridSkeleton />
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
                <NoteCardItem note={note} onClick={() => navigate('note-detail', { id: note.id })} />
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
          <NoteGridSkeleton />
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
                <NoteCardItem note={note} onClick={() => navigate('note-detail', { id: note.id })} />
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
                  <Upload className="size-4" /> Upload & Generate
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
