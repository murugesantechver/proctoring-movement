const AWS = require("aws-sdk");
const redisClient = require("../config/redis");
const db = require("../../models/models");
const { Op } = require("sequelize");
const path = require("path");
const { storeAIResult } = require("./storeAIResults.service");
const { uploadImageToS3 } = require("./imageUpload.service");
const { getLambdaConfig } = require("../utils/lambdaConfig");

const lambda = new AWS.Lambda({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const SQS_BUCKET = process.env.S3_BUCKET_NAME;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

// ─── LOCAL LAMBDA MOCK ───────────────────────────────────────────────────────
// When LAMBDA_UPLOAD_URL is not configured (local dev), we bypass the real
// Lambda invoke and return sample data. Remove this block once Lambda is wired.
async function invokeLambda(functionName, payloadObj) {
  const isLocal = !functionName || functionName.trim() === "";
  if (isLocal) {
    console.warn("[Lambda Mock] No LAMBDA_UPLOAD_URL configured — returning mock response for local dev.");
    const mockKey = `mock/${payloadObj.organisation_id || "org"}/${payloadObj.type || "frame"}/${payloadObj.userId || "user"}/${Date.now()}.png`;
    return {
      Payload: JSON.stringify({
        statusCode: 200,
        body: JSON.stringify({ key: mockKey, s3Key: mockKey }),
      }),
    };
  }
  return lambda.invoke({ FunctionName: functionName, Payload: JSON.stringify(payloadObj) }).promise();
}
// ─────────────────────────────────────────────────────────────────────────────

exports.handleImageUpload = async ({ session_id, userId, organisation_id, fileName, fileData, type, first_name, last_name, request_id }) => {
  try {
    if (!session_id || !userId || !fileName || !fileData || !type || !organisation_id) throw new Error("Missing required fields");

    const duplicateCheck = await redisClient.get(fileName);
    if (duplicateCheck) throw new Error("Duplicate upload detected");
    console.log("request-id on image service", request_id);

    const uploadPayload = { session_id, userId, organisation_id, fileName, fileData, type };
    const sessionDetails = await redisClient.hgetall(`session:${session_id}:details`);
    const key = await db.ProctoringKey.findOne({ where: { key_id: sessionDetails?.key_id }, attributes: ["key_id", "proctoring_type_ids", "proctoring_type", "proctoring_tolerance"] });

    let proctoring_type = key?.proctoring_type || "AWS Rekognition";
    let lambdaUploadUrl = process.env.LAMBDA_UPLOAD_URL;
    let virtual_proctor_type = proctoring_type ?? "AWS Rekognition";
    if (proctoring_type === "AWS Rekognition") lambdaUploadUrl = process.env.LAMBDA_UPLOAD_URL ?? lambdaUploadUrl;
    if (proctoring_type === "BIS Virtual Proctor") lambdaUploadUrl = process.env.OPEN_SOURCE_LAMBDA_UPLOAD_URL ?? lambdaUploadUrl;

    const lambdaResult = await invokeLambda(lambdaUploadUrl, uploadPayload);

    const rawPayload = lambdaResult.Payload?.toString() || "{}";
    console.log("Lambda rawPayload Main:", rawPayload);

    let uploadedKey;
    try {
      const parsed = JSON.parse(rawPayload);
      const body = typeof parsed.body === "string" ? JSON.parse(parsed.body) : parsed.body;
      uploadedKey = body.key || body.s3Key;
    } catch (err) {
      console.error("Error parsing Lambda response:", err);
      throw new Error("Invalid response from Lambda");
    }

    if (!uploadedKey) throw new Error("No uploadedImageUrl returned from Lambda");

    await redisClient.set(`session:${session_id}:request:${request_id}`, uploadedKey);

    const basePayload = { session_id, userId, organisation_id, request_id, first_name, last_name, file_name: fileName, bucket_name: process.env.S3_BUCKET_NAME, comparison_image: uploadedKey };

    console.log("Type:++", type);

    if (type === "user-image") {
      await redisClient.set(`session:${session_id}:source_image`, uploadedKey);
      await redisClient.set(`session:${session_id}:source_image_file_name`, fileName);
      await db.Session.update({ user_image: uploadedKey }, { where: { id: session_id } });
      const sqsPayload = { ...basePayload, type: null, type_label: "user_image", source_image: uploadedKey, virtual_proctor_type };
      await invokeLambda(lambdaUploadUrl, { ...uploadPayload, sqsPayload });
      console.log(sqsPayload, "SQS Payload User Image");

    } else if (type === "govt-id") {
      const sourceFileName = await redisClient.get(`session:${session_id}:source_image_file_name`);
      if (!sourceFileName) throw new Error("Selfie image not uploaded yet");
      const extension = path.extname(sourceFileName) || ".png";
      const baseName = path.basename(sourceFileName, extension);
      const sourceKey = `${organisation_id}/user-image/${userId}/${session_id}/${baseName}${extension}`;
      const getProctoringTolerance = key?.proctoring_tolerance?.find((element) => element.name === "Name and Photo ID Match");
      const aiToolConfig = getLambdaConfig(getProctoringTolerance.ai_tool);
      console.log("aiToolConfig ::govt-id", aiToolConfig);
      const sqsPayload = { ...basePayload, type: 1, type_label: "govt_id_verification", source_image: sourceKey, virtual_proctor_type };
      await invokeLambda(lambdaUploadUrl, { ...uploadPayload, sqsPayload });

    } else if (type === "frames") {
      console.log("Entered to Frames");
      const sourceKey = await redisClient.get(`session:${session_id}:source_image`);
      if (!sourceKey) throw new Error("Source image not found in Redis. Make sure 'user-image' is uploaded before frames.");

      const acceptableProcTypes = [2, 4, 5, 6, 7, 11];
      let proctoringTypeIds = key.proctoring_type_ids;
      proctoringTypeIds = proctoringTypeIds.filter((id) => Number(id) >= 2).filter((id) => acceptableProcTypes.includes(Number(id)));

      const recognitionTypes = await db.ProctoringType.findAll({ where: { id: proctoringTypeIds }, order: [["id", "ASC"]] });
      const baseRequestId = request_id;
      console.log("Proctoring Types", recognitionTypes);

      for (const typeRow of recognitionTypes) {
        const t = typeRow.id;
        const specificRequestId = `${baseRequestId}-${t}`;
        const counterKey = `session:${session_id}:frames_pending:request:${specificRequestId}`;
        const getProctoringTolerance = key?.proctoring_tolerance?.find((element) => element.id === typeRow.id);
        const aiToolConfig = getLambdaConfig(getProctoringTolerance.ai_tool);
        console.log("aiToolConfig ::frames", aiToolConfig);

        const alreadyCounted = await redisClient.get(counterKey);
        if (!alreadyCounted) {
          await redisClient.sadd(`session:${session_id}:pending_requests`, specificRequestId);
          await redisClient.expire(`session:${session_id}:pending_requests`, 3600);
          await redisClient.set(`session:${session_id}:pending_ts:${specificRequestId}`, Date.now());
          await redisClient.expire(`session:${session_id}:pending_ts:${specificRequestId}`, 3600);
          await redisClient.set(counterKey, "1");
        }

        const sqsPayload = { ...basePayload, request_id: specificRequestId, type: t, type_label: typeRow.name, virtual_proctor_type };
        if (t === 2) sqsPayload.source_image = sourceKey;
        if ([4, 5, 6, 7, 11].includes(t)) sqsPayload.confidence_threshold = 60.0;

        await redisClient.incr(`session:${session_id}:frames_pending`);
        const count = await redisClient.get(`session:${session_id}:frames_pending`);
        console.log(`[Redis] Frame counter incremented to ${count} for session ${session_id}`);

        const lambdaResponse = await invokeLambda(lambdaUploadUrl, { ...uploadPayload, sqsPayload });
        console.log("Lambda rawPayload:", lambdaResponse.Payload?.toString?.() ?? lambdaResponse);
        console.log("SQS PayLoad", sqsPayload);
      }

    } else if (["tab-switch", "screen-share", "monitor-switch", "full-screen-switch", "active-participation", "full-screen-exit"].includes(type)) {
      let proctoringTypeIds = key.proctoring_type_ids ?? [];
      proctoringTypeIds = proctoringTypeIds.filter((id) => Number(id) >= 2);
      const recognitionTypes = await db.ProctoringType.findAll({ where: { id: proctoringTypeIds }, order: [["id", "ASC"]] });

      const typeMapping = { "active-participation": "Active Participation", "monitor-switch": "Single Monitor Only", "full-screen-switch": "Full View of Monitor", "full-screen-exit": "Full View of Monitor", "tab-switch": "Screen Monitoring" };
      const requiredName = typeMapping[type];

      if (requiredName && recognitionTypes.some((rt) => rt.name === requiredName)) {
        const baseRequestId = request_id;
        let imageUpload = await uploadImageToS3({ session_id, userId, organisation_id, fileName, fileData, type });
        console.log(imageUpload, "Image Uploaded +++++++++");

        const violationMap = {
          "tab-switch": { field: "screen_monitoring", message: "Face match or liveness failed", reasons: ["User opened new browser tab"] },
          "monitor-switch": { field: "monitor_switch", message: "Multiple monitors detected", reasons: ["Multiple monitors detected"] },
          "full-screen-switch": { field: "full_view_of_monitor", message: "User opened new browser", reasons: ["User opened new browser"] },
          "full-screen-exit": { field: "full_view_of_monitor", message: "User exited fullscreen mode", reasons: ["User exited fullscreen mode"] },
          "active-participation": { field: "active_participation", message: "Participant found inactive", reasons: ["Participant found inactive"] },
        };

        const buildViolationData = (imageType, ctx) => {
          const { field, message, reasons } = violationMap[imageType] || {};
          if (!field) throw new Error(`Unsupported imageType: ${imageType}`);
          return { status: 409, userId: ctx.userId, message, fileName: ctx.fileName, request_id: ctx.baseRequestId, session_id: ctx.session_id, [field]: { reason: reasons.join(" / ") }, failed_reasons: reasons, organisation_id: ctx.organisation_id, comparison_image: ctx.imageUpload.key };
        };

        const aiViolationData = buildViolationData(type, { userId, fileName, baseRequestId, session_id, organisation_id, imageUpload });
        console.log("AI Violation Data:", aiViolationData);
        await storeAIResult(aiViolationData);
      }
    }

    await redisClient.set(`session:${session_id}:stage_status`, JSON.stringify({ stage: type === "govt-id" ? "photoID-upload" : "photo-upload", status: "uploaded", timestamp: new Date().toISOString() }));

    await db.AuditLog.create({ organization_id: organisation_id, action: "IMAGE_UPLOAD", action_type: "CREATE", affected_entity: "UserImage", description: `Image (${type}) uploaded and processed for User ${userId}` });

    return { success: true, message: "Image uploaded and processed successfully" };
  } catch (err) {
    console.error("Image upload failed:", err.message);
    return { success: false, message: err.message };
  }
};
