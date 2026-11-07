import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleRequest } from '../server/http.js';
export default function handler(
  request: IncomingMessage & { body?: unknown },
  response: ServerResponse,
) {
  return handleRequest(request, response);
}
