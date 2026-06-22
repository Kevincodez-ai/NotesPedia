'use client';

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { NoteCard, NoteFileType } from '@/types';
import { NoteCard as NoteCardComponent, NoteCardGridSkeleton } from '@/components/features/note-card';

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

// ── Empty State ─────────────────────────────────────────────────
const EmptyState = memo(function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
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
          ? "Try adjusting your filters or search terms to find what you're looking for."
          : 'Be the first to upload notes and share knowledge with your peers.'}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onClear}>
          <X className="size-3.5" /> Clear Filters
        </Button>
      )}
    </motion.div>
  );
});

// ── Main Notes Page ─────────────────────────────────────────────
export function NotesPage() {
  const { navigate } = useAppStore();
  const queryClient = useQueryClient();

  // Filter state
  const [subjectId, setSubjectId] = useState<string>('_all');
  const [semester, setSemester] = useState<string>('_all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [fileType, setFileType] = useState<string>('_all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookmarkingRef = useRef<Set<string>>(new Set());

  // Debounce search input → search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Fetch subjects and colleges for filters — staleTime: Infinity since they rarely change
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-filter'],
    queryFn: fetchSubjects,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  });
  const { data: collegesData } = useQuery({
    queryKey: ['colleges-filter'],
    queryFn: fetchColleges,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
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

  // Fetch notes — keepPreviousData prevents the skeleton flash between pages
  const { data: notesData, isLoading, isError, isFetching } = useQuery({
    queryKey: ['notes', queryParams],
    queryFn: () => fetchNotes(queryParams),
    placeholderData: keepPreviousData,
  });

  const notes: NoteCard[] = notesData?.notes ?? [];
  const totalPages: number = notesData?.totalPages ?? 1;
  const total: number = notesData?.total ?? 0;
  const hasFilters = subjectId !== '_all' || semester !== '_all' || fileType !== '_all' || searchQuery.trim() !== '';

  const handleBookmark = useCallback(async (noteId: string) => {
    // Prevent rapid double-clicks
    if (bookmarkingRef.current.has(noteId)) return;
    bookmarkingRef.current.add(noteId);

    const note = notes.find((n) => n.id === noteId);
    if (!note) { bookmarkingRef.current.delete(noteId); return; }

    try {
      if (note.isBookmarked) {
        const res = await fetch(`/api/bookmarks?noteId=${noteId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
      } else {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId }),
        });
        if (!res.ok) throw new Error('Failed');
      }
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    } catch {
      toast.error('Failed to update bookmark. Please try again.');
    } finally {
      bookmarkingRef.current.delete(noteId);
    }
  }, [notes, queryClient]);

  const clearFilters = useCallback(() => {
    setSubjectId('_all');
    setSemester('_all');
    setSortBy('date');
    setFileType('_all');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  }, []);

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
            {isFetching && !isLoading && (
              <span className="ml-2 text-xs text-primary animate-pulse">Refreshing…</span>
            )}
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
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="h-9 text-xs pl-8"
                  />
                  {searchInput && (
                    <button
                      onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1); }}
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
        <NoteCardGridSkeleton count={9} />
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
                <NoteCardComponent
                  note={note}
                  onClick={() => navigate('note-detail', { id: note.id })}
                  onBookmarkToggle={handleBookmark}
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
