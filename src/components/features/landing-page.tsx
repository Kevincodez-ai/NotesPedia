'use client';

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Brain,
  BookOpen,
  Search,
  Star,
  TrendingUp,
  ArrowRight,
  FileText,
  GraduationCap,
  Users,
  Building2,
  BookMarked,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const features = [
  {
    icon: Sparkles,
    title: 'AI Summaries',
    description: 'Get instant, intelligent summaries of any note. Save hours of reading with our advanced AI that extracts key concepts.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Brain,
    title: 'Smart Flashcards',
    description: 'Automatically generate flashcards from your notes. Spaced repetition helps you retain information longer.',
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    icon: BookOpen,
    title: 'MCQ Practice',
    description: 'Practice with AI-generated multiple choice questions. Test your understanding before exams.',
    gradient: 'from-cyan-500 to-emerald-600',
  },
  {
    icon: Search,
    title: 'Search & Discover',
    description: 'Find notes across colleges, subjects, and semesters. Powerful filters help you find exactly what you need.',
    gradient: 'from-emerald-600 to-green-600',
  },
  {
    icon: Star,
    title: 'Rate & Review',
    description: 'Help the community by rating notes. Quality content rises to the top through peer reviews.',
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    icon: TrendingUp,
    title: 'Build Reputation',
    description: 'Earn reputation and contribution scores. Climb the leaderboard as you help fellow students.',
    gradient: 'from-teal-600 to-emerald-500',
  },
];

const defaultStats = [
  { value: '0', label: 'Students', icon: Users },
  { value: '0', label: 'Notes', icon: FileText },
  { value: '0', label: 'Colleges', icon: Building2 },
  { value: '0', label: 'Subjects', icon: BookMarked },
];

export function LandingPage() {
  const { isAuthenticated, navigate } = useAppStore();

  // Build footer links with real navigation actions
  const footerLinks: Record<string, { label: string; action: () => void }[]> = {
    Product: [
      { label: 'Features', action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }) },
      { label: 'Explore Notes', action: () => navigate('search') },
    ],
    Resources: [
      { label: 'Search', action: () => navigate('search') },
      { label: 'Leaderboard', action: () => navigate('leaderboard') },
    ],
  };

  // Fetch dynamic stats
  const [stats, setStats] = React.useState(defaultStats);
  React.useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.success && data.stats) {
          setStats([
            { value: data.stats.totalUsers.toLocaleString() + '+', label: 'Students', icon: Users },
            { value: data.stats.totalNotes.toLocaleString() + '+', label: 'Notes', icon: FileText },
            { value: data.stats.totalColleges.toLocaleString() + '+', label: 'Colleges', icon: Building2 },
            { value: data.stats.totalSubjects.toLocaleString() + '+', label: 'Subjects', icon: BookMarked },
          ]);
        }
      } catch {
        // keep default stats
      }
    }
    loadStats();
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('dashboard');
    } else {
      navigate('signup');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="size-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">NotesPedia</span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Features
            </button>
            <button onClick={() => navigate('search')} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Explore
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('login')} className="text-sm">
              Login
            </Button>
            <Button onClick={handleGetStarted} className="text-sm">
              Get Started
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
            <div className="absolute top-0 left-1/4 size-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-primary/8 blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8 lg:pt-32">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="mx-auto max-w-3xl text-center"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground"
              >
                <Sparkles className="size-3.5 text-primary" />
                AI-Powered Academic Platform
              </motion.div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your Academic Knowledge,{' '}
                <span className="bg-gradient-to-r from-primary via-teal-500 to-emerald-500 bg-clip-text text-transparent">
                  Supercharged
                </span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
                Upload, organize, and share academic notes. AI-powered summaries, flashcards, and MCQs 
                help you study smarter, not harder. Join thousands of students building knowledge together.
              </p>

              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" onClick={handleGetStarted} className="h-12 px-8 text-base">
                  Get Started Free
                  <ArrowRight className="ml-2 size-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="h-12 px-8 text-base">
                  Learn More
                </Button>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required. Free forever for students.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to excel
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful features designed by students, for students. Built with cutting-edge AI to transform how you study.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature) => (
                <motion.div key={feature.title} variants={staggerItem}>
                  <Card className="group h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <CardContent className="p-6">
                      <div className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg`}>
                        <feature.icon className="size-6" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Stats / Social Proof */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-2xl text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Trusted by students everywhere
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join a growing community of learners who are transforming their academic journey.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            >
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={staggerItem}
                  className="flex flex-col items-center gap-3 text-center"
                >
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <stat.icon className="size-7" />
                  </div>
                  <div className="text-4xl font-bold tracking-tight">{stat.value}</div>
                  <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mx-auto max-w-2xl text-center"
            >
              <GraduationCap className="mx-auto mb-6 size-12 text-primary" />
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to transform your study game?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of students already using NotesPedia to study smarter and achieve more.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" onClick={handleGetStarted} className="h-12 px-8 text-base">
                  Start for Free
                  <ArrowRight className="ml-2 size-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('login')} className="h-12 px-8 text-base">
                  Login
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <FileText className="size-4" />
                </div>
                <span className="text-lg font-bold tracking-tight">NotesPedia</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                AI-Powered Academic Knowledge Platform for students everywhere.
              </p>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="mb-3 text-sm font-semibold">{category}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <button
                        onClick={link.action}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} NotesPedia. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built for students, by students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
