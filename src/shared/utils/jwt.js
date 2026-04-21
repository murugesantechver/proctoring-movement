const db = require("../../models/models");
const { storeAccessToken } = require("../services/redistokenservice");
const jwt = require("jsonwebtoken");

const generateAccessToken = async (user) => {
  const token = jwt.sign(
    {
      user_id: user.id,
      role: user.role,
      organization_id: user.organization_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY }
  );
  await storeAccessToken(user.id, token);
  return token;
};

const generateRefreshToken = async (user) => {
  const token = jwt.sign({ user_id: user.id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
  const expiry_date = new Date();
  expiry_date.setDate(expiry_date.getDate() + 7);
  await db.RefreshToken.create({ token, user_id: user.id, expiry_date });
  return token;
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

const verifyRefreshToken = async (token) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const storedToken = await db.RefreshToken.findOne({
      where: { token, user_id: payload.user_id },
    });
    if (!storedToken || new Date(storedToken.expiry_date) < new Date()) return null;
    return payload;
  } catch (err) {
    return null;
  }
};

const generateCrfToken = (data, expire) =>
  jwt.sign(data, process.env.JWT_SECRET, { expiresIn: expire });

const verifyCrfToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded && decoded.crf;
  } catch {
    return false;
  }
};

const verifyResubmitCrfToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.user_id ? decoded : false;
  } catch {
    return false;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateCrfToken,
  verifyCrfToken,
  verifyResubmitCrfToken,
};
