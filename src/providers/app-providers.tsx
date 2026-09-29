import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient, useReactQueryAppFocus } from '@/data/query/query-client';
import { SessionProvider } from '@/providers/session-provider';

function AppFocusManager() {
  useReactQueryAppFocus();
  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppFocusManager />
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
