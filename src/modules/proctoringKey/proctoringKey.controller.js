const { Op, fn, col, where } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { addNote } = require("../../shared/utils/proctoringNotes");
const db = require("../../models/models");
const sequelizeInstance = db.sequelize;
const { createProctoringNote } = require("../../shared/utils/proctoringNote");

const getPurgeCodeForOrganization = async (organization_id) => {
  try { const r = await db.PurgeCode.findOne({ where: { organization_id }, attributes: ["purge_code"] }); return r ? r.purge_code : null; }
  catch (error) { console.error("Error fetching purge code:", error); return null; }
};

exports.createProctoringKey = async (req, res) => {
  try {
    const { organization_id, proctoring_type_ids, created_by, expires_at, name, proctoring_type, hours, minutes, description, violation_tolerance, cost = 0, fee = 0, currencyType = null, proctoring_tolerance = [] } = req.body;
    const allowedTypes = ["Hybrid", "AWS Rekognition", "BIS Virtual Proctor"];
    if (!allowedTypes.includes(proctoring_type)) return res.status(400).json({ error: "Invalid proctoring type" });
    const existing = await db.ProctoringKey.findOne({ where: { name, organization_id, revoked: false } });
    if (existing) return res.status(400).json({ error: `Key name '${name}' already exists for this organization.` });
    const duration_minutes = parseInt(hours || 0) * 60 + parseInt(minutes || 0);
    const key_id = `KEY-${uuidv4().replace(/-/g, "").substring(0, 7).toUpperCase()}`;
    const newKey = await db.ProctoringKey.create({ organization_id, key_id, proctoring_type_ids, created_by, expires_at, name, proctoring_type, duration_minutes, description, violation_tolerance: violation_tolerance ?? 0, cost, fee, currencyType, proctoring_tolerance });
    let ruleNames = [];
    if (Array.isArray(proctoring_type_ids) && proctoring_type_ids.length > 0) { const ruleRecords = await db.ProctoringType.findAll({ where: { id: proctoring_type_ids }, attributes: ["name"] }); ruleNames = ruleRecords.map(r => r.name); }
    const ruleList = ruleNames.length > 0 ? ruleNames.join(", ") : "None";
    await db.AuditLog.create({ admin_id: created_by, organization_id, action: "CREATE_KEY", action_type: "CREATE", affected_entity: "ProctoringKey", description: `Admin ${created_by} created key '${name}' with type '${proctoring_type}' for Org ${organization_id}.` });
    await addNote({ key_id, user_id: created_by, organization_id, description: `${name} was created (Key Type: ${proctoring_type}, Time: ${duration_minutes} minutes, Rules: ${ruleList}, Cost: ${cost}, Fee: ${fee}).`, source: "key_details" });
    if (description && description.trim() !== "") await addNote({ key_id, organization_id, user_id: created_by, description: `${name} description was added or updated: ${description.trim()}.`, source: "key_details" });
    res.status(201).json({ message: "Proctoring Key created successfully", key: newKey });
  } catch (error) { console.error("Error creating proctoring key:", error); res.status(500).json({ error: "Failed to create key" }); }
};

exports.getProctoringKeys = async (req, res) => {
  try {
    const { organization_id } = req.params;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const offset = page && limit ? (page - 1) * limit : null;
    const queryOptions = { where: { organization_id, revoked: false }, order: [["createdAt", "DESC"]] };
    if (limit !== null && offset !== null) { queryOptions.limit = limit; queryOptions.offset = offset; }
    const { count, rows } = await db.ProctoringKey.findAndCountAll(queryOptions);
    const response = { success: true, data: rows };
    if (limit !== null && page !== null) response.pagination = { total: count, page, limit, totalPages: Math.ceil(count / limit) };
    return res.json(response);
  } catch (error) { console.error("Error fetching keys:", error); res.status(500).json({ success: false, error: "Failed to fetch keys" }); }
};

