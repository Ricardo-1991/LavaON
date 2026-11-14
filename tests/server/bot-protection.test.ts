import { afterEach, expect, test, vi } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { checkBotId } from 'botid/server';
import { verifyBrowser } from '../../server/bot-protection';
vi.mock('botid/server', () => ({ checkBotId: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
test('produção exige veredito humano do provedor sem aceitar bypass por cabeçalho', async () => {
  vi.stubEnv('VERCEL', '1');
  const request = { headers: { 'x-skip-bot-check': 'true' } } as unknown as IncomingMessage;
  vi.mocked(checkBotId).mockResolvedValue({
    isHuman: false,
    isBot: true,
    isVerifiedBot: false,
    bypassed: false,
  });
  await expect(verifyBrowser(request)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(checkBotId).toHaveBeenCalledWith({
    developmentOptions: { isDevelopment: false },
    advancedOptions: { checkLevel: 'basic', headers: request.headers },
  });
  vi.mocked(checkBotId).mockResolvedValue({
    isHuman: true,
    isBot: false,
    isVerifiedBot: false,
    bypassed: false,
  });
  await expect(verifyBrowser(request)).resolves.toBeUndefined();
  vi.mocked(checkBotId).mockRejectedValue(new Error('unavailable'));
  await expect(verifyBrowser(request)).rejects.toThrow('unavailable');
});
