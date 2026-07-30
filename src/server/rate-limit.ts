interface WindowState {
  count: number;
  resetAt: number;
}

const windows = new Map<string, WindowState>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function consumeRateLimit(
  namespace: string,
  key: string,
  maximum: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowKey = `${namespace}:${key}`;
  const current = windows.get(windowKey);

  if (!current || current.resetAt <= now) {
    windows.set(windowKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: maximum - 1, retryAfterSeconds: 0 };
  }
  if (current.count >= maximum) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000)
    };
  }
  current.count += 1;
  return { allowed: true, remaining: maximum - current.count, retryAfterSeconds: 0 };
}

export function consumeDomainRateLimit(key: string): RateLimitResult {
  return consumeRateLimit(
    "domains",
    key,
    Number(process.env.DOMAIN_RATE_LIMIT_REQUESTS ?? 10),
    Number(process.env.DOMAIN_RATE_LIMIT_WINDOW_SECONDS ?? 60)
  );
}

export function consumeAIRateLimit(key: string): RateLimitResult {
  return consumeRateLimit(
    "ai",
    key,
    Number(process.env.AI_RATE_LIMIT_REQUESTS ?? 5),
    Number(process.env.AI_RATE_LIMIT_WINDOW_SECONDS ?? 60)
  );
}
