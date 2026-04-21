const redisClient = require("../config/redis");

exports.cacheAdminSettings = async (adminId, settings) => {
  const key = `admin:${adminId}:settings`;
  await redisClient.setex(key, 60 * 10, JSON.stringify(settings));
};

exports.getCachedAdminSettings = async (adminId) => {
  const key = `admin:${adminId}:settings`;
  const cachedData = await redisClient.get(key);
  return cachedData ? JSON.parse(cachedData) : null;
};

exports.clearAdminSettingsCache = async (adminId) => {
  const key = `admin:${adminId}:settings`;
  await redisClient.del(key);
};
