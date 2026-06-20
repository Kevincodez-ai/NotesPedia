'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import {
  Settings,
  User,
  Lock,
  Bell,
  Palette,
  Camera,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

// ── Fetchers ────────────────────────────────────────────────────
async function fetchUserProfile() {
  const res = await fetch('/api/auth');
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

async function updateProfile(data: Record<string, unknown>) {
  const res = await fetch('/api/auth', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update profile');
  }
  return res.json();
}

async function changePassword(data: { currentPassword: string; newPassword: string }) {
  const res = await fetch('/api/auth', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'changePassword', ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to change password');
  }
  return res.json();
}

async function deleteAccount() {
  const res = await fetch('/api/auth', {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete account');
  }
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

// ── Profile Settings Tab ────────────────────────────────────────
function ProfileTab() {
  const { user, setUser } = useAppStore();
  const queryClient = useQueryClient();

  // Track which fields the user has manually edited
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const markEdited = (field: string) => setEdited((prev) => new Set(prev).add(field));

  const { data: collegesData } = useQuery({
    queryKey: ['settings-colleges'],
    queryFn: fetchColleges,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['settings-subjects'],
    queryFn: fetchSubjects,
  });

  // Fetch full profile to get bio, college, etc.
  const { data: profileData } = useQuery({
    queryKey: ['user-profile-settings'],
    queryFn: async () => {
      const res = await fetch('/api/users/me');
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Derive form values: use local state if edited, otherwise server data
  const serverUser = profileData?.user;
  const [nameState, setNameState] = useState(user?.name || '');
  const [bioState, setBioState] = useState('');
  const [collegeIdState, setCollegeIdState] = useState('');
  const [departmentIdState, setDepartmentIdState] = useState('');
  const [semesterState, setSemesterState] = useState('');
  const [avatarUrlState, setAvatarUrlState] = useState(user?.avatarUrl || '');

  const name = edited.has('name') ? nameState : (serverUser?.name || user?.name || nameState);
  const bio = edited.has('bio') ? bioState : (serverUser?.bio || '');
  const collegeId = edited.has('collegeId') ? collegeIdState : (serverUser?.collegeId || '');
  const departmentId = edited.has('departmentId') ? departmentIdState : (serverUser?.departmentId || '');
  const semester = edited.has('semester') ? semesterState : (serverUser?.semester ? String(serverUser.semester) : '');
  const avatarUrl = edited.has('avatarUrl') ? avatarUrlState : (serverUser?.avatarUrl || user?.avatarUrl || '');

  const setName = (v: string) => { setNameState(v); markEdited('name'); };
  const setBio = (v: string) => { setBioState(v); markEdited('bio'); };
  const setCollegeId = (v: string) => { setCollegeIdState(v); markEdited('collegeId'); };
  const setDepartmentId = (v: string) => { setDepartmentIdState(v); markEdited('departmentId'); };
  const setSemester = (v: string) => { setSemesterState(v); markEdited('semester'); };
  const setAvatarUrl = (v: string) => { setAvatarUrlState(v); markEdited('avatarUrl'); };

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateProfile(data),
    onSuccess: (data) => {
      if (data.user) {
        setUser(data.user);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile-settings'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    updateMutation.mutate({
      name: name.trim(),
      bio: bio.trim(),
      collegeId: collegeId || undefined,
      departmentId: departmentId || undefined,
      semester: semester ? parseInt(semester) : undefined,
      avatarUrl: avatarUrl || undefined,
    });
  };

  const colleges = collegesData?.colleges ?? [];
  const departments = subjectsData?.subjects ?? [];

  return (
    <div className="space-y-6">
      {/* Avatar section */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="size-20 ring-2 ring-emerald-200 dark:ring-emerald-800">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="text-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {name.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera className="size-5 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{name || 'Your Name'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Paste avatar URL..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile form */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4 text-emerald-600" /> Personal Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Display Name *</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-semester">Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger id="settings-semester">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-bio">Bio</Label>
            <Textarea
              id="settings-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground">{bio.length}/200 characters</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>College</Label>
              <Select value={collegeId || 'none'} onValueChange={setCollegeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select college" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {colleges.map((c: { id: string; name: string }) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId || 'none'} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {departments.map((d: { id: string; name: string }) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="size-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Account Settings Tab ────────────────────────────────────────
function AccountTab() {
  const { user, setUser } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailValue, setEmailValue] = useState(user?.email || '');

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    },
    onError: (error) => toast.error(error.message),
  });

  const emailMutation = useMutation({
    mutationFn: (email: string) => updateProfile({ email }),
    onSuccess: (data) => {
      if (data.user) setUser(data.user);
      toast.success('Email updated successfully');
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success('Account deleted');
      setUser(null);
      useAppStore.getState().navigate('landing');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  const passwordStrength = newPassword.length === 0 ? 0 : newPassword.length < 6 ? 1 : newPassword.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400'];
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong'];

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="size-4 text-emerald-600" /> Change Password
          </CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </Button>
            </div>
            {newPassword.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength ? strengthColors[passwordStrength] : 'bg-muted'}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">{strengthLabels[passwordStrength]}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-destructive">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleChangePassword}
              disabled={passwordMutation.isPending}
            >
              <Lock className="size-4" />
              {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-emerald-600" /> Email Address
          </CardTitle>
          <CardDescription>Update your email address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-email">Email</Label>
            <div className="flex gap-2">
              <Input
                id="settings-email"
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="your@email.com"
              />
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                onClick={() => {
                  if (emailValue !== user?.email) {
                    emailMutation.mutate(emailValue);
                  }
                }}
                disabled={emailMutation.isPending || emailValue === user?.email}
              >
                {emailMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" /> Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5 shrink-0">
                  <Trash2 className="size-3.5" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                  <Label>Type &quot;DELETE&quot; to confirm</Label>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirm('')}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (deleteConfirm === 'DELETE') {
                        deleteMutation.mutate();
                      } else {
                        toast.error('Please type DELETE to confirm');
                      }
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={deleteConfirm !== 'DELETE' || deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Notification Settings Tab ───────────────────────────────────
function NotificationsTab() {
  const [notifications, setNotifications] = useState({
    emailComments: true,
    emailRatings: true,
    emailFollows: true,
    emailDownloads: false,
    emailSystem: true,
    inAppComments: true,
    inAppRatings: true,
    inAppFollows: true,
    inAppDownloads: true,
    inAppMentions: true,
    inAppAchievements: true,
    inAppSystem: true,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateProfile({ notificationPreferences: data }),
    onSuccess: () => toast.success('Notification preferences saved'),
    onError: (error) => toast.error(error.message),
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      return updated;
    });
  };

  const handleSave = () => {
    updateMutation.mutate(notifications);
  };

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4 text-emerald-600" /> Email Notifications
          </CardTitle>
          <CardDescription>Choose what emails you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            label="Comments"
            description="Get notified when someone comments on your notes"
            checked={notifications.emailComments}
            onCheckedChange={() => handleToggle('emailComments')}
          />
          <Separator />
          <NotificationToggle
            label="Ratings"
            description="Get notified when someone rates your notes"
            checked={notifications.emailRatings}
            onCheckedChange={() => handleToggle('emailRatings')}
          />
          <Separator />
          <NotificationToggle
            label="New Followers"
            description="Get notified when someone follows you"
            checked={notifications.emailFollows}
            onCheckedChange={() => handleToggle('emailFollows')}
          />
          <Separator />
          <NotificationToggle
            label="Downloads"
            description="Get notified when someone downloads your notes"
            checked={notifications.emailDownloads}
            onCheckedChange={() => handleToggle('emailDownloads')}
          />
          <Separator />
          <NotificationToggle
            label="System Updates"
            description="Platform announcements and feature updates"
            checked={notifications.emailSystem}
            onCheckedChange={() => handleToggle('emailSystem')}
          />
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4 text-teal-600" /> In-App Notifications
          </CardTitle>
          <CardDescription>Choose what you see in the notification center</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationToggle
            label="Comments"
            description="Notify when someone comments on your notes"
            checked={notifications.inAppComments}
            onCheckedChange={() => handleToggle('inAppComments')}
          />
          <Separator />
          <NotificationToggle
            label="Ratings"
            description="Notify when someone rates your notes"
            checked={notifications.inAppRatings}
            onCheckedChange={() => handleToggle('inAppRatings')}
          />
          <Separator />
          <NotificationToggle
            label="Follows"
            description="Notify when someone follows you"
            checked={notifications.inAppFollows}
            onCheckedChange={() => handleToggle('inAppFollows')}
          />
          <Separator />
          <NotificationToggle
            label="Downloads"
            description="Notify when someone downloads your notes"
            checked={notifications.inAppDownloads}
            onCheckedChange={() => handleToggle('inAppDownloads')}
          />
          <Separator />
          <NotificationToggle
            label="Mentions"
            description="Notify when someone mentions you"
            checked={notifications.inAppMentions}
            onCheckedChange={() => handleToggle('inAppMentions')}
          />
          <Separator />
          <NotificationToggle
            label="Achievements"
            description="Notify when you unlock an achievement"
            checked={notifications.inAppAchievements}
            onCheckedChange={() => handleToggle('inAppAchievements')}
          />
          <Separator />
          <NotificationToggle
            label="System"
            description="Platform announcements and updates"
            checked={notifications.inAppSystem}
            onCheckedChange={() => handleToggle('inAppSystem')}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Save className="size-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

// ── Notification Toggle Row ─────────────────────────────────────
function NotificationToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ── Appearance Settings Tab ─────────────────────────────────────
function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [compactMode, setCompactMode] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState('left');

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => updateProfile({ appearance: data }),
    onSuccess: () => toast.success('Appearance settings saved'),
    onError: (error) => toast.error(error.message),
  });

  const handleSave = () => {
    updateMutation.mutate({ compactMode, sidebarPosition });
  };

  const themes = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Clean and bright' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on the eyes' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Follow system setting' },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="size-4 text-emerald-600" /> Theme
          </CardTitle>
          <CardDescription>Choose how NotesPedia looks to you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.value;
              return (
                <motion.button
                  key={t.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTheme(t.value)}
                  className={`relative rounded-xl p-4 text-center border-2 transition-all ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-muted hover:border-emerald-200 dark:hover:border-emerald-800'
                  }`}
                >
                  <Icon className={`size-6 mx-auto mb-2 ${isActive ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <p className={`text-sm font-medium ${isActive ? 'text-emerald-600' : ''}`}>{t.label}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                  {isActive && (
                    <div className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="size-4 text-emerald-600" /> Display Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Compact Mode</p>
              <p className="text-xs text-muted-foreground">
                Reduce spacing and show more content on screen
              </p>
            </div>
            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Sidebar Position</p>
              <p className="text-xs text-muted-foreground">Choose where the sidebar appears</p>
            </div>
            <Select value={sidebarPosition} onValueChange={setSidebarPosition}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Save className="size-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Appearance'}
        </Button>
      </div>
    </div>
  );
}

// ── Main Settings Page ──────────────────────────────────────────
export function SettingsPage() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="size-7 text-emerald-600" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account settings and preferences
        </p>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="profile" className="text-xs gap-1.5">
            <User className="size-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs gap-1.5">
            <Lock className="size-3.5" /> Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <Bell className="size-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs gap-1.5">
            <Palette className="size-3.5" /> Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="account" className="mt-6">
          <AccountTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
