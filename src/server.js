require("dotenv").config();
const fs = require("fs");
const http = require("http");
const https = require("https");
const app = require("./app");
const db = require("./models/models");
const { initializeSharedServices } = require("./init");
const { initializeWebSocket } = require("./shared/utils/websocket");
const startWatchdog = require("./shared/utils/watchdog");
const cron = require("node-cron");

(async () => {
  try {
    const env = process.env.NODE_ENV || "development";
    console.log(`You are in ${env} environment`);

    if (["production", "vp_production", "bis_staging"].includes(env)) {
      await initializeSharedServices();
      console.log("Secrets fetched and mapped successfully");
    } else {
      console.log(`Skipping AWS Secrets fetch for ${env}`);
    }

    await db.init();
    await db.sequelize.authenticate();
    console.log("Models initialized and database connection authenticated");

    // Load routes AFTER DB is ready
    const adminRoutes = require("./modules");
    app.use("/api/proctor-admin", adminRoutes);

    const shouldPollSqs = env !== "development" || process.env.ENABLE_SQS_POLLING === "true";
    if (shouldPollSqs) {
      require("./shared/services/sqsConsumer")();
    } else {
      console.log("Skipping SQS polling for local development");
    }

    const httpsEnvs = ["testing"];
    const useHttps = httpsEnvs.includes(env);
    const useProdCerts = env === "testing";

    let server;
    if (useHttps) {
      const sslOptions = {
        key: fs.readFileSync(useProdCerts ? "/etc/ssl/techversant/techversantinfotech.key" : "./ssl/key.pem"),
        cert: fs.readFileSync(useProdCerts ? "/etc/ssl/techversant/fullchain.pem" : "./ssl/cert.pem"),
      };
      server = https.createServer(sslOptions, app);
      console.log("Using HTTPS");
    } else {
      server = http.createServer(app);
      console.log("Using HTTP for local development");
    }

    const PORT = parseInt(process.env.PORT, 10) || (useHttps ? 443 : 3000);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    await initializeWebSocket(server);
    startWatchdog();
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
})();
