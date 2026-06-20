'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  MessageSquare,
  Star,
  UserPlus,
  Download,
  AtSign,
  Settings,
  Trophy,
  Check,
  CheckCheck,
  Filter,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { NotificationType, NotificationData } from '@/types';

// ── Animation variants ──────────────────────────────────────────
const listContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};
const listItem = {
  hidden: { opacity: 0, x: -15 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, x: 15, transition: { duration: 0.2 } },
};

// ── Helpers ─────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'comment': return <MessageSquare className="size-4" />;
    case 'rating': return <Star className="size-4" />;
    case 'follow': return <UserPlus className="size-4" />;
    case 'download': return <Download className="size-4" />;
    case 'mention': return <AtSign className="size-4" />;
    case 'system': return <Settings className="size-4" />;
    case 'achievement': return <Trophy className="size-4" />;
    default: return <Bell className="size-4" />;
  }
}

function notificationColor(type: NotificationType) {
  switch (type) {
    case 'comment': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
    case 'rating': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'follow': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
    case 'download': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'mention': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
    case 'system': return 'bg-muted text-muted-foreground';
    case 'achievement': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

function typeLabel(type: NotificationType) {
  const labels: Record<NotificationType, string> = {
    comment: 'Comments',
    rating: 'Ratings',
    follow: 'Follows',
    download: 'Downloads',
    mention: 'Mentions',
    system: 'System',
    achievement: 'Achievements',
  };
  return labels[type] || type;
}

// ── Fetchers ────────────────────────────────────────────────────
async function fetchNotifications(params?: string) {
  const res = await fetch(`/api/notifications?limit=30${params ? `&${params}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

async function markAsRead(notificationId: string) {
  const res = await fetch('/api/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId }),
  });
  if (!res.ok) throw new Error('Failed to mark as read');
  return res.json();
}

async function markAllAsRead() {
  const res = await fetch('/api/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markAll: true }),
  });
  if (!res.ok) throw new Error('Failed to mark all as read');
  return res.json();
}

// ── Notification Item ───────────────────────────────────────────
function NotificationItem({
  notification,
  onRead,
  onClick,
}: {
  notification: NotificationData;
  onRead: () => void;
  onClick: () => void;
}) {
  const handleClick = () => {
    if (!notification.isRead) onRead();
    onClick();
  };

  return (
    <motion.div
      variants={listItem}
      exit="exit"
      layout
    >
      <Card
        className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
          !notification.isRead ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-l-2 border-l-emerald-500' : ''
        }`}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`rounded-lg p-2 shrink-0 ${notificationColor(notification.type)}`}>
              {notificationIcon(notification.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-sm font-medium leading-snug ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {notification.title}
                </h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!notification.isRead && (
                    <div className="size-2 rounded-full bg-emerald-500" />
                  )}
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(notification.createdAt)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  {typeLabel(notification.type)}
                </Badge>
              </div>
            </div>

            {/* Mark as read button */}
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-50 dark:hover:bg-emerald-900/20 shrink-0"
                onClick={(e) => { e.stopPropagation(); onRead(); }}
                title="Mark as read"
              >
                <Check className="size-3.5 text-emerald-600" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Notification Skeleton ───────────────────────────────────────
function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Notifications Page ─────────────────────────────────────
export function NotificationsPage() {
  const { navigate } = useAppStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build query params based on active tab
  const getNotificationParams = useCallback(() => {
    let params = `page=${page}&limit=${limit}`;
    if (activeTab === 'unread') params += '&unread=true';
    else if (activeTab !== 'all') params += `&type=${activeTab}`;
    return params;
  }, [activeTab, page]);

  // Fetch notifications
  const { data: notifsData, isLoading, isError } = useQuery({
    queryKey: ['notifications', activeTab, page],
    queryFn: () => fetchNotifications(getNotificationParams()),
  });

  const notifications: NotificationData[] = notifsData?.notifications ?? [];
  const total: number = notifsData?.total ?? 0;
  const unreadCount: number = notifsData?.unreadCount ?? 0;
  const totalPages: number = notifsData?.totalPages ?? 1;

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Handle notification click
  const handleNotificationClick = useCallback((notification: NotificationData) => {
    if (notification.link) {
      // Parse link to navigate (e.g., /users/123 -> profile, /notes/123 -> note-detail)
      const link = notification.link;
      if (link.includes('/users/')) {
        const userId = link.split('/users/')[1]?.split('/')[0];
        if (userId) navigate('profile', { id: userId });
      } else if (link.includes('/notes/')) {
        const noteId = link.split('/notes/')[1]?.split('/')[0];
        if (noteId) navigate('note-detail', { id: noteId });
      }
    }
  }, [navigate]);

  // Filter tabs
  const filterTabs = [
    { value: 'all', label: 'All', icon: Bell },
    { value: 'unread', label: 'Unread', icon: BellOff },
    { value: 'comment', label: 'Comments', icon: MessageSquare },
    { value: 'rating', label: 'Ratings', icon: Star },
    { value: 'follow', label: 'Follows', icon: UserPlus },
    { value: 'system', label: 'System', icon: Settings },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* ── Header ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="size-7 text-emerald-600" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-emerald-600 text-white text-xs px-2">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Stay updated with your latest activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Filter Tabs ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-muted/50 w-full sm:w-auto">
              {filterTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1 text-xs px-2.5">
                  <tab.icon className="size-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.value === 'unread' && unreadCount > 0 && (
                    <Badge className="ml-0.5 size-4 p-0 text-[8px] flex items-center justify-center bg-emerald-600 text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <NotificationSkeleton />
            ) : isError ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
                  <Bell className="size-8 text-destructive" />
                </div>
                <h3 className="font-semibold">Failed to load notifications</h3>
                <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications'] })}>
                  Retry
                </Button>
              </motion.div>
            ) : notifications.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-2xl bg-muted/60 p-4 mb-4">
                  {activeTab === 'unread' ? (
                    <BellOff className="size-8 text-muted-foreground" />
                  ) : (
                    <Bell className="size-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-semibold">
                  {activeTab === 'unread' ? 'All caught up!' : 'No notifications'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {activeTab === 'unread'
                    ? 'You have no unread notifications. Check back later!'
                    : activeTab === 'all'
                    ? 'You don\'t have any notifications yet. They\'ll appear here when there\'s activity on your content.'
                    : `No ${filterTabs.find(t => t.value === activeTab)?.label.toLowerCase()} notifications yet.`}
                </p>
              </motion.div>
            ) : (
              <>
                <motion.div
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  <AnimatePresence mode="popLayout">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={() => markReadMutation.mutate(notification.id)}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* Pagination / Load More */}
                {totalPages > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center pt-4"
                  >
                    {page < totalPages ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronDown className="size-4" />
                        Load More
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">You&apos;ve seen all notifications</p>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
