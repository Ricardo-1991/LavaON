import type { IncomingMessage, ServerResponse } from 'node:http';
import { ZodError } from 'zod';
import { AppError } from '../src/domain/errors.js';
import { authenticate, bookPublic, getPublicSchedule, ownerRequest } from './application.js';
import { digest, rateLimit, readToken, sessionCookie } from './auth.js';

async function readJson(request: IncomingMessage & { body?: unknown }) {
  if (request.body !== undefined) {
    const value = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    if (Buffer.byteLength(JSON.stringify(value)) > 16000)
      throw new AppError('VALIDATION', 'Solicitação muito grande.');
    return value;
  }
  let body = '';
  for await (const chunk of request) {
    body += String(chunk);
    if (Buffer.byteLength(body) > 16000)
      throw new AppError('VALIDATION', 'Solicitação muito grande.');
  }
  return JSON.parse(body);
}
export async function handleRequest(
  request: IncomingMessage & { body?: unknown },
  response: ServerResponse,
) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status: number, value: unknown) => {
    response.statusCode = status;
    response.end(JSON.stringify(value));
  };
  try {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL)
      return send(503, {
        code: 'PERSISTENCE',
        message:
          'O agendamento compartilhado ainda não está conectado ao banco. Tente novamente mais tarde.',
      });
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname !== '/api/app')
      return send(404, { code: 'NOT_FOUND', message: 'Recurso não encontrado.' });
    if (request.method === 'GET') {
      if (url.searchParams.get('health') === '1') return send(200, { status: 'ok' });
      const establishmentId = url.searchParams.get('establishment');
      if (!establishmentId || establishmentId.length > 150)
        throw new AppError('NOT_FOUND', 'Agenda não encontrada.');
      return send(200, { data: await getPublicSchedule(establishmentId) });
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      return send(405, { message: 'Método não permitido.' });
    }
    const origin = request.headers.origin;
    if (
      (origin &&
        origin !== process.env.APP_ORIGIN &&
        new URL(origin).host !== request.headers.host) ||
      request.headers['sec-fetch-site'] === 'cross-site'
    )
      return send(403, { message: 'Origem não permitida.' });
    if (!request.headers['content-type']?.startsWith('application/json'))
      return send(415, { message: 'Envie os dados em JSON.' });
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new AppError('VALIDATION', 'Solicitação inválida.');
    const token = readToken(request);
    const ip = String(
      request.headers['x-vercel-forwarded-for'] ??
        request.headers['x-forwarded-for'] ??
        request.socket.remoteAddress ??
        'unknown',
    )
      .split(',')[0]!
      .trim();
    const secure = process.env.VERCEL === '1' || request.headers['x-forwarded-proto'] === 'https';
    if (body.op === 'auth.signIn' || body.op === 'auth.signUp') {
      await rateLimit(`auth-ip:${ip}`, 30, 900);
      const input = Array.isArray(body.args) ? body.args[0] : null;
      if (input && typeof input.email === 'string')
        await rateLimit(`auth-email:${digest(input.email.trim().toLowerCase())}`, 15, 900);
      const result = await authenticate(body.op === 'auth.signIn' ? 'signIn' : 'signUp', input);
      response.setHeader('Set-Cookie', sessionCookie(result.token, secure));
      return send(200, { data: result.session });
    }
    if (body.op === 'public.book') {
      await rateLimit(`booking:${ip}`, 25, 900);
      if (
        !Array.isArray(body.args) ||
        typeof body.args[0] !== 'string' ||
        body.args[0].length > 150
      )
        throw new AppError('VALIDATION', 'Agenda inválida.');
      return send(200, { data: await bookPublic(body.args[0], body.args[1]) });
    }
    const result = await ownerRequest(token, body);
    if (body.op === 'auth.signOut') response.setHeader('Set-Cookie', sessionCookie('', secure));
    return send(200, { data: result });
  } catch (error) {
    if (error instanceof ZodError)
      return send(400, {
        code: 'VALIDATION',
        message: error.issues[0]?.message ?? 'Confira os dados informados.',
      });
    if (error instanceof SyntaxError)
      return send(400, { code: 'VALIDATION', message: 'Solicitação inválida.' });
    if (error instanceof AppError)
      return send(
        error.code === 'UNAUTHORIZED'
          ? 401
          : error.code === 'NOT_FOUND'
            ? 404
            : error.code === 'CAPACITY_CONFLICT'
              ? 409
              : 400,
        { code: error.code, message: error.message },
      );
    // Do not log payloads, connection strings or PostgreSQL error details (may contain personal data).
    console.error('Lava On: falha na operação do servidor.');
    return send(503, {
      code: 'PERSISTENCE',
      message:
        'Não foi possível acessar o servidor. Seus dados foram preservados. Tente novamente.',
    });
  }
}
