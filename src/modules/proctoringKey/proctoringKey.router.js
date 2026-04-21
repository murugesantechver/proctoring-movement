const express = require("express");
const router = express.Router();
const proctoringKeyController = require("./proctoringKey.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/", authenticate, proctoringKeyController.createProctoringKey);
router.get("/search", authenticate, proctoringKeyController.elasticSearchProctoringKeys);
router.get("/elastic/search", authenticate, proctoringKeyController.searchProctoringKeys);
router.get("/proctoring-types", authenticate, proctoringKeyController.getProctoringTypesForKey);
router.get("/check-name", authenticate, proctoringKeyController.checkProctoringKeyNameUnique);
router.get("/:organization_id", authenticate, proctoringKeyController.getProctoringKeys);
router.put("/revoke/:key_id", authenticate, proctoringKeyController.revokeProctoringKey);
router.put("/:key_id", authenticate, proctoringKeyController.editProctoringKey);
router.delete("/:key_id", authenticate, proctoringKeyController.deleteProctoringKey);

module.exports = router;
