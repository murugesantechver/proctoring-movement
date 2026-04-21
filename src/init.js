const dotenv = require("dotenv");
dotenv.config();

const db = require("./models/models");
const { getSecrets } = require("./shared/utils/getSecrets");

async function initializeSharedServices() {
  try {
    await getSecrets();
    console.log("Models initialized and ready.");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}

module.exports = { initializeSharedServices };
