const express = require("express");
const router = express.Router();

const authRoutes           = require("./auth/auth.router");
const userRoutes           = require("./user/user.router");
const imageRoutes          = require("./image/image.router");
const adminRoutes          = require("./admin/admin.router");
const proctoringKeyRoutes  = require("./proctoringKey/proctoringKey.router");
const proctoringTypeRoutes = require("./proctoringType/proctoringType.router");
const proctoringRuleRoutes = require("./proctoringRule/proctoringRule.router");
const courseAssignmentRoutes = require("./courseAssignment/courseAssignment.router");
const auditLogRoutes       = require("./auditLog/auditLogs.router");
const websocketRoutes      = require("./websocket/websocket.router");
const aiResultRoutes       = require("./aiResults/aiResults.router");
const organizationRoutes   = require("./organization/organization.router");
const noteRoutes           = require("./proctoringNote/proctoringNote.router");
const reportRoutes         = require("./report/report.router");
const redisRoutes          = require("./redis/redis.router");
const jobRoutes            = require("./job/job.router");

router.use("/auth",              authRoutes);
router.use("/users",             userRoutes);
router.use("/image",             imageRoutes);
router.use("/admin",             adminRoutes);
router.use("/keys",              proctoringKeyRoutes);
router.use("/types",             proctoringTypeRoutes);
router.use("/rules",             proctoringRuleRoutes);
router.use("/course-assignment", courseAssignmentRoutes);
router.use("/logs",              auditLogRoutes);
router.use("/ws",                websocketRoutes);
router.use("/ai-results",        aiResultRoutes);
router.use("/organization",      organizationRoutes);
router.use("/notes",             noteRoutes);
router.use("/reports",           reportRoutes);
router.use("/redis",             redisRoutes);
router.use("/jobs",              jobRoutes);

module.exports = router;
