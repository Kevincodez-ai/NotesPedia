'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  SlidersHorizontal,
  Download,
  Star,
  Eye,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  FileText,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

// ── Local Storage for recent searches ───────────────────────────
const RECENT_KEY = 'notespedia-recent-searches';

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query.trim());
    recent.unshift(query.trim());
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
  } catch {
    // Silently fail
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // Silently fail
  }
}

// ── Fetchers ────────────────────────────────────────────────────
async function fetchSearch(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/search?${qs}`);
  if (!res.ok) throw new Error('Failed to search');
  return res.json();
}

async function fetchColleges() {
  const res = await fetch('/api/colleges?limit=100');
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function fetchSubjects() {
  const res = await fetch('/api/subjects?limit=100');
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

// ── Main Search Page ────────────────────────────────────────────
export function SearchPage() {
  const { navigate, searchQuery: storeQuery, setSearchQuery } = useAppStore();
  const queryClient = useQueryClient();

  // Search state — storeQuery is the source of truth, inputValue mirrors it
  const [inputValue, setInputValue] = useState(storeQuery || '');
  const [debouncedQuery, setDebouncedQuery] = useState(storeQuery || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collegeId, setCollegeId] = useState<string>('_all');
  const [departmentId, setDepartmentId] = useState<string>('_all');
  const [subjectId, setSubjectId] = useState<string>('_all');
  const [semester, setSemester] = useState<string>('_all');
  const [fileType, setFileType] = useState<string>('_all');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [page, setPage] = useState(1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const limit = 12;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce input → trigger search
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
      setPage(1);
    }, 300);
  }, [setSearchQuery]);

  // Clear search
  const handleClear = useCallback(() => {
    setInputValue('');
    setDebouncedQuery('');
    setSearchQuery('');
    setPage(1);
  }, [setSearchQuery]);

  // Submit search (Enter key)
  const handleSubmit = useCallback(() => {
    if (debouncedQuery.trim()) {
      addRecentSearch(debouncedQuery);
      setRecentSearches(getRecentSearches());
    }
  }, [debouncedQuery]);

  // Click recent search
  const handleRecentClick = useCallback((query: string) => {
    setInputValue(query);
    setDebouncedQuery(query);
    setSearchQuery(query);
    setPage(1);
  }, [setSearchQuery]);

  // Fetch trending subjects (most popular by note count)
  const { data: trendingData } = useQuery({
    queryKey: ['trending-subjects'],
    queryFn: async () => {
      const res = await fetch('/api/subjects?limit=8');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });
  const trendingTags: string[] = (trendingData?.subjects ?? [])
    .filter((s: { actualNoteCount?: number; noteCount?: number }) => (s.actualNoteCount ?? s.noteCount ?? 0) > 0)
    .map((s: { name: string }) => s.name)
    .slice(0, 8);

  // Fetch colleges & subjects for filters
  const { data: collegesData } = useQuery({
    queryKey: ['search-colleges'],
    queryFn: fetchColleges,
  });
  const { data: subjectsData } = useQuery({
    queryKey: ['search-subjects'],
    queryFn: fetchSubjects,
  });

  // Build search query params
  const hasActiveQuery = debouncedQuery.trim().length > 0;
  const queryParams: Record<string, string> = {
    q: debouncedQuery.trim(),
    page: String(page),
    limit: String(limit),
    sortBy,
  };
  if (collegeId && collegeId !== '_all') queryParams.collegeId = collegeId;
  if (departmentId && departmentId !== '_all') queryParams.departmentId = departmentId;
  if (subjectId && subjectId !== '_all') queryParams.subjectId = subjectId;
  if (semester && semester !== '_all') queryParams.semester = semester;
  if (fileType && fileType !== '_all') queryParams.fileType = fileType;

  // Fetch search results
  const { data: searchData, isLoading, isError } = useQuery({
    queryKey: ['search', queryParams],
    queryFn: () => fetchSearch(queryParams),
    enabled: hasActiveQuery,
  });

  const notes: NoteCard[] = searchData?.notes ?? [];
  const totalPages: number = searchData?.totalPages ?? 1;
  const total: number = searchData?.total ?? 0;
  const hasFilters = collegeId !== '_all' || departmentId !== '_all' || subjectId !== '_all' || semester !== '_all' || fileType !== '_all';

  // Bookmark handler
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
      toast.error('Failed to update bookmark. Please try again.');
    }
  }, [queryClient]);

  const clearFilters = () => {
    setCollegeId('_all');
    setDepartmentId('_all');
    setSubjectId('_all');
    setSemester('_all');
    setFileType('_all');
    setSortBy('relevance');
    setPage(1);
  };

  const clearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Departments for selected college
  const departments = (collegesData?.colleges ?? []).find(
    (c: { id: string }) => c.id === collegeId
  )?.departments ?? [];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Header & Search Input ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Search Notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Find academic resources across all colleges and subjects</p>
        </div>

        {/* Large search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Search notes by title, description, or content..."
            className="h-12 pl-12 pr-12 text-base rounded-xl border-2 focus:border-emerald-500 dark:focus:border-emerald-400 transition-colors"
          />
          {inputValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full hover:bg-muted"
              onClick={handleClear}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Collapsible Filter Panel ───────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="size-4" />
                Filters
                {hasFilters && (
                  <Badge className="ml-1 size-5 p-0 text-[10px] flex items-center justify-center bg-emerald-600 text-white">
                    {[collegeId !== '_all', departmentId !== '_all', subjectId !== '_all', semester !== '_all', fileType !== '_all'].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={clearFilters}>
                <X className="size-3" /> Clear filters
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <Card className="mt-3 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* College */}
                  <Select value={collegeId} onValueChange={(v) => { setCollegeId(v); setDepartmentId('_all'); setPage(1); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="College" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Colleges</SelectItem>
                      {(collegesData?.colleges ?? []).map((c: { id: string; name: string }) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Department */}
                  <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Departments</SelectItem>
                      {departments.map((d: { id: string; name: string }) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

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
                        <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                      ))}
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

                  {/* Sort By */}
                  <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="downloads">Downloads</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="views">Views</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* ── No Active Query State ──────────────────── */}
      {!hasActiveQuery && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Recent Searches</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearRecent}>
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((query) => (
                  <motion.button
                    key={query}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRecentClick(query)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 hover:bg-muted text-xs font-medium transition-colors"
                  >
                    <Clock className="size-3 text-muted-foreground" />
                    {query}
                  </motion.button>
                ))}
              </div>
            </section>
          )}

          {/* Trending Tags */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="size-4 text-emerald-600" />
              <h2 className="text-sm font-semibold">Trending Topics</h2>
              <Sparkles className="size-3.5 text-amber-500" />
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <motion.button
                  key={tag}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleRecentClick(tag)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium transition-colors border border-emerald-200 dark:border-emerald-800"
                >
                  <TrendingUp className="size-3" />
                  {tag}
                </motion.button>
              ))}
            </div>
          </section>

          {/* Search prompt */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-6 mb-4">
              <Search className="size-10 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg">Search for Notes</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Type a keyword above to search across thousands of academic notes, summaries, and study materials.
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Search Results ─────────────────────────── */}
      {hasActiveQuery && (
        <>
          {/* Result count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between"
          >
            <div className="text-sm text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-32 inline-block" />
              ) : (
                <>
                  <span className="font-semibold text-foreground">{total}</span>
                  {' '}result{total !== 1 ? 's' : ''} for &quot;{debouncedQuery}&quot;
                </>
              )}
            </div>
          </motion.div>

          {/* Results grid */}
          {isLoading ? (
            <NoteGridSkeleton />
          ) : isError ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
                <FileText className="size-8 text-destructive" />
              </div>
              <h3 className="font-semibold">Search failed</h3>
              <p className="text-sm text-muted-foreground mt-1">Something went wrong. Please try again.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['search'] })}>
                Retry
              </Button>
            </motion.div>
          ) : notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="rounded-2xl bg-muted/60 p-4 mb-4">
                <Search className="size-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No results found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Try different keywords, remove some filters, or check your spelling.
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={clearFilters}>
                  <X className="size-3.5" /> Clear Filters
                </Button>
              )}
            </motion.div>
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

          {/* Pagination */}
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
        </>
      )}
    </div>
  );
}
