const express = require("express");
const router = express.Router();
const bisCommunicationLogsController = require("./bisCommunicateLog.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.get("/", authenticate, bisCommunicationLogsController.getCommunicationLogs);
router.get("/s3-test", bisCommunicationLogsController.s3test);
router.post("/check-s3-delete", bisCommunicationLogsController.testS3check);
router.post("/redis-delete", bisCommunicationLogsController.deleteRedisCacheImg);

module.exports = router;
