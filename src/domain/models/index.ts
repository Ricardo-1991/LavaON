export type Id = string;
export type CalendarDate = string;
export type IsoTimestamp = string;

export type ReservationStatus =
  'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type ReservationAction = 'ACCEPT' | 'REJECT' | 'CANCEL' | 'COMPLETE' | 'MARK_NO_SHOW';
export type VehicleCategory = 'SMALL_CAR' | 'LARGE_CAR';
export type MembershipRole = 'OWNER';

export interface Address {
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  complement?: string;
}

export interface Owner {
  id: Id;
  name: string;
  email: string;
  createdAt: IsoTimestamp;
}

export interface EstablishmentMembership {
  ownerId: Id;
  establishmentId: Id;
  role: MembershipRole;
}

export interface Establishment {
  id: Id;
  name: string;
  phone: string;
  address: Address;
  timeZone: string;
  onboardingCompleted: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Customer {
  id: Id;
  establishmentId: Id;
  name: string;
  phone: string;
}

export interface Vehicle {
  id: Id;
  establishmentId: Id;
  customerId: Id;
  description: string;
  plate: string;
  category: VehicleCategory;
}

export interface Service {
  id: Id;
  establishmentId: Id;
  name: string;
  vehicleCategory: VehicleCategory;
  priceInCents: number;
  active: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface OperatingDay {
  establishmentId: Id;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  open: boolean;
  capacity: number;
}

export interface ReservationSnapshot {
  customerName: string;
  customerPhone: string;
  vehicleDescription: string;
  vehiclePlate: string;
  vehicleCategory: VehicleCategory;
  serviceName: string;
  priceInCents: number;
}

export interface Reservation {
  id: Id;
  establishmentId: Id;
  customerId: Id;
  vehicleId: Id;
  serviceId: Id;
  serviceDate: CalendarDate;
  status: ReservationStatus;
  snapshot: ReservationSnapshot;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface Session {
  owner: Owner;
  memberships: EstablishmentMembership[];
  activeEstablishmentId: Id | null;
}

export interface DailyCapacity {
  establishmentId: Id;
  date: CalendarDate;
  open: boolean;
  capacity: number;
  pending: number;
  confirmed: number;
  completed: number;
  noShow: number;
  cancelled: number;
  rejected: number;
  consumed: number;
  available: number;
  inconsistent: boolean;
}

export type ReservationPeriod = 'ALL' | 'TODAY' | 'UPCOMING' | 'HISTORY' | 'DATE';
export type ReservationStatusFilter =
  'ALL' | 'PENDING' | 'CONFIRMED' | 'FINISHED' | 'CANCELLED' | 'REJECTED';

export interface ReservationFilters {
  period?: ReservationPeriod;
  status?: ReservationStatusFilter;
  date?: CalendarDate;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DaySchedule {
  capacity: DailyCapacity;
  reservations: Reservation[];
}

export interface DashboardSummary {
  date: CalendarDate;
  capacity: DailyCapacity;
  pendingReservations: Reservation[];
  confirmedReservations: Reservation[];
  upcomingReservations: Reservation[];
  activeServiceCount: number;
}

export interface EstablishmentInput {
  name: string;
  phone: string;
  address: Address;
}

export interface ServiceInput {
  name: string;
  vehicleCategory: VehicleCategory;
  priceInCents: number;
  active: boolean;
}

export interface SignUpInput {
  name: string;
  email: string;
}
