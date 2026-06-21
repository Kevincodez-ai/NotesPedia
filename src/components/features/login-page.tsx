'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import { FileText, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthUser } from '@/types';

export function LoginPage() {
  const { navigate, setUser } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        setError('Server error. Please try again later.');
        return;
      }

      if (!res.ok && !data?.success) {
        setError(data?.error || 'Login failed. Please check your credentials.');
        return;
      }

      if (data.success && data.user) {
        setUser(data.user as AuthUser);
        navigate('dashboard');
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <button onClick={() => navigate('landing')} className="flex items-center gap-2 group">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <FileText className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">NotesPedia</span>
        </button>
        <Button variant="ghost" onClick={() => navigate('signup')} className="text-sm">
          Sign up
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => {
                      navigate('forgot-password');
                    }}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('signup')}
                    className="font-medium text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
