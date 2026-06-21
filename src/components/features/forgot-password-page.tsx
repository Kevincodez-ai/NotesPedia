'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { motion } from 'framer-motion';
import { FileText, Mail, ArrowLeft, Loader2, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
  const { navigate } = useAppStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

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

      let data;
      try {
        data = await res.json();
      } catch {
        setError('Server error. Please try again later.');
        return;
      }

      if (!res.ok && !data?.success) {
        setError(data?.error || 'Failed to generate reset link. Please try again.');
        return;
      }

      if (data.success) {
        setIsSent(true);
        setEmailSent(!!data.emailSent);
        if (data.resetUrl) {
          setResetUrl(data.resetUrl);
        }
      } else {
        setError(data.error || 'Failed to generate reset link. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyResetLink = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(resetUrl).then(() => {
        setCopied(true);
        toast.success('Reset link copied!');
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        toast.error('Failed to copy');
      });
    } else {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = resetUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Reset link copied!');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleResetNow = () => {
    // Extract token from URL and navigate to reset-password page
    const url = new URL(resetUrl);
    const token = url.searchParams.get('token');
    if (token) {
      navigate('reset-password', { id: token });
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
                  <CardTitle className="text-2xl font-bold">
                    {emailSent ? 'Check your email' : 'Reset link ready'}
                  </CardTitle>
                  <CardDescription>
                    {emailSent
                      ? "We've sent a password reset link to your email address."
                      : "Your reset link has been generated. Use it below to reset your password."
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emailSent ? (
                    <p className="text-sm text-muted-foreground text-center">
                      The reset link will expire in 1 hour. Don&apos;t forget to check your spam folder.
                    </p>
                  ) : (
                    <>
                      {/* Show the reset link directly */}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                          Your password reset link:
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs bg-white dark:bg-background rounded px-2 py-1.5 break-all border">
                            {resetUrl}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 size-8"
                            onClick={copyResetLink}
                          >
                            {copied ? (
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <Button
                        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleResetNow}
                      >
                        <ExternalLink className="size-4" />
                        Reset Password Now
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        This link expires in 1 hour. Copy it or click above to use it now.
                      </p>
                    </>
                  )}
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
                    Enter your email to get a password reset link
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
                        Generating reset link...
                      </>
                    ) : (
                      'Get reset link'
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
