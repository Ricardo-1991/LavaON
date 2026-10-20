import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, test, vi } from 'vitest';
import { MockDatabase, DATABASE_NAME } from '@/data/mocks/storage/mock-database';

describe('persistência IndexedDB', () => {
  test('restaura os dados gravados numa nova instância', async () => {
    const factory = new IDBFactory();
    const db = new MockDatabase(factory);
    await db.write((state) => {
      state.owners[0]!.name = 'Nome persistido';
    });
    expect(await new MockDatabase(factory).read((state) => state.owners[0]!.name)).toBe(
      'Nome persistido',
    );
  });
  test('serializa alterações entre instâncias sem perder atualizações', async () => {
    const factory = new IDBFactory();
    const first = new MockDatabase(factory),
      second = new MockDatabase(factory);
    await Promise.all([
      first.write((state) => {
        state.owners[0]!.name = 'João atualizado';
      }),
      second.write((state) => {
        state.owners[1]!.name = 'Pedro atualizado';
      }),
    ]);
    expect(await first.read((state) => state.owners.map((owner) => owner.name))).toEqual([
      'João atualizado',
      'Pedro atualizado',
    ]);
  });
  test('reverte a transação se a regra de negócio rejeitar a alteração', async () => {
    const db = new MockDatabase(new IDBFactory());
    const initial = await db.read((state) => state.owners[0]!.name);
    await expect(
      db.write((state) => {
        state.owners[0]!.name = 'Não persistir';
        throw new Error('Operação inválida');
      }),
    ).rejects.toThrow('Operação inválida');
    expect(await db.read((state) => state.owners[0]!.name)).toBe(initial);
  });
  test('falha de gravação preserva o estado anterior', async () => {
    const factory = new IDBFactory();
    const db = new MockDatabase(factory);
    await db.read((state) => state.owners);
    const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    await expect(
      db.write((state) => {
        state.owners[0]!.name = 'Não persistir';
      }),
    ).rejects.toThrow();
    put.mockRestore();
    expect(await db.read((state) => state.owners[0]!.name)).toBe('João Silva');
  });
  test('não substitui dados incompatíveis por uma nova demonstração', async () => {
    const factory = new IDBFactory();
    await new MockDatabase(factory).read((state) => state.owners);
    await new Promise<void>((resolve, reject) => {
      const open = factory.open(DATABASE_NAME, 1);
      open.onsuccess = () => {
        const transaction = open.result.transaction('state', 'readwrite');
        transaction.objectStore('state').put({ schemaVersion: 99, original: true }, 'database');
        transaction.oncomplete = () => {
          open.result.close();
          resolve();
        };
        transaction.onabort = () => reject(transaction.error);
      };
    });
    await expect(new MockDatabase(factory).read((state) => state.owners)).rejects.toThrow(
      'Nenhum cadastro foi apagado',
    );
    const stored = await new Promise<unknown>((resolve) => {
      const open = factory.open(DATABASE_NAME, 1);
      open.onsuccess = () => {
        const request = open.result.transaction('state').objectStore('state').get('database');
        request.onsuccess = () => {
          resolve(request.result);
          open.result.close();
        };
      };
    });
    expect(stored).toEqual({ schemaVersion: 99, original: true });
  });
  test('informa indisponibilidade sem fingir persistência', async () => {
    const db = new MockDatabase({
      open: () => {
        throw new Error('Armazenamento bloqueado');
      },
    } as unknown as IDBFactory);
    await expect(db.read((state) => state.owners)).rejects.toThrow('Armazenamento bloqueado');
  });
});
