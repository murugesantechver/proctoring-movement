const express = require("express");
const router = express.Router();
const proctoringTypeController = require("./proctoringType.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/", authenticate, proctoringTypeController.createProctoringTypes);
router.put("/:id", authenticate, proctoringTypeController.updateProctoringTypes);
router.get("/", authenticate, proctoringTypeController.getProctoringTypes);
router.delete("/:id", authenticate, proctoringTypeController.deleteProctoringTypeById);

module.exports = router;
