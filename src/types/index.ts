// ============================================================
// Core Types for NotesPedia
// ============================================================

// User Roles
export type UserRole = 'guest' | 'student' | 'verified_student' | 'contributor' | 'moderator' | 'admin' | 'super_admin';

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

// Navigation Types
export type PageName =
  | 'landing'
  | 'dashboard'
  | 'login'
  | 'signup'
  | 'profile'
  | 'notes'
  | 'note-detail'
  | 'upload'
  | 'bookmarks'
  | 'notifications'
  | 'leaderboard'
  | 'search'
  | 'study-groups'
  | 'admin'
  | 'settings'
  | 'features'
  | 'pricing'
  | 'college'
  | 'subject';

export interface PageParams {
  id?: string;
  tab?: string;
  query?: string;
  filters?: Record<string, string>;
}

// Note Types
export type NoteFileType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'md' | 'image';
export type NoteStatus = 'active' | 'processing' | 'flagged' | 'removed' | 'draft';

export interface NoteCard {
  id: string;
  title: string;
  description?: string;
  fileType?: NoteFileType;
  thumbnailUrl?: string;
  subject?: { id: string; name: string };
  college?: { id: string; name: string };
  department?: { id: string; name: string };
  semester?: number;
  uploader: { id: string; name: string; avatarUrl?: string };
  downloadCount: number;
  viewCount: number;
  bookmarkCount: number;
  avgRating: number;
  ratingCount: number;
  tags: string[];
  createdAt: string;
  status: NoteStatus;
  isBookmarked?: boolean;
  userRating?: number | null;
}

export interface NoteDetail extends NoteCard {
  filePath?: string;
  fileSize?: number;
  previewText?: string;
  extractedText?: string;
  version: number;
  isPublic: boolean;
  qualityScore: number;
  commentCount: number;
  aiSummary?: AISummaryData;
  flashcards: FlashcardData[];
  mcqs: MCQData[];
  comments: CommentData[];
  isBookmarked?: boolean;
  userRating?: number;
  versions: { id: string; version: number; changeLog?: string; createdAt: string }[];
}

export interface AISummaryData {
  summary: string;
  keywords: string[];
  concepts: string[];
  learningObjectives: string[];
  importantQuestions: string[];
}

export interface FlashcardData {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface MCQData {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string;
  order: number;
}

// Comment Types
export interface CommentData {
  id: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
  replies?: CommentData[];
}

// Search Types
export interface SearchFilters {
  query?: string;
  collegeId?: string;
  departmentId?: string;
  subjectId?: string;
  semester?: string;
  fileType?: string;
  sortBy?: 'relevance' | 'date' | 'downloads' | 'rating' | 'views';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  notes: NoteCard[];
  total: number;
  page: number;
  totalPages: number;
}

// Bookmark Types
export interface BookmarkFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  bookmarkCount: number;
}

// Notification Types
export type NotificationType = 'comment' | 'rating' | 'follow' | 'download' | 'mention' | 'system' | 'achievement';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// Profile Types
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  college?: { id: string; name: string };
  department?: { id: string; name: string };
  semester?: number;
  contributionScore: number;
  reputationScore: number;
  uploadCount: number;
  downloadCount: number;
  followerCount: number;
  followingCount: number;
  noteCount: number;
  achievements: AchievementData[];
  isFollowing?: boolean;
}

export interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  unlockedAt: string;
}

// Study Group Types
export interface StudyGroupData {
  id: string;
  name: string;
  description?: string;
  subject?: { id: string; name: string };
  college?: { id: string; name: string };
  creator: { id: string; name: string; avatarUrl?: string };
  isPublic: boolean;
  memberCount: number;
  maxMembers: number;
  isMember?: boolean;
  createdAt: string;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  totalNotes: number;
  totalDownloads: number;
  totalColleges: number;
  pendingReports: number;
  activeUsersToday: number;
  newNotesToday: number;
}

// College Types
export interface CollegeData {
  id: string;
  name: string;
  shortName?: string;
  city?: string;
  state?: string;
  country?: string;
  type?: string;
  logoUrl?: string;
  isVerified: boolean;
  noteCount: number;
  followerCount: number;
}

// Subject Types
export interface SubjectData {
  id: string;
  name: string;
  code?: string;
  semester?: number;
  department?: { id: string; name: string };
  college?: { id: string; name: string };
  noteCount: number;
  followerCount: number;
  isFollowing?: boolean;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  user: { id: string; name: string; avatarUrl?: string };
  reputationScore: number;
  contributionScore: number;
  uploadCount: number;
  college?: { name: string };
}
