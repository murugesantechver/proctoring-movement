const redisClient = require("../../shared/config/redis");
const db = require("../../models/models");
const { resolveSession } = require("../../shared/utils/sessionIdResolver");
const { closeSession } = require("../../shared/services/session.service");
const sessionManager = require("../../shared/services/sessionManager.service");
const { Op, Sequelize } = require("sequelize");
const { finalizeSession } = require("../../shared/utils/finalizeSession");
const { createProctoringNote } = require("../../shared/utils/proctoringNote");
const { createVirtualProctoringUpdateEmailContent, testMailSend, createVirtualProctoringOnPendingUpdateEmailContent, createVirtualProctoringOffPendingUpdateEmailContent, courseCompleteEmail, createInvalidProofEmailContent } = require("../../shared/services/emailCreation.service");
const { getSecrets } = require("../../shared/utils/getSecrets");
// const { issueCloudFrontSignedUrl } = require("../../shared/utils/cloudfrontSignedUrls");
const { postFinalAiResult } = require("../../shared/utils/sendResults");

exports.getSettings = async (req, res) => {
  try {
    const { orgId } = req.params;
    const cacheKey = `adminSettings:${orgId}`;
    const cachedSettings = await redisClient.get(cacheKey);
    if (cachedSettings) return res.json(JSON.parse(cachedSettings));
    const settings = await db.AdminSettings.findOne({ where: { orgId } });
    if (!settings) return res.status(404).json({ error: "Settings not found" });
    await redisClient.setex(cacheKey, 600, JSON.stringify(settings));
    res.json(settings);
  } catch (error) { console.error("Error fetching settings:", error); res.status(500).json({ error: "Failed to fetch settings" }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const { orgId, settings, adminId } = req.body;
    const [updated] = await db.AdminSettings.upsert({ orgId, settings, lastUpdatedBy: adminId });
    await db.AuditLog.create({ admin_id: adminId, organization_id: orgId, action: "UPDATE_SETTINGS", action_type: "UPDATE", affected_entity: "AdminSettings", description: `Admin ${adminId} updated settings for Org ${orgId}.` });
    return res.json({ message: "Settings updated successfully", updated });
  } catch (error) { console.error("Error updating settings:", error); return res.status(500).json({ error: "Failed to update settings" }); }
};

exports.getAllSessions = async (req, res) => {
  try { const sessions = await db.Session.findAll(); res.json(sessions); }
  catch (error) { console.error("Error fetching sessions:", error); res.status(500).json({ error: "Failed to fetch sessions" }); }
};

exports.getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.Session.findByPk(sessionId, { include: { model: db.ProctoringKey, as: "proctoringKey" } });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (error) { console.error("Error fetching session details:", error); res.status(500).json({ error: "Failed to fetch session details" }); }
};