exports.revokeProctoringKey = async (req, res) => {
  try {
    const { key_id } = req.params;
    const { admin_id, purge_code } = req.body;
    const key = await db.ProctoringKey.findOne({ where: { key_id } });
    if (!key) return res.status(404).json({ error: "Key not found" });
    const session = await db.Session.findOne({ where: { key_id } });
    if (session) return res.status(400).json({ success: false, message: "Key is currently in use by an active session" });
    const organizationPurgeCode = await getPurgeCodeForOrganization(key.organization_id);
    if (purge_code !== organizationPurgeCode && purge_code !== key.purge_code) return res.status(404).json({ error: "Invalid purge code" });
    key.revoked = true; await key.save();
    let rules;
    if (key?.proctoring_tolerance.length) rules = key?.proctoring_tolerance.map(e => e.name).join(",");
    else if (key?.proctoring_type_ids.length) { const ruleRecords = await db.ProctoringType.findAll({ where: { id: key.proctoring_type_ids }, attributes: ["name"] }); rules = ruleRecords.map(r => r.name).join(", "); }
    await createProctoringNote({ commentKey: "key_deleted", source: "key_details", user_id: admin_id, organization_id: key.organization_id, messages: { KeyName: key.name, KeyType: key.proctoring_type, Cost: key.cost, Fee: key.fee, TimeMinutes: key.duration_minutes, Rules: rules || "Name and Photo ID Match, Remain in Camera View" } });
    await db.AuditLog.create({ admin_id, organization_id: key.organization_id, action: "REVOKE_KEY", action_type: "UPDATE", affected_entity: "ProctoringKey", description: `Admin ${admin_id} revoked Proctoring Key ${key_id}.` });
    res.json({ message: "Key revoked successfully" });
  } catch (error) { console.error("Error revoking key:", error); res.status(500).json({ error: "Failed to revoke key", message: error.message }); }
};

exports.editProctoringKey = async (req, res) => {
  try {
    const { key_id } = req.params;
    const { organization_id, proctoring_type_ids, expires_at, name, proctoring_type, hours, minutes, description, updated_by, violation_tolerance, proctoring_tolerance, cost, fee } = req.body;
    const allowedTypes = ["Hybrid", "AWS Rekognition", "BIS Virtual Proctor"];
    if (proctoring_type && !allowedTypes.includes(proctoring_type)) return res.status(400).json({ error: "Invalid proctoring type" });
    const key = await db.ProctoringKey.findOne({ where: { key_id, organization_id } });
    if (!key) return res.status(404).json({ error: "Key not found for the given organization" });
    const duration_minutes = parseInt(hours || 0) * 60 + parseInt(minutes || 0);
    const oldDescription = key.description;
    await key.update({ proctoring_type_ids, expires_at, name, proctoring_type, duration_minutes, description, violation_tolerance: violation_tolerance ?? key.violation_tolerance, proctoring_tolerance, cost, fee });
    if (description && description !== oldDescription) await addNote({ key_id: key.key_id, user_id: updated_by, organization_id, description: `${key.name} description was added or updated: ${description}`, source: "key_details" });
    let ruleNames = [];
    if (Array.isArray(proctoring_type_ids) && proctoring_type_ids.length > 0) { const ruleRecords = await db.ProctoringType.findAll({ where: { id: proctoring_type_ids }, attributes: ["name"] }); ruleNames = ruleRecords.map(r => r.name); }
    const ruleList = ruleNames.length > 0 ? ruleNames.join(", ") : "None";
    await addNote({ key_id, user_id: updated_by, organization_id, description: `${name} was updated (Key Type: ${proctoring_type}, Time: ${duration_minutes} minutes, Rules: ${ruleList}, Cost: ${cost}, Fee: ${fee}).`, source: "key_details" });
    await db.AuditLog.create({ admin_id: updated_by, organization_id, action: "UPDATE_KEY", action_type: "UPDATE", affected_entity: "ProctoringKey", description: `Admin ${updated_by} updated key '${name}' (ID: ${key_id}) for Org ${organization_id}` });
    res.json({ message: "Proctoring Key updated successfully", key });
  } catch (error) { console.error("Error updating proctoring key:", error); res.status(500).json({ error: "Failed to update key" }); }
};

exports.deleteProctoringKey = async (req, res) => {
  try {
    const { key_id } = req.params;
    const { organization_id, deleted_by, purge_code } = req.body;
    const key = await db.ProctoringKey.findOne({ where: { key_id, organization_id } });
    if (!key) return res.status(404).json({ message: "Key not found in the organization" });
    const organizationPurgeCode = await getPurgeCodeForOrganization(organization_id);
    if (purge_code !== organizationPurgeCode && purge_code !== key.purge_code) return res.status(404).json({ error: "Invalid purge code" });
    const { name, proctoring_type, duration_minutes, proctoring_type_ids } = key;
    let ruleNames = [];
    if (Array.isArray(proctoring_type_ids) && proctoring_type_ids.length > 0) { const ruleRecords = await db.ProctoringType.findAll({ where: { id: proctoring_type_ids }, attributes: ["name"] }); ruleNames = ruleRecords.map(r => r.name); }
    const ruleList = ruleNames.length > 0 ? ruleNames.join(", ") : "None";
    await key.destroy();
    await addNote({ key_id, user_id: deleted_by, organization_id, description: `${name} was deleted (Key Type: ${proctoring_type}, Time: ${duration_minutes} minutes, Rules: ${ruleList}, Cost: 0, Fee: 0).`, source: "key_details" });
    await db.AuditLog.create({ admin_id: deleted_by, organization_id, action: "DELETE_KEY", action_type: "DELETE", affected_entity: "ProctoringKey", description: `Admin ${deleted_by} deleted key '${name}' for Org ${organization_id}.` });
    return res.status(200).json({ message: "Proctoring Key deleted successfully" });
  } catch (error) { console.error("Error deleting key:", error); return res.status(500).json({ error: "Failed to delete key" }); }
};

