const express = require("express");
const router = express.Router();
const adminController = require("./admin.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.put("/settings", authenticate, adminController.updateSettings);
router.get("/settings/:orgId", authenticate, adminController.getSettings);
router.get("/sessions", authenticate, adminController.getAllSessions);
router.get("/sessions/:sessionId", authenticate, adminController.getSessionDetails);
router.get("/keys/:keyId/sessions", authenticate, adminController.getSessionsByKey);
router.post("/sessions/:session_id/override", authenticate, adminController.overrideSession);
router.get("/participants/:organization_id/sessions", authenticate, adminController.getParticipantsByOrganization);
router.get("/participants/:organization_id/session/:session_id", authenticate, adminController.getParticipantDetails);
router.get("/participants/search/:organization_id", authenticate, adminController.searchParticipants);
router.delete("/participants/:organization_id/:session_id", authenticate, adminController.deleteParticipant);
router.post("/session/end", authenticate, adminController.endSession);
router.post("/testMail", authenticate, adminController.testMail);
router.get("/get-aws-secret", authenticate, adminController.getAwsSecrets);
router.post("/resend-id-verification-email", authenticate, adminController.resendNotifyUser);

module.exports = router;
