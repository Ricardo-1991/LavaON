import { readFile, writeFile } from 'node:fs/promises';
import { exportEncryptedBackup, restoreEncryptedBackup } from '../server/backup.js';
import { ensureDatabaseEnvironment, getPool } from '../server/database.js';

const [command, file] = process.argv.slice(2);
const key = process.env.LAVA_BACKUP_KEY;
if (!file || !key || !['export', 'restore'].includes(command ?? ''))
  throw new Error(
    'Informe export/restore, caminho do arquivo e LAVA_BACKUP_KEY (32 bytes em base64).',
  );
try {
  await ensureDatabaseEnvironment();
  if (command === 'export')
    await writeFile(file, await exportEncryptedBackup(getPool(), key), { mode: 0o600, flag: 'wx' });
  else {
    if (process.env.LAVA_RESTORE_EMPTY !== 'yes')
      throw new Error('Defina LAVA_RESTORE_EMPTY=yes para restaurar em um banco vazio.');
    await restoreEncryptedBackup(getPool(), key, await readFile(file));
  }
  console.log('Operação de backup concluída. Sessões não são copiadas ou restauradas.');
} catch {
  console.error(
    'Backup não concluído. Confira chave, arquivo, ambiente e banco de destino vazio. Não foram exibidos dados nem credenciais.',
  );
  process.exitCode = 1;
} finally {
  await getPool().end();
}
