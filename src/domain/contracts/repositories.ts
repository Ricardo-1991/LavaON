import type {
  CalendarDate,
  DashboardSummary,
  DaySchedule,
  Establishment,
  EstablishmentInput,
  OperatingDay,
  PaginatedResult,
  Reservation,
  ReservationAction,
  ReservationFilters,
  Service,
  ServiceInput,
  Session,
  SignUpInput,
} from '@/domain/models';

export interface AuthRepository {
  getSession(): Promise<Session | null>;
  signIn(email: string): Promise<Session>;
  signUp(input: SignUpInput): Promise<Session>;
  requestPasswordRecovery(email: string): Promise<void>;
  signOut(): Promise<void>;
  updateOwnerName(ownerId: string, name: string): Promise<Session>;
}

export interface EstablishmentRepository {
  getById(establishmentId: string): Promise<Establishment>;
  createForOwner(
    ownerId: string,
    input: EstablishmentInput,
    operatingDays: Omit<OperatingDay, 'establishmentId'>[],
  ): Promise<Establishment>;
  update(establishmentId: string, input: EstablishmentInput): Promise<Establishment>;
  getOperatingDays(establishmentId: string): Promise<OperatingDay[]>;
  updateOperatingDays(establishmentId: string, days: OperatingDay[]): Promise<OperatingDay[]>;
}

export interface ServiceRepository {
  list(establishmentId: string): Promise<Service[]>;
  getById(establishmentId: string, serviceId: string): Promise<Service>;
  create(establishmentId: string, input: ServiceInput): Promise<Service>;
  update(establishmentId: string, serviceId: string, input: ServiceInput): Promise<Service>;
  setActive(establishmentId: string, serviceId: string, active: boolean): Promise<Service>;
}

export interface ReservationRepository {
  list(
    establishmentId: string,
    filters?: ReservationFilters,
  ): Promise<PaginatedResult<Reservation>>;
  getById(establishmentId: string, reservationId: string): Promise<Reservation>;
  performAction(
    establishmentId: string,
    reservationId: string,
    action: ReservationAction,
  ): Promise<Reservation>;
}

export interface ScheduleRepository {
  getRange(establishmentId: string, startDate: CalendarDate, days: number): Promise<DaySchedule[]>;
  getDay(establishmentId: string, date: CalendarDate): Promise<DaySchedule>;
}

export interface DashboardRepository {
  getSummary(establishmentId: string, date: CalendarDate): Promise<DashboardSummary>;
}

export interface Repositories {
  auth: AuthRepository;
  establishments: EstablishmentRepository;
  services: ServiceRepository;
  reservations: ReservationRepository;
  schedule: ScheduleRepository;
  dashboard: DashboardRepository;
}
