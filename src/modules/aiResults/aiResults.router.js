const express = require("express");
const router = express.Router();
const aiResultsController = require("./aiResults.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.put("/:id/feedback", authenticate, aiResultsController.updateFeedback);
router.get("/:id", authenticate, aiResultsController.getAIResultById);
router.put("/:id/resolved", authenticate, aiResultsController.updateResolvedStatus);
router.put("/:id/id-status", authenticate, aiResultsController.updateIdStatus);
router.get("/session/:session_id", authenticate, aiResultsController.getResultsBySession);

module.exports = router;
