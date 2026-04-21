const redisService = require("../../shared/services/redis.service");
const db = require("../../models/models");
const { Op } = require("sequelize");
const { generateAccessToken } = require("../../shared/utils/jwt");

exports.createUser = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, role, organization_id, user_name } = req.body;
    if (!email || !password || !first_name || !last_name || !role || !organization_id) return res.status(400).json({ success: false, message: "Missing required fields" });
    const existing = await db.User.findOne({ where: { email, role } });
    if (existing) return res.status(409).json({ success: false, message: `${role} with this email already exists` });
    const user = await db.User.create({ email, password, first_name, last_name, phone, role, organization_id, user_name });
    res.status(201).json({ success: true, data: user });
  } catch (error) { console.error("Error creating user:", error); res.status(500).json({ success: false, message: "Internal server error" }); }
};

exports.saveCheckpoint = async (req, res) => {
  const { userId } = req.params;
  const { checkpoint, result } = req.body;
  if (!checkpoint) return res.status(400).json({ message: "Checkpoint is required" });
  try { await redisService.saveCheckpoint(userId, checkpoint, result); res.json({ message: "Checkpoint saved", userId, checkpoint }); }
  catch (error) { console.error("Redis Error:", error); res.status(500).json({ message: "Error saving checkpoint", error }); }
};

exports.getUserCheckpoints = async (req, res) => {
  const { userId } = req.params;
  try { const checkpoints = await redisService.getCheckpoints(userId); res.json({ userId, checkpoints }); }
  catch (error) { res.status(500).json({ message: "Error fetching checkpoints", error }); }
};

exports.resetCheckpoint = async (req, res) => {
  const { userId } = req.params;
  const { checkpoint } = req.body;
  try { await redisService.resetToCheckpoint(userId, checkpoint); res.json({ message: `User reset to checkpoint ${checkpoint}` }); }
  catch (error) { console.error("Error resetting checkpoint:", error); res.status(500).json({ message: "Error resetting checkpoint", error }); }
};

exports.clearUserCheckpoints = async (req, res) => {
  const { userId } = req.params;
  try { await redisService.clearCheckpoints(userId); res.json({ message: `All checkpoints cleared for user ${userId}` }); }
  catch (error) { res.status(500).json({ message: "Error clearing checkpoints", error }); }
};

exports.getUsers = async (req, res) => {
  try {
    const { email, first_name, last_name, phone, role, organization_id } = req.query;
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
    const offset = page && limit ? (page - 1) * limit : null;
    const where = {};
    if (email) where.email = { [Op.like]: `%${email}%` };
    if (first_name) where.first_name = { [Op.like]: `%${first_name}%` };
    if (last_name) where.last_name = { [Op.like]: `%${last_name}%` };
    if (phone) where.phone = { [Op.like]: `%${phone}%` };
    if (role) where.role = role;
    if (organization_id) where.organization_id = organization_id;
    const queryOptions = { where, order: [["createdAt", "DESC"]], attributes: ["id", "user_name", "first_name", "last_name", "email", "phone", "role", "organization_id", "status", "last_login_at"] };
    if (limit !== null && offset !== null) { queryOptions.limit = limit; queryOptions.offset = offset; }
    const { count, rows } = await db.User.findAndCountAll(queryOptions);
    const response = { success: true, data: rows };
    if (limit !== null && page !== null) response.pagination = { total: count, page, limit, totalPages: Math.ceil(count / limit) };
    return res.json(response);
  } catch (error) { console.error("Error fetching users:", error); return res.status(500).json({ success: false, message: "Internal server error" }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    await user.destroy();
    await db.AuditLog.create({ admin_id: null, organization_id: user.organization_id, action: "deleteUser", action_type: "DELETE", affected_entity: "User", description: `User (${id}) deleted from organization (${user.organization_id}).` });
    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) { console.error("Error deleting user:", error); return res.status(500).json({ success: false, message: "Internal server error" }); }
};

exports.getUserInfo = async (req, res) => {
  try {
    if (!req.userId) return res.status(400).json({ success: false, message: "Missing userId in request" });
    const user_id = req.userId;
    const user = await db.User.findOne({ where: { id: user_id }, attributes: ["id", "email", "first_name", "last_name", "role", "organization_id", "user_name"] });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const accessToken = await generateAccessToken(user);
    return res.json({ success: true, data: user, access_token: accessToken });
  } catch (error) { console.error("Error getUserInfo user:", error); return res.status(500).json({ success: false, message: "Internal server error" }); }
};
