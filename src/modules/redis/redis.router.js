const express = require("express");
const router = express.Router();
const redisController = require("./redis.controller");
const authenticate = require("../../shared/middlewares/auth.middleware");

router.post("/create", authenticate, redisController.createRedisValue);
router.put("/update", authenticate, redisController.updateRedisValue);
router.get("/fetch/:redisKey", authenticate, redisController.getRedisValue);
router.delete("/remove/:redisKey", authenticate, redisController.deleteRedisValue);

module.exports = router;
