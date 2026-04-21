const db = require("../../models/models");

exports.logAction = async (adminId, action, details = null) => {
  try {
    await db.AuditLog.create({ adminId, action, details });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
};
