'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  Sparkles,
  CloudUpload,
  Tag,
  Plus,
  ArrowRight,
  File,
  ImageIcon,
  FileType2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { NoteFileType } from '@/types';

// ── Animation variants ──────────────────────────────────────────
const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Helpers ─────────────────────────────────────────────────────
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  switch (type) {
    case 'pdf': return <FileType2 className="size-8 text-red-500" />;
    case 'docx': return <FileText className="size-8 text-blue-500" />;
    case 'pptx': return <FileText className="size-8 text-orange-500" />;
    case 'txt': return <File className="size-8 text-gray-500" />;
    case 'md': return <FileText className="size-8 text-purple-500" />;
    case 'image': return <ImageIcon className="size-8 text-emerald-500" />;
    default: return <File className="size-8 text-muted-foreground" />;
  }
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.pptx,.txt,.md,.jpg,.jpeg,.png,.gif,.webp';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ── Fetchers ────────────────────────────────────────────────────
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

// ── Main Upload Page ────────────────────────────────────────────
export function UploadPage() {
  const { navigate } = useAppStore();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [semester, setSemester] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'creating' | 'success' | 'error'>('idle');
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch subjects and colleges
  const { data: subjectsData } = useQuery({ queryKey: ['upload-subjects'], queryFn: fetchSubjects });
  const { data: collegesData } = useQuery({ queryKey: ['upload-colleges'], queryFn: fetchColleges });

  const subjects = subjectsData?.subjects ?? [];
  const colleges = collegesData?.colleges ?? [];

  // ── Drag & Drop Handlers ────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.size > MAX_FILE_SIZE) {
        setErrorMessage('File size exceeds 50MB limit');
        return;
      }
      setFile(droppedFile);
      setErrorMessage('');
      // Auto-fill title from filename
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  }, [title]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        setErrorMessage('File size exceeds 50MB limit');
        return;
      }
      setFile(selectedFile);
      setErrorMessage('');
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    }
  }, [title]);

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Tag Handling ────────────────────────────────────
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // ── Submit Upload ───────────────────────────────────
  const handleSubmit = async () => {
    if (!file || !title.trim()) return;

    setUploadStage('uploading');
    setErrorMessage('');

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        let errData;
        try {
          errData = await uploadRes.json();
        } catch {
          throw new Error(`Upload failed (HTTP ${uploadRes.status}). The server may be experiencing an issue.`);
        }
        throw new Error(errData.error || 'Upload failed');
      }

      setUploadStage('creating');

      const uploadData = await uploadRes.json();

      // Step 2: Create note record
      const noteRes = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          subjectId: subjectId || undefined,
          collegeId: collegeId || undefined,
          semester: semester ? parseInt(semester) : undefined,
          tags,
          filePath: uploadData.filePath || undefined,
          storageKey: uploadData.storageKey || undefined,
          fileType: uploadData.fileType || undefined,
          fileSize: uploadData.fileSize || undefined,
          extractedText: uploadData.extractedText || undefined,
          previewText: uploadData.extractedText?.slice(0, 500) || undefined,
        }),
      });

      if (!noteRes.ok) {
        let errData;
        try {
          errData = await noteRes.json();
        } catch {
          throw new Error(`Failed to create note (HTTP ${noteRes.status})`);
        }
        // Note creation failed — try to clean up the orphaned uploaded file
        if (uploadData.filePath) {
          try {
            await fetch('/api/upload', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: uploadData.filePath }),
            });
          } catch { /* cleanup failed, that's okay */ }
        }
        throw new Error(errData.error || 'Failed to create note');
      }

      const noteData = await noteRes.json();
      setCreatedNoteId(noteData.note.id);
      setUploadStage('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      setUploadStage('error');
    }
  };

  const canSubmit = file && title.trim() && uploadStage === 'idle';

  // ── Success State ───────────────────────────────────
  if (uploadStage === 'success') {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
            className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4 inline-flex"
          >
            <CheckCircle2 className="size-12 text-emerald-600" />
          </motion.div>
          <h2 className="text-2xl font-bold">Upload Successful!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your note has been uploaded and is now being processed by our AI.
          </p>

          <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 mt-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/50 p-2">
                  <Sparkles className="size-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">AI Processing In Progress</p>
                  <p className="text-xs text-muted-foreground">Generating summaries, flashcards, and MCQs...</p>
                </div>
              </div>
              <div className="mt-3">
                <Progress value={30} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-1">This usually takes 1-2 minutes</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-3 pt-2">
            {createdNoteId && (
              <Button
                onClick={() => navigate('note-detail', { id: createdNoteId })}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                View Note <ArrowRight className="size-4" />
              </Button>
            )}
            <Button variant="outline" onClick={() => {
              setUploadStage('idle');
              setFile(null);
              setTitle('');
              setDescription('');
              setSubjectId('');
              setCollegeId('');
              setSemester('');
              setTags([]);
              setCreatedNoteId(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}>
              Upload Another
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Upload Note</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share your academic notes and let AI generate study materials automatically.
        </p>
      </motion.div>

      {/* ── Upload Progress ─────────────────────────── */}
      <AnimatePresence>
        {uploadStage !== 'idle' && uploadStage !== 'success' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {uploadStage === 'error' ? (
                    <X className="size-5 text-destructive" />
                  ) : (
                    <Loader2 className="size-5 text-primary animate-spin" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {uploadStage === 'uploading' && 'Uploading file...'}
                      {uploadStage === 'creating' && 'Creating note record...'}
                      {uploadStage === 'error' && 'Upload failed'}
                    </p>
                    {uploadStage !== 'error' && (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </div>
                {uploadStage === 'error' && errorMessage && (
                  <p className="text-sm text-destructive mt-2">{errorMessage}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Drop Zone ───────────────────────────────── */}
      <motion.div variants={fadeIn} initial="hidden" animate="show">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
            isDragging
              ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
              : file
                ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/10'
                : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-background p-3 shadow-sm border">
                  {getFileIcon(file.name.split('.').pop()?.toLowerCase() || '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeFile(); }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-10 md:p-14 text-center space-y-3">
              <motion.div
                animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                className="inline-flex rounded-2xl bg-muted/60 p-4"
              >
                <CloudUpload className="size-10 text-muted-foreground" />
              </motion.div>
              <div>
                <p className="font-medium">
                  {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or <span className="text-primary underline underline-offset-2">browse files</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {['PDF', 'DOCX', 'PPTX', 'TXT', 'MD', 'Images'].map((type) => (
                  <Badge key={type} variant="secondary" className="text-[10px] font-normal">{type}</Badge>
                ))}
                <span className="text-[10px] text-muted-foreground">Max 50MB</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Form Fields ─────────────────────────────── */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="Enter a descriptive title for your note"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="description"
            placeholder="Briefly describe what this note covers..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>

        {/* Subject, College, Semester row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s: { id: string; name: string }) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* College */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">College</Label>
            <Select value={collegeId} onValueChange={setCollegeId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select college" />
              </SelectTrigger>
              <SelectContent>
                {colleges.map((c: { id: string; name: string }) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Semester */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Semester</Label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tags</Label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="h-10"
            />
            <Button
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={addTag}
              disabled={!tagInput.trim() || tags.length >= 10}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  #{tag}
                  <button
                    className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Add up to 10 tags to help others discover your note.</p>
        </div>
      </motion.div>

      {/* ── Submit ──────────────────────────────────── */}
      <motion.div variants={fadeIn} initial="hidden" animate="show" className="pt-2">
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm px-8"
          >
            {uploadStage !== 'idle' ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="size-4" /> Upload Note
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            AI will automatically generate summaries, flashcards &amp; quizzes
          </p>
        </div>
        {!file && title.trim() && (
          <p className="text-xs text-amber-600 mt-2">Please select a file to upload.</p>
        )}
        {errorMessage && uploadStage === 'idle' && (
          <p className="text-xs text-destructive mt-2">{errorMessage}</p>
        )}
      </motion.div>
    </div>
  );
}
