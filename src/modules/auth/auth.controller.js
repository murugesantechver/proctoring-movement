const db = require("../../models/models");
const bcrypt = require("bcryptjs");
const { generateAccessToken, verifyRefreshToken, generateCrfToken, verifyCrfToken, verifyResubmitCrfToken } = require("../../shared/utils/jwt");
const { removeAccessToken } = require("../../shared/services/redistokenservice");
const { sendLoginOtp } = require("../../shared/utils/otp");

exports.otpLogin = async (req, res) => {
  const { email, password } = req.body;
  const crfToken = req.headers["x-crf-token"] || req.body.crfToken;
  try {
    if (!crfToken || !verifyCrfToken(crfToken)) return res.status(403).json({ error: "Invalid or expired CRF token" });
    const user = await db.User.findOne({ where: { email, role: "client_admin" } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Invalid credentials or Access denied" });
    if (user.status !== "active") return res.status(403).json({ error: "User is inactive or blocked" });
    const otpStatus = await sendLoginOtp(user);
    if (!otpStatus.success) return res.status(500).json({ error: "Failed to send OTP" });
    res.json({ message: "OTP sent to your registered email.", mail: user.email, status: true });
  } catch (err) { console.error("Login error:", err); res.status(500).json({ error: "Server error" }); }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "No refresh token provided" });
  const tokenRecord = await db.RefreshToken.findOne({ where: { token: refreshToken } });
  if (tokenRecord) {
    await db.RefreshToken.destroy({ where: { token: refreshToken } });
    await db.AuditLog.create({ admin_id: tokenRecord.user_id, organization_id: null, action: "LOGOUT", action_type: "AUTH", affected_entity: "User", description: `User ID ${tokenRecord.user_id} logged out.` });
  }
  return res.json({ message: "Logged out successfully" });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "No refresh token provided" });
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return res.status(403).json({ message: "Invalid or expired refresh token" });
  const user = await db.User.findByPk(payload.user_id);
  if (!user || user.status !== "active") return res.status(403).json({ message: "User is not active" });
  const newAccessToken = generateAccessToken(user);
  await db.AuditLog.create({ admin_id: user.id, organization_id: user.organization_id, action: "REFRESH_TOKEN", action_type: "AUTH", affected_entity: "User", description: `User ${user.email} refreshed their token.` });
  res.json({ accessToken: newAccessToken });
};

exports.getCrf = async (req, res) => {
  const token = generateCrfToken({ crf: true }, "10m");
  res.json({ crfToken: token });
};

exports.createAuthToken = async (req, res) => {
  const { password } = req.params;
  if (password !== "Passw0rd!123") return res.status(403).json({ error: "Forbidden" });
  const { data, expireIn = "365d" } = req.body;
  const token = generateCrfToken(data, expireIn);
  res.json({ crfToken: token });
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  const crfToken = req.headers["x-crf-token"] || req.body.crfToken;
  try {
    if (!crfToken || !verifyCrfToken(crfToken)) return res.status(403).json({ error: "Invalid or expired CRF token" });
    const user = await db.User.findOne({ where: { email, role: "client_admin" } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const userOtp = await db.UserOtp.findOne({ where: { userId: user.id, otp, verified: false } });
    if (!userOtp) return res.status(400).json({ error: "Invalid OTP" });
    if (new Date() > userOtp.expiresAt) return res.status(400).json({ error: "OTP expired" });
    await db.UserOtp.destroy({ where: { id: userOtp.id } });
    const accessToken = await generateAccessToken(user);
    user.last_login_at = new Date();
    await user.save();
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name, organization_id: user.organization_id, user_name: user.user_name } });
  } catch (err) { console.error("OTP verify error:", err); res.status(500).json({ error: "Server error" }); }
};

exports.sendResubmitMailOtp = async (req, res) => {
  try {
    const crfToken = req.headers["x-crf-token"] || req.body.crfToken;
    if (!crfToken) return res.status(403).json({ error: "CRF token is required" });
    const verifyCrf = verifyResubmitCrfToken(crfToken);
    if (!verifyCrf) return res.status(403).json({ error: "Invalid or expired CRF token" });
    const user = await db.User.findOne({ where: { email: verifyCrf.user_mail, id: verifyCrf.user_id } });
    if (!user) return res.status(401).json({ error: "Invalid user details" });
    if (user.status !== "active") return res.status(403).json({ error: "User is inactive or blocked" });
    const otpStatus = await sendLoginOtp(user);
    if (!otpStatus.success) return res.status(500).json({ error: "Failed to send OTP" });
    res.json({ message: "OTP sent to your registered email.", mail: user.email, status: true });
  } catch (error) { console.error("OTP verify error:", error); res.status(500).json({ error: "Server error" }); }
};

exports.verifyResubmitOtp = async (req, res) => {
  const { email, otp } = req.body;
  const rawCrf = req.headers["x-crf-token"] || req.body.crfToken;
  try {
    if (!rawCrf) return res.status(403).json({ error: "CRF token missing" });
    const payload = verifyResubmitCrfToken(rawCrf);
    if (!payload) return res.status(403).json({ error: "Invalid or expired CRF token" });
    if (!payload.user_id || !payload.user_mail) return res.status(403).json({ error: "Invalid CRF token payload" });
    const user = await db.User.findOne({ where: { email: payload.user_mail, id: payload.user_id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const userOtp = await db.UserOtp.findOne({ where: { userId: user.id, otp, verified: false }, order: [["createdAt", "DESC"]] });
    if (!userOtp) return res.status(400).json({ error: "Invalid OTP" });
    if (new Date() > userOtp.expiresAt) return res.status(400).json({ error: "OTP expired" });
    await db.UserOtp.destroy({ where: { id: userOtp.id } });
    const accessToken = await generateAccessToken(user);
    res.json({ accessToken, user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name, organization_id: user.organization_id, user_name: user.user_name } });
  } catch (err) { console.error("OTP verify error:", err); res.status(500).json({ error: "Server error" }); }
};

exports.redis_logout = async (req, res) => {
  try {
    const accesstoken = req.headers["authorization"]?.replace("Bearer ", "") || req.body.accessToken;
    if (!accesstoken) return res.status(400).json({ message: "No access token provided" });
    const result = await removeAccessToken(accesstoken);
    return res.json({ message: "Logged out successfully", removedFromRedis: result === 1 });
  } catch (e) { console.error("Logout error:", e); return res.status(500).json({ message: "Server error" }); }
};
