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

export function consumeDomainRateLimit(key: string): RateLimitResult {
  const maximum = Number(process.env.DOMAIN_RATE_LIMIT_REQUESTS ?? 20);
  const windowSeconds = Number(process.env.DOMAIN_RATE_LIMIT_WINDOW_SECONDS ?? 60);
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
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