exports.searchProctoringKeys = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== "string") return res.status(400).json({ message: "Missing or invalid search query" });
    const results = await db.ProctoringKey.findAll({ where: { name: { [Op.iLike]: `%${query.trim()}%` } }, attributes: ["id", "name", "key_id", "proctoring_type", "duration_minutes"], order: [["name", "ASC"]] });
    res.json(results);
  } catch (error) { console.error("Search error:", error); res.status(500).json({ message: "Internal server error", error: error.message }); }
};

exports.checkProctoringKeyNameUnique = async (req, res) => {
  try {
    const { name, organization_id } = req.query;
    if (!name || !organization_id) return res.status(400).json({ message: "Both name and organization_id are required" });
    const existingKey = await db.ProctoringKey.findOne({ where: { organization_id, revoked: false, [Op.and]: [where(fn("LOWER", col("name")), name.toLowerCase())] } });
    return res.status(200).json({ exists: !!existingKey });
  } catch (err) { console.error("Error checking name uniqueness:", err); return res.status(500).json({ message: "Internal server error" }); }
};

exports.getProctoringTypesForKey = async (req, res) => {
  const { key_id, organization_id } = req.query;
  if (!key_id || !organization_id) return res.status(400).json({ success: false, error: "key_id and organization_id are required" });
  try {
    const key = await db.ProctoringKey.findOne({ where: { key_id, organization_id, revoked: false } });
    if (!key) return res.status(404).json({ success: false, error: "Proctoring key not found or revoked" });
    const typeIds = key.proctoring_type_ids;
    if (!Array.isArray(typeIds) || typeIds.length === 0) return res.json({ success: true, data: [] });
    const types = await db.ProctoringType.findAll({ where: { id: typeIds }, attributes: ["id", "name"] });
    return res.json({ success: true, data: types });
  } catch (error) { console.error("Error fetching proctoring types:", error); return res.status(500).json({ success: false, error: "Internal server error" }); }
};

exports.elasticSearchProctoringKeys = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== "string") return res.status(400).json({ message: "Missing or invalid search query" });
    const searchTerm = query.trim();
    function isUUID(str) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str); }
    function isNumeric(str) { return !isNaN(str) && !isNaN(parseFloat(str)); }
    const orConditions = [isUUID(searchTerm) ? { session_id: searchTerm } : null, isNumeric(searchTerm) ? { course_id: parseInt(searchTerm) } : null, { email: { [Op.iLike]: `%${searchTerm}%` } }, { first_name: { [Op.iLike]: `%${searchTerm}%` } }, { last_name: { [Op.iLike]: `%${searchTerm}%` } }, { user_name: { [Op.iLike]: `%${searchTerm}%` } }, { course_name: { [Op.iLike]: `%${searchTerm}%` } }, { "$session.external_session_id$": { [Op.iLike]: `%${searchTerm}%` } }].filter(Boolean);
    const results = await db.CourseAssignment.findAll({ where: { [Op.or]: orConditions }, include: [{ model: db.ProctoringKey, as: "proctoringKey", required: false, where: { revoked: false }, on: { [Op.and]: [sequelizeInstance.where(sequelizeInstance.cast(sequelizeInstance.col("CourseAssignment.key_id"), "TEXT"), "=", sequelizeInstance.col("proctoringKey.key_id")), sequelizeInstance.where(sequelizeInstance.col("proctoringKey.revoked"), "=", false)] } }, { model: db.Session, as: "session", required: false, attributes: ["id", "status", "started_at", "ended_at", "external_session_id", "course_id"] }], order: [["createdAt", "DESC"]] });
    let proctoringResults = await db.ProctoringKey.findAll({ where: { revoked: false, [Op.or]: [{ name: { [Op.iLike]: `%${searchTerm}%` } }] } });
    const proctoringKeys = results.map(r => r.proctoringKey).filter((key, index, self) => key && self.findIndex(k => k?.key_id === key?.key_id) === index);
    const merged = [...proctoringResults, ...proctoringKeys];
    const uniqueByKeyId = Object.values(merged.reduce((acc, item) => { acc[item.key_id] = item; return acc; }, {}));
    res.json(uniqueByKeyId);
  } catch (error) { console.error("Elastic search error:", error); res.status(500).json({ message: "Internal server error", error: error.message }); }
};
