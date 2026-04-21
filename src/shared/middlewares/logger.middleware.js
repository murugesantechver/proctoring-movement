const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "../logs/access.log");

exports.requestLogger = (req, res, next) => {
  const log = `${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}\n`;
  
  fs.appendFile(logFile, log, (err) => {
    if (err) console.error("Logging failed:", err);
  });

  console.log(log.trim());
  next();
};