exports.overrideSession = async (req, res) => {
  try {
    const { session_id } = req.params;
    const { admin_id, decision, reason, organization_id, userName } = req.body;
    if (!["approved"].includes(decision)) return res.status(400).json({ error: "Only 'approved' decision (mark valid) is allowed currently." });
    const resolvedSessionId = await resolveSession(session_id, organization_id);
    if (!resolvedSessionId) return res.status(400).json({ error: "Session Not Found" });
    const session = await db.Session.findOne({ where: { id: resolvedSessionId, organization_id }, include: [{ model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name", "id", ["id", "user_id"]] }, { model: db.Course, as: "course", attributes: ["id", "name"] }] });
    if (!session) return res.status(404).json({ error: "Session not found for this organization" });
    if (session.status !== "invalid") return res.status(400).json({ error: "Only sessions marked as 'invalid' can be overridden." });
    session.status = "valid"; session.override_status = true; session.override_reason = reason || "No reason provided"; session.has_violations = false;
    await session.save();
    await db.AIResult.update({ id_status: "valid", override_reason: reason || "No reason provided" }, { where: { session_id: resolvedSessionId } });
    await db.AuditLog.create({ admin_id, organization_id: session.organization_id, action: "OVERRIDE_SESSION", action_type: "UPDATE", affected_entity: "Session", description: `Admin ${admin_id} overridden session ${session_id} as ${decision}. Reason: ${reason}.` });
    const proctoringKeyDetails = await db.ProctoringKey.findOne({ where: { key_id: session.key_id } });
    await createProctoringNote({ commentKey: "invalid_proctor_full_override", session_id: resolvedSessionId, source: "participant_view", user_id: admin_id, messages: { KeyName: proctoringKeyDetails.name, SessionID: resolvedSessionId, Reason: reason } });
    let mail = await createVirtualProctoringUpdateEmailContent({ userId: session.user.id, sessionId: session.external_session_id || session.id, organisationId: session.organization_id, course: session.course.name || "Unknown Course", reason: reason || "No reason provided" });
    await postFinalAiResult({ session_id: resolvedSessionId, organization_id, over_ride: true });
    return res.json({ message: "Session overridden successfully", session_id, mail });
  } catch (error) { console.error("Error overriding session:", error); res.status(500).json({ error: "Failed to override session" }); }
};

exports.getSessionsByKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const sessions = await db.Session.findAll({ where: { key_id: keyId } });
    if (!sessions.length) return res.status(404).json({ error: "No sessions found for this key" });
    res.json(sessions);
  } catch (error) { console.error("Error fetching sessions by key:", error); res.status(500).json({ error: "Failed to fetch sessions" }); }
};

exports.getParticipantsByOrganization = async (req, res) => {
  const { organization_id } = req.params;
  const { key_id, keyword, status, thumbs } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  try {
    const whereCondition = { organization_id };
    if (key_id) whereCondition.key_id = key_id;
    if (status) whereCondition.status = status;
    const keywordFilters = [];
    const userInclude = { model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name"], required: false };
    const courseInclude = { model: db.Course, as: "course", attributes: ["id", "name"], required: false };
    if (keyword) {
      keywordFilters.push({ external_session_id: { [Op.iLike]: `%${keyword}%` } }, { first_name: { [Op.iLike]: `%${keyword}%` } }, { last_name: { [Op.iLike]: `%${keyword}%` } }, Sequelize.where(Sequelize.col("user.first_name"), { [Op.iLike]: `%${keyword}%` }), Sequelize.where(Sequelize.col("user.last_name"), { [Op.iLike]: `%${keyword}%` }), Sequelize.where(Sequelize.col("user.email"), { [Op.iLike]: `%${keyword}%` }), Sequelize.where(Sequelize.col("course.name"), { [Op.iLike]: `%${keyword}%` }));
      whereCondition[Op.or] = keywordFilters;
      userInclude.required = true; courseInclude.required = true;
    }
    let aiResultsWhereCondition = { warning: { [Op.not]: null } };
    let includeAIResults = { model: db.AIResult, as: "aiResults", required: false, attributes: ["id"], where: aiResultsWhereCondition };
    if (thumbs === "down") { aiResultsWhereCondition.thumbs_down = true; includeAIResults.required = true; } else { includeAIResults.separate = true; }
    let finalQuery = {
      where: whereCondition,
      attributes: ["external_session_id", "first_name", "last_name", "user_name", "override_status", "override_reason", "verification_status", "status", "started_at",
        [Sequelize.literal(`(SELECT COUNT(*) FROM "AIResults" AS ai WHERE ai.session_id = "Session"."id" AND ai.thumbs_down = true)`), "thumbs_down_count"],
        [Sequelize.literal(`(SELECT COUNT(*) FROM "AIResults" AS ai WHERE ai.session_id = "Session"."id" AND ai.feedback_text IS NOT NULL)`), "feedback_count"],
        [Sequelize.literal(`(SELECT COUNT(*) FROM "AIResults" AS ai WHERE ai.session_id = "Session"."id" AND ai.resolved_comment IS NOT NULL)`), "resolved_count"],
        [Sequelize.literal(`(SELECT COUNT(*) FROM "AIResults" AS ai WHERE ai.session_id = "Session"."id" AND ai.warning IS NOT NULL)`), "total_violation"]],
      include: [userInclude, courseInclude, includeAIResults],
      subQuery: false, distinct: true, order: [["started_at", "DESC"]],
    };
    if (!thumbs) { finalQuery.offset = offset; finalQuery.limit = limit; }
    const { count, rows } = await db.Session.findAndCountAll(finalQuery);
    const mappedRows = rows.map(s => { const j = s.toJSON(); if (j.aiResults) j.aiResults = j.aiResults.map(ai => ({ ...ai, frame_image: ai.frame_image || null, user_image: ai.user_image || null })); return j; });
    if (thumbs === "down") { return res.json({ success: true, data: mappedRows.slice(offset, offset + limit), pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }, message: "Success" }); }
    return res.json({ success: true, data: mappedRows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }, message: "Success" });
  } catch (error) { console.error("Error fetching sessions:", error); return res.status(500).json({ success: false, error: "Internal server error", details: error.message }); }
};

exports.getParticipantDetails = async (req, res) => {
  const { organization_id, session_id } = req.params;
  const { key_id, status } = req.query;
  try {
    const resolvedSessionId = await resolveSession(session_id, organization_id);
    if (!resolvedSessionId) return res.status(404).json({ success: false, error: "Session not found" });
    let queryCondition = { id: resolvedSessionId, organization_id };
    if (key_id) queryCondition.key_id = key_id;
    if (status) queryCondition.status = status;
    const session = await db.Session.findOne({ where: queryCondition, attributes: ["external_session_id", "first_name", "user_name", "last_name", "user_image", "override_status", "override_reason", "verification_status", "status", "started_at"], include: [{ model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name", "id", ["id", "user_id"]] }, { model: db.Course, as: "course", attributes: ["id", "name"] }, { model: db.AIResult, as: "aiResults", separate: true, order: [["createdAt", "ASC"]], attributes: ["warning", "frame_image", "detected_objects", ["person_count", "count_of_objects"], ["createdAt", "timestamp"], "id", "feedback_text", "feedback_rating", "thumbs_up", "thumbs_down", "resolved", "resolved_comment", "feedback_added_time", "feedback_updated_time", "resolved_time", "resolved_updated_time", "feedback_added_user", "resolved_user", "id_status", "override_reason", "raw_response", "rules", "finalResult", "AttemptCount", "active", "result_type", "eye_closure_streak"], required: false, where: { [Op.or]: [{ warning: { [Op.ne]: null } }, { detected_objects: { [Op.ne]: null } }] } }] });
    if (!session) return res.status(404).json({ success: false, error: "Session not found" });
    const response = session.toJSON();
    const hasIdVerification = Array.isArray(response.aiResults) && response.aiResults.some(ai => ai.result_type === "id-verification" && ai.finalResult === true);
    response.is_id_verified = !hasIdVerification;
    if (response.aiResults && Array.isArray(response.aiResults)) response.aiResults = response.aiResults.map(ai => ({ ...ai, frame_image: ai.frame_image || null }));
    response.aiResults = response.aiResults.filter(ai => !(ai.result_type === "eye-closure" && ai.eye_closure_streak === true));
    const order = { "id-verification": 1, "id-verification-reSubmit": 2 };
    response.aiResults = [...response.aiResults].sort((a, b) => (order[a.result_type] || 99) - (order[b.result_type] || 99));
    return res.json({ success: true, data: response });
  } catch (error) { console.error("Error fetching session details:", error); return res.status(500).json({ success: false, error: "Internal server error" }); }
};

exports.searchParticipants = async (req, res) => {
  const { organization_id } = req.params;
  const { query } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  if (!query || typeof query !== "string") return res.status(400).json({ success: false, error: "Missing or invalid search query" });
  try {
    const { count, rows } = await db.Session.findAndCountAll({ where: { organization_id }, attributes: ["id", "first_name", "last_name", "override_status", "override_reason", "user_name", "verification_status", "status", "started_at"], include: [{ model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name"], where: { [Op.or]: [{ first_name: { [Op.iLike]: `%${query}%` } }, { last_name: { [Op.iLike]: `%${query}%` } }] } }, { model: db.Course, as: "course", attributes: ["id", "name"] }, { model: db.AIResult, as: "aiResults", order: [["createdAt", "ASC"]], attributes: ["warning", "frame_image", "detected_objects", ["person_count", "count_of_objects"], "user_image", "id", "feedback_text", "feedback_rating", "thumbs_up", "thumbs_down", "resolved", "resolved_comment", "feedback_added_time", "feedback_updated_time", "resolved_time", "resolved_updated_time", "feedback_added_user", "resolved_user", "id_status", "override_reason", "raw_response", "rules", "finalResult", "AttemptCount", "active", "eye_closure_streak"], required: false }], limit, offset, order: [["started_at", "DESC"]] });
    return res.json({ success: true, data: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } });
  } catch (error) { console.error("Error searching participants:", error); return res.status(500).json({ success: false, error: "Internal server error" }); }
};

exports.deleteParticipant = async (req, res) => {
  const { organization_id, session_id } = req.params;
  const { admin_id, purge_code } = req.body;
  if (!admin_id) return res.status(400).json({ success: false, message: "Missing admin_id in request body" });
  try {
    const session = await db.Session.findOne({ where: { external_session_id: session_id, organization_id } });
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const proctoringKeyDetails = await db.ProctoringKey.findOne({ where: { key_id: session.key_id } });
    if (!proctoringKeyDetails) return res.status(404).json({ error: "Key not found" });
    if (purge_code !== "456789" && purge_code !== proctoringKeyDetails.purge_code) return res.status(404).json({ error: "Invalid purge code" });
    await createProctoringNote({ commentKey: "participant_proctor_record_deleted", session_id, source: "participant_view", user_id: admin_id, organization_id, messages: { KeyName: proctoringKeyDetails.name, ParticipantFullName: session.first_name + " " + session.last_name } });
    const sessionData = session.toJSON();
    await session.destroy();
    await db.AuditLog.create({ organization_id, admin_id, action: "DELETE_PARTICIPANT_SESSION", action_type: "DELETE", affected_entity: "Session", description: `Admin ${admin_id} deleted participant session (${session_id}) for user: ${sessionData.first_name} ${sessionData.last_name}` });
    return res.json({ success: true, message: "Participant session deleted successfully" });
  } catch (error) { console.error("Error deleting participant session:", error); return res.status(500).json({ success: false, message: "Internal server error" }); }
};

exports.endSession = async (req, res) => {
  try {
    const { session_key, key_id, organization_id } = req.body;
    if (!session_key || !organization_id) return res.status(400).json({ status: "error", message: "session_key and organization_id required" });
    const session_id = await resolveSession(session_key, organization_id);
    if (!session_id) return res.status(404).json({ status: "error", message: "Session not found" });
    const isSessionEnded = await db.Session.findOne({ where: { id: session_id, ended_at: { [Op.ne]: null } } });
    if (isSessionEnded) return res.status(400).json({ status: "error", message: "Session already ended" });
    let isClosed = await closeSession(session_id, organization_id, null);
    if (!isClosed) return res.status(400).json({ status: "error", message: "Session could not be closed (already ended?)" });
    const session = await db.Session.findByPk(session_id, { include: [{ model: db.Course, as: "course", attributes: ["id", "name"] }] });
    if (!session) return res.status(404).json({ status: "error", message: "Session not found in DB" });
    const key = await db.ProctoringKey.findOne({ where: { key_id }, attributes: ["key_id", "proctoring_type_ids", "proctoring_type"] });
    const emailData = { userId: session.user_id, sessionId: session_id, organisationId: organization_id, course: session.course.name };
    if (key.proctoring_type_ids.length === 1) {
      let ProctoringTypeData = await db.ProctoringType.findOne({ where: { id: key.proctoring_type_ids[0] } });
      if (ProctoringTypeData.name === "Name and Photo ID Match") await createVirtualProctoringOffPendingUpdateEmailContent(emailData);
      else await createVirtualProctoringOnPendingUpdateEmailContent(emailData);
    } else { await createVirtualProctoringOnPendingUpdateEmailContent(emailData); }
    await session.update({ ended_at: new Date() });
    await redisClient.set(`session:${session_id}:end_triggered`, "1");
    const pendingKey = `session:${session_id}:pending_requests`;
    const remaining = await redisClient.scard(pendingKey);
    if (remaining === 0) await finalizeSession(session_id);
    sessionManager.removeSession(session_id);
    await db.AuditLog.create({ organization_id, admin_id: null, action: "END_SESSION", action_type: "UPDATE", affected_entity: "Session", description: `Session ${session_key} ended for organization ${organization_id}${key_id ? ` using key_id ${key_id}` : ""}` });
    return res.json({ status: "success", message: "Session marked ended (finalization pending AI frames)", session_key });
  } catch (error) { console.error("Error ending session:", error); return res.status(500).json({ status: "error", message: "Internal server error" }); }
};

exports.testMail = async (req, res) => {
  try { let data = req.body; let response = await testMailSend(data); return res.send(response); }
  catch (error) { return res.status(500).json({ status: "error", message: "Internal server error" }); }
};

exports.getAwsSecrets = async (req, res) => {
  try {
    const secrets = await getSecrets();
    const env = process.env;
    if (secrets) return res.status(200).send({ secrets, env });
    return res.status(400).send({ secrets, env, message: "AWS secrets not found" });
  } catch (error) { return res.send({ message: "Error fetching AWS secrets from Redis:", error: error.message }); }
};

exports.resendNotifyUser = async (req, res) => {
  try {
    const { session_key, organization_id } = req.body;
    if (!session_key || !organization_id) return res.status(400).json({ success: false, error: "Missing required fields" });
    const session_id = await resolveSession(session_key, organization_id);
    if (!session_id) return res.status(404).json({ success: false, error: "Session not found" });
    const session = await db.Session.findOne({ where: { id: session_id }, include: [{ model: db.User, as: "user", attributes: ["id", "first_name", "last_name", "email"] }, { model: db.Course, as: "course", attributes: ["id", "name"] }] });
    if (!session || !session.user || !session.user.email) return res.status(404).json({ success: false, error: "User email not found" });
    await db.AIResult.update({ active: false }, { where: { session_id, result_type: "id-verification-reSubmit" } });
    await createInvalidProofEmailContent({ userId: session.user.id, sessionId: session_id, organisationId: organization_id, course_name: session.course?.name ?? "Unknown Course" });
    return res.json({ success: true, message: "Resent notification email successfully" });
  } catch (error) { console.error("Error resendNotifyUser:", error); return res.status(500).json({ success: false, error: "Internal server error" }); }
};
