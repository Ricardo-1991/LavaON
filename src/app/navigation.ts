import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
export { Link } from 'react-router';

type Destination = string | { pathname: string; params: Record<string, string> };
function toUrl(destination: Destination) {
  return typeof destination === 'string'
    ? destination
    : `${destination.pathname}?${new URLSearchParams(destination.params)}`;
}
export function fallbackFor(path: string): string {
  if (path.startsWith('/services/')) return '/services';
  if (path.startsWith('/reservations/')) return '/reservations';
  if (path.startsWith('/schedule/')) return '/schedule';
  if (path.startsWith('/settings/')) return '/settings';
  return '/';
}
export function useAppNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const back = useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) void navigate(-1);
    else void navigate(fallbackFor(pathname), { replace: true });
  }, [navigate, pathname]);
  return useMemo(
    () => ({
      push: (destination: Destination) => void navigate(toUrl(destination)),
      replace: (destination: Destination) => void navigate(toUrl(destination), { replace: true }),
      back,
    }),
    [navigate, back],
  );
}
export function useRouteParams<T extends Record<string, string | undefined>>(): T {
  const params = useParams();
  const [search] = useSearchParams();
  return { ...Object.fromEntries(search), ...params } as T;
}
