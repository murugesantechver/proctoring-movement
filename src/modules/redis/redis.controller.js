const redisClient = require("../../shared/config/redis");
const db = require("../../models/models");

function decodeWssId(encodedString) {
  try { const searchParams = new URLSearchParams(encodedString); return searchParams.get("wssId"); }
  catch (error) { console.error("Error decoding wssid:", error); return null; }
}

function resetStepProgressInRedis(encodedString) {
  try { const searchParams = new URLSearchParams(encodedString); const data = Object.fromEntries(searchParams.entries()); data.stepIndex = 0; return new URLSearchParams(data).toString(); }
  catch (error) { console.error("Error decoding data:", error); return null; }
}

exports.createRedisValue = async (req, res) => {
  const { redisKey, value } = req.body;
  if (typeof redisKey !== "string" || typeof value !== "string") return res.status(400).json({ error: "redisKey and value must be strings" });
  try { await redisClient.set(redisKey, value); res.status(201).json({ message: "Value created", redisKey, value }); }
  catch (error) { console.error("Redis create error:", error); res.status(500).json({ error: "Internal server error" }); }
};

exports.updateRedisValue = async (req, res) => {
  const { redisKey, value } = req.body;
  if (typeof redisKey !== "string" || typeof value !== "string") return res.status(400).json({ error: "redisKey and value must be strings" });
  try { await redisClient.set(redisKey, value); res.status(200).json({ message: "Value updated", redisKey, value }); }
  catch (error) { console.error("Redis update error:", error); res.status(500).json({ error: "Internal server error" }); }
};

exports.getRedisValue = async (req, res) => {
  const { redisKey } = req.params;
  const EXPIRY_MS = 6 * 30 * 24 * 60 * 60 * 1000;
  try {
    const value = await redisClient.get(redisKey);
    if (!value) return res.status(404).json({ message: "Key not found" });
    let sessionId;
    try { sessionId = decodeWssId(value); } catch (err) { return res.status(200).json({ redisKey, value }); }
    if (!sessionId) return res.status(200).json({ redisKey, value });
    const session = await db.Session.findOne({ where: { id: sessionId }, attributes: ["updatedAt"] });
    if (!session) return res.status(200).json({ redisKey, value });
    const lastUpdatedMs = new Date(session.updatedAt).getTime();
    const now = Date.now();
    if (now - lastUpdatedMs > EXPIRY_MS) {
      const newValue = resetStepProgressInRedis(value);
      await redisClient.set(redisKey, newValue);
      return res.status(200).json({ redisKey, value: newValue, expired: true });
    }
    return res.status(200).json({ redisKey, value, expired: false });
  } catch (error) { console.error("Redis get error:", error); return res.status(500).json({ error: "Internal server error" }); }
};

exports.deleteRedisValue = async (req, res) => {
  const { redisKey } = req.params;
  try { await redisClient.del(redisKey); res.status(200).json({ message: "Key deleted", redisKey }); }
  catch (error) { console.error("Redis delete error:", error); res.status(500).json({ error: "Internal server error" }); }
};
