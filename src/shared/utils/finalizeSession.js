const db = require("../../models/models");
const redisClient = require("../config/redis");
const {
  createVirtualProctoringValidatedEmailContent,
  createVirtualProctoringUnsuccessfulEmailContent,
  sendManualVerificationAlertEmail,
} = require("../services/emailCreation.service");
const { postFinalAiResult } = require("./sendResults");

async function finalizeSession(session_id) {
  const pendingKey = `session:${session_id}:pending_requests`;
  const remaining = await redisClient.scard(pendingKey);
  if (remaining > 0) return;

  const session = await db.Session.findOne({
    where: { id: session_id },
    include: [
      { model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name", "id", ["id", "user_id"]] },
      { model: db.Course, as: "course", attributes: ["id", "name"] },
    ],
  });
  if (!session) return;

  if (session.status !== "in_progress" || session.override_status) return;

  const endTriggered = await redisClient.get(`session:${session_id}:end_triggered`);
  if (endTriggered !== "1") {
    console.log(`[Finalizer] Skipping session ${session_id} — endSession API not triggered`);
    return;
  }

  let finalStatus = "valid";
  if (session.verification_status === "rejected" || session.has_violations) {
    finalStatus = "invalid";
  }

  await db.Session.update({ status: finalStatus, ended_at: new Date() }, { where: { id: session_id } });

  if (finalStatus === "valid") {
    await createVirtualProctoringValidatedEmailContent({
      userId: session.user.id,
      sessionId: session.external_session_id || session.id,
      organisationId: session.organization_id,
      course: session.course.name || "Unknown Course",
    });
    await postFinalAiResult({ session_id, organization_id: session.organization_id });
  } else if (finalStatus === "invalid") {
    await createVirtualProctoringUnsuccessfulEmailContent({
      userId: session.user.id,
      sessionId: session.external_session_id || session.id,
      organisationId: session.organization_id,
      course: session.course.name || "Unknown Course",
    });
    await postFinalAiResult({ session_id, organization_id: session.organization_id });
  }

  const aiResultReSubmitted = await db.AIResult.findOne({
    where: { session_id, result_type: "id-verification-reSubmit", active: true },
  });

  if (aiResultReSubmitted && (finalStatus === "valid" || finalStatus === "invalid")) {
    await sendManualVerificationAlertEmail(session.organization_id, {
      participant_name: `${session.first_name} ${session.last_name}` || "Unknown",
      course_name: session.course.name || "Unknown Course",
      date: new Date(session.createdAt).toLocaleDateString("en-GB"),
    });
  }

  await redisClient.del(pendingKey);
  await redisClient.del(`session:${session_id}:end_triggered`);
  console.log(`[Finalizer] Updated session ${session_id} to '${finalStatus}' and cleared ${pendingKey}`);
}

module.exports = { finalizeSession };
