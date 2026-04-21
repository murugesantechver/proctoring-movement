const express = require("express");
const router = express.Router();
const auditLogsController = require("./auditLogs.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.get("/", authenticate, auditLogsController.getAllLogs);
router.get("/:adminId", authenticate, auditLogsController.getLogsByAdmin);

module.exports = router;
