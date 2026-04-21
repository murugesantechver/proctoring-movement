// utils/getSecrets.js
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const env = process.env.NODE_ENV || "development";
const prodEnvs = ["production", "vp_production", "bis_staging"];

// For dev/test environments, skip AWS Secrets fetch
if (!prodEnvs.includes(env)) {
  console.log(`Skipping AWS Secrets fetch for environment: ${env}`);
  module.exports = { getSecrets: async () => null };
  return;
}

// Production/staging setup
const secretName = process.env.DB_SECRET_NAME;
if (!secretName) {
  throw new Error(`Missing DB_SECRET_NAME environment variable for ${env}`);
}

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "us-east-1" });

// Map Secrets Manager keys to standard app env keys
const envKeyMap = {
  production: {
    DB_USERNAME: "PROD_DB_USERNAME",
    DB_PASSWORD: "PROD_DB_PASSWORD",
    DB_HOST: "PROD_DB_HOST",
    DB_NAME: "PROD_DB_NAME",
    DB_PORT: "DB_PORT",
    SMTP_HOST: "SMTP_HOST",
    SMTP_PORT: "SMTP_PORT",
    SMTP_USER: "SMTP_USER",
    SMTP_PASS: "SMTP_PASS",
    SMTP_FROM: "SMTP_FROM",
  },
  vp_production: {
    DB_USERNAME: "PROD_DB_USERNAME",
    DB_PASSWORD: "PROD_DB_PASSWORD",
    DB_HOST: "PROD_DB_HOST",
    DB_NAME: "PROD_DB_NAME",
    DB_PORT: "DB_PORT",
    SMTP_HOST: "SMTP_HOST",
    SMTP_PORT: "SMTP_PORT",
    SMTP_USER: "SMTP_USER",
    SMTP_PASS: "SMTP_PASS",
    SMTP_FROM: "SMTP_FROM",
  },
  bis_staging: {
    DB_USERNAME: "STAG_DB_USERNAME",
    DB_PASSWORD: "STAG_DB_PASSWORD",
    DB_HOST: "STAG_DB_HOST",
    DB_NAME: "STAG_DB_NAME",
    DB_PORT: "DB_PORT",
    SMTP_HOST: "SMTP_HOST",
    SMTP_PORT: "SMTP_PORT",
    SMTP_USER: "SMTP_USER",
    SMTP_PASS: "SMTP_PASS",
    SMTP_FROM: "SMTP_FROM",
  },
};

async function getSecrets() {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await client.send(command);
    const secret = JSON.parse(data.SecretString);

    const map = envKeyMap[env];
    if (!map) throw new Error(`No key mapping for environment: ${env}`);
    // Object.assign(process.env, secret);
    Object.keys(map).forEach((appKey) => {
      const secretKey = map[appKey];
      if (secret[secretKey]) {
        process.env[appKey] = secret[secretKey];
        process.env[secretKey] = secret[secretKey];
      } else if (appKey !== "DB_PORT") {
        console.warn(`Warning: Secret key ${secretKey} missing for environment ${env}`);
      }
    });
    //console.log(process.env, "Env")
    console.log(`Secrets fetched and mapped successfully for ${env}`);
  } catch (err) {
    console.error(`Failed to fetch secrets for ${env}`, err);
    throw err;
  }
}

module.exports = { getSecrets };
