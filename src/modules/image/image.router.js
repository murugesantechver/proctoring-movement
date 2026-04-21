const express = require("express");
const router = express.Router();
const imageController = require("./image.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/upload", authenticate, imageController.uploadImage);
router.get("/upload/status/:userId", authenticate, imageController.getUploadStatus);
router.get("/stream", authenticate, imageController.streamImage);

module.exports = router;
