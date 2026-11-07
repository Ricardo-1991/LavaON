import { mockDatabase } from '@/data/mocks/storage/mock-database';
import { createRepositories } from './create-repositories';
export const repositories = createRepositories(mockDatabase);
