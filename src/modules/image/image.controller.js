const multer = require("multer");
const imageService = require("../../shared/services/image.service");
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const AWS = require("aws-sdk");
const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const redisClient = require("../../shared/config/redis");
const CACHE_PREFIX = "image-cache:";
const { pipeline } = require("stream/promises");

exports.uploadImage = (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: "Upload error: " + err.message });
    const { userId, organisation_id, type } = req.body;
    if (!req.file || !userId || !type || !organisation_id) return res.status(400).json({ error: "Missing file, userId, type or organisationId" });
    const fileName = `${type}_${userId}_${Date.now()}`;
    const fileData = req.file.buffer.toString("base64");
    const result = await imageService.handleImageUpload({ userId, organisation_id, fileName, fileData, type });
    if (result.success) return res.status(200).json({ message: result.message });
    else return res.status(500).json({ error: result.message });
  });
};

exports.getUploadStatus = async (req, res) => {
  const userId = req.params.userId;
  const userData = await redisClient.get(`user:${userId}`);
  if (!userData) return res.status(404).json({ error: "No upload data found for user" });
  res.json(JSON.parse(userData));
};

const getCachedImage = async (key) => {
  const redisKey = CACHE_PREFIX + key;
  const data = await redisClient.hgetallBuffer(redisKey);
  if (!data || !data.Body) return null;
  return data;
};

const setCachedImage = async (key, buffer, contentType, etag, ttl = 3600) => {
  const redisKey = CACHE_PREFIX + key;
  await redisClient.del(redisKey);
  await redisClient.hmset(redisKey, { Body: buffer, ContentType: Buffer.from(contentType), ETag: Buffer.from(etag) });
  await redisClient.expire(redisKey, ttl);
};

exports.streamImage = async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "Image key is required" });
    const cached = await getCachedImage(key);
    if (cached) {
      res.setHeader("Content-Type", cached.ContentType.toString());
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("ETag", cached.ETag.toString());
      return res.end(cached.Body);
    }
    const head = await s3.headObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }).promise();
    res.setHeader("Content-Type", head.ContentType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("ETag", head.ETag);
    const s3Stream = s3.getObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key }).createReadStream();
    const chunks = [];
    s3Stream.on("data", (chunk) => chunks.push(chunk));
    s3Stream.on("error", (err) => { console.error("S3 stream error:", err); if (!res.headersSent) res.status(500).json({ error: "Error streaming image" }); });
    s3Stream.on("end", async () => { const buffer = Buffer.concat(chunks); await setCachedImage(key, buffer, head.ContentType, head.ETag); });
    await pipeline(s3Stream, res);
  } catch (err) {
    console.error("Error streaming image:", err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
};
