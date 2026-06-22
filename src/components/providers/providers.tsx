'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 minutes before data is considered stale (was 1 min)
            staleTime: 5 * 60 * 1000,
            // Keep unused cache for 10 minutes before garbage-collecting
            gcTime: 10 * 60 * 1000,
            // Auth revalidation already handles refresh on focus —
            // disabling this prevents duplicate API calls on tab switch
            refetchOnWindowFocus: false,
            // Serve cached data while offline instead of erroring
            networkMode: 'offlineFirst',
            // Only retry once to avoid hammering a flaky API
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
