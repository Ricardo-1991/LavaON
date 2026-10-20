import { useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import LoginScreen from '@/features/auth/screens/login-screen';
import SignUpScreen from '@/features/auth/screens/sign-up-screen';
import ForgotPasswordScreen from '@/features/auth/screens/forgot-password-screen';
import DashboardScreen from '@/features/dashboard/screens/dashboard-screen';
import OnboardingScreen from '@/features/onboarding/screens/onboarding-screen';
import ScheduleScreen from '@/features/schedule/screens/schedule-screen';
import DayDetailScreen from '@/features/schedule/screens/day-detail-screen';
import ReservationsScreen from '@/features/reservations/screens/reservations-screen';
import ReservationDetailScreen from '@/features/reservations/screens/reservation-detail-screen';
import SettingsScreen from '@/features/settings/screens/settings-screen';
import AccountScreen from '@/features/settings/screens/account-screen';
import EstablishmentScreen from '@/features/establishment/screens/establishment-screen';
import OperatingScreen from '@/features/establishment/screens/operating-screen';
import ServicesScreen from '@/features/services/screens/services-screen';
import ServiceFormScreen from '@/features/services/screens/service-form-screen';
import { useSession } from '@/providers/session-provider';
import { Button, ErrorState, LoadingState, ScreenContainer } from '@/shared/ui';
import { DialogHost } from '@/shared/ui/dialog';
import { Icon, type IconName } from '@/shared/ui/icon';
import { useAppNavigation } from './navigation';
import { PwaControls } from '@/pwa/pwa-controls';
import { clearFormDirty } from '@/pwa/activity';
import styles from './app.module.css';

const tabs: { to: string; title: string; icon: IconName }[] = [
  { to: '/', title: 'Início', icon: 'home-outline' },
  { to: '/schedule', title: 'Agenda', icon: 'calendar-outline' },
  { to: '/reservations', title: 'Reservas', icon: 'car-outline' },
  { to: '/settings', title: 'Ajustes', icon: 'settings-outline' },
];
function GuestRoute() {
  const { session } = useSession();
  return session ? (
    <Navigate to={session.activeEstablishmentId ? '/' : '/onboarding'} replace />
  ) : (
    <Outlet />
  );
}
function ProtectedRoute() {
  const { session } = useSession();
  return !session ? (
    <Navigate to="/login" replace />
  ) : !session.activeEstablishmentId ? (
    <Navigate to="/onboarding" replace />
  ) : (
    <Outlet />
  );
}
function OnboardingRoute() {
  const { session } = useSession();
  return !session ? (
    <Navigate to="/login" replace />
  ) : session.activeEstablishmentId ? (
    <Navigate to="/" replace />
  ) : (
    <OnboardingScreen />
  );
}
function Frame() {
  const { pathname } = useLocation();
  const router = useAppNavigation();
  const header = useRef<HTMLHeadingElement>(null);
  const tab = tabs.find((item) => item.to === pathname);
  const title =
    tab?.title ??
    (pathname.startsWith('/reservations/')
      ? 'Detalhes da reserva'
      : pathname.startsWith('/schedule/')
        ? 'Agenda do dia'
        : pathname === '/services'
          ? 'Serviços'
          : pathname === '/services/new'
            ? 'Novo serviço'
            : pathname.startsWith('/services/')
              ? 'Editar serviço'
              : pathname === '/settings/establishment'
                ? 'Estabelecimento'
                : pathname === '/settings/operating'
                  ? 'Funcionamento'
                  : 'Conta');
  useEffect(() => {
    document.title = `${title} · Lava On`;
    window.scrollTo(0, 0);
    header.current?.focus({ preventScroll: true });
    clearFormDirty();
  }, [pathname, title]);
  return (
    <>
      <header className={styles.header}>
        {!tab && (
          <button type="button" aria-label="Voltar" onClick={router.back}>
            <Icon name="chevron-back" />
          </button>
        )}
        <h1 ref={header} tabIndex={-1}>
          {title}
        </h1>
      </header>
      <Outlet />
      {tab && (
        <nav className={styles.tabs} aria-label="Navegação principal">
          {tabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) => (isActive ? styles.active : undefined)}
            >
              <Icon name={item.icon} size={24} />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
function NotFound() {
  const router = useAppNavigation();
  return (
    <ScreenContainer>
      <ErrorState message="Esta página não foi encontrada." />
      <Button title="Voltar ao início" onClick={() => router.replace('/')} />
    </ScreenContainer>
  );
}
function SessionRoutes() {
  const { ready, error, refreshSession } = useSession();
  if (!ready) return <LoadingState label="Preparando o Lava On…" />;
  if (error) return <ErrorState message={error} onRetry={() => void refreshSession()} />;
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="login" element={<LoginScreen />} />
        <Route path="sign-up" element={<SignUpScreen />} />
        <Route path="forgot-password" element={<ForgotPasswordScreen />} />
      </Route>
      <Route path="onboarding" element={<OnboardingRoute />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Frame />}>
          <Route index element={<DashboardScreen />} />
          <Route path="schedule" element={<ScheduleScreen />} />
          <Route path="schedule/:date" element={<DayDetailScreen />} />
          <Route path="reservations" element={<ReservationsScreen />} />
          <Route path="reservations/:id" element={<ReservationDetailScreen />} />
          <Route path="services" element={<ServicesScreen />} />
          <Route path="services/new" element={<ServiceFormScreen key="new" />} />
          <Route path="services/:id" element={<ServiceFormScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="settings/account" element={<AccountScreen />} />
          <Route path="settings/establishment" element={<EstablishmentScreen />} />
          <Route path="settings/operating" element={<OperatingScreen />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
export function App() {
  return (
    <BrowserRouter>
      <div className={styles.app}>
        <a href="#main" className={styles.skip}>
          Ir para o conteúdo
        </a>
        <main id="main" className={styles.main}>
          <SessionRoutes />
        </main>
        <PwaControls />
        <DialogHost />
      </div>
    </BrowserRouter>
  );
}
