const express = require("express");
const router = express.Router();
const authenticate = require("../../shared/middlewares/auth.middleware");

router.get("/", (req, res) => {
  res.send("WebSocket routes are active!");
});

module.exports = router;
