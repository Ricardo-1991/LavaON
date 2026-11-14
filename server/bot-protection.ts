import type { IncomingMessage } from 'node:http';
import { checkBotId } from 'botid/server';
import { AppError } from '../src/domain/errors.js';

export async function verifyBrowser(request: IncomingMessage) {
  // Local tests exercise both verdicts by mocking the SDK; no request header bypass exists.
  const verdict = await checkBotId({
    developmentOptions: { isDevelopment: process.env.VERCEL !== '1' },
    advancedOptions: { checkLevel: 'basic', headers: request.headers },
  });
  if (!verdict.isHuman || verdict.isBot || verdict.isVerifiedBot) {
    throw new AppError(
      'FORBIDDEN',
      'Não foi possível validar este acesso. Reabra a página no navegador e tente novamente.',
    );
  }
}
