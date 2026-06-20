'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import { FileText, Lock, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordPage() {
  const { navigate } = useAppStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    // Extract token from URL query params
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (!resetToken) {
      setIsInvalid(true);
    } else {
      setToken(resetToken);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.error || 'Failed to reset password. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInvalid) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <button onClick={() => navigate('landing')} className="flex items-center gap-2 group">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <FileText className="size-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">NotesPedia</span>
          </button>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
            <Card className="border-border/50 shadow-xl shadow-primary/5">
              <CardHeader className="space-y-1 text-center pb-4">
                <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <XCircle className="size-6" />
                </div>
                <CardTitle className="text-2xl font-bold">Invalid link</CardTitle>
                <CardDescription>
                  This password reset link is invalid or has expired. Please request a new one.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col gap-4">
                <Button variant="outline" className="w-full" onClick={() => navigate('forgot-password')}>
                  Request new reset link
                </Button>
                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Back to sign in
                </button>
              </CardFooter>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <button onClick={() => navigate('landing')} className="flex items-center gap-2 group">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <FileText className="size-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">NotesPedia</span>
          </button>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
            <Card className="border-border/50 shadow-xl shadow-primary/5">
              <CardHeader className="space-y-1 text-center pb-4">
                <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle2 className="size-6" />
                </div>
                <CardTitle className="text-2xl font-bold">Password reset!</CardTitle>
                <CardDescription>
                  Your password has been reset successfully. You can now sign in with your new password.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" onClick={() => navigate('login')}>
                  Sign in
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <button onClick={() => navigate('landing')} className="flex items-center gap-2 group">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <FileText className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">NotesPedia</span>
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <form onSubmit={handleSubmit}>
              <CardHeader className="space-y-1 text-center pb-4">
                <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Lock className="size-6" />
                </div>
                <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
                <CardDescription>
                  Enter your new password below
                </CardDescription>
              </CardHeader>

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
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    'Reset password'
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  Back to sign in
                </button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
