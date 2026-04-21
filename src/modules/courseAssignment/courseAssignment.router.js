const express = require("express");
const router = express.Router();
const courseAssignmentController = require("./courseAssignment.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/", authenticate, courseAssignmentController.assignProctoringLevel);
router.get("/:courseId", authenticate, courseAssignmentController.getAssignments);

module.exports = router;
