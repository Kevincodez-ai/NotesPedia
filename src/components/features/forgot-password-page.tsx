'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import { FileText, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordPage() {
  const { navigate } = useAppStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSent(true);
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.');
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
            {isSent ? (
              <>
                <CardHeader className="space-y-1 text-center pb-4">
                  <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="size-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
                  <CardDescription>
                    If an account with that email exists, we&apos;ve sent you a password reset link.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    The reset link will expire in 1 hour. Don&apos;t forget to check your spam folder.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('login')}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Back to sign in
                  </Button>
                </CardFooter>
              </>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardHeader className="space-y-1 text-center pb-4">
                  <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Mail className="size-6" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
                  <CardDescription>
                    Enter your email and we&apos;ll send you a reset link
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
                    <Label htmlFor="email">Email address</Label>
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
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      'Send reset link'
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
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
