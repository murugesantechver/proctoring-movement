const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { Op, Sequelize } = require("sequelize");
const db = require('../../models/models')
// AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const redisClient = require("../config/redis");
const CACHE_PREFIX = "image-cache:";

async function getCachedImage(key) {
  const redisKey = CACHE_PREFIX + key;
  const data = await redisClient.hgetallBuffer(redisKey);
  if (!data || !data.Body) return null;
  return data;
}

const cleanFramesByDays = async (days, status) => {
  try {
    console.log(`[CLEANUP] Starting cleanup for sessions older than ${days} days...`);

    const sessionWhere = {};

    if (status === 'in_progress') {
      sessionWhere.status = 'in_progress';
      sessionWhere.started_at = { [Op.lt]: Sequelize.literal(`NOW() - INTERVAL '${days} days'`) };
    } else if (status === 'valid' || status === 'invalid') {
      sessionWhere.status = { [Op.in]: ['valid', 'invalid'] };
      sessionWhere.ended_at = { [Op.lt]: Sequelize.literal(`NOW() - INTERVAL '${days} days'`) };
    }

    const oldSessions = await db.Session.findAll({
      where: sessionWhere,
      attributes: ['id', 'organization_id']
    });

    if (!oldSessions.length) {
      console.log(`[CLEANUP] No sessions ended ${days} days ago.`);
      return { success: true, deletedCount: 0 };
    }

    const sessionIds = oldSessions.map(s => s.id);

    const whereCondition = {
      session_id: sessionIds,
      frame_image: { [Op.ne]: null }
    };

    if(status === 'valid' || status === 'invalid') {
        whereCondition.id_status = status;
    }

    const results = await db.AIResult.findAll({
      where: whereCondition
    });

    console.log(`[CLEANUP] Found ${results.length} frame items to purge.`);
    if (!results.length) {
      return { success: true, deletedCount: 0 };
    }

    for (const rec of results) {
      try {
        const key = rec.frame_image;
        console.log(`[CHECK] Processing Key: ${key}`);

        // Step 1 --> Redis check & delete
        const cached = await getCachedImage(key);
        const redisKey = CACHE_PREFIX + key;
        //console.log(`[CHECK] cached : ${cached}`);

        if (cached) {
          await redisClient.del(redisKey);
          console.log(`[REDIS] Deleted cache: ${redisKey}`);
        } else {
          console.log(`[REDIS] Cache not found: ${redisKey}`);
        }

        // Step 2 --> Delete from S3
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
        console.log(`[S3] Deleted object: ${key}`);

        // Step 3 --> Audit Log
        const session = await db.Session.findOne({ where: { id: rec.session_id } });
        await db.AuditLog.create({
          organization_id: session.organization_id,
          action: "CLEANUP_FRAMES",
          action_type: "DELETE",
          affected_entity: "AIResult",
          description: `System auto clean: deleted frame image for Session ${rec.session_id}`
        });
      } catch (err) {
        console.error(`[CLEANUP ERROR] Failed for ${rec.id}: ${err.message}`);
      }
    }

    console.log(`[CLEANUP] Completed cleanup for ${days} days.`);
    return { success: true, deletedCount: results.length || 0 };
  } catch (error) {
    console.error(`[CLEANUP GLOBAL ERROR] ${error.message}`);
    return { success: false, error: error.message };
  }
};


exports.deleteS3Frames30Days = async () => {
  return cleanFramesByDays(30, 'valid');
}

exports.deleteS3Frames2Years = async () => {
  return cleanFramesByDays(365 * 2, 'invalid');
}

exports.deleteS3Frames213Days = async () => {
  return cleanFramesByDays(213, 'in_progress');
}
// Delete S3 objects older than 2 years
/*
exports.deleteS3_2yearOldObjects = async () => {
    try {
        const days = 365 * 2; // 2 years
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        console.log(`\n[INFO] Cleanup for objects older than ${days} days, Cutoff date: ${cutoffDate.toISOString()}`);

        const response = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME }));

        if (!response.Contents || response.Contents.length === 0) {
            console.log("[INFO] No objects found in bucket.");
            return;
        }

        console.log(`[INFO] Total objects fetched: ${response.Contents.length}`);

        const oldKeys = response.Contents
            .filter((obj) => obj.LastModified && obj.LastModified < cutoffDate)
            .map((obj) => ({ Key: obj.Key }));

        console.log(`[DEBUG] Objects older than ${days} days:`, oldKeys.map((k) => k.Key));

        if (oldKeys.length > 0) {
            await s3.send(new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: { Objects: oldKeys },
            }));
            console.log(`[SUCCESS] Deleted ${oldKeys.length} objects older than ${days} days.`);
        } else {
            console.log(`[INFO] No objects older than ${days} days found.`);
        }

        console.log(`[END] Cleanup finished for ${days} days\n`);
    } catch (err) {
        console.error(`[ERROR] Failed to delete objects older than 2 years:`, err);
    }
};
*/


