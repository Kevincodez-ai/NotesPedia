'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Globe,
  Lock,
  LogOut,
  UserPlus,
  MessageSquare,
  Share2,
  BookOpen,
  X,
  Send,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { StudyGroupData } from '@/types';

// ── Animation variants ──────────────────────────────────────────
const gridContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Fetchers ────────────────────────────────────────────────────
async function fetchStudyGroups(params?: string) {
  const res = await fetch(`/api/study-groups?limit=100${params ? `&${params}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch study groups');
  return res.json();
}

async function createGroup(data: Record<string, unknown>) {
  const res = await fetch('/api/study-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create group');
  }
  return res.json();
}

async function joinLeaveGroup(groupId: string, action: 'join' | 'leave') {
  const res = await fetch('/api/study-groups', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to ${action} group`);
  }
  return res.json();
}

async function fetchSubjects() {
  const res = await fetch('/api/subjects?limit=100');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// ── Grid Skeleton ───────────────────────────────────────────────
function GroupGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Group Card ──────────────────────────────────────────────────
function GroupCard({
  group,
  onJoinLeave,
  onViewDetails,
}: {
  group: StudyGroupData & { actualMemberCount?: number };
  onJoinLeave: (groupId: string, isMember: boolean) => void;
  onViewDetails: (group: StudyGroupData) => void;
}) {
  const memberCount = group.actualMemberCount ?? group.memberCount;
  const isFull = memberCount >= group.maxMembers;
  const progressPercent = Math.min((memberCount / group.maxMembers) * 100, 100);

  return (
    <motion.div
      variants={gridItem}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer">
        {/* Top color bar */}
        <div className={`h-1.5 w-full ${group.isPublic ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <CardContent className="p-5 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`rounded-lg p-2 shrink-0 ${group.isPublic ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
              {group.isPublic ? (
                <Globe className="size-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Lock className="size-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3
                className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-primary transition-colors"
                onClick={() => onViewDetails(group)}
              >
                {group.name}
              </h3>
              {group.subject && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {group.subject.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {group.description}
            </p>
          )}

          {/* Member progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3" /> {memberCount}/{group.maxMembers} members
              </span>
              {isFull && <Badge className="text-[8px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1 py-0">Full</Badge>}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${progressPercent >= 100 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Creator */}
          <div className="flex items-center gap-2">
            <Avatar className="size-5">
              {group.creator.avatarUrl && <AvatarImage src={group.creator.avatarUrl} />}
              <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {group.creator.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground">
              by {group.creator.name}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1.5 h-8"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(group);
              }}
            >
              <BookOpen className="size-3" /> View Details
            </Button>
            <Button
              size="sm"
              className={`flex-1 text-xs gap-1.5 h-8 ${
                group.isMember
                  ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              disabled={!group.isMember && isFull}
              onClick={(e) => {
                e.stopPropagation();
                onJoinLeave(group.id, !!group.isMember);
              }}
            >
              {group.isMember ? (
                <><LogOut className="size-3" /> Leave</>
              ) : (
                <><UserPlus className="size-3" /> Join</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Group Detail Dialog ─────────────────────────────────────────
function GroupDetailDialog({
  group,
  open,
  onOpenChange,
  onJoinLeave,
}: {
  group: StudyGroupData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinLeave: (groupId: string, isMember: boolean) => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('info');

  if (!group) return null;

  const memberCount = group.memberCount;
  const isFull = memberCount >= group.maxMembers;

  // Mock messages for discussion board
  const mockMessages = [
    { id: '1', user: { name: 'Arjun Patel', avatarUrl: undefined }, content: 'Has anyone started Chapter 5 yet?', time: '2h ago' },
    { id: '2', user: { name: 'Priya Sharma', avatarUrl: undefined }, content: 'Yes! I have some good notes. Will share them here.', time: '1h ago' },
    { id: '3', user: { name: 'Rahul Kumar', avatarUrl: undefined }, content: 'Can we schedule a study session this weekend?', time: '30m ago' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {group.isPublic ? (
              <Globe className="size-4 text-emerald-600" />
            ) : (
              <Lock className="size-4 text-amber-600" />
            )}
            {group.name}
          </DialogTitle>
          <DialogDescription>{group.description || 'No description provided.'}</DialogDescription>
        </DialogHeader>

        {/* Detail tabs */}
        <div className="flex gap-1 border-b pb-0">
          {[
            { key: 'info', label: 'Info' },
            { key: 'members', label: `Members (${memberCount})` },
            { key: 'discussion', label: 'Discussion' },
            { key: 'resources', label: 'Resources' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveDetailTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                activeDetailTab === tab.key
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {activeDetailTab === 'info' && (
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Subject</p>
                  <p className="text-sm font-medium mt-0.5">{group.subject?.name || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Visibility</p>
                  <p className="text-sm font-medium mt-0.5">{group.isPublic ? 'Public' : 'Private'}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Members</p>
                  <p className="text-sm font-medium mt-0.5">{memberCount}/{group.maxMembers}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Created</p>
                  <p className="text-sm font-medium mt-0.5">{new Date(group.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-[10px] text-muted-foreground uppercase">Creator</p>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="size-6">
                    {group.creator.avatarUrl && <AvatarImage src={group.creator.avatarUrl} />}
                    <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {group.creator.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">{group.creator.name}</p>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'members' && (
            <div className="space-y-2 py-3">
              {/* Creator */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <Avatar className="size-8">
                  {group.creator.avatarUrl && <AvatarImage src={group.creator.avatarUrl} />}
                  <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {group.creator.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{group.creator.name}</p>
                  <p className="text-[10px] text-muted-foreground">Admin</p>
                </div>
                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Admin</Badge>
              </div>
              {/* Mock members */}
              {['Amit Singh', 'Neha Gupta', 'Vikram Reddy', 'Sneha Joshi'].map((name, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-[10px] text-muted-foreground">Member</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeDetailTab === 'discussion' && (
            <div className="py-3 space-y-3">
              {/* Messages */}
              {mockMessages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <Avatar className="size-6 shrink-0 mt-0.5">
                    <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">{msg.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{msg.user.name}</p>
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{msg.content}</p>
                  </div>
                </div>
              ))}

              {/* Message input */}
              <div className="flex gap-2 pt-2 border-t">
                <Input
                  className="h-8 text-xs"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      toast.success('Message sent (demo)');
                      setNewMessage('');
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="size-8 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    if (newMessage.trim()) {
                      toast.success('Message sent (demo)');
                      setNewMessage('');
                    }
                  }}
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
          )}

          {activeDetailTab === 'resources' && (
            <div className="py-3 space-y-2">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-xl bg-muted/60 p-3 mb-3">
                  <Share2 className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No shared resources yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Group members can share notes and study materials here.</p>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer actions */}
        <DialogFooter className="border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            size="sm"
            className={`gap-1.5 ${
              group.isMember
                ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            disabled={!group.isMember && isFull}
            onClick={() => {
              onJoinLeave(group.id, !!group.isMember);
              onOpenChange(false);
            }}
          >
            {group.isMember ? (
              <><LogOut className="size-3.5" /> Leave Group</>
            ) : (
              <><UserPlus className="size-3.5" /> Join Group</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Study Groups Page ──────────────────────────────────────
export function StudyGroupsPage() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailGroup, setDetailGroup] = useState<StudyGroupData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create group form
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subjectId: '',
    isPublic: true,
    maxMembers: '20',
  });

  // Fetch subjects for create form
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-study-groups'],
    queryFn: fetchSubjects,
  });

  // Fetch study groups
  const queryParams = new URLSearchParams();
  if (searchQuery.trim()) queryParams.set('q', searchQuery.trim());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['study-groups', filter, searchQuery],
    queryFn: () => fetchStudyGroups(queryParams.toString()),
  });

  const allGroups: (StudyGroupData & { actualMemberCount?: number })[] = data?.groups ?? [];
  const groups = filter === 'my'
    ? allGroups.filter((g) => g.isMember)
    : allGroups;

  // Join/Leave mutation
  const joinLeaveMutation = useMutation({
    mutationFn: ({ groupId, action }: { groupId: string; action: 'join' | 'leave' }) =>
      joinLeaveGroup(groupId, action),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      toast.success(variables.action === 'join' ? 'Joined group!' : 'Left group');
    },
    onError: (error) => toast.error(error.message),
  });

  // Create group mutation
  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-groups'] });
      setCreateDialogOpen(false);
      setNewGroup({ name: '', description: '', subjectId: '', isPublic: true, maxMembers: '20' });
      toast.success('Study group created!');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleJoinLeave = useCallback((groupId: string, isMember: boolean) => {
    joinLeaveMutation.mutate({ groupId, action: isMember ? 'leave' : 'join' });
  }, [joinLeaveMutation]);

  const handleCreateGroup = () => {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    createMutation.mutate({
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || undefined,
      subjectId: newGroup.subjectId || undefined,
      isPublic: newGroup.isPublic,
      maxMembers: parseInt(newGroup.maxMembers) || 20,
    });
  };

  const subjects = subjectsData?.subjects ?? [];

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
            <Users className="size-7 text-emerald-600" />
            Study Groups
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Collaborate with peers and study together
          </p>
        </div>
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm self-start"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="size-4" /> Create Group
        </Button>
      </motion.div>

      {/* ── Filters ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={`text-xs gap-1.5 ${filter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            onClick={() => setFilter('all')}
          >
            <Globe className="size-3.5" /> All Groups
          </Button>
          <Button
            variant={filter === 'my' ? 'default' : 'outline'}
            size="sm"
            className={`text-xs gap-1.5 ${filter === 'my' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            onClick={() => setFilter('my')}
          >
            <Users className="size-3.5" /> My Groups
          </Button>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* ── Groups Grid ────────────────────────────── */}
      {isLoading ? (
        <GroupGridSkeleton />
      ) : isError ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
            <Users className="size-8 text-destructive" />
          </div>
          <h3 className="font-semibold">Failed to load groups</h3>
          <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['study-groups'] })}>
            Retry
          </Button>
        </motion.div>
      ) : groups.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-muted/60 p-4 mb-4">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">
            {filter === 'my' ? "You haven't joined any groups" : 'No study groups yet'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {filter === 'my'
              ? 'Browse all groups and join one to start studying with peers.'
              : 'Be the first to create a study group and invite your classmates.'}
          </p>
          <Button
            size="sm"
            className="mt-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => filter === 'my' ? setFilter('all') : setCreateDialogOpen(true)}
          >
            {filter === 'my' ? (
              <><Globe className="size-4" /> Browse Groups</>
            ) : (
              <><Plus className="size-4" /> Create Group</>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {groups.map((group) => (
              <motion.div key={group.id} layout>
                <GroupCard
                  group={group}
                  onJoinLeave={handleJoinLeave}
                  onViewDetails={(g) => {
                    setDetailGroup(g);
                    setDetailOpen(true);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Create Group Dialog ────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-emerald-600" /> Create Study Group
            </DialogTitle>
            <DialogDescription>
              Start a new study group to collaborate with your peers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name *</Label>
              <Input
                id="group-name"
                value={newGroup.name}
                onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Data Structures Study Circle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-desc">Description</Label>
              <Textarea
                id="group-desc"
                value={newGroup.description}
                onChange={(e) => setNewGroup((p) => ({ ...p, description: e.target.value }))}
                placeholder="What will your group study?"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={newGroup.subjectId || 'none'}
                  onValueChange={(v) => setNewGroup((p) => ({ ...p, subjectId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subject</SelectItem>
                    {subjects.map((s: { id: string; name: string }) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-members">Max Members</Label>
                <Input
                  id="max-members"
                  type="number"
                  min={2}
                  max={200}
                  value={newGroup.maxMembers}
                  onChange={(e) => setNewGroup((p) => ({ ...p, maxMembers: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Public Group</p>
                <p className="text-xs text-muted-foreground">
                  {newGroup.isPublic ? 'Anyone can find and join this group' : 'Only invited members can join'}
                </p>
              </div>
              <Switch
                checked={newGroup.isPublic}
                onCheckedChange={(checked) => setNewGroup((p) => ({ ...p, isPublic: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              disabled={!newGroup.name.trim() || createMutation.isPending}
              onClick={handleCreateGroup}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Group Detail Dialog ────────────────────── */}
      <GroupDetailDialog
        group={detailGroup}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onJoinLeave={handleJoinLeave}
      />
    </div>
  );
}
