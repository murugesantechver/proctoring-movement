const redisClient = require("../config/redis");

const CHECKPOINTS_KEY = (userId) => `user:${userId}:checkpoints`;

exports.saveCheckpoint = async (userId, checkpoint, result = null) => {
  const timestamp = new Date().toISOString();
  const checkpointData = result
    ? JSON.stringify({ status: "completed", timestamp, result })
    : JSON.stringify({ status: "completed", timestamp });
  await redisClient.hSet(CHECKPOINTS_KEY(userId), checkpoint, checkpointData);
};

exports.getCheckpoints = async (userId) => {
  const checkpoints = await redisClient.hGetAll(CHECKPOINTS_KEY(userId));
  Object.keys(checkpoints).forEach((key) => {
    try {
      checkpoints[key] = JSON.parse(checkpoints[key]);
    } catch (error) {
      checkpoints[key] = { status: "completed", result: checkpoints[key] };
    }
  });
  return checkpoints;
};

exports.resetToCheckpoint = async (userId, checkpoint) => {
  const checkpoints = await this.getCheckpoints(userId);
  const keysToKeep = Object.keys(checkpoints).filter((key) => key === checkpoint || key === "privacy_policy_done");
  const newCheckpoints = {};
  keysToKeep.forEach((key) => (newCheckpoints[key] = JSON.stringify(checkpoints[key])));
  await redisClient.del(CHECKPOINTS_KEY(userId));
  if (Object.keys(newCheckpoints).length > 0) {
    await redisClient.hSet(CHECKPOINTS_KEY(userId), ...Object.entries(newCheckpoints).flat());
  }
};

exports.clearCheckpoints = async (userId) => {
  await redisClient.del(CHECKPOINTS_KEY(userId));
};
