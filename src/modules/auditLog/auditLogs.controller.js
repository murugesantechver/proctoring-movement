//const { AuditLog } = require("../models");
const db = require("../../models/models");

// Fetch all audit logs
exports.getAllLogs = async (req, res) => {
  try {
    const logs = await db.AuditLog.findAll();
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};

// Fetch logs for a specific admin
exports.getLogsByAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const logs = await db.AuditLog.findAll({ where: { admin_id:adminId } });

    if (!logs.length) return res.status(404).json({ error: "No logs found for this admin" });

    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs by admin:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};