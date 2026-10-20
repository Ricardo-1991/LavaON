import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/data/query/query-client';
import { SessionProvider } from '@/providers/session-provider';
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
