import type {
  Customer,
  Establishment,
  EstablishmentMembership,
  OperatingDay,
  Owner,
  Reservation,
  Service,
  ScheduleDay,
  Vehicle,
} from './index';
export interface ApplicationState {
  schemaVersion: 1;
  sessionOwnerId: string | null;
  owners: Owner[];
  establishments: Establishment[];
  memberships: EstablishmentMembership[];
  customers: Customer[];
  vehicles: Vehicle[];
  services: Service[];
  operatingDays: OperatingDay[];
  scheduleDays: ScheduleDay[];
  reservations: Reservation[];
}

export interface StateDatabase {
  read<T>(reader: (state: ApplicationState) => T): Promise<T>;
  write<T>(writer: (state: ApplicationState) => T): Promise<T>;
}
