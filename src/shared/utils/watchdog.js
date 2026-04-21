const redisClient = require("../config/redis");
const { finalizeSession } = require("./finalizeSession");
const TIMEOUT_MS = 60_000;

async function checkForExpiredFrames(session_id) {
  const expiredRequests = [];
  const pendingKey = `session:${session_id}:pending_requests`;
  const requestIds = await redisClient.smembers(pendingKey);
  const now = Date.now();

  for (const request_id of requestIds) {
    const tsKey = `session:${session_id}:pending_ts:${request_id}`;
    const timestampStr = await redisClient.get(tsKey);
    const timestamp = Number(timestampStr);
    if (!timestamp) continue;
    const age = now - timestamp;
    if (age > TIMEOUT_MS) {
      console.warn(`[Watchdog] Timeout detected: ${request_id} | Age: ${age}ms`);
      await redisClient.srem(pendingKey, request_id);
      await redisClient.del(tsKey);
      await redisClient.del(`session:${session_id}:frames_pending:request:${request_id}`);
      const newCount = await redisClient.decr(`session:${session_id}:frames_pending`);
      console.log(`[Watchdog] Auto-decremented frames_pending to ${newCount} for session ${session_id}`);
      expiredRequests.push(request_id);
    }
  }

  const remainingAfterTimeouts = await redisClient.scard(pendingKey);
  if (remainingAfterTimeouts === 0) {
    if (expiredRequests.length > 0) {
      console.warn(`[Watchdog] Finalizing session ${session_id} after timeouts. Dropped requests:`, expiredRequests);
    } else {
      console.log(`[Watchdog] No more pending. Finalizing session ${session_id}`);
    }
    await finalizeSession(session_id);
  }
}

async function runWatchdog() {
  const keys = await redisClient.keys("session:*:pending_requests");
  for (const key of keys) {
    const session_id = key.split(":")[1];
    await checkForExpiredFrames(session_id);
  }
  setTimeout(runWatchdog, 10_000);
}

module.exports = runWatchdog;
