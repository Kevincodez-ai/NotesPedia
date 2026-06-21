'use client';

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  Bookmark,
  BookmarkCheck,
  Star,
  Eye,
  Share2,
  Calendar,
  BookOpen,
  Sparkles,
  Brain,
  HelpCircle,
  MessageSquare,
  History,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Send,
  Clock,
  Tag,
  GraduationCap,
  Building2,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Trophy,
  FileText,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import type { NoteDetail, CommentData, FlashcardData, MCQData } from '@/types';
import { toast } from 'sonner';
import { formatRelativeTime as formatRelativeTimeBase } from '@/components/features/note-card';

// ── Animation variants ──────────────────────────────────────────
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Helpers ─────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const formatRelativeTime = formatRelativeTimeBase;

function formatFileSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Fetchers ────────────────────────────────────────────────────
async function fetchNote(noteId: string) {
  const res = await fetch(`/api/notes/${noteId}`);
  if (!res.ok) throw new Error('Failed to fetch note');
  return res.json();
}

// ── Rating Stars ────────────────────────────────────────────────
function RatingWidget({ noteId, currentRating, avgRating, ratingCount }: { noteId: string; currentRating: number | null; avgRating: number; ratingCount: number }) {
  const queryClient = useQueryClient();
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(currentRating);

  const rateMutation = useMutation({
    mutationFn: async (value: number) => {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, value }),
      });
      if (!res.ok) throw new Error('Failed to rate');
      return res.json();
    },
    onSuccess: (_, value) => {
      setUserRating(value);
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    },
  });

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} stars`}
            className="p-0.5 hover:scale-125 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => !rateMutation.isPending && rateMutation.mutate(star)}
            disabled={rateMutation.isPending}
          >
            <Star
              className={`size-5 ${
                (hoverRating || userRating) >= star
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/40'
              }`}
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'} {ratingCount > 0 && `(${ratingCount})`}
      </span>
    </div>
  );
}

// ── Flashcard Deck ──────────────────────────────────────────────
function FlashcardDeck({ flashcards }: { flashcards: FlashcardData[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-2xl bg-muted/60 p-4 mb-4"><Brain className="size-8 text-muted-foreground" /></div>
        <h3 className="font-semibold">No flashcards yet</h3>
        <p className="text-sm text-muted-foreground mt-1">AI-generated flashcards will appear here after processing.</p>
      </div>
    );
  }

  const card = flashcards[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Card {currentIndex + 1} of {flashcards.length}</span>
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => { setFlipped(false); setCurrentIndex(0); }}>
          <RotateCcw className="size-3" /> Restart
        </Button>
      </div>

      <motion.div
        className="min-h-[220px] cursor-pointer perspective-1000"
        onClick={() => setFlipped(!flipped)}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIndex}-${flipped}`}
            initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className={`border-2 ${flipped ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/30' : 'border-primary/20 bg-card'}`}>
              <CardContent className="p-6 md:p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                <div className="mb-3">
                  {flipped ? (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 mb-2">
                      Answer
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mb-2">Question</Badge>
                  )}
                </div>
                <p className="text-base md:text-lg leading-relaxed font-medium">
                  {flipped ? card.answer : card.question}
                </p>
                {!flipped && (
                  <p className="text-xs text-muted-foreground mt-4">Click to reveal answer</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => { setFlipped(false); setCurrentIndex((i) => i - 1); }}
          className="gap-1"
        >
          <ChevronLeft className="size-4" /> Previous
        </Button>
        <Progress value={((currentIndex + 1) / flashcards.length) * 100} className="flex-1 max-w-32 h-2" />
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === flashcards.length - 1}
          onClick={() => { setFlipped(false); setCurrentIndex((i) => i + 1); }}
          className="gap-1"
        >
          Next <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ── MCQ Quiz ────────────────────────────────────────────────────
