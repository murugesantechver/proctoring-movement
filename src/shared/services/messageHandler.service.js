const { handleImageUpload } = require("./image.service");
const { createSession, closeSession, recoverSession } = require("./session.service");
const sessionManager = require("./sessionManager.service");
const redisClient = require("../config/redis");
const { analyzeAIResponse } = require("./aiResultAnalyzer.service");
const { v4: uuidv4 } = require("uuid");
const { storeAIResult } = require("./storeAIResults.service");
const { resolveSession } = require("../utils/sessionIdResolver");
const { finalizeSession } = require("../utils/finalizeSession");
const db = require("../../models/models");

function sendJson(target, payload, eventType = "message") {
  if (!target) return;
  if (typeof target.emit === "function") target.emit(eventType, payload);
  else if (typeof target.send === "function") target.send(JSON.stringify(payload));
}

async function handleMessage(message, incomingSocket) {
  let data;
  try {
    data = JSON.parse(message);
  } catch {
    console.error("[WS] Failed to parse incoming message:", message);
    return sendJson(incomingSocket, { status: "error", message: "Invalid JSON format" }, "socket_error");
  }

  const { AuditLog, Session, User, ProctoringKey, ProctoringType, Course, CourseAssignment } = db;
  const { type, payload } = data;
  let { organization_id, session_key } = payload || {};

  const session_id = await resolveSession(session_key, organization_id);

  const existingSocket = sessionManager.getWebSocket(session_id);
  if (existingSocket && existingSocket.id !== incomingSocket.id) existingSocket.disconnect(true);

  let socket = incomingSocket;

  switch (type) {
    case "start-session": {
      const { user_id, organization_id, key_id, course_id, course_name, first_name, last_name, user_name, email_id, redirect_url, session_id: providedSessionId } = payload || {};
      const resolvedSessionId = providedSessionId === "demo" ? `demo-${uuidv4().replace(/-/g, "").substring(0, 5)}` : providedSessionId;

      if (!user_id || !organization_id || !key_id || !first_name || !last_name || !email_id || !resolvedSessionId || !course_id || !course_name || !redirect_url) {
        return sendJson(socket, { status: "error", message: "Missing required fields" }, "socket_error");
      }

      let user = await User.findOne({ where: { id: user_id } });
      if (!user) {
        user = await User.create({ id: user_id, first_name, last_name, user_name: user_name ?? null, email: email_id, organization_id, password: "default_password", role: "participant", status: "active" });
      } else {
        const updates = {};
        if (user.first_name !== first_name) updates.first_name = first_name;
        if (user.last_name !== last_name) updates.last_name = last_name;
        if (user.email !== email_id) updates.email = email_id;
        if (user.user_name !== user_name) updates.user_name = user_name;
        updates.last_login_at = new Date();
        await user.update(updates);
      }

      const key = await ProctoringKey.findOne({ where: { key_id }, attributes: ["key_id", "proctoring_type_ids", "proctoring_type"] });
      if (!key) return sendJson(socket, { status: "error", message: "Proctoring key not found" }, "socket_error");

      let course = await Course.findOne({ where: { id: course_id } });
      if (!course) course = await Course.create({ id: course_id, name: course_name, organization_id });
      else await course.update({ name: course_name });

      const session = await createSession({ user_id, organization_id, key_id, first_name, last_name, user_name, course_id, external_session_id: resolvedSessionId });

      await CourseAssignment.create({ course_id, course_name, user_id, first_name, last_name, user_name: user_name ?? null, email: email_id, key_id, session_id: session.id, organization_id, external_session_id: resolvedSessionId });

      try { await sessionManager.registerSession(socket, session.id, user_id, organization_id, first_name, last_name); } catch (err) { console.error("[WS] registerSession failed:", err); }

      try {
        const redisKey = `session:${session.id}:details`;
        await redisClient.hmset(redisKey, { first_name, last_name, proctoring_type_ids: JSON.stringify(key.proctoring_type_ids), course_id, organization_id, redirect_url, external_session_id: resolvedSessionId || "", proctoring_type: key.proctoring_type, key_id });
      } catch (err) { console.error("[WS] Redis error while storing session:", err.message); }

      return sendJson(socket, { status: "success", session_id: session.id });
    }

    case "recover-session": {
      if (!session_key || !organization_id) return sendJson(socket, { status: "error", message: "session_key and organization_id are required" }, "socket_error");
      if (!session_id) return sendJson(socket, { status: "error", message: "No active session found for the given session_key" }, "socket_error");

      const session = await recoverSession(session_id);
      if (!session) return sendJson(socket, { status: "error", message: "Recovery failed or session not active" }, "socket_error");

      const existing = sessionManager.getWebSocket(session_id);
      if (!existing) {
        await sessionManager.removeSession(session_id);
        await sessionManager.registerSession(socket, session.id, session.user_id, session.organization_id, session.first_name, session.last_name);
      } else if (existing.id !== socket.id) {
        existing.disconnect(true);
        await sessionManager.registerSession(socket, session.id, session.user_id, session.organization_id, session.first_name, session.last_name);
      }

      return sendJson(socket, { status: "success", message: "Session recovered", session_id: session.id });
    }

    case "end-session": {
      if (!session_key || !organization_id) return sendJson(socket, { status: "error", message: "session_key and organization_id are required" }, "socket_error");
      if (!session_id) return sendJson(socket, { status: "error", message: "No active session found for the given session_key" }, "socket_error");
      await closeSession(session_id, organization_id);
      await sessionManager.removeSession(session_id);
      return sendJson(socket, { status: "success", message: "Session closed successfully" });
    }

    case "image-upload": {
      let { session_id: payloadSessionId, user_id, organization_id, fileName, fileData, imgType } = payload || {};
      if (!payloadSessionId || !user_id || !organization_id || !fileName || !fileData || !imgType) return sendJson(socket, { status: "error", message: "Missing image upload fields" }, "socket_error");

      if (!/^\d+$/.test(payloadSessionId)) {
        const resolvedId = await resolveSession(payloadSessionId, organization_id);
        if (!resolvedId) return sendJson(socket, { status: "error", message: "Invalid or inactive session key provided" }, "socket_error");
        payloadSessionId = resolvedId;
      }

      if (!(await sessionManager.isInitialized(payloadSessionId))) return sendJson(socket, { status: "error", message: "Session not initialized. Please start session." }, "socket_error");

      const session = await Session.findByPk(payloadSessionId);
      if (!session || session.status !== "in_progress") return sendJson(socket, { status: "error", message: "Invalid or inactive session" }, "socket_error");

      const request_id = payload.request_id || uuidv4();

      await AuditLog.create({ organization_id, user_id, session_id: payloadSessionId, request_id, action: "IMAGE_RECEIVED", action_type: "UPLOAD", affected_entity: "ProctoringImage", description: `Image (${imgType}) received via WebSocket.` });

      let first_name = "", last_name = "";
      try {
        const redisKey = `session:${payloadSessionId}:details`;
        const redisData = await redisClient.hgetall(redisKey);
        first_name = redisData.first_name || "";
        last_name = redisData.last_name || "";
      } catch (err) { console.error("[WS] Redis fetch error:", err); }

      const result = await handleImageUpload({ session_id: payloadSessionId, userId: user_id, organisation_id: organization_id, fileName, fileData, type: imgType, first_name, last_name, request_id });

      return sendJson(socket, { status: result.success ? "success" : "error", message: result.message });
    }

    case "ping-test":
      return sendJson(socket, { status: "pong", time: Date.now() });

    default:
      console.log("[WS] Invalid message type received:", type);
      return sendJson(socket, { status: "error", message: "Invalid message type" }, "socket_error");
  }
}

