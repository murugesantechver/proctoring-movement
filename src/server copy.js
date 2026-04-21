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
const { deleteS3Frames30Days, deleteS3Frames2Years, deleteS3Frames213Days } = require("./shared/utils/awsS3Cleanup");

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

    require("./shared/services/sqsConsumer")();

    const prodEnvs = ["production", "bis_staging", "vp_production"];
    const useHttps = !prodEnvs.includes(env);
    const useProdCerts = env === "testing";

    let server;
    if (useHttps) {
      const sslOptions = {
        key: fs.readFileSync(useProdCerts ? "/etc/ssl/techversant/techversantinfotech.key" : "./ssl/key.pem"),
        cert: fs.readFileSync(useProdCerts ? "/etc/ssl/techversant/fullchain.pem" : "./ssl/cert.pem"),
      };
      server = https.createServer(sslOptions, app);
      console.log("Using HTTPS (Local or Testing)");
    } else {
      server = http.createServer(app);
      console.log("Using HTTP (Production/Staging - behind Load Balancer)");
    }

    const PORT = parseInt(process.env.PORT, 10) || (useHttps ? 443 : 3000);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    await initializeWebSocket(server);
    startWatchdog();

    cron.schedule(
      "0 2 * * *",
      async () => {
        console.log("[CRON] S3 cleanup started");
        await deleteS3Frames30Days();
        await deleteS3Frames2Years();
        await deleteS3Frames213Days();
        console.log("[CRON] S3 cleanup finished");
      },
      { timezone: "America/Toronto" }
    );
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
})();
