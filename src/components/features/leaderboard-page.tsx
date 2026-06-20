'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Crown,
  Upload,
  Star,
  TrendingUp,
  Users,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Animation variants ──────────────────────────────────────────
const podiumVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};
const podiumItem = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } },
};
const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.4, ease: 'easeOut' },
  }),
};

// ── Types ───────────────────────────────────────────────────────
interface LeaderboardUser {
  rank: number;
  user: { id: string; name: string; avatarUrl?: string; role?: string };
  college?: { id: string; name: string; shortName?: string } | null;
  department?: { id: string; name: string } | null;
  reputationScore: number;
  contributionScore: number;
  uploadCount: number;
  downloadCount: number;
  noteCount: number;
  followerCount: number;
}

// ── Fetchers ────────────────────────────────────────────────────
async function fetchLeaderboard(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/leaderboard?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

async function fetchColleges() {
  const res = await fetch('/api/colleges?limit=100');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// ── Podium Display ──────────────────────────────────────────────
function PodiumDisplay({ top3, onUserClick }: { top3: LeaderboardUser[]; onUserClick: (id: string) => void }) {
  const podiumOrder = [1, 0, 2]; // Silver, Gold, Bronze display order

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return 'h-32';
      case 2: return 'h-24';
      case 3: return 'h-20';
      default: return 'h-16';
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="size-6 text-yellow-500" />;
      case 2: return <Medal className="size-5 text-gray-400" />;
      case 3: return <Medal className="size-5 text-amber-600" />;
      default: return null;
    }
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-400 to-amber-500';
      case 2: return 'from-gray-300 to-gray-400';
      case 3: return 'from-amber-600 to-amber-700';
      default: return 'from-muted to-muted/50';
    }
  };

  return (
    <motion.div
      variants={podiumVariants}
      initial="hidden"
      animate="show"
      className="flex items-end justify-center gap-3 md:gap-6 pt-8 pb-4"
    >
      {podiumOrder.map((idx) => {
        const entry = top3[idx];
        if (!entry) return null;

        return (
          <motion.div
            key={entry.user.id}
            variants={podiumItem}
            className="flex flex-col items-center cursor-pointer"
            onClick={() => onUserClick(entry.user.id)}
            whileHover={{ scale: 1.03 }}
          >
            {/* Avatar + Medal */}
            <div className="relative mb-2">
              <Avatar className={`border-4 ${entry.rank === 1 ? 'size-20 md:size-24 border-yellow-400' : entry.rank === 2 ? 'size-16 md:size-20 border-gray-300' : 'size-14 md:size-18 border-amber-600'} shadow-lg`}>
                {entry.user.avatarUrl && <AvatarImage src={entry.user.avatarUrl} />}
                <AvatarFallback className={`text-xl md:text-2xl font-bold ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                  {entry.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-1">
                {getMedalIcon(entry.rank)}
              </div>
            </div>

            {/* Name & Stats */}
            <h3 className="font-bold text-sm md:text-base text-center max-w-[120px] truncate">{entry.user.name}</h3>
            <p className="text-xs text-muted-foreground">{entry.reputationScore} pts</p>

            {/* Podium block */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.5 + idx * 0.1, duration: 0.5, ease: 'easeOut' }}
              className={`w-20 md:w-28 ${getPodiumHeight(entry.rank)} bg-gradient-to-t ${getPodiumColor(entry.rank)} rounded-t-lg mt-2 origin-bottom flex items-center justify-center`}
            >
              <span className="text-white font-bold text-2xl md:text-3xl drop-shadow">{entry.rank}</span>
            </motion.div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ── Leaderboard Table ───────────────────────────────────────────
function LeaderboardTable({ entries, currentUserId, onUserClick }: { entries: LeaderboardUser[]; currentUserId?: string; onUserClick: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Rank</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="hidden md:table-cell">College</TableHead>
            <TableHead className="text-center">Reputation</TableHead>
            <TableHead className="text-center hidden sm:table-cell">Score</TableHead>
            <TableHead className="text-center hidden lg:table-cell">Uploads</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, i) => {
            const isCurrentUser = entry.user.id === currentUserId;
            return (
              <motion.tr
                key={entry.user.id}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="show"
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${isCurrentUser ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}
                onClick={() => onUserClick(entry.user.id)}
              >
                <TableCell className="text-center font-bold">
                  {entry.rank <= 3 ? (
                    <span className={
                      entry.rank === 1 ? 'text-yellow-500' :
                      entry.rank === 2 ? 'text-gray-400' :
                      'text-amber-600'
                    }>
                      {entry.rank <= 3 && entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">#{entry.rank}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      {entry.user.avatarUrl && <AvatarImage src={entry.user.avatarUrl} />}
                      <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {entry.user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate flex items-center gap-1.5">
                        {entry.user.name}
                        {isCurrentUser && (
                          <Badge className="text-[8px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">You</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-xs text-muted-foreground truncate max-w-[150px] inline-block">
                    {entry.college?.name || '—'}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold text-sm flex items-center justify-center gap-1">
                    <Star className="size-3 text-amber-500" />
                    {entry.reputationScore}
                  </span>
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  <span className="text-sm text-muted-foreground">{entry.contributionScore}</span>
                </TableCell>
                <TableCell className="text-center hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">{entry.uploadCount}</span>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Leaderboard Page ───────────────────────────────────────
export function LeaderboardPage() {
  const { navigate, user } = useAppStore();

  const [collegeId, setCollegeId] = useState<string>('_all');
  const [timePeriod, setTimePeriod] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch colleges for filter
  const { data: collegesData } = useQuery({
    queryKey: ['leaderboard-colleges'],
    queryFn: fetchColleges,
  });

  // Fetch leaderboard
  const queryParams: Record<string, string> = {
    page: String(page),
    limit: String(limit),
    type: 'reputation',
  };
  if (collegeId && collegeId !== '_all') queryParams.collegeId = collegeId;
  if (timePeriod && timePeriod !== 'all') queryParams.timePeriod = timePeriod;

  const { data: leaderboardData, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', queryParams],
    queryFn: () => fetchLeaderboard(queryParams),
  });

  const entries: LeaderboardUser[] = leaderboardData?.leaderboard ?? [];
  const totalPages: number = leaderboardData?.totalPages ?? 1;
  const total: number = leaderboardData?.total ?? 0;
  const top3 = entries.slice(0, 3);
  const restEntries = entries;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="size-7 text-emerald-600" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Top contributors across the platform
          </p>
        </div>
      </motion.div>

      {/* ── Filters ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              {/* College filter */}
              <Select value={collegeId} onValueChange={(v) => { setCollegeId(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Colleges</SelectItem>
                  {(collegesData?.colleges ?? []).map((c: { id: string; name: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Time period filter */}
              <Select value={timePeriod} onValueChange={(v) => { setTimePeriod(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Podium for Top 3 ───────────────────────── */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-end justify-center gap-6">
              {[2, 1, 3].map((rank) => (
                <div key={rank} className="flex flex-col items-center gap-2">
                  <Skeleton className={`rounded-full ${rank === 1 ? 'size-24' : 'size-20'}`} />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className={`w-20 ${rank === 1 ? 'h-32' : rank === 2 ? 'h-24' : 'h-20'} rounded-t-lg`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : isError ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
            <Trophy className="size-8 text-destructive" />
          </div>
          <h3 className="font-semibold">Failed to load leaderboard</h3>
          <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
        </motion.div>
      ) : entries.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-muted/60 p-4 mb-4">
            <Trophy className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No contributors yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Start uploading notes to appear on the leaderboard!</p>
        </motion.div>
      ) : (
        <>
          {top3.length >= 2 && (
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-4 md:p-6 bg-gradient-to-b from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent">
                <PodiumDisplay top3={top3} onUserClick={(id) => navigate('profile', { id })} />
              </CardContent>
            </Card>
          )}

          {/* ── Full Leaderboard Table ──────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{total} contributors</span>
                  </div>
                </div>
                <LeaderboardTable
                  entries={restEntries}
                  currentUserId={user?.id}
                  onUserClick={(id) => navigate('profile', { id })}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Pagination ──────────────────────────── */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 pt-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1"
              >
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="gap-1"
              >
                Next <ChevronRight className="size-4" />
              </Button>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
