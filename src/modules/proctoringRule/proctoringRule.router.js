const express = require("express");
const router = express.Router();
const proctoringRuleController = require("./proctoringRule.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/", authenticate, proctoringRuleController.createRule);
router.get("/:organization_id", authenticate, proctoringRuleController.getRulesByOrganization);
router.put("/:id", authenticate, proctoringRuleController.updateRulesByOrganization);

module.exports = router;
