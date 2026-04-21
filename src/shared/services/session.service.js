const db = require("../../models/models");
const { Op } = require("sequelize");

exports.createSession = async ({ user_id, organization_id, key_id, first_name, last_name, course_id, external_session_id, user_name = null }) => {
  const session = await db.Session.create({
    user_id, organization_id, key_id,
    started_at: new Date(), status: "in_progress",
    first_name, last_name, course_id, external_session_id, user_name,
  });
  await db.AuditLog.create({
    organization_id, user_id,
    action: "SESSION_CREATED", action_type: "CREATE",
    affected_entity: "Session",
    description: `Session ${session.id} started for user ${user_id}`,
  });
  return session;
};

exports.closeSession = async (session_id_or_external, organization_id, status = "valid") => {
  const session = await db.Session.findOne({
    where: {
      organization_id, status: "in_progress",
      [Op.or]: [{ id: session_id_or_external }, { external_session_id: session_id_or_external }],
    },
  });
  if (!session) {
    console.warn(`[closeSession] No in-progress session found for ID or External ID: ${session_id_or_external}`);
    return false;
  }
  let finalStatus = status;
  if (!finalStatus && !session.override_status) {
    const hasViolations = await db.Session.findOne({ where: { id: session.id, organization_id } });
    finalStatus = hasViolations ? "invalid" : "valid";
  }
  await session.update({ ended_at: new Date() });
  await db.AuditLog.create({
    organization_id: session.organization_id, user_id: session.user_id,
    action: "SESSION_CLOSED", action_type: "UPDATE",
    affected_entity: "Session",
    description: `Session ${session.id} closed for user ${session.user_id}`,
  });
  return true;
};

exports.recoverSession = async (session_id_or_external) => {
  console.log(`[recoverSession] Attempting recovery for session_id: ${session_id_or_external}`);
  const session = await db.Session.findOne({
    where: {
      status: "in_progress",
      [Op.or]: [{ id: session_id_or_external }, { external_session_id: session_id_or_external }],
    },
  });
  if (session) {
    await db.AuditLog.create({
      organization_id: session.organization_id, user_id: session.user_id,
      action: "SESSION_RECOVERED", action_type: "RECONNECT",
      affected_entity: "Session",
      description: `Session ${session.id} reconnected for user ${session.user_id}`,
    });
  }
  return session;
};
