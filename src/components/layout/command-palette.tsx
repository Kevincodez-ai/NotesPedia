'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Upload,
  Bookmark,
  Search,
  Trophy,
  Users,
  Bell,
  Settings,
  Shield,
  ArrowRight,
  Clock,
} from 'lucide-react';
import type { PageName } from '@/types';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface QuickNavItem {
  title: string;
  page: PageName;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const quickNavItems: QuickNavItem[] = [
  { title: 'Dashboard', page: 'dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { title: 'My Notes', page: 'notes', icon: FileText, keywords: ['documents', 'files'] },
  { title: 'Upload Note', page: 'upload', icon: Upload, keywords: ['new', 'add', 'create'] },
  { title: 'Bookmarks', page: 'bookmarks', icon: Bookmark, keywords: ['saved', 'favorites'] },
  { title: 'Search', page: 'search', icon: Search, keywords: ['find', 'look'] },
  { title: 'Leaderboard', page: 'leaderboard', icon: Trophy, keywords: ['ranking', 'top', 'score'] },
  { title: 'Study Groups', page: 'study-groups', icon: Users, keywords: ['group', 'team', 'collaborate'] },
  { title: 'Notifications', page: 'notifications', icon: Bell, keywords: ['alerts', 'updates'] },
  { title: 'Settings', page: 'settings', icon: Settings, keywords: ['preferences', 'config'] },
  { title: 'Admin Panel', page: 'admin', icon: Shield, keywords: ['administration', 'manage'] },
];

const quickActions = [
  { title: 'Upload a new note', page: 'upload' as PageName, icon: Upload, keywords: ['new', 'create', 'add'] },
  { title: 'Search all notes', page: 'search' as PageName, icon: Search, keywords: ['find', 'look'] },
  { title: 'Go to profile', page: 'profile' as PageName, icon: FileText, keywords: ['me', 'account'] },
];

const recentSearches = ['Data Structures notes', 'Machine Learning PDF', 'Operating Systems'];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, navigate, user } = useAppStore();
  const [recentSearch, setRecentSearch] = React.useState<string[]>(recentSearches);

  // Keyboard shortcut Ctrl+K / Cmd+K is already handled in page.tsx
  // But also handle here for robustness
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const runCommand = (command: () => void) => {
    setCommandPaletteOpen(false);
    command();
  };

  const handleSearchSelect = (query: string) => {
    setRecentSearch((prev) => [query, ...prev.filter((s) => s !== query)].slice(0, 5));
    runCommand(() => navigate('search', { query }));
  };

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      title="Command Palette"
      description="Search for pages and actions"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {quickActions.map((action) => (
            <CommandItem
              key={action.title}
              onSelect={() => runCommand(() => {
                if (action.page === 'profile') {
                  navigate('profile', { id: user?.id });
                } else {
                  navigate(action.page);
                }
              })}
              className="cursor-pointer"
            >
              <action.icon className="size-4 text-primary" />
              <span>{action.title}</span>
              <ArrowRight className="ml-auto size-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {quickNavItems.map((item) => (
            <CommandItem
              key={item.page}
              value={`${item.title} ${item.keywords.join(' ')}`}
              onSelect={() => runCommand(() => navigate(item.page))}
              className="cursor-pointer"
            >
              <item.icon className="size-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Recent Searches */}
        {recentSearch.length > 0 && (
          <CommandGroup heading="Recent Searches">
            {recentSearch.map((search, i) => (
              <CommandItem
                key={`${search}-${i}`}
                value={search}
                onSelect={() => handleSearchSelect(search)}
                className="cursor-pointer"
              >
                <Clock className="size-4 text-muted-foreground" />
                <span>{search}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
