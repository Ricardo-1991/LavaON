import { createServer } from 'node:http';
import { handleRequest } from './http.js';
import { migrate, ensureDatabaseEnvironment } from './database.js';
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) await migrate();
else await ensureDatabaseEnvironment();
const port = Number(process.env.API_PORT ?? 3001);
createServer((request, response) => {
  void handleRequest(request, response);
}).listen(port, '127.0.0.1', () => console.log(`API Lava On: http://127.0.0.1:${port}`));
