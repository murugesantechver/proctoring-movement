const redisClient = require("../config/redis");

exports.storeAccessToken = async (user_id, token) => {
  userKey = `user:${user_id}:token`;
  const isExist = await redisClient.get(userKey);
  if (isExist) await redisClient.del(`token:${isExist}`);
  await redisClient.set(userKey, token);
  await redisClient.set(`token:${token}`, "valid");
};

exports.removeAccessToken = async (token) => {
  return await redisClient.del(`token:${token}`);
};

exports.isAccessTokenValid = async (redis_key) => {
  return await redisClient.get(redis_key);
};
