'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Download,
  Star,
  Eye,
  Bookmark,
  Filter,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Upload,
  X,
  SlidersHorizontal,
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
import { Input } from '@/components/ui/input';
import type { NoteCard, NoteFileType } from '@/types';
import { formatRelativeTime, fileTypeIcon, fileTypeLabel, fileTypeColor } from '@/components/features/note-card';

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
async function fetchNotes(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/notes?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
}

async function fetchSubjects() {
  const res = await fetch('/api/subjects?limit=100');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function fetchColleges() {
  const res = await fetch('/api/colleges?limit=100');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// ── Note Card ───────────────────────────────────────────────────
function NoteCardItem({ note, onClick, onBookmark }: { note: NoteCard; onClick: () => void; onBookmark: (e: React.MouseEvent) => void }) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
        {/* Color bar at top based on file type */}
        <div className={`h-1 w-full ${fileTypeColor(note.fileType)}`} />
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0 mt-0.5">{fileTypeIcon(note.fileType)}</div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {note.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {note.subject && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {note.subject.name}
                  </Badge>
                )}
                {note.semester && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Sem {note.semester}
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

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                  #{tag}
                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <Avatar className="size-5">
              {note.uploader.avatarUrl && <AvatarImage src={note.uploader.avatarUrl} />}
              <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {note.uploader.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground truncate">{note.uploader.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{formatRelativeTime(note.createdAt)}</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><Download className="size-3" />{note.downloadCount}</span>
              <span className="flex items-center gap-0.5"><Star className="size-3 text-amber-500" />{note.avgRating > 0 ? note.avgRating.toFixed(1) : '—'}</span>
              <span className="flex items-center gap-0.5"><Eye className="size-3" />{note.viewCount}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              onClick={onBookmark}
            >
              <Bookmark className={`size-3.5 ${note.isBookmarked ? 'fill-emerald-500 text-emerald-500' : 'text-muted-foreground'}`} />
            </Button>
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
      {Array.from({ length: 9 }).map((_, i) => (
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
function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="rounded-2xl bg-muted/60 p-4 mb-4">
        {hasFilters ? (
          <Filter className="size-8 text-muted-foreground" />
        ) : (
          <FileText className="size-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-semibold">{hasFilters ? 'No notes match your filters' : 'No notes yet'}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        {hasFilters
          ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
          : 'Be the first to upload notes and share knowledge with your peers.'}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onClear}>
          <X className="size-3.5" /> Clear Filters
        </Button>
      )}
    </motion.div>
  );
}

// ── Main Notes Page ─────────────────────────────────────────────
export function NotesPage() {
  const { navigate } = useAppStore();
  const queryClient = useQueryClient();

  // Filter state
  const [subjectId, setSubjectId] = useState<string>('_all');
  const [semester, setSemester] = useState<string>('_all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [fileType, setFileType] = useState<string>('_all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Fetch subjects and colleges for filters
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-filter'],
    queryFn: fetchSubjects,
  });
  const { data: collegesData } = useQuery({
    queryKey: ['colleges-filter'],
    queryFn: fetchColleges,
  });

  // Build query params
  const queryParams: Record<string, string> = {
    page: String(page),
    limit: String(limit),
    sortBy,
  };
  if (subjectId && subjectId !== '_all') queryParams.subjectId = subjectId;
  if (semester && semester !== '_all') queryParams.semester = semester;
  if (fileType && fileType !== '_all') queryParams.fileType = fileType;
  if (searchQuery) queryParams.q = searchQuery;

  // Fetch notes
  const { data: notesData, isLoading, isError } = useQuery({
    queryKey: ['notes', queryParams],
    queryFn: () => fetchNotes(queryParams),
  });

  const notes: NoteCard[] = notesData?.notes ?? [];
  const totalPages: number = notesData?.totalPages ?? 1;
  const total: number = notesData?.total ?? 0;
  const hasFilters = subjectId !== '_all' || semester !== '_all' || fileType !== '_all' || searchQuery.trim() !== '';

  const handleBookmark = useCallback(async (e: React.MouseEvent, note: NoteCard) => {
    e.stopPropagation();
    try {
      if (note.isBookmarked) {
        await fetch(`/api/bookmarks?noteId=${note.id}`, { method: 'DELETE' });
      } else {
        await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId: note.id }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    } catch {
      // Silently fail
    }
  }, [queryClient]);

  const clearFilters = () => {
    setSubjectId('_all');
    setSemester('_all');
    setSortBy('date');
    setFileType('_all');
    setSearchQuery('');
    setPage(1);
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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Browse Notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total > 0 ? `${total} notes available` : 'Discover academic resources'}
          </p>
        </div>
        <Button onClick={() => navigate('upload')} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm self-start">
          <Upload className="size-4" /> Upload Note
        </Button>
      </motion.div>

      {/* ── Filter Bar ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="ml-auto text-xs h-7 gap-1" onClick={clearFilters}>
                  <X className="size-3" /> Clear all
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {/* Search */}
              <div className="col-span-2 sm:col-span-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="h-9 text-xs pl-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Subject */}
              <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Subjects</SelectItem>
                  {(subjectsData?.subjects ?? []).map((s: { id: string; name: string }) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Semester */}
              <Select value={semester} onValueChange={(v) => { setSemester(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Newest First</SelectItem>
                  <SelectItem value="downloads">Most Downloads</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="views">Most Viewed</SelectItem>
                </SelectContent>
              </Select>

              {/* File Type */}
              <Select value={fileType} onValueChange={(v) => { setFileType(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="File type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="pptx">PPTX</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                  <SelectItem value="md">Markdown</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Notes Grid ─────────────────────────────── */}
      {isLoading ? (
        <NoteGridSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
            <FileText className="size-8 text-destructive" />
          </div>
          <h3 className="font-semibold">Failed to load notes</h3>
          <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
        </div>
      ) : notes.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <motion.div
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {notes.map((note) => (
              <motion.div key={note.id} variants={gridItem} layout>
                <NoteCardItem
                  note={note}
                  onClick={() => navigate('note-detail', { id: note.id })}
                  onBookmark={(e) => handleBookmark(e, note)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Pagination ─────────────────────────────── */}
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
          <div className="flex items-center gap-1 px-2">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'ghost'}
                  size="sm"
                  className={`size-8 p-0 text-xs ${page === pageNum ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
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
    </div>
  );
}
