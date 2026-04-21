const db = require("../../models/models");

exports.addNote = async ({ key_id, session_id = null, user_id = null, organization_id, description, source = "system" }) => {
  try {
    await db.ProctoringNote.create({ key_id, session_id, user_id, organization_id, description, source });
  } catch (err) {
    console.error("Failed to save proctoring note:", err);
  }
};
