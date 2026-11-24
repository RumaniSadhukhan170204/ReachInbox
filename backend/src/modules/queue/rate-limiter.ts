
import { redis } from "../../config/redis";

const RESERVE_SLOT_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local hourlyLimit = tonumber(ARGV[2])
local minDelay = tonumber(ARGV[3])
local member = ARGV[4]

redis.call("ZREMRANGEBYSCORE", key, "-inf", now - 3600000)

local count = redis.call("ZCARD", key)
local last = redis.call("ZREVRANGE", key, 0, 0, "WITHSCORES")

if count >= hourlyLimit then
  local oldest = redis.call("ZRANGE", key, 0, 0, "WITHSCORES")
  return {0, tonumber(oldest[2]) + 3600000 - now}
end

if #last > 0 then
  local nextAllowed = tonumber(last[2]) + minDelay
  if now < nextAllowed then
    return {0, nextAllowed - now}
  end
end

redis.call("ZADD", key, now, member)
redis.call("PEXPIRE", key, 7200000)

return {1, 0}
`;

export async function reserveEmailSlot(
  userId: string,
  hourlyLimit: number,
  emailId: string,
  minDelay: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (!Number.isInteger(hourlyLimit) || hourlyLimit < 1) {
    throw new Error("Hourly limit must be a positive integer");
  }

  if (!Number.isFinite(minDelay) || minDelay < 0) {
    throw new Error("Minimum delay must be non-negative");
  }

  const result = await redis.eval(
    RESERVE_SLOT_SCRIPT,
    1,
    `email-rate:${userId}`,
    Date.now(),
    hourlyLimit,
    minDelay,
    emailId
  ) as number[];

  return {
    allowed: Number(result[0]) === 1,
    retryAfterMs: Math.max(0, Number(result[1]))
  };
}

export async function releaseEmailSlot(
  userId: string,
  emailId: string
): Promise<void> {
  await redis.zrem(`email-rate:${userId}`, emailId);
}
