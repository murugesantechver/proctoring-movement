const express = require("express");
const router = express.Router();
const controller = require("./job.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.get("/", authenticate, controller.listJobs);
router.post("/", authenticate, controller.createJob);
router.post("/:id/log", authenticate, controller.appendLog);
router.put("/:id/status", authenticate, controller.overrideStatus);
router.post("/:id/retry", authenticate, controller.triggerRetry);

module.exports = router;
