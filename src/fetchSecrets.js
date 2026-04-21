// fetchSecrets.js - Root level AWS Secrets Manager integration
require('dotenv').config();
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || "development";
const prodEnvs = ["production", "vp_production", "bis_staging", "testing"];

// For dev/test environments, skip AWS Secrets fetch
if (!prodEnvs.includes(env)) {
  console.log(`Skipping AWS Secrets fetch for environment: ${env}`);
  module.exports = { fetchSecrets: async () => null };
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
  },
  vp_production: {
    DB_USERNAME: "PROD_DB_USERNAME",
    DB_PASSWORD: "PROD_DB_PASSWORD",
    DB_HOST: "PROD_DB_HOST",
    DB_NAME: "PROD_DB_NAME",
    DB_PORT: "DB_PORT",
  },
  bis_staging: {
    DB_USERNAME: "STAG_DB_USERNAME",
    DB_PASSWORD: "STAG_DB_PASSWORD",
    DB_HOST: "STAG_DB_HOST",
    DB_NAME: "STAG_DB_NAME",
    DB_PORT: "DB_PORT",
  },
  testing: {
    DB_USERNAME: "TEST_DB_USERNAME",
    DB_PASSWORD: "TEST_DB_PASSWORD",
    DB_HOST: "TEST_DB_HOST",
    DB_NAME: "TEST_DB_NAME",
    DB_PORT: "DB_PORT",
  },
};

/**
 * Fetches secrets from AWS Secrets Manager and updates process.env
 * @returns {Promise<Object|null>} The fetched secrets object or null for dev environments
 */
async function fetchSecrets() {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await client.send(command);
    const secret = JSON.parse(data.SecretString);
    // const secret = {
    //   TEST_DB_USERNAME: "postgres",
    //   TEST_DB_PASSWORD: "BisProJsdb2025",
    //   TEST_DB_NAME: "proctoring_tool_test",
    //   TEST_DB_HOST: "database-1-proc.c9s2qgea4q0z.us-west-2.rds.amazonaws.com"
    // }
    const map = envKeyMap[env];
    if (!map) {
      throw new Error(`No key mapping for environment: ${env}`);
    }

    // Update process.env with the fetched secrets
    Object.keys(map).forEach((appKey) => {
      const secretKey = map[appKey];
      if (secret[secretKey]) {
        process.env[appKey] = secret[secretKey];
        process.env[secretKey] = secret[secretKey];
      } else if (appKey !== "DB_PORT") {
        console.warn(`Warning: Secret key ${secretKey} missing for environment ${env}`);
      }
    });

    console.log(`Secrets fetched and mapped successfully for ${env}`);
    return secret;
  } catch (err) {
    console.error(`Failed to fetch secrets for ${env}`, err);
    throw err;
  }
}

/**
 * Fetches a specific secret by name from AWS Secrets Manager
 * @param {string} secretName - The name of the secret to fetch
 * @returns {Promise<Object>} The fetched secret object
 */
async function fetchSpecificSecret(secretName) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await client.send(command);
    return JSON.parse(data.SecretString);
  } catch (err) {
    console.error(`Failed to fetch secret: ${secretName}`, err);
    throw err;
  }
}

/**
 * Updates environment variables from a secrets object
 * @param {Object} secrets - The secrets object
 * @param {Object} keyMap - Optional mapping of secret keys to env keys
 */
function updateEnvFromSecrets(secrets, keyMap = null) {
  if (keyMap) {
    Object.keys(keyMap).forEach((envKey) => {
      const secretKey = keyMap[envKey];
      if (secrets[secretKey]) {
        process.env[envKey] = secrets[secretKey];
      }
    });
  } else {
    // Direct mapping - use secret keys as env keys
    Object.keys(secrets).forEach((key) => {
      process.env[key] = secrets[key];
    });
  }
}

/**
 * Saves secrets to dbSecrets.json file
 * @param {Object} secrets - The secrets object to save
 * @param {string} environment - The current environment
 */
function saveSecretsToFile(secrets, environment) {
  try {
    const secretsData = {
      environment: environment,
      timestamp: new Date().toISOString(),
      ...secrets,
      secrets: secrets
    };
    
    const filePath = path.join(__dirname, 'dbSecrets.json');
    fs.writeFileSync(filePath, JSON.stringify(secretsData, null, 2));
    console.log(`Secrets saved to: ${filePath}`);
  } catch (error) {
    console.error('Error saving secrets to file:', error);
  }
}

module.exports = { 
  fetchSecrets, 
  fetchSpecificSecret, 
  updateEnvFromSecrets,
  saveSecretsToFile
};

// If this file is run directly, execute fetchSecrets
if (require.main === module) {
  fetchSecrets()
    .then((secrets) => {
      if (secrets) {
        // console.log('Secrets fetched successfully:', Object.keys(secrets));
        // Save secrets to dbSecrets.json file
        saveSecretsToFile(secrets, env);
      } else {
        console.log('Skipped fetching secrets for development environment');
        // For development, create an empty secrets file with environment info
        const devSecrets = {
          environment: env,
          message: 'No secrets fetched - running in development mode',
          timestamp: new Date().toISOString()
        };
        saveSecretsToFile(devSecrets, env);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error fetching secrets:', error);
      process.exit(1);
    });
}