async function sendAiResultToClient(resultPayload) {
  const { session_id } = resultPayload;
  const socket = sessionManager.getWebSocket(session_id);
  const analyzed = analyzeAIResponse(resultPayload);

  try { await storeAIResult(resultPayload); } catch (err) { console.error("[DB] Failed to store AI result:", err.message); }

  async function deliver(payload) {
    if (socket) sendJson(socket, payload);
    else await sessionManager.sendToSession(session_id, payload);
  }

  console.log(resultPayload, "+++ResultPayload");

  if (resultPayload.id_verification_result) await deliver({ type: "id-verification-result", data: { status: analyzed.verificationStatus, analyzed } });
  if (resultPayload.face_comparison_result) await deliver({ type: "face_comparison_result", data: { status: analyzed.verificationStatus ?? false, analyzed } });

  await deliver({ type: "full_result", res: JSON.stringify(resultPayload), data: { status: analyzed.verificationStatus ?? false, analyzed } });

  if (resultPayload.type_label === "user_image") await deliver({ type: "user_image", res: JSON.stringify(resultPayload), data: { status: analyzed.verificationStatus ?? false, analyzed } });

  if (analyzed.hasViolations) {
    const violationTypes = analyzed.violations.map((v) => v.type);
    await deliver({ type: "violation-alert", data: { violations: violationTypes, analyzed } });
    try {
      const redisKey = `session:${session_id}:pending_requests`;
      await redisClient.srem(redisKey, resultPayload.request_id);
      await redisClient.scard(redisKey);
    } catch (err) { console.error("[Redis Finalizer] Error updating pending_requests:", err.message); }
    try { await finalizeSession(session_id); } catch (err) { console.error("[Redis Finalizer] Error during finalizeSession:", err.message); }
  }
}

module.exports = { handleMessage, sendAiResultToClient };
