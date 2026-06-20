'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import { FileText, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthUser } from '@/types';

interface PasswordValidation {
  minLength: boolean;
  match: boolean;
}

export function SignupPage() {
  const { navigate, setUser } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordValidation: PasswordValidation = {
    minLength: password.length >= 6,
    match: password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
  };

  const isFormValid =
    name.length >= 2 &&
    email.includes('@') &&
    passwordValidation.minLength &&
    passwordValidation.match;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid) {
      setError('Please fill in all fields correctly.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', name, email, password }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user as AuthUser);
        navigate('dashboard');
      } else {
        setError(data.error || 'Signup failed. Please try again.');
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
        <Button variant="ghost" onClick={() => navigate('login')} className="text-sm">
          Login
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
                <User className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription>
                Start your academic journey with NotesPedia
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
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="name"
                      disabled={isLoading}
                    />
                  </div>
                </div>

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
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                  </div>
                  {/* Password validation indicators */}
                  <div className="mt-2 space-y-1">
                    <ValidationIndicator
                      isValid={passwordValidation.minLength}
                      label="At least 6 characters"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                  </div>
                  {confirmPassword.length > 0 && (
                    <ValidationIndicator
                      isValid={passwordValidation.match}
                      label={passwordValidation.match ? 'Passwords match' : 'Passwords don\'t match'}
                    />
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading || !isFormValid} size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('login')}
                    className="font-medium text-primary hover:underline"
                  >
                    Login
                  </button>
                </p>

                <p className="text-center text-xs text-muted-foreground">
                  By creating an account, you agree to our{' '}
                  <button type="button" className="text-primary hover:underline">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" className="text-primary hover:underline">Privacy Policy</button>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

function ValidationIndicator({ isValid, label }: { isValid: boolean; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 text-xs"
    >
      {isValid ? (
        <CheckCircle2 className="size-3.5 text-emerald-500" />
      ) : (
        <XCircle className="size-3.5 text-destructive/60" />
      )}
      <span className={isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
        {label}
      </span>
    </motion.div>
  );
}
