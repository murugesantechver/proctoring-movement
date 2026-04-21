const Redis = require("ioredis");

const deployedEnvs = ["testing", "production", "bis_staging"];
const isDeployed = deployedEnvs.includes(process.env.NODE_ENV);

console.log("You are in ",process.env.NODE_ENV,"Environment");

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD || null,
 ...(isDeployed ? { tls: {} } : {}), // Use TLS not needed in development
});

redisClient.on("connect", () => {
  console.log("Redis connected!");
  redisClient.ping((err, result) => {
    if (err) {
      console.error("Ping failed:", err);
    } else {
      console.log("Redis ping response:", result);
    }
  });
});

redisClient.on("ready", () => console.log("Redis is ready!"));

redisClient.on("error", (err) => console.error("Redis error:", err));

module.exports = redisClient;
