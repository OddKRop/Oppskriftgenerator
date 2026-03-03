import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_MAX_PER_MINUTE = 5;
const RATE_LIMIT_MINUTE_WINDOW = "60 s";
const RATE_LIMIT_MAX_PER_DAY = 25;
const RATE_LIMIT_DAY_WINDOW = "1 d";

const UNKNOWN_IP_MAX_PER_MINUTE = 2;
const UNKNOWN_IP_MAX_PER_DAY = 5;

type LimitReason = "minute" | "day";

type RateLimitResult = {
  ok: boolean;
  reason?: LimitReason;
  reset?: number;
};

let missingConfigLogged = false;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

const minuteLimiter =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_PER_MINUTE, RATE_LIMIT_MINUTE_WINDOW),
    prefix: "ratelimit:minute",
  });

const dayLimiter =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_PER_DAY, RATE_LIMIT_DAY_WINDOW),
    prefix: "ratelimit:day",
  });

const unknownMinuteLimiter =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(UNKNOWN_IP_MAX_PER_MINUTE, RATE_LIMIT_MINUTE_WINDOW),
    prefix: "ratelimit:unknown:minute",
  });

const unknownDayLimiter =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(UNKNOWN_IP_MAX_PER_DAY, RATE_LIMIT_DAY_WINDOW),
    prefix: "ratelimit:unknown:day",
  });

function getKey(ip: string): string {
  return ip === "unknown" ? "unknown-ip" : ip;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  if (
    !redis ||
    !minuteLimiter ||
    !dayLimiter ||
    !unknownMinuteLimiter ||
    !unknownDayLimiter
  ) {
    if (!missingConfigLogged) {
      console.error(
        "[RateLimit] Missing Upstash config. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
      );
      missingConfigLogged = true;
    }

    return {
      ok: false,
      reason: "minute",
      reset: Math.ceil((Date.now() + 60_000) / 1000),
    };
  }

  const minute = ip === "unknown" ? unknownMinuteLimiter : minuteLimiter;
  const day = ip === "unknown" ? unknownDayLimiter : dayLimiter;
  const key = getKey(ip);

  const minuteResult = await minute.limit(key);
  if (!minuteResult.success) {
    return {
      ok: false,
      reason: "minute",
      reset: Math.ceil(minuteResult.reset / 1000),
    };
  }

  const dayResult = await day.limit(key);
  if (!dayResult.success) {
    return {
      ok: false,
      reason: "day",
      reset: Math.ceil(dayResult.reset / 1000),
    };
  }

  return { ok: true };
}