function MCQQuiz({ mcqs }: { mcqs: MCQData[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  if (mcqs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-2xl bg-muted/60 p-4 mb-4"><HelpCircle className="size-8 text-muted-foreground" /></div>
        <h3 className="font-semibold">No quiz questions yet</h3>
        <p className="text-sm text-muted-foreground mt-1">AI-generated MCQs will appear here after processing.</p>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / mcqs.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
        <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4 inline-flex">
          <Trophy className="size-10 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold">Quiz Complete!</h3>
        <p className="text-muted-foreground">You scored <span className="font-bold text-primary">{score}</span> out of <span className="font-bold">{mcqs.length}</span></p>
        <div className="max-w-48 mx-auto">
          <Progress value={percentage} className="h-3" />
          <p className="text-sm text-muted-foreground mt-1">{percentage}% correct</p>
        </div>
        <Button
          onClick={() => {
            setCurrentIndex(0);
            setSelectedAnswer(null);
            setShowResult(false);
            setScore(0);
            setAnswered(0);
            setQuizComplete(false);
          }}
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <RotateCcw className="size-4" /> Try Again
        </Button>
      </motion.div>
    );
  }

  const mcq = mcqs[currentIndex];
  const options = [
    { key: 'A', text: mcq.optionA },
    { key: 'B', text: mcq.optionB },
    { key: 'C', text: mcq.optionC },
    { key: 'D', text: mcq.optionD },
  ];
  const isCorrect = selectedAnswer === mcq.correctAnswer;

  const handleSelect = (key: string) => {
    if (showResult) return;
    setSelectedAnswer(key);
    setShowResult(true);
    setAnswered((a) => a + 1);
    if (key === mcq.correctAnswer) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIndex === mcqs.length - 1) {
      setQuizComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Question {currentIndex + 1} of {mcqs.length}</span>
        <span className="text-sm font-medium text-primary">Score: {score}/{answered}</span>
      </div>

      <Progress value={((currentIndex + 1) / mcqs.length) * 100} className="h-2" />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 md:p-6">
          <h3 className="font-semibold text-base leading-relaxed mb-5">{mcq.question}</h3>
          <div className="space-y-2.5">
            {options.map((opt) => {
              let optionClass = 'border-2 hover:border-primary/40 hover:bg-primary/5 cursor-pointer';
              if (showResult) {
                if (opt.key === mcq.correctAnswer) {
                  optionClass = 'border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30';
                } else if (opt.key === selectedAnswer && opt.key !== mcq.correctAnswer) {
                  optionClass = 'border-2 border-destructive bg-destructive/5';
                } else {
                  optionClass = 'border-2 border-muted opacity-50 cursor-not-allowed';
                }
              } else if (selectedAnswer === opt.key) {
                optionClass = 'border-2 border-primary bg-primary/5';
              }

              return (
                <motion.button
                  key={opt.key}
                  type="button"
                  whileHover={!showResult ? { scale: 1.01 } : undefined}
                  whileTap={!showResult ? { scale: 0.99 } : undefined}
                  className={`w-full text-left rounded-xl px-4 py-3 transition-all ${optionClass}`}
                  onClick={() => handleSelect(opt.key)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      showResult && opt.key === mcq.correctAnswer
                        ? 'bg-emerald-500 text-white'
                        : showResult && opt.key === selectedAnswer
                          ? 'bg-destructive text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {showResult && opt.key === mcq.correctAnswer ? (
                        <CheckCircle2 className="size-4" />
                      ) : showResult && opt.key === selectedAnswer ? (
                        <XCircle className="size-4" />
                      ) : (
                        opt.key
                      )}
                    </span>
                    <span className="text-sm">{opt.text}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {showResult && mcq.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-lg bg-muted/50"
            >
              <p className="text-xs text-muted-foreground"><span className="font-medium">Explanation:</span> {mcq.explanation}</p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {showResult && (
        <div className="flex justify-end">
          <Button onClick={handleNext} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            {currentIndex === mcqs.length - 1 ? 'See Results' : 'Next Question'} <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Comments Section ────────────────────────────────────────────
function CommentsSection({ noteId, comments: initialComments }: { noteId: string; comments: CommentData[] }) {
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const commentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId, content, parentId }),
      });
      if (!res.ok) throw new Error('Failed to comment');
      return res.json();
    },
    onSuccess: () => {
      setCommentText('');
      setReplyText('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Add comment form */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Textarea
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-[80px] resize-none border-0 bg-muted/30 focus-visible:ring-1"
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              disabled={!commentText.trim() || commentMutation.isPending}
              onClick={() => commentMutation.mutate({ content: commentText })}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="size-3.5" /> {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments list */}
      {initialComments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <MessageSquare className="size-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initialComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              noteId={noteId}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              commentMutation={commentMutation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  noteId,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  commentMutation,
}: {
  comment: CommentData;
  noteId: string;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  commentMutation: ReturnType<typeof useMutation>;
}) {
  const queryClient = useQueryClient();
  const { user } = useAppStore();
  const isReplying = replyingTo === comment.id;

  // Edit comment state
  const [editingComment, setEditingComment] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isCommentOwner = user?.id === comment.user.id;
  const isAdminOrModerator = user ? ['admin', 'super_admin', 'moderator'].includes(user.role) : false;
  const canModifyComment = isCommentOwner || isAdminOrModerator;

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to edit comment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      setEditingComment(false);
      setEditContent('');
      toast.success('Comment updated');
    },
    onError: (error) => toast.error(error.message),
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete comment');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      setDeleteDialogOpen(false);
      toast.success('Comment deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleStartEdit = () => {
    setEditContent(comment.content);
    setEditingComment(true);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) return;
    editCommentMutation.mutate({ commentId: comment.id, content: editContent.trim() });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="size-8 shrink-0">
              {comment.user.avatarUrl && <AvatarImage src={comment.user.avatarUrl} />}
              <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {comment.user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.user.name}</span>
                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
                {comment.isEdited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
              </div>

              {editingComment ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!editContent.trim() || editCommentMutation.isPending}
                      onClick={handleSaveEdit}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                    >
                      {editCommentMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => { setEditingComment(false); setEditContent(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{comment.content}</p>
              )}

              {!editingComment && (
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-muted-foreground gap-1 px-0"
                    onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                  >
                    <MessageSquare className="size-3" /> Reply
                  </Button>

                  {canModifyComment && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-muted-foreground gap-1 px-0">
                          <MoreHorizontal className="size-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {isCommentOwner && (
                          <DropdownMenuItem onClick={handleStartEdit}>
                            <Pencil className="size-3.5 mr-2" />
                            Edit Comment
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          Delete Comment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}

              {/* Reply form */}
              {isReplying && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 space-y-2">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[60px] resize-none text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!replyText.trim() || commentMutation.isPending}
                      onClick={() => commentMutation.mutate({ content: replyText, parentId: comment.id })}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs"
                    >
                      <Send className="size-3" /> Reply
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Cancel</Button>
                  </div>
                </motion.div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
                  {comment.replies.map((reply) => (
                    <ReplyItem key={reply.id} reply={reply} noteId={noteId} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Comment Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCommentMutation.isPending}
              onClick={() => deleteCommentMutation.mutate(comment.id)}
            >
              {deleteCommentMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

// ── Reply Item with edit/delete ─────────────────────────────────
function ReplyItem({ reply, noteId }: { reply: CommentData; noteId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  const [editingReply, setEditingReply] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isReplyOwner = user?.id === reply.user.id;
  const isAdminOrModerator = user ? ['admin', 'super_admin', 'moderator'].includes(user.role) : false;
  const canModifyReply = isReplyOwner || isAdminOrModerator;

  const editReplyMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, content }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to edit reply');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      setEditingReply(false);
      setEditContent('');
      toast.success('Reply updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments?commentId=${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete reply');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      setDeleteDialogOpen(false);
      toast.success('Reply deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <>
      <div className="flex items-start gap-2">
        <Avatar className="size-6 shrink-0">
          {reply.user.avatarUrl && <AvatarImage src={reply.user.avatarUrl} />}
          <AvatarFallback className="text-[9px] bg-muted">
            {reply.user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium">{reply.user.name}</span>
            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(reply.createdAt)}</span>
            {reply.isEdited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
            {canModifyReply && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-5 ml-1">
                    <MoreHorizontal className="size-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {isReplyOwner && (
                    <DropdownMenuItem onClick={() => { setEditContent(reply.content); setEditingReply(true); }}>
                      <Pencil className="size-3.5 mr-2" />
                      Edit Reply
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-3.5 mr-2" />
                    Delete Reply
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {editingReply ? (
            <div className="mt-1 space-y-1.5">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[40px] resize-none text-xs"
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  disabled={!editContent.trim() || editReplyMutation.isPending}
                  onClick={() => editReplyMutation.mutate({ commentId: reply.id, content: editContent.trim() })}
                  className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white h-6 text-[10px] px-2"
                >
                  {editReplyMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => { setEditingReply(false); setEditContent(''); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed">{reply.content}</p>
          )}
        </div>
      </div>

      {/* Delete Reply Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reply</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reply? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteReplyMutation.isPending}
              onClick={() => deleteReplyMutation.mutate(reply.id)}
            >
              {deleteReplyMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── AI Summary Section ──────────────────────────────────────────
function AISummarySection({ summary }: { summary: NonNullable<NoteDetail['aiSummary']> }) {
  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/50 p-1.5">
            <Sparkles className="size-4 text-emerald-600" />
          </div>
          AI-Generated Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{summary.summary}</p>

        {summary.keywords.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Tag className="size-3" /> Keywords
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {summary.keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{kw}</Badge>
              ))}
            </div>
          </div>
        )}

        {summary.concepts.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <Lightbulb className="size-3" /> Key Concepts
            </h4>
            <ul className="space-y-1">
              {summary.concepts.map((concept, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-emerald-500 mt-1 shrink-0">•</span>
                  {concept}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.learningObjectives.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <GraduationCap className="size-3" /> Learning Objectives
            </h4>
            <ul className="space-y-1">
              {summary.learningObjectives.map((obj, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.importantQuestions.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <HelpCircle className="size-3" /> Important Questions
            </h4>
            <ul className="space-y-1">
              {summary.importantQuestions.map((q, i) => (
                <li key={i} className="text-sm flex items-start gap-2 text-foreground/80">
                  <span className="text-amber-500 font-mono text-xs mt-0.5 shrink-0">Q{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Detail Page Skeleton ────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <Skeleton className="h-6 w-24" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-60 w-full" />
    </div>
  );
}

// ── Main Note Detail Page ───────────────────────────────────────
export function NoteDetailPage({ noteId }: { noteId: string }) {
  const { navigate, user } = useAppStore();
  const queryClient = useQueryClient();

  // Edit note dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    tags: '',
    isPublic: true,
  });

  // Delete note dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch note detail
  const { data, isLoading, isError } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => fetchNote(noteId),
  });

  const note: NoteDetail | null = data?.note ?? null;

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (shouldBookmark: boolean) => {
      if (shouldBookmark) {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ noteId }),
        });
        if (!res.ok) throw new Error('Failed');
        return res.json();
      } else {
        const res = await fetch(`/api/bookmarks?noteId=${noteId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    },
  });

  // Edit note mutation
  const editNoteMutation = useMutation({
    mutationFn: async (formData: typeof editForm) => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
          isPublic: formData.isPublic,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update note');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      setEditDialogOpen(false);
      toast.success('Note updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete note');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Note deleted successfully');
      navigate('notes');
    },
    onError: (error) => toast.error(error.message),
  });

  const isNoteOwner = user?.id === note?.uploader?.id;
  const isAdminOrModerator = user ? ['admin', 'super_admin', 'moderator'].includes(user.role) : false;

  if (isLoading) return <DetailSkeleton />;

  if (isError || !note) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-2xl bg-destructive/10 p-4 mb-4"><FileText className="size-8 text-destructive" /></div>
          <h2 className="text-lg font-semibold">Note not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This note may have been removed or doesn&apos;t exist.</p>
          <Button variant="outline" className="mt-4 gap-1.5" onClick={() => navigate('notes')}>
            <ArrowLeft className="size-4" /> Back to Notes
          </Button>
        </div>
      </div>
    );
  }

  const isBookmarked = note.isBookmarked ?? false;

  const handleOpenEdit = () => {
    setEditForm({
      title: note.title,
      description: note.description || '',
      tags: note.tags.join(', '),
      isPublic: note.isPublic,
    });
    setEditDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Back Button ──────────────────────────────── */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => navigate('notes')}>
          <ArrowLeft className="size-4" /> Back to Notes
        </Button>
      </motion.div>

      {/* ── Header Section ───────────────────────────── */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" className="space-y-4">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">{note.title}</h1>
            {note.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">{note.description}</p>
            )}
          </div>

          {/* Uploader info & stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                {note.uploader.avatarUrl && <AvatarImage src={note.uploader.avatarUrl} />}
                <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {note.uploader.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{note.uploader.name}</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="size-3" /> {formatDate(note.createdAt)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3" /> {note.viewCount} views
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="size-3" /> {note.downloadCount} downloads
            </span>
            {note.fileSize && (
              <span className="text-xs text-muted-foreground">{formatFileSize(note.fileSize)}</span>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {note.subject && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 gap-1">
                <BookOpen className="size-3" /> {note.subject.name}
              </Badge>
            )}
            {note.college && (
              <Badge variant="outline" className="gap-1">
                <Building2 className="size-3" /> {note.college.name}
              </Badge>
            )}
            {note.semester && (
              <Badge variant="outline">Semester {note.semester}</Badge>
            )}
            {note.fileType && (
              <Badge variant="secondary" className="font-mono uppercase">{note.fileType}</Badge>
            )}
            {note.status === 'processing' && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800">
                ⏳ AI Processing
              </Badge>
            )}
          </div>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">#{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            onClick={async () => {
              try {
                const res = await fetch(`/api/download/${note.id}`);
                if (!res.ok) {
                  const data = await res.json().catch(() => null);
                  toast.error(data?.error || 'Download failed — no file available for this note');
                  return;
                }
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const disposition = res.headers.get('Content-Disposition');
                const match = disposition?.match(/filename="?(.+?)"?$/);
                a.download = match?.[1] || `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success('Download started!');
              } catch {
                toast.error('Download failed — please try again');
              }
            }}
          >
            <Download className="size-4" /> Download
          </Button>
          <Button
            variant="outline"
            className={`gap-2 ${isBookmarked ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400' : ''}`}
            onClick={() => bookmarkMutation.mutate(!isBookmarked)}
            disabled={bookmarkMutation.isPending}
          >
            {isBookmarked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => {
            const message = `Check out '${note.title}' on NotesPedia!`;
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(message).then(() => {
                toast.success('Link copied to clipboard!');
              }).catch(() => {
                toast.error('Failed to copy');
              });
            } else {
              // Fallback for non-secure contexts
              const textArea = document.createElement('textarea');
              textArea.value = message;
              textArea.style.position = 'fixed';
              textArea.style.left = '-9999px';
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                toast.success('Link copied to clipboard!');
              } catch {
                toast.error('Failed to copy');
              }
              document.body.removeChild(textArea);
            }
          }}>
            <Share2 className="size-4" /> Share
          </Button>

          {/* Edit & Delete - only for owner or admin/moderator */}
          {(isNoteOwner || isAdminOrModerator) && (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleOpenEdit}
              >
                <Pencil className="size-4" /> Edit
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Rate this note:</span>
          <RatingWidget noteId={noteId} currentRating={note.userRating} avgRating={note.avgRating} ratingCount={note.ratingCount} />
        </div>
      </motion.div>

      <Separator />

      {/* ── Tabbed Content ───────────────────────────── */}
      <motion.div variants={fadeIn} initial="hidden" animate="show">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="size-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Brain className="size-3.5" /> Flashcards {note.flashcards.length > 0 && `(${note.flashcards.length})`}
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <HelpCircle className="size-3.5" /> MCQ Quiz {note.mcqs.length > 0 && `(${note.mcqs.length})`}
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <MessageSquare className="size-3.5" /> Comments {note.commentCount > 0 && `(${note.commentCount})`}
            </TabsTrigger>
            <TabsTrigger value="versions" className="gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <History className="size-3.5" /> Versions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* AI Summary */}
            {note.aiSummary && <AISummarySection summary={note.aiSummary} />}

            {/* Preview Text */}
            {note.previewText && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" /> Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-[20]">{note.previewText}</p>
                </CardContent>
              </Card>
            )}

            {!note.aiSummary && !note.previewText && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-2xl bg-muted/60 p-4 mb-4"><Sparkles className="size-8 text-muted-foreground" /></div>
                <h3 className="font-semibold">AI Processing In Progress</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Our AI is analyzing this note to generate summaries, flashcards, and quiz questions. Check back soon!
                </p>
              </div>
            )}
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards">
            <FlashcardDeck flashcards={note.flashcards} />
          </TabsContent>

          {/* MCQ Quiz Tab */}
          <TabsContent value="quiz">
            <MCQQuiz mcqs={note.mcqs} />
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <CommentsSection noteId={noteId} comments={note.comments} />
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                    <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 p-1.5">
                      <FileText className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Version {note.version} (Current)</p>
                      <p className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</p>
                    </div>
                  </div>
                  {(!note.versions || (note as Record<string, unknown>).versions === undefined) && note.version <= 1 && (
                    <p className="text-sm text-muted-foreground text-center py-4">This is the first version of this note.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Edit Note Dialog ────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
            <DialogDescription>
              Update your note details. Changes will create a new version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-note-title">Title *</Label>
              <Input
                id="edit-note-title"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Note title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note-desc">Description</Label>
              <Textarea
                id="edit-note-desc"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the note"
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-note-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-note-tags"
                value={editForm.tags}
                onChange={(e) => setEditForm((p) => ({ ...p, tags: e.target.value }))}
                placeholder="e.g., machine-learning, python, algorithms"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!editForm.title.trim() || editNoteMutation.isPending}
              onClick={() => editNoteMutation.mutate(editForm)}
            >
              {editNoteMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Note Confirmation ────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{note.title}&quot;? This action cannot be undone. The note will be soft-deleted and removed from public view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNoteMutation.isPending}
              onClick={() => deleteNoteMutation.mutate()}
            >
              {deleteNoteMutation.isPending ? 'Deleting...' : 'Delete Note'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
