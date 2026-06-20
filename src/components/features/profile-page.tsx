'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import {
  User,
  MapPin,
  GraduationCap,
  BookOpen,
  Download,
  Users,
  Star,
  Award,
  Activity,
  Pencil,
  UserPlus,
  UserMinus,
  FileText,
  Calendar,
  Trophy,
  Target,
  Zap,
  MessageSquare,
  Heart,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { NoteCard, NoteFileType, AchievementData } from '@/types';

// ── Animation variants ──────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Helpers ─────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fileTypeIcon(type?: string | null) {
  switch (type) {
    case 'pdf': return '📕';
    case 'docx': return '📘';
    case 'pptx': return '📙';
    case 'txt': return '📄';
    case 'md': return '📝';
    case 'image': return '🖼️';
    default: return '📋';
  }
}

function fileTypeLabel(type?: string | null) {
  const labels: Record<string, string> = { pdf: 'PDF', docx: 'DOCX', pptx: 'PPTX', txt: 'TXT', md: 'MD', image: 'Image' };
  return type ? labels[type] || type.toUpperCase() : 'FILE';
}

function roleBadgeColor(role: string) {
  switch (role) {
    case 'admin': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'super_admin': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'moderator': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'contributor': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    case 'verified_student': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

function achievementIcon(category: string) {
  switch (category) {
    case 'upload': return <Upload2Icon className="size-5" />;
    case 'social': return <Users className="size-5" />;
    case 'quality': return <Star className="size-5" />;
    case 'streak': return <Zap className="size-5" />;
    default: return <Trophy className="size-5" />;
  }
}

function Upload2Icon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ── Fetchers ────────────────────────────────────────────────────
async function fetchProfile(userId: string) {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

async function fetchUserNotes(userId: string) {
  const res = await fetch(`/api/notes?uploaderId=${userId}&limit=12`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

async function toggleFollow(userId: string) {
  const res = await fetch('/api/follows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'user', followingId: userId }),
  });
  if (!res.ok) throw new Error('Failed to toggle follow');
  return res.json();
}

async function updateProfile(data: { name?: string; bio?: string }) {
  const res = await fetch('/api/auth', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return res.json();
}

// ── Stat Item ───────────────────────────────────────────────────
function StatItem({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-3 py-2">
      <div className={`rounded-lg p-1.5 ${color}`}>
        <Icon className="size-4 text-white" />
      </div>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Note Card (compact) ─────────────────────────────────────────
function ProfileNoteCard({ note, onClick }: { note: NoteCard; onClick: () => void }) {
  return (
    <motion.div
      variants={gridItem}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
        <div className={`h-1 w-full ${
          note.fileType === 'pdf' ? 'bg-red-400' :
          note.fileType === 'docx' ? 'bg-blue-400' :
          note.fileType === 'pptx' ? 'bg-orange-400' :
          note.fileType === 'md' ? 'bg-purple-400' :
          'bg-emerald-400'
        }`} />
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <div className="text-xl shrink-0">{fileTypeIcon(note.fileType)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{note.title}</h3>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {note.subject && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {note.subject.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{fileTypeLabel(note.fileType)}</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Download className="size-3" />{note.downloadCount}</span>
            <span className="flex items-center gap-0.5"><Star className="size-3 text-amber-500" />{note.avgRating > 0 ? note.avgRating.toFixed(1) : '—'}</span>
            <span className="ml-auto">{formatRelativeTime(note.createdAt)}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Achievement Card ────────────────────────────────────────────
function AchievementCard({ achievement }: { achievement: AchievementData }) {
  return (
    <motion.div variants={gridItem}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-2.5 text-emerald-600 dark:text-emerald-400">
            {achievement.icon ? (
              <span className="text-xl">{achievement.icon}</span>
            ) : (
              achievementIcon(achievement.category)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{achievement.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{achievement.description}</p>
          </div>
          <Badge variant="outline" className="text-[9px] shrink-0">
            {formatRelativeTime(achievement.unlockedAt)}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Skeletons ───────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Skeleton className="size-24 rounded-full" />
            <div className="flex-1 space-y-3 text-center md:text-left">
              <Skeleton className="h-6 w-48 mx-auto md:mx-0" />
              <Skeleton className="h-4 w-64 mx-auto md:mx-0" />
              <div className="flex gap-2 justify-center md:justify-start">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="flex justify-center md:justify-start gap-6 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Profile Page ───────────────────────────────────────────
export function ProfilePage({ userId }: { userId: string }) {
  const { user: currentUser, navigate } = useAppStore();
  const queryClient = useQueryClient();
  const isOwnProfile = currentUser?.id === userId;

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');

  // Fetch profile
  const { data: profileData, isLoading, isError } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
  });

  // Fetch user's notes
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['user-notes', userId],
    queryFn: () => fetchUserNotes(userId),
  });

  // Check follow status
  const { data: followData } = useQuery({
    queryKey: ['follow-status', userId],
    queryFn: async () => {
      const res = await fetch(`/api/follows?type=user&followingId=${userId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !isOwnProfile,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => toggleFollow(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    },
  });

  // Edit profile mutation
  const editMutation = useMutation({
    mutationFn: (data: { name: string; bio: string }) => updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      setEditOpen(false);
    },
  });

  const profile = profileData?.profile;
  const achievements: AchievementData[] = profile?.achievements ?? [];
  const recentNotes: NoteCard[] = notesData?.notes ?? [];
  const isFollowing = followData?.following ?? false;

  const handleEditOpen = () => {
    if (profile) {
      setEditName(profile.name || '');
      setEditBio(profile.bio || '');
    }
    setEditOpen(true);
  };

  const handleEditSave = () => {
    editMutation.mutate({ name: editName, bio: editBio });
  };

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
            <User className="size-8 text-destructive" />
          </div>
          <h3 className="font-semibold">Profile not found</h3>
          <p className="text-sm text-muted-foreground mt-1">This user does not exist or their profile is private.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('dashboard')}>
            Go Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Profile Header ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-0 shadow-sm overflow-hidden">
          {/* Banner */}
          <div className="h-24 md:h-32 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ1cmwoI2cpIi8+PC9zdmc+')] opacity-50" />
          </div>
          <CardContent className="p-6 pt-0 -mt-12 md:-mt-16">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
              {/* Avatar */}
              <Avatar className="size-24 md:size-32 border-4 border-background shadow-lg">
                {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
                <AvatarFallback className="text-2xl md:text-3xl font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {profile.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold">{profile.name}</h1>
                  <Badge className={`text-[10px] px-2 py-0.5 self-center ${roleBadgeColor(profile.role)}`}>
                    {profile.role.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Badge>
                </div>
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">{profile.bio}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2 justify-center md:justify-start">
                  {profile.profile?.college && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GraduationCap className="size-3" /> {profile.profile.college.name}
                    </span>
                  )}
                  {profile.profile?.department && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {profile.profile.department.name}
                    </span>
                  )}
                  {profile.profile?.semester && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="size-3" /> Semester {profile.profile.semester}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="size-3" /> Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEditOpen}>
                    <Pencil className="size-3.5" /> Edit Profile
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className={`gap-1.5 ${isFollowing ? 'bg-muted text-foreground hover:bg-muted/80' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                  >
                    {isFollowing ? <UserMinus className="size-3.5" /> : <UserPlus className="size-3.5" />}
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </Button>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Stats row */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <StatItem icon={FileText} label="Uploads" value={profile.stats?.totalNotes ?? profile.profile?.uploadCount ?? 0} color="bg-emerald-500" />
              <StatItem icon={Download} label="Downloads" value={profile.profile?.downloadCount ?? profile.stats?.totalDownloads ?? 0} color="bg-teal-500" />
              <StatItem icon={Users} label="Followers" value={profile.stats?.totalFollowers ?? profile.profile?.followerCount ?? 0} color="bg-amber-500" />
              <StatItem icon={UserPlus} label="Following" value={profile.stats?.totalFollowing ?? profile.profile?.followingCount ?? 0} color="bg-sky-500" />
              <StatItem icon={Star} label="Reputation" value={profile.profile?.reputationScore ?? 0} color="bg-rose-500" />
              <StatItem icon={TrendingUp} label="Score" value={profile.profile?.contributionScore ?? 0} color="bg-purple-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────── */}
      <Tabs defaultValue="notes">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="notes" className="gap-1.5 text-xs">
            <FileText className="size-3.5" /> Uploaded Notes
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-1.5 text-xs">
            <Award className="size-3.5" /> Achievements
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs">
            <Activity className="size-3.5" /> Activity
          </TabsTrigger>
        </TabsList>

        {/* ── Uploaded Notes Tab ───────────────────── */}
        <TabsContent value="notes" className="mt-6">
          {notesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <Skeleton className="size-6 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentNotes.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-2xl bg-muted/60 p-4 mb-4">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No notes uploaded yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isOwnProfile ? 'Share your knowledge by uploading your first note!' : 'This user hasn\'t uploaded any notes yet.'}
              </p>
              {isOwnProfile && (
                <Button size="sm" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => navigate('upload')}>
                  <Upload2Icon className="size-3.5" /> Upload Note
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div variants={gridContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentNotes.map((note) => (
                <ProfileNoteCard key={note.id} note={note} onClick={() => navigate('note-detail', { id: note.id })} />
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* ── Achievements Tab ──────────────────────── */}
        <TabsContent value="achievements" className="mt-6">
          {achievements.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-2xl bg-muted/60 p-4 mb-4">
                <Award className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No achievements yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isOwnProfile ? 'Keep contributing to unlock achievements!' : 'This user hasn\'t unlocked any achievements yet.'}
              </p>
            </motion.div>
          ) : (
            <motion.div variants={gridContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </motion.div>
          )}
        </TabsContent>

        {/* ── Activity Tab ──────────────────────────── */}
        <TabsContent value="activity" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {recentNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-2xl bg-muted/60 p-4 mb-4">
                  <Activity className="size-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold">No recent activity</h3>
                <p className="text-sm text-muted-foreground mt-1">Activity will appear here as notes are uploaded and interacted with.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((note, i) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('note-detail', { id: note.id })}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2 text-emerald-600 dark:text-emerald-400">
                          <FileText className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{note.title}</p>
                          <p className="text-xs text-muted-foreground">Uploaded {formatRelativeTime(note.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                          <span className="flex items-center gap-0.5"><Download className="size-3" />{note.downloadCount}</span>
                          <span className="flex items-center gap-0.5"><Star className="size-3 text-amber-500" />{note.avgRating > 0 ? note.avgRating.toFixed(1) : '—'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ── Edit Profile Dialog ────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bio">Bio</Label>
              <Textarea
                id="edit-bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleEditSave}
              disabled={editMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {editMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
