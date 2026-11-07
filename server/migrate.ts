import { migrate, getPool } from './database.js';
await migrate();
console.log('PostgreSQL: esquema Lava On atualizado, sem apagar cadastros.');
await getPool().end();
