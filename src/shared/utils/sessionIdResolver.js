const db = require("../../models/models");

function isUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveSession(session_key, organization_id) {
  if (!session_key || !organization_id) return null;
  if (isUUID(session_key)) {
    const sessionById = await db.Session.findOne({ where: { id: session_key, organization_id } });
    if (sessionById) return sessionById.id;
  }
  const sessionByExternal = await db.Session.findOne({ where: { external_session_id: session_key, organization_id } });
  return sessionByExternal ? sessionByExternal.id : null;
}

module.exports = { resolveSession };
