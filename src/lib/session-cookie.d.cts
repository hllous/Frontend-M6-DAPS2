export const DEFAULT_LOCAL_SESSION_SECRET: string;
export const SESSION_IDLE_MS: number;
export const SESSION_ABSOLUTE_MS: number;

export function createMockSessionState<TScenarioId extends string>(
  scenarioId: TScenarioId,
  now: number,
): {
  mode: "mock";
  scenarioId: TScenarioId;
  issuedAt: number;
  lastActivityAt: number;
  absoluteExpiresAt: number;
  jwtExpiresAt: number;
};

export function sealSessionValue(session: object, secret: string): string;
export function openSessionValue(cookieValue: string, secret: string): string;
export function createLocalMockWarmupCookie(
  environment: { NODE_ENV?: string; M6_AUTH_MODE?: string; M6_SESSION_SECRET?: string },
  now?: number,
): string;
