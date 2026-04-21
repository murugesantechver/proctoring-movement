const { verifyAccessToken } = require("../utils/jwt");
const { isAccessTokenValid } = require("../services/redistokenservice");

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ message: "Access Token Missing" });
  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);
  if (!payload) return res.status(401).json({ message: "Invalid or expired token" });
  const redis_key = `token:${token}`;
  const Is_valid = await isAccessTokenValid(redis_key);
  if (!Is_valid) return res.status(401).json({ message: "Token revoked or expired" });
  if (payload.role !== "client_admin") return res.status(403).json({ message: "Not authorized" });
  if (payload.crf === true) return res.status(401).json({ message: "Access denied" });
  req.user = payload;
  next();
};
