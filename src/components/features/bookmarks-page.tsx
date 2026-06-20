'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  BookmarkX,
  FolderPlus,
  Folder,
  Download,
  Star,
  Eye,
  FileText,
  Grid3X3,
  LayoutList,
  ArrowUpDown,
  X,
  Palette,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NoteFileType } from '@/types';

// ── Animation variants ──────────────────────────────────────────
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

// ── Folder Colors ───────────────────────────────────────────────
const FOLDER_COLORS = [
  { name: 'Emerald', value: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  { name: 'Teal', value: '#14b8a6', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  { name: 'Amber', value: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  { name: 'Rose', value: '#f43f5e', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300' },
  { name: 'Purple', value: '#a855f7', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  { name: 'Sky', value: '#0ea5e9', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300' },
  { name: 'Orange', value: '#f97316', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  { name: 'Slate', value: '#64748b', bg: 'bg-slate-100 dark:bg-slate-900/30', text: 'text-slate-700 dark:text-slate-300' },
];

// ── Fetchers ────────────────────────────────────────────────────
async function fetchBookmarks(params?: string) {
  const res = await fetch(`/api/bookmarks?limit=100${params ? `&${params}` : ''}`);
  if (!res.ok) throw new Error('Failed to fetch bookmarks');
  return res.json();
}

async function createFolder(name: string, color: string) {
  const res = await fetch('/api/bookmarks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'createFolder', name, color }),
  });
  if (!res.ok) throw new Error('Failed to create folder');
  return res.json();
}

async function removeBookmark(noteId: string) {
  const res = await fetch(`/api/bookmarks?noteId=${noteId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove bookmark');
  return res.json();
}

// ── Bookmark Card ───────────────────────────────────────────────
interface BookmarkNote {
  id: string;
  title: string;
  description?: string;
  fileType?: NoteFileType;
  thumbnailUrl?: string;
  subject?: { id: string; name: string };
  college?: { id: string; name: string };
  downloadCount: number;
  avgRating: number;
  ratingCount: number;
  uploader: { id: string; name: string; avatarUrl?: string };
  tags: string[];
}

interface BookmarkItem {
  id: string;
  noteId: string;
  folderId?: string | null;
  createdAt: string;
  folder?: { id: string; name: string; color?: string; icon?: string } | null;
  note: BookmarkNote;
}

function BookmarkCard({ bookmark, onRemove, onClick }: { bookmark: BookmarkItem; onRemove: () => void; onClick: () => void }) {
  const note = bookmark.note;
  return (
    <motion.div
      variants={gridItem}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group relative">
        <div className={`h-1 w-full ${
          note.fileType === 'pdf' ? 'bg-red-400' :
          note.fileType === 'docx' ? 'bg-blue-400' :
          note.fileType === 'pptx' ? 'bg-orange-400' :
          note.fileType === 'md' ? 'bg-purple-400' :
          'bg-emerald-400'
        }`} />
        <CardContent className="p-4 space-y-3">
          {/* Remove button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 size-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <BookmarkX className="size-3.5 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Bookmark</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove &quot;{note.title}&quot; from your bookmarks?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={(e) => { e.stopPropagation(); onRemove(); }} className="bg-destructive hover:bg-destructive/90">
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0 mt-0.5">{fileTypeIcon(note.fileType)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors pr-6">
                {note.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {note.subject && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {note.subject.name}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                  {fileTypeLabel(note.fileType)}
                </Badge>
              </div>
            </div>
          </div>

          {note.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{note.description}</p>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <Avatar className="size-5">
              {note.uploader.avatarUrl && <AvatarImage src={note.uploader.avatarUrl} />}
              <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {note.uploader.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground truncate">{note.uploader.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{formatRelativeTime(bookmark.createdAt)}</span>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-0.5"><Download className="size-3" />{note.downloadCount}</span>
            <span className="flex items-center gap-0.5"><Star className="size-3 text-amber-500" />{note.avgRating > 0 ? note.avgRating.toFixed(1) : '—'}</span>
            <span className="flex items-center gap-0.5"><Eye className="size-3" />0</span>
          </div>

          {/* Folder badge */}
          {bookmark.folder && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Folder className="size-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{bookmark.folder.name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Bookmark Grid Skeleton ──────────────────────────────────────
function BookmarkGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <div className="h-1 w-full bg-muted" />
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-10 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
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

// ── Main Bookmarks Page ─────────────────────────────────────────
export function BookmarksPage() {
  const { navigate } = useAppStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState(FOLDER_COLORS[0].value);

  // Fetch bookmarks
  const { data: bookmarksData, isLoading, isError } = useQuery({
    queryKey: ['bookmarks', selectedFolderId],
    queryFn: () => fetchBookmarks(selectedFolderId ? `folderId=${selectedFolderId}` : undefined),
  });

  const bookmarks: BookmarkItem[] = bookmarksData?.bookmarks ?? [];
  const folders: { id: string; name: string; color?: string; icon?: string; _count?: { bookmarks: number }; bookmarkCount?: number }[] = bookmarksData?.folders ?? [];
  const total = bookmarksData?.total ?? 0;

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) => createFolder(name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      setCreateFolderOpen(false);
      setFolderName('');
      setFolderColor(FOLDER_COLORS[0].value);
    },
  });

  // Remove bookmark mutation
  const removeBookmarkMutation = useMutation({
    mutationFn: (noteId: string) => removeBookmark(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });

  // Sort bookmarks
  const sortedBookmarks = [...bookmarks].sort((a, b) => {
    if (sortBy === 'title') return a.note.title.localeCompare(b.note.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleCreateFolder = () => {
    if (!folderName.trim()) return;
    createFolderMutation.mutate({ name: folderName.trim(), color: folderColor });
  };

  const getFolderColorStyle = (color?: string | null) => {
    const found = FOLDER_COLORS.find((c) => c.value === color);
    return found || FOLDER_COLORS[0];
  };

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
            <Bookmark className="size-7 text-emerald-600" />
            Bookmarks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} saved note${total !== 1 ? 's' : ''}` : 'Save notes for quick access'}
          </p>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date Added</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedFolderId(null); }}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="gap-1.5 text-xs">
            <Grid3X3 className="size-3.5" />
            All Bookmarks
          </TabsTrigger>
          <TabsTrigger value="folders" className="gap-1.5 text-xs">
            <Folder className="size-3.5" />
            By Folder
          </TabsTrigger>
        </TabsList>

        {/* ── All Bookmarks Tab ─────────────────────── */}
        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <BookmarkGridSkeleton />
          ) : isError ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
                <FileText className="size-8 text-destructive" />
              </div>
              <h3 className="font-semibold">Failed to load bookmarks</h3>
              <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['bookmarks'] })}>
                Retry
              </Button>
            </motion.div>
          ) : sortedBookmarks.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-2xl bg-muted/60 p-4 mb-4">
                <Bookmark className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No bookmarks yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Start bookmarking notes while browsing to build your personal collection.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => navigate('notes')}
              >
                Browse Notes
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
                {sortedBookmarks.map((bookmark) => (
                  <motion.div key={bookmark.id} layout>
                    <BookmarkCard
                      bookmark={bookmark}
                      onClick={() => navigate('note-detail', { id: bookmark.noteId })}
                      onRemove={() => removeBookmarkMutation.mutate(bookmark.noteId)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </TabsContent>

        {/* ── By Folder Tab ─────────────────────────── */}
        <TabsContent value="folders" className="mt-6 space-y-6">
          {/* Create Folder Dialog */}
          <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <FolderPlus className="size-4" />
                Create Folder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Bookmark Folder</DialogTitle>
                <DialogDescription>Organize your bookmarks into custom folders.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="e.g., Exam Prep, Machine Learning"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Palette className="size-3.5" /> Color
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setFolderColor(color.value)}
                        className={`size-8 rounded-full border-2 transition-all ${folderColor === color.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateFolder}
                  disabled={!folderName.trim() || createFolderMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {createFolderMutation.isPending ? 'Creating...' : 'Create Folder'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Folder List */}
          {folders.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-2xl bg-muted/60 p-4 mb-4">
                <Folder className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No folders yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Create folders to organize your bookmarks by subject, topic, or purpose.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((folder) => {
                const colorStyle = getFolderColorStyle(folder.color);
                const bookmarkCount = folder._count?.bookmarks ?? folder.bookmarkCount ?? 0;
                const isSelected = selectedFolderId === folder.id;

                return (
                  <motion.div
                    key={folder.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}
                      onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                    >
                      <div className="h-1 w-full" style={{ backgroundColor: folder.color || FOLDER_COLORS[0].value }} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${colorStyle.bg}`}>
                            <Folder className={`size-5 ${colorStyle.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{folder.name}</h3>
                            <p className="text-xs text-muted-foreground">{bookmarkCount} bookmark{bookmarkCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Bookmarks in selected folder */}
          {selectedFolderId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Bookmarks in folder
                </h3>
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setSelectedFolderId(null)}>
                  <X className="size-3" /> Clear selection
                </Button>
              </div>
              {isLoading ? (
                <BookmarkGridSkeleton />
              ) : sortedBookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No bookmarks in this folder yet.</p>
                </div>
              ) : (
                <motion.div
                  variants={gridContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {sortedBookmarks.map((bookmark) => (
                    <motion.div key={bookmark.id} layout>
                      <BookmarkCard
                        bookmark={bookmark}
                        onClick={() => navigate('note-detail', { id: bookmark.noteId })}
                        onRemove={() => removeBookmarkMutation.mutate(bookmark.noteId)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
