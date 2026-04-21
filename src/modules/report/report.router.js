const express = require("express");
const router = express.Router();
const reportController = require("./report.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/ai-feedback-report", authenticate, reportController.generateAiFeedbackReport);
router.post("/ai-feedback-report/stream", authenticate, reportController.generateAiFeedbackReportChunks);

module.exports = router;
