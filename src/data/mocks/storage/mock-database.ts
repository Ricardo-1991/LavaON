import { AppError } from '@/domain/errors';
import { beginWrite, clearFormDirty } from '@/pwa/activity';
import { addDays, format } from 'date-fns';

import type {
  Customer,
  Establishment,
  EstablishmentMembership,
  OperatingDay,
  Owner,
  Reservation,
  Service,
  Vehicle,
} from '@/domain/models';
import { getTodayInTimeZone } from '@/domain/rules/reservations';

export const DATABASE_NAME = 'lava-on-demo';
const STORE = 'state';
const STORAGE_KEY = 'database';

export interface MockDatabaseState {
  schemaVersion: 1;
  sessionOwnerId: string | null;
  owners: Owner[];
  establishments: Establishment[];
  memberships: EstablishmentMembership[];
  customers: Customer[];
  vehicles: Vehicle[];
  services: Service[];
  operatingDays: OperatingDay[];
  reservations: Reservation[];
}

function relativeDate(offset: number): string {
  const today = getTodayInTimeZone('America/Sao_Paulo');
  return format(addDays(new Date(`${today}T12:00:00Z`), offset), 'yyyy-MM-dd');
}

function reservation(
  id: string,
  establishmentId: string,
  customer: Customer,
  vehicle: Vehicle,
  service: Service,
  dateOffset: number,
  status: Reservation['status'],
  createdOffset = -2,
): Reservation {
  const createdAt = addDays(new Date(), createdOffset).toISOString();
  return {
    id,
    establishmentId,
    customerId: customer.id,
    vehicleId: vehicle.id,
    serviceId: service.id,
    serviceDate: relativeDate(dateOffset),
    status,
    snapshot: {
      customerName: customer.name,
      customerPhone: customer.phone,
      vehicleDescription: vehicle.description,
      vehiclePlate: vehicle.plate,
      vehicleCategory: vehicle.category,
      serviceName: service.name,
      priceInCents: service.priceInCents,
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function createSeed(): MockDatabaseState {
  const timestamp = new Date().toISOString();
  const owners: Owner[] = [
    { id: 'owner-joao', name: 'João Silva', email: 'joao@lavaon.com.br', createdAt: timestamp },
    { id: 'owner-pedro', name: 'Pedro Costa', email: 'pedro@lavaon.com.br', createdAt: timestamp },
  ];
  const establishments: Establishment[] = [
    {
      id: 'establishment-joao',
      name: 'Lava Jato do João',
      phone: '(11) 99999-1111',
      address: {
        street: 'Rua das Palmeiras',
        number: '120',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01001-000',
      },
      timeZone: 'America/Sao_Paulo',
      onboardingCompleted: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'establishment-pedro',
      name: 'Clean Car',
      phone: '(21) 98888-2222',
      address: {
        street: 'Avenida Atlântica',
        number: '50',
        district: 'Copacabana',
        city: 'Rio de Janeiro',
        state: 'RJ',
        postalCode: '22010-000',
      },
      timeZone: 'America/Sao_Paulo',
      onboardingCompleted: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  const memberships: EstablishmentMembership[] = [
    { ownerId: 'owner-joao', establishmentId: 'establishment-joao', role: 'OWNER' },
    { ownerId: 'owner-pedro', establishmentId: 'establishment-pedro', role: 'OWNER' },
  ];
  const services: Service[] = [
    {
      id: 'service-complete-small',
      establishmentId: 'establishment-joao',
      name: 'Lavagem completa',
      vehicleCategory: 'SMALL_CAR',
      priceInCents: 4000,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'service-complete-large',
      establishmentId: 'establishment-joao',
      name: 'Lavagem completa',
      vehicleCategory: 'LARGE_CAR',
      priceInCents: 5500,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'service-wax-small',
      establishmentId: 'establishment-joao',
      name: 'Lavagem + cera',
      vehicleCategory: 'SMALL_CAR',
      priceInCents: 6000,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'service-clean-car',
      establishmentId: 'establishment-pedro',
      name: 'Lavagem expressa',
      vehicleCategory: 'SMALL_CAR',
      priceInCents: 3500,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
  const customers: Customer[] = [
    {
      id: 'customer-ana',
      establishmentId: 'establishment-joao',
      name: 'Ana Lima',
      phone: '(11) 98810-1010',
    },
    {
      id: 'customer-carlos',
      establishmentId: 'establishment-joao',
      name: 'Carlos Souza',
      phone: '(11) 97720-2020',
    },
    {
      id: 'customer-marina',
      establishmentId: 'establishment-joao',
      name: 'Marina Alves',
      phone: '(11) 96630-3030',
    },
    {
      id: 'customer-lucas',
      establishmentId: 'establishment-joao',
      name: 'Lucas Rocha',
      phone: '(11) 95540-4040',
    },
    {
      id: 'customer-other',
      establishmentId: 'establishment-pedro',
      name: 'Cliente Clean',
      phone: '(21) 94444-5555',
    },
  ];
  const vehicles: Vehicle[] = [
    {
      id: 'vehicle-ana',
      establishmentId: 'establishment-joao',
      customerId: 'customer-ana',
      description: 'Honda Fit prata',
      plate: 'ABC1D23',
      category: 'SMALL_CAR',
    },
    {
      id: 'vehicle-carlos',
      establishmentId: 'establishment-joao',
      customerId: 'customer-carlos',
      description: 'Toyota Hilux preta',
      plate: 'DEF4G56',
      category: 'LARGE_CAR',
    },
    {
      id: 'vehicle-marina',
      establishmentId: 'establishment-joao',
      customerId: 'customer-marina',
      description: 'Volkswagen Polo branco',
      plate: 'GHI7J89',
      category: 'SMALL_CAR',
    },
    {
      id: 'vehicle-lucas',
      establishmentId: 'establishment-joao',
      customerId: 'customer-lucas',
      description: 'Jeep Compass cinza',
      plate: 'KLM0N12',
      category: 'LARGE_CAR',
    },
    {
      id: 'vehicle-other',
      establishmentId: 'establishment-pedro',
      customerId: 'customer-other',
      description: 'Fiat Argo vermelho',
      plate: 'XYZ9A87',
      category: 'SMALL_CAR',
    },
  ];
  const byId = <T extends { id: string }>(items: T[], id: string) =>
    items.find((item) => item.id === id)!;
  const reservations: Reservation[] = [
    reservation(
      'reservation-1',
      'establishment-joao',
      byId(customers, 'customer-ana'),
      byId(vehicles, 'vehicle-ana'),
      byId(services, 'service-complete-small'),
      0,
      'PENDING',
    ),
    reservation(
      'reservation-2',
      'establishment-joao',
      byId(customers, 'customer-carlos'),
      byId(vehicles, 'vehicle-carlos'),
      byId(services, 'service-complete-large'),
      0,
      'CONFIRMED',
    ),
    reservation(
      'reservation-3',
      'establishment-joao',
      byId(customers, 'customer-marina'),
      byId(vehicles, 'vehicle-marina'),
      byId(services, 'service-wax-small'),
      0,
      'COMPLETED',
      -4,
    ),
    reservation(
      'reservation-4',
      'establishment-joao',
      byId(customers, 'customer-lucas'),
      byId(vehicles, 'vehicle-lucas'),
      byId(services, 'service-complete-large'),
      1,
      'CONFIRMED',
    ),
    reservation(
      'reservation-5',
      'establishment-joao',
      byId(customers, 'customer-ana'),
      byId(vehicles, 'vehicle-ana'),
      byId(services, 'service-wax-small'),
      2,
      'PENDING',
    ),
    reservation(
      'reservation-6',
      'establishment-joao',
      byId(customers, 'customer-carlos'),
      byId(vehicles, 'vehicle-carlos'),
      byId(services, 'service-complete-large'),
      -1,
      'NO_SHOW',
      -5,
    ),
    reservation(
      'reservation-7',
      'establishment-joao',
      byId(customers, 'customer-marina'),
      byId(vehicles, 'vehicle-marina'),
      byId(services, 'service-complete-small'),
      -2,
      'PENDING',
      -6,
    ),
    reservation(
      'reservation-other',
      'establishment-pedro',
      byId(customers, 'customer-other'),
      byId(vehicles, 'vehicle-other'),
      byId(services, 'service-clean-car'),
      0,
      'CONFIRMED',
    ),
  ];
  const closedWeekday = new Date(`${relativeDate(3)}T12:00:00Z`).getUTCDay();
  const operatingDays = establishments.flatMap((establishment) =>
    ([0, 1, 2, 3, 4, 5, 6] as const).map((weekday) => ({
      establishmentId: establishment.id,
      weekday,
      open: weekday !== closedWeekday,
      capacity: weekday === 6 ? 12 : 15,
    })),
  );

  return {
    schemaVersion: 1,
    sessionOwnerId: null,
    owners,
    establishments,
    memberships,
    customers,
    vehicles,
    services,
    operatingDays,
    reservations,
  };
}

function validateState(value: unknown): MockDatabaseState {
  if (!value || typeof value !== 'object')
    throw new AppError(
      'PERSISTENCE',
      'Os dados locais não puderam ser lidos. Nenhum cadastro foi apagado.',
    );
  const state = value as MockDatabaseState;
  const collections = [
    'owners',
    'establishments',
    'memberships',
    'customers',
    'vehicles',
    'services',
    'operatingDays',
    'reservations',
  ] as const;
  if (
    state.schemaVersion !== 1 ||
    collections.some((key) => !Array.isArray(state[key])) ||
    !(state.sessionOwnerId === null || typeof state.sessionOwnerId === 'string')
  ) {
    throw new AppError(
      'PERSISTENCE',
      'A versão dos dados locais não é compatível. Nenhum cadastro foi apagado.',
    );
  }
  return state;
}

export class MockDatabase {
  private connection: Promise<IDBDatabase> | null = null;
  constructor(private factory: IDBFactory | undefined = globalThis.indexedDB) {}

  private open(): Promise<IDBDatabase> {
    if (this.connection) return this.connection;
    this.connection = new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.factory)
        return reject(
          new AppError(
            'PERSISTENCE',
            'Este navegador não disponibilizou o armazenamento local. Verifique as permissões e tente novamente.',
          ),
        );
      const request = this.factory.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () =>
        reject(
          new AppError(
            'PERSISTENCE',
            'Não foi possível abrir os dados locais. Nenhum cadastro foi apagado.',
          ),
        );
      request.onblocked = () =>
        reject(new AppError('PERSISTENCE', 'Feche outras abas do Lava On e tente novamente.'));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.connection = null;
        };
        resolve(db);
      };
    }).catch((cause) => {
      this.connection = null;
      throw cause;
    });
    return this.connection;
  }

  async read<T>(reader: (state: MockDatabaseState) => T): Promise<T> {
    return this.transaction(reader, false);
  }

  async write<T>(writer: (draft: MockDatabaseState) => T): Promise<T> {
    const finish = beginWrite();
    try {
      const output = await this.transaction(writer, true);
      clearFormDirty();
      return output;
    } finally {
      finish();
    }
  }

  private async transaction<T>(
    operation: (state: MockDatabaseState) => T,
    write: boolean,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      // The read/modify/write stays in one transaction, including across multiple tabs.
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(STORAGE_KEY);
      let output: T;
      let cause: unknown;
      transaction.oncomplete = () => resolve(output);
      transaction.onabort = () =>
        reject(
          cause ??
            new AppError(
              'PERSISTENCE',
              'Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e tente novamente. Os cadastros anteriores foram preservados.',
            ),
        );
      transaction.onerror = () => {
        /* onabort reports the failure after rollback. */
      };
      request.onsuccess = () => {
        try {
          const state = request.result === undefined ? createSeed() : validateState(request.result);
          output = operation(state);
          if (write || request.result === undefined) {
            try {
              store.put(state, STORAGE_KEY);
            } catch {
              throw new AppError(
                'PERSISTENCE',
                'Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e tente novamente. Os cadastros anteriores foram preservados.',
              );
            }
          }
        } catch (error) {
          cause = error;
          transaction.abort();
        }
      };
    });
  }
}

export const mockDatabase = new MockDatabase();
