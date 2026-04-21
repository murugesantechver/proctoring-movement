const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");

router.post("/login-otp", authController.otpLogin);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resubmit-otp", authController.sendResubmitMailOtp);
router.post("/verify-resubmit-otp", authController.verifyResubmitOtp);
router.post("/logout", authController.redis_logout);
router.get("/crf-token", authController.getCrf);
router.post("/dev/:password/create-token", authController.createAuthToken);

module.exports = router;
