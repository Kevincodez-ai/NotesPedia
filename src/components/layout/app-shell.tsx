'use client';

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Bookmark,
  Search,
  Trophy,
  Bell,
  Shield,
  Settings,
  Sun,
  Moon,
  LogOut,
  User,
  Menu,
} from 'lucide-react';
import type { PageName } from '@/types';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  title: string;
  page: PageName;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { title: 'My Notes', page: 'notes', icon: FileText },
  { title: 'Upload', page: 'upload', icon: Upload },
  { title: 'Bookmarks', page: 'bookmarks', icon: Bookmark },
  { title: 'Search', page: 'search', icon: Search },
  { title: 'Leaderboard', page: 'leaderboard', icon: Trophy },
  { title: 'Notifications', page: 'notifications', icon: Bell },
  { title: 'Admin', page: 'admin', icon: Shield, adminOnly: true },
  { title: 'Settings', page: 'settings', icon: Settings },
];

function AppSidebar() {
  const { currentPage, navigate, user, unreadNotificationCount } = useAppStore();

  const isAdmin = user?.role === 'admin' || user?.role === 'moderator' || user?.role === 'super_admin';

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const mainNav = filteredItems.filter((item) => !['settings'].includes(item.page));
  const bottomNav = filteredItems.filter((item) => ['settings'].includes(item.page));

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent/50"
              onClick={() => navigate('dashboard')}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FileText className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold tracking-tight">NotesPedia</span>
                <span className="truncate text-xs text-muted-foreground">Academic Knowledge</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    tooltip={item.title}
                    onClick={() => navigate(item.page)}
                    className="transition-all duration-150"
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.page === 'notifications' && unreadNotificationCount > 0 && (
                    <SidebarMenuBadge>{unreadNotificationCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {bottomNav.map((item) => (
            <SidebarMenuItem key={item.page}>
              <SidebarMenuButton
                isActive={currentPage === item.page}
                tooltip={item.title}
                onClick={() => navigate(item.page)}
              >
                <item.icon className="size-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarSeparator />
          <SidebarMenuItem>
            <UserNav />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function UserNav() {
  const { user, navigate, setUser } = useAppStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore
    }
    setUser(null);
    navigate('landing');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent/50 hover:bg-sidebar-accent/50"
          tooltip={user?.name || 'User'}
        >
          <Avatar className="size-8">
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">{user?.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
          </div>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end"
        side="top"
        sideOffset={4}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate('profile', { id: user?.id })} className="cursor-pointer">
            <User className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('settings')} className="cursor-pointer">
            <Settings className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopHeader() {
  const { setCommandPaletteOpen, navigate } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-14 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4 sticky top-0 z-30">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Search Bar */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:border-ring sm:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search notes...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="size-9"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Avatar Dropdown (visible on mobile) */}
        <HeaderUserMenu />
      </div>
    </header>
  );
}

function HeaderUserMenu() {
  const { user, navigate, setUser } = useAppStore();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch {
      // ignore
    }
    setUser(null);
    navigate('landing');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full">
          <Avatar className="size-8">
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate('profile', { id: user?.id })} className="cursor-pointer">
            <User className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('settings')} className="cursor-pointer">
            <Settings className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentPage, isAuthenticated, setUnreadNotificationCount } = useAppStore();

  // Single notification polling instance (shared via Zustand store)
  React.useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/notifications?limit=1');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) setUnreadNotificationCount(data.unreadCount || 0);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, setUnreadNotificationCount]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopHeader />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 overflow-auto"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NotificationBell() {
  const { navigate, unreadNotificationCount } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative size-9"
      onClick={() => navigate('notifications')}
    >
      <Bell className="size-4" />
      {unreadNotificationCount > 0 && (
        <Badge className="absolute -top-1 -right-1 size-5 justify-center p-0 text-[10px] font-bold bg-destructive">
          {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
        </Badge>
      )}
      <span className="sr-only">Notifications</span>
    </Button>
  );
}
