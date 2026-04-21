const express = require("express");
const router = express.Router();
const organizationController = require("./organization.controller");
const upload = require("../../shared/middlewares/upload.middleware");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/", authenticate, organizationController.createOrganization);
router.post("/:organization_id/manual-verification-alert", authenticate, organizationController.sendManualVerificationAlert);
router.get("/:organization_id", authenticate, organizationController.getOrganizationDetails);
router.put("/:organization_id/notification-emails", authenticate, organizationController.updateNotificationEmails);
router.post("/id-reupload", authenticate, upload.single("file"), organizationController.reuploadGovtId);
router.post("/id-reupload-status-check", authenticate, organizationController.checkReUpload);
router.post("/id-reupload/status-update", authenticate, organizationController.updateReuploadStatus);
router.post("/reupload/status-check", authenticate, organizationController.reuploadStatusCheck);
router.post("/send-manual-verification-alert", authenticate, organizationController.sendManualVerificationAlertMail);

module.exports = router;
