const jwt = require("jsonwebtoken");
const { verifyTempToken } = require('../../clientModule/utils/jwt');

module.exports = (req, res, next) => {
    try {
        const token = req.headers["x-temp-token"];
        if (!token) {
            return res.status(401).json({ success: false, message: "Token missing." });
        }

        const decoded = verifyTempToken(token);
        if (!decoded || decoded.type !== "sso") {
            return res.status(401).json({ success: false, message: "Invalid token type." });
        }

        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid/Expired temp token." });
    }
};
