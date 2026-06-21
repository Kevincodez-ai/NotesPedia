"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  FileText,
  Download,
  GraduationCap,
  AlertTriangle,
  Activity,
  Search,
  Ban,
  CheckCircle2,
  ArrowUpRight,
  Flag,
  Trash2,
  Star,
  Eye,
  Plus,
  MoreHorizontal,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  UserCog,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { AdminStats, CollegeData } from "@/types";

// ── Animation variants ──────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

// ── Fetchers ────────────────────────────────────────────────────
async function fetchAdminStats() {
  const res = await fetch("/api/admin");
  if (!res.ok) throw new Error("Failed to fetch admin stats");
  return res.json();
}

async function fetchAdminUsers(params: string) {
  const parsed = Object.fromEntries(new URLSearchParams(params));
  const body: Record<string, unknown> = { action: "listUsers" };
  if (parsed.page) body.page = parseInt(parsed.page);
  if (parsed.limit) body.limit = parseInt(parsed.limit);
  if (parsed.q) body.q = parsed.q;
  if (parsed.role && parsed.role !== "all") body.role = parsed.role;
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function fetchAdminNotes(params: string) {
  const parsed = Object.fromEntries(new URLSearchParams(params));
  const body: Record<string, unknown> = { action: "listNotes" };
  if (parsed.page) body.page = parseInt(parsed.page);
  if (parsed.limit) body.limit = parseInt(parsed.limit);
  if (parsed.status && parsed.status !== "all") body.status = parsed.status;
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

async function fetchAdminReports(params: string) {
  const parsed = Object.fromEntries(new URLSearchParams(params));
  const body: Record<string, unknown> = { action: "listReports" };
  if (parsed.page) body.page = parseInt(parsed.page);
  if (parsed.limit) body.limit = parseInt(parsed.limit);
  if (parsed.status && parsed.status !== "all") body.status = parsed.status;
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to fetch reports");
  return res.json();
}

async function fetchAdminColleges(params: string) {
  const parsed = Object.fromEntries(new URLSearchParams(params));
  const body: Record<string, unknown> = { action: "listColleges" };
  if (parsed.page) body.page = parseInt(parsed.page);
  if (parsed.limit) body.limit = parseInt(parsed.limit);
  if (parsed.q) body.q = parsed.q;
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to fetch colleges");
  return res.json();
}

async function adminPostAction(body: Record<string, unknown>) {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Action failed");
  }
  return data;
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  subtitle?: string;
  color: string;
}) {
  return (
    <motion.div variants={item}>
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {title}
              </p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={`rounded-xl p-2.5 ${color}`}>
              <Icon className="size-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Access Denied ───────────────────────────────────────────────
function AccessDenied() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="rounded-2xl bg-destructive/10 p-6 mb-6">
        <Shield className="size-12 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        You don&apos;t have permission to access the admin panel. This area is
        restricted to administrators only.
      </p>
      <Button
        variant="outline"
        className="mt-6 gap-2"
        onClick={() => useAppStore.getState().navigate("dashboard")}
      >
        Back to Dashboard
      </Button>
    </motion.div>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="size-10 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main Admin Page ─────────────────────────────────────────────
export function AdminPage() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");

  // Gate access
  if (!user || !["admin", "super_admin", "moderator"].includes(user.role)) {
    return <AccessDenied />;
  }

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
            <Shield className="size-7 text-emerald-600" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage users, notes, reports, and platform settings
          </p>
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <Activity className="size-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs gap-1.5">
            <Users className="size-3.5" /> Users
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1.5">
            <FileText className="size-3.5" /> Notes
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1.5">
            <AlertTriangle className="size-3.5" /> Reports
          </TabsTrigger>
          <TabsTrigger value="colleges" className="text-xs gap-1.5">
            <GraduationCap className="size-3.5" /> Colleges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <OverviewTab onTabChange={setActiveTab} />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>
        <TabsContent value="notes" className="mt-6">
          <NotesTab />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="colleges" className="mt-6">
          <CollegesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Overview Tab ────────────────────────────────────────────────
function OverviewTab({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
  });

  const stats: AdminStats | null = data?.stats ?? null;

  if (isLoading) return <StatsSkeleton />;
  if (isError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <h3 className="font-semibold">Failed to load stats</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Something went wrong. Please try again.
        </p>
      </motion.div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          subtitle="Registered"
          color="bg-emerald-500"
        />
        <StatCard
          title="Total Notes"
          value={stats.totalNotes}
          icon={FileText}
          subtitle="Uploaded"
          color="bg-teal-500"
        />
        <StatCard
          title="Downloads"
          value={stats.totalDownloads}
          icon={Download}
          subtitle="All time"
          color="bg-amber-500"
        />
        <StatCard
          title="Colleges"
          value={stats.totalColleges}
          icon={GraduationCap}
          subtitle="Registered"
          color="bg-rose-500"
        />
        <StatCard
          title="Pending Reports"
          value={stats.pendingReports}
          icon={AlertTriangle}
          subtitle="Need review"
          color="bg-orange-500"
        />
        <StatCard
          title="New Today"
          value={stats.newUsersToday}
          icon={Activity}
          subtitle="Users"
          color="bg-cyan-500"
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpRight className="size-4 text-emerald-600" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => onTabChange("users")}
              >
                <Users className="size-5 text-emerald-600" />
                <span className="text-xs">View Users</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => onTabChange("reports")}
              >
                <AlertTriangle className="size-5 text-orange-500" />
                <span className="text-xs">Review Reports</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => onTabChange("colleges")}
              >
                <GraduationCap className="size-5 text-teal-600" />
                <span className="text-xs">Add College</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => onTabChange("notes")}
              >
                <FileText className="size-5 text-amber-500" />
                <span className="text-xs">Flagged Notes</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Reports */}
      {data?.stats?.recentReports && data.stats.recentReports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-orange-500" /> Recent
                Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {data.stats.recentReports.map(
                  (report: {
                    id: string;
                    targetType: string;
                    reason: string;
                    status: string;
                    createdAt: string;
                    reporter: { name: string; avatarUrl?: string };
                  }) => (
                    <div
                      key={report.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="size-7">
                        {report.reporter.avatarUrl && (
                          <AvatarImage src={report.reporter.avatarUrl} />
                        )}
                        <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {report.reporter.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {report.reason}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Reported by {report.reporter.name} ·{" "}
                          {report.targetType}
                        </p>
                      </div>
                      <Badge className="text-[9px] bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 shrink-0">
                        {report.status}
                      </Badge>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ── Users Tab ───────────────────────────────────────────────────
function UsersTab() {
  const { user } = useAppStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Role change dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const [newRole, setNewRole] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { q: search }),
    ...(roleFilter !== "all" && { role: roleFilter }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, roleFilter, page],
    queryFn: () => fetchAdminUsers(params),
  });

  const users: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
    _count?: { notes: number };
  }[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Admin action mutation - POST /api/admin
  const adminActionMutation = useMutation({
    mutationFn: adminPostAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleChangeRole = () => {
    if (!selectedUser || !newRole) return;
    adminActionMutation.mutate(
      { action: "updateUser", id: selectedUser.id, role: newRole },
      {
        onSuccess: () => {
          toast.success(
            `Changed ${selectedUser.name}'s role to ${newRole.replace("_", " ")}`,
          );
          setRoleDialogOpen(false);
          setSelectedUser(null);
          setNewRole("");
        },
      },
    );
  };

  const handleSuspendUser = (userId: string, userName: string) => {
    adminActionMutation.mutate(
      { action: "updateUser", id: userId, isActive: false },
      { onSuccess: () => toast.success(`Suspended ${userName}`) },
    );
  };

  const handleActivateUser = (userId: string, userName: string) => {
    adminActionMutation.mutate(
      { action: "updateUser", id: userId, isActive: true },
      { onSuccess: () => toast.success(`Activated ${userName}`) },
    );
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
      case "admin":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
      case "moderator":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "contributor":
        return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
      case "verified_student":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 h-9"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="student">Student</SelectItem>
            <SelectItem value="verified_student">Verified</SelectItem>
            <SelectItem value="contributor">Contributor</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : users.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-2xl bg-muted/60 p-4 mb-4">
            <Users className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No users found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filter.
          </p>
        </motion.div>
      ) : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                        <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {u.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[150px]">
                          {u.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${roleBadgeColor(u.role)}`}>
                      {u.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.isActive ? "secondary" : "destructive"}
                      className="text-[10px]"
                    >
                      {u.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u._count?.notes ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser({
                              id: u.id,
                              name: u.name,
                              role: u.role,
                            });
                            setNewRole(u.role);
                            setRoleDialogOpen(true);
                          }}
                        >
                          <UserCog className="size-3.5 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        {u.isActive ? (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleSuspendUser(u.id, u.name)}
                            disabled={
                              adminActionMutation.isPending || u.id === user?.id
                            }
                          >
                            <Ban className="size-3.5 mr-2" />
                            {u.id === user?.id
                              ? "Cannot Suspend Self"
                              : "Suspend User"}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-emerald-600 focus:text-emerald-600"
                            onClick={() => handleActivateUser(u.id, u.name)}
                            disabled={adminActionMutation.isPending}
                          >
                            <CheckCircle2 className="size-3.5 mr-2" />
                            Activate User
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.name}. This will affect their
              permissions on the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="verified_student">
                    Verified Student
                  </SelectItem>
                  <SelectItem value="contributor">Contributor</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                !newRole ||
                newRole === selectedUser?.role ||
                adminActionMutation.isPending
              }
              onClick={handleChangeRole}
            >
              {adminActionMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Notes Tab ───────────────────────────────────────────────────
function NotesTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Remove note dialog state
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [noteToRemove, setNoteToRemove] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [removeReason, setRemoveReason] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(statusFilter !== "all" && { status: statusFilter }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notes", statusFilter, page],
    queryFn: () => fetchAdminNotes(params),
  });

  const notes: {
    id: string;
    title: string;
    fileType: string;
    status: string;
    downloadCount: number;
    viewCount: number;
    avgRating: number;
    createdAt: string;
    uploader: { id: string; name: string; avatarUrl?: string };
    subject?: { name: string };
  }[] = data?.notes ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Admin action mutation - POST /api/admin
  const adminActionMutation = useMutation({
    mutationFn: adminPostAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleRemoveNote = () => {
    if (!noteToRemove || !removeReason.trim()) return;
    adminActionMutation.mutate(
      {
        action: "removeNote",
        id: noteToRemove.id,
        reason: removeReason.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Note "${noteToRemove.title}" removed`);
          setRemoveDialogOpen(false);
          setNoteToRemove(null);
          setRemoveReason("");
        },
      },
    );
  };

  const handleFeatureNote = (noteId: string, noteTitle: string) => {
    adminActionMutation.mutate(
      { action: "featureNote", id: noteId },
      { onSuccess: () => toast.success(`Note "${noteTitle}" featured`) },
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "processing":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "flagged":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
      case "removed":
        return "bg-destructive/10 text-destructive";
      case "draft":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="removed">Removed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{total} notes</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton cols={6} />
      ) : notes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-2xl bg-muted/60 p-4 mb-4">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No notes found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No notes match the current filter.
          </p>
        </motion.div>
      ) : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Uploader</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[200px]">
                        {n.title}
                      </p>
                      {n.subject && (
                        <p className="text-[10px] text-muted-foreground">
                          {n.subject.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${statusBadge(n.status)}`}>
                      {n.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {n.fileType?.toUpperCase() || "FILE"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Download className="size-3" />
                        {n.downloadCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Eye className="size-3" />
                        {n.viewCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className="size-3 text-amber-500" />
                        {n.avgRating > 0 ? n.avgRating.toFixed(1) : "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5">
                        {n.uploader.avatarUrl && (
                          <AvatarImage src={n.uploader.avatarUrl} />
                        )}
                        <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {n.uploader.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                        {n.uploader.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {n.status !== "removed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          onClick={() => handleFeatureNote(n.id, n.title)}
                          disabled={adminActionMutation.isPending}
                          title="Feature note"
                        >
                          <Star className="size-3.5 text-emerald-600" />
                        </Button>
                      )}
                      {n.status !== "removed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 hover:bg-destructive/10"
                          onClick={() => {
                            setNoteToRemove({ id: n.id, title: n.title });
                            setRemoveReason("");
                            setRemoveDialogOpen(true);
                          }}
                          title="Remove note"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Remove Note Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Note</DialogTitle>
            <DialogDescription>
              Remove &quot;{noteToRemove?.title}&quot; from the platform. This
              action will set the note status to removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="remove-reason">Reason for removal *</Label>
              <Textarea
                id="remove-reason"
                placeholder="e.g., Contains copyrighted material, violates community guidelines..."
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!removeReason.trim() || adminActionMutation.isPending}
              onClick={handleRemoveNote}
            >
              {adminActionMutation.isPending ? "Removing..." : "Remove Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reports Tab ─────────────────────────────────────────────────
function ReportsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const limit = 10;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(statusFilter !== "all" && { status: statusFilter }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", statusFilter, page],
    queryFn: () => fetchAdminReports(params),
  });

  const reports: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    description?: string;
    status: string;
    createdAt: string;
    reporter: { id: string; name: string; avatarUrl?: string };
  }[] = data?.reports ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Admin action mutation - POST /api/admin
  const adminActionMutation = useMutation({
    mutationFn: adminPostAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleResolve = (reportId: string) => {
    adminActionMutation.mutate(
      { action: "resolveReport", id: reportId, reportAction: "resolve" },
      { onSuccess: () => toast.success("Report resolved") },
    );
  };

  const handleDismiss = (reportId: string) => {
    adminActionMutation.mutate(
      { action: "resolveReport", id: reportId, reportAction: "dismiss" },
      { onSuccess: () => toast.success("Report dismissed") },
    );
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "resolved":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "dismissed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{total} reports</span>
      </div>

      {/* Reports list */}
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : reports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 p-4 mb-4">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <h3 className="font-semibold">
            {statusFilter === "pending" ? "All clear!" : "No reports found"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter === "pending"
              ? "No pending reports to review."
              : "No reports match the current filter."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-8 mt-0.5">
                      {report.reporter.avatarUrl && (
                        <AvatarImage src={report.reporter.avatarUrl} />
                      )}
                      <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {report.reporter.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {report.reason}
                        </span>
                        <Badge
                          className={`text-[10px] ${statusBadgeColor(report.status)}`}
                        >
                          {report.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {report.targetType}
                        </Badge>
                      </div>
                      {report.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {report.description}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Reported by {report.reporter.name} ·{" "}
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {report.status === "pending" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800"
                          disabled={adminActionMutation.isPending}
                          onClick={() => handleResolve(report.id)}
                        >
                          <CheckCircle2 className="size-3" /> Resolve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={adminActionMutation.isPending}
                          onClick={() => handleDismiss(report.id)}
                        >
                          <X className="size-3" /> Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Colleges Tab ────────────────────────────────────────────────
function CollegesTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCollege, setNewCollege] = useState({
    name: "",
    shortName: "",
    city: "",
    state: "",
    country: "",
    type: "",
    website: "",
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCollege, setEditCollege] = useState<
    (CollegeData & { website?: string; country?: string }) | null
  >(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collegeToDelete, setCollegeToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-colleges", page],
    queryFn: () => fetchAdminColleges(params),
  });

  const colleges: (CollegeData & { website?: string; country?: string })[] =
    data?.colleges ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Add college mutation - POST /api/colleges
  const addCollegeMutation = useMutation({
    mutationFn: (college: typeof newCollege) =>
      fetch("/api/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(college),
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to add college");
        return data;
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setAddDialogOpen(false);
      setNewCollege({
        name: "",
        shortName: "",
        city: "",
        state: "",
        country: "",
        type: "",
        website: "",
      });
      toast.success("College added successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  // Admin action mutation - POST /api/admin
  const adminActionMutation = useMutation({
    mutationFn: adminPostAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-colleges"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleUpdateCollege = () => {
    if (!editCollege) return;
    const updateData: Record<string, unknown> = {
      action: "updateCollege",
      id: editCollege.id,
    };
    if (editCollege.name) updateData.name = editCollege.name;
    if (editCollege.shortName !== undefined)
      updateData.shortName = editCollege.shortName;
    if (editCollege.city !== undefined) updateData.city = editCollege.city;
    if (editCollege.state !== undefined) updateData.state = editCollege.state;
    if (editCollege.country !== undefined)
      updateData.country = editCollege.country;
    if (editCollege.type !== undefined) updateData.type = editCollege.type;
    if (editCollege.website !== undefined)
      updateData.website = editCollege.website;
    if (editCollege.isVerified !== undefined)
      updateData.isVerified = editCollege.isVerified;

    adminActionMutation.mutate(updateData, {
      onSuccess: () => {
        toast.success("College updated successfully");
        setEditDialogOpen(false);
        setEditCollege(null);
      },
    });
  };

  const handleDeleteCollege = () => {
    if (!collegeToDelete) return;
    adminActionMutation.mutate(
      { action: "deleteCollege", id: collegeToDelete.id },
      {
        onSuccess: () => {
          toast.success("College deleted successfully");
          setDeleteDialogOpen(false);
          setCollegeToDelete(null);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{total} colleges</span>
        <Button
          size="sm"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="size-4" /> Add College
        </Button>
      </div>

      {/* Colleges list */}
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : colleges.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="rounded-2xl bg-muted/60 p-4 mb-4">
            <GraduationCap className="size-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No colleges yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add the first college to get started.
          </p>
        </motion.div>
      ) : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>College</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {colleges.map((college) => (
                <TableRow key={college.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{college.name}</p>
                      {college.shortName && (
                        <p className="text-[10px] text-muted-foreground">
                          {college.shortName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[college.city, college.state].filter(Boolean).join(", ") ||
                      "—"}
                  </TableCell>
                  <TableCell>
                    {college.isVerified ? (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{college.noteCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                        onClick={() => {
                          setEditCollege({ ...college });
                          setEditDialogOpen(true);
                        }}
                        title="Edit college"
                      >
                        <Pencil className="size-3.5 text-emerald-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 hover:bg-destructive/10"
                        onClick={() => {
                          setCollegeToDelete({
                            id: college.id,
                            name: college.name,
                          });
                          setDeleteDialogOpen(true);
                        }}
                        title="Delete college"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Add College Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New College</DialogTitle>
            <DialogDescription>
              Add a new college to the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="college-name">College Name *</Label>
              <Input
                id="college-name"
                value={newCollege.name}
                onChange={(e) =>
                  setNewCollege((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Indian Institute of Technology Delhi"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="short-name">Short Name</Label>
                <Input
                  id="short-name"
                  value={newCollege.shortName}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, shortName: e.target.value }))
                  }
                  placeholder="e.g., IIT Delhi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-city">City</Label>
                <Input
                  id="add-city"
                  value={newCollege.city}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, city: e.target.value }))
                  }
                  placeholder="e.g., New Delhi"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-state">State</Label>
                <Input
                  id="add-state"
                  value={newCollege.state}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, state: e.target.value }))
                  }
                  placeholder="e.g., Delhi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-country">Country</Label>
                <Input
                  id="add-country"
                  value={newCollege.country}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, country: e.target.value }))
                  }
                  placeholder="e.g., India"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-type">Type</Label>
                <Select
                  value={newCollege.type || "_none"}
                  onValueChange={(v) =>
                    setNewCollege((p) => ({
                      ...p,
                      type: v === "_none" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger id="add-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="college">College</SelectItem>
                    <SelectItem value="institute">Institute</SelectItem>
                    <SelectItem value="deemed_university">
                      Deemed University
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-website">Website</Label>
                <Input
                  id="add-website"
                  value={newCollege.website}
                  onChange={(e) =>
                    setNewCollege((p) => ({ ...p, website: e.target.value }))
                  }
                  placeholder="e.g., https://iitd.ac.in"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              disabled={!newCollege.name.trim() || addCollegeMutation.isPending}
              onClick={() => addCollegeMutation.mutate(newCollege)}
            >
              {addCollegeMutation.isPending ? "Adding..." : "Add College"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit College Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit College</DialogTitle>
            <DialogDescription>Update college information.</DialogDescription>
          </DialogHeader>
          {editCollege && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">College Name *</Label>
                <Input
                  id="edit-name"
                  value={editCollege.name}
                  onChange={(e) =>
                    setEditCollege((p) =>
                      p ? { ...p, name: e.target.value } : p,
                    )
                  }
                  placeholder="e.g., Indian Institute of Technology Delhi"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-short-name">Short Name</Label>
                  <Input
                    id="edit-short-name"
                    value={editCollege.shortName || ""}
                    onChange={(e) =>
                      setEditCollege((p) =>
                        p ? { ...p, shortName: e.target.value } : p,
                      )
                    }
                    placeholder="e.g., IIT Delhi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editCollege.city || ""}
                    onChange={(e) =>
                      setEditCollege((p) =>
                        p ? { ...p, city: e.target.value } : p,
                      )
                    }
                    placeholder="e.g., New Delhi"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={editCollege.state || ""}
                    onChange={(e) =>
                      setEditCollege((p) =>
                        p ? { ...p, state: e.target.value } : p,
                      )
                    }
                    placeholder="e.g., Delhi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-country">Country</Label>
                  <Input
                    id="edit-country"
                    value={editCollege.country || ""}
                    onChange={(e) =>
                      setEditCollege((p) =>
                        p ? { ...p, country: e.target.value } : p,
                      )
                    }
                    placeholder="e.g., India"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editCollege.type || "_none"}
                    onValueChange={(v) =>
                      setEditCollege((p) =>
                        p ? { ...p, type: v === "_none" ? "" : v } : p,
                      )
                    }
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      <SelectItem value="university">University</SelectItem>
                      <SelectItem value="college">College</SelectItem>
                      <SelectItem value="institute">Institute</SelectItem>
                      <SelectItem value="deemed_university">
                        Deemed University
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={editCollege.website || ""}
                    onChange={(e) =>
                      setEditCollege((p) =>
                        p ? { ...p, website: e.target.value } : p,
                      )
                    }
                    placeholder="e.g., https://iitd.ac.in"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="edit-verified">Verified Status</Label>
                <Button
                  id="edit-verified"
                  variant={editCollege.isVerified ? "default" : "outline"}
                  size="sm"
                  className={
                    editCollege.isVerified
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      : "gap-1"
                  }
                  onClick={() =>
                    setEditCollege((p) =>
                      p ? { ...p, isVerified: !p.isVerified } : p,
                    )
                  }
                >
                  {editCollege.isVerified ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <X className="size-3.5" />
                  )}
                  {editCollege.isVerified ? "Verified" : "Unverified"}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              disabled={
                !editCollege?.name?.trim() || adminActionMutation.isPending
              }
              onClick={handleUpdateCollege}
            >
              {adminActionMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete College</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{collegeToDelete?.name}
              &quot;? This action cannot be undone. Colleges with departments or
              notes assigned cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={adminActionMutation.isPending}
              onClick={handleDeleteCollege}
            >
              {adminActionMutation.isPending ? "Deleting..." : "Delete College"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
