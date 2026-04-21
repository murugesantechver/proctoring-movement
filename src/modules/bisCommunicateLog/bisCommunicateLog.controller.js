const db = require("../../models/models");
const { createCommunicationLog } = require("../../shared/services/biscommunicationlog.service");
const { deleteS3Frames30Days } = require("../../shared/utils/awsS3Cleanup");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const redisClient = require("../../shared/config/redis");

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CACHE_PREFIX = "image-cache:";

const getCachedImage = async (key) => {
  const redisKey = CACHE_PREFIX + key;
  const data = await redisClient.hgetallBuffer(redisKey);
  if (!data || !data.Body) return null;
  return data;
};

exports.getCommunicationLogs = async (req, res) => {
  try {
    const { organization_id, session_id } = req.query;
    const whereCondition = {};
    if (organization_id) whereCondition.organization_id = organization_id;
    if (session_id) whereCondition.session_id = session_id;
    const logs = await db.BisCommunicationLog.findAll({ where: whereCondition, order: [["timestamp", "DESC"]] });
    return res.json({ success: true, data: logs });
  } catch (error) {
    console.error("Error fetching BisCommunicationLogs:", error);
    return res.status(500).json({ error: "Failed to fetch communication logs" });
  }
};

exports.s3test = async (req, res) => {
  try {
    const result = await deleteS3Frames30Days();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching s3test:", error);
    return res.status(500).json({ error: "Failed to fetch s3test logs" });
  }
};

exports.testS3check = async (req, res) => {
  try {
    const { key } = req.body;
    const cached = await getCachedImage(key);
    if (cached) return res.json({ success: true, message: `Found in Redis Cache -> ${key}`, data: cached });
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    res.json({ success: true, message: `Deleted S3 -> ${key}` });
  } catch (error) {
    console.error("Error deleting S3 test:", error);
    return res.status(500).json({ error: "Failed to delete in S3", message: error.message });
  }
};

exports.deleteRedisCacheImg = async (req, res) => {
  try {
    const { key } = req.body;
    const redisKey = CACHE_PREFIX + key;
    const result = await redisClient.del(redisKey);
    if (result === 1) return res.json({ success: true, message: `Deleted Redis Cache -> ${key}` });
    return res.json({ success: false, message: `Key not found in Redis Cache -> ${key}` });
  } catch (error) {
    console.error("Error deleting Redis Cache Image:", error);
    return res.status(500).json({ error: "Failed to delete in Redis Cache", message: error.message });
  }
};
