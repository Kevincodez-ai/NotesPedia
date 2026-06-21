'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Star,
  Eye,
  Bookmark,
  Heart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { NoteCard as NoteCardType } from '@/types';

// ── Helpers ─────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  // Guard against negative diff (server clock skew)
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
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
  const labels: Record<string, string> = {
    pdf: 'PDF', docx: 'DOCX', pptx: 'PPTX', txt: 'TXT', md: 'MD', image: 'Image',
  };
  return type ? labels[type] || type.toUpperCase() : 'FILE';
}

function fileTypeColorBar(type?: string | null) {
  switch (type) {
    case 'pdf': return 'bg-red-400';
    case 'docx': return 'bg-sky-400';
    case 'pptx': return 'bg-orange-400';
    case 'md': return 'bg-purple-400';
    case 'txt': return 'bg-gray-400';
    case 'image': return 'bg-pink-400';
    default: return 'bg-emerald-400';
  }
}

// ── Props ───────────────────────────────────────────────────────
interface NoteCardProps {
  note: NoteCardType;
  onBookmarkToggle?: (noteId: string) => void;
  onClick?: () => void;
}

// ── NoteCard Component ──────────────────────────────────────────
export function NoteCard({ note, onBookmarkToggle, onClick }: NoteCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="h-full border-0 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
        {/* File type color strip at top */}
        <div className={`h-1.5 w-full ${fileTypeColorBar(note.fileType)}`} />

        <CardContent className="p-4 space-y-3">
          {/* Thumbnail / Icon + Title area */}
          <div className="flex items-start gap-3">
            <div className="text-2xl shrink-0 mt-0.5 select-none">
              {note.thumbnailUrl ? (
                <div className="size-10 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                  <img src={note.thumbnailUrl} alt="" className="size-full object-cover" />
                </div>
              ) : (
                fileTypeIcon(note.fileType)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {note.title}
              </h3>
              {note.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                  {note.description}
                </p>
              )}
            </div>
          </div>

          {/* Badges: Subject, Semester */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.subject && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                {note.subject.name}
              </Badge>
            )}
            {note.semester && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Sem {note.semester}
              </Badge>
            )}
          </div>

          {/* Uploader info */}
          <div className="flex items-center gap-2">
            <Avatar className="size-5">
              {note.uploader.avatarUrl && <AvatarImage src={note.uploader.avatarUrl} />}
              <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {note.uploader.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground truncate">{note.uploader.name}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">
              {formatRelativeTime(note.createdAt)}
            </span>
          </div>

          {/* Tags (max 3 + count) */}
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

          {/* Stats row + Bookmark */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Download className="size-3" />{note.downloadCount}
              </span>
              <span className="flex items-center gap-0.5">
                <Star className="size-3 text-amber-500" />
                {note.avgRating > 0 ? note.avgRating.toFixed(1) : '—'}
              </span>
              <span className="flex items-center gap-0.5">
                <Eye className="size-3" />{note.viewCount}
              </span>
            </div>

            {onBookmarkToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmarkToggle(note.id);
                }}
              >
                <motion.div
                  whileTap={{ scale: 1.3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                >
                  {note.isBookmarked ? (
                    <Heart className="size-3.5 fill-emerald-500 text-emerald-500" />
                  ) : (
                    <Bookmark className="size-3.5 text-muted-foreground" />
                  )}
                </motion.div>
              </Button>
            )}
          </div>

          {/* File type label at bottom */}
          <div className="flex items-center gap-1.5 pt-0">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
              {fileTypeLabel(note.fileType)}
            </Badge>
            {note.status === 'processing' && (
              <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Processing
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── NoteCard Skeleton ───────────────────────────────────────────
export function NoteCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <div className="h-1.5 w-full bg-muted" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-md bg-muted shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-2/3 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="h-4 w-14 rounded-full bg-muted" />
          <div className="h-4 w-10 rounded-full bg-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="size-5 rounded-full bg-muted" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
        <div className="flex gap-1">
          <div className="h-4 w-12 rounded-full bg-muted" />
          <div className="h-4 w-10 rounded-full bg-muted" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <div className="h-3 w-10 bg-muted rounded" />
            <div className="h-3 w-10 bg-muted rounded" />
            <div className="h-3 w-10 bg-muted rounded" />
          </div>
          <div className="size-7 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── NoteCard Grid Skeleton ──────────────────────────────────────
export function NoteCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <NoteCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Re-export helpers for convenience ───────────────────────────
export { fileTypeIcon, fileTypeLabel, fileTypeColorBar as fileTypeColor, fileTypeColorBar, formatRelativeTime };
