const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");
// const verifyTempToken = require("../../shared/middlewares/verifyTempToken");

router.post("/", authenticate, userController.createUser);
router.get("/", authenticate, userController.getUsers);
router.delete("/:id", userController.deleteUser);
router.post("/:userId/checkpoint", authenticate, userController.saveCheckpoint);
router.get("/:userId/checkpoints", authenticate, userController.getUserCheckpoints);
router.put("/:userId/checkpoint/reset", authenticate, userController.resetCheckpoint);
router.delete("/:userId/checkpoints", authenticate, userController.clearUserCheckpoints);
// router.get("/user-info", verifyTempToken, userController.getUserInfo);

module.exports = router;
