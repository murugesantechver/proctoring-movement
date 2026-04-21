require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { getSecrets } = require("../utils/getSecrets");

// Load secrets from dbSecrets.json if it exists
function loadSecretsFromFile() {
  const secretsFilePath = path.join(__dirname, '../../dbSecrets.json');
  
  if (fs.existsSync(secretsFilePath)) {
    try {
      const secretsData = JSON.parse(fs.readFileSync(secretsFilePath, 'utf8'));
      
      if (secretsData.secrets && typeof secretsData.secrets === 'object') {
        console.log(`📁 Loading secrets from dbSecrets.json for environment: ${secretsData.environment}`);
        Object.keys(secretsData.secrets).forEach(key => {
          process.env[key] = secretsData.secrets[key];
        });
        return secretsData;
      } else if (secretsData.message) {
        return secretsData;
      }
    } catch (error) {
      console.warn(`⚠️ Error reading dbSecrets.json: ${error.message}`);
    }
  }
  
  return {};
}
const secretsLoadedFromFile = loadSecretsFromFile();

function getSslOptions(env) {
  const isProdEnv = ["production", "vp_production", "bis_staging"].includes(env);
  if (isProdEnv && process.env.RDS_CA_PATH) {
    const caPath = path.resolve(process.env.RDS_CA_PATH);
    return {
      require: true,
      ca: fs.existsSync(caPath) ? fs.readFileSync(caPath).toString() : undefined,
    };
  }
  return { require: true, rejectUnauthorized: false };
}

function buildConfig(localData) {
  const env = process.env.NODE_ENV || "development";
  const sslOptions = getSslOptions(env);
  return {
    development: {
      username: localData?.DB_USERNAME ?? process.env.DB_USERNAME,
      password: localData?.DB_PASSWORD ?? process.env.DB_PASSWORD,
      database: localData?.DB_NAME ?? process.env.DB_NAME,
      host: localData?.DB_HOST ?? process.env.DB_HOST,
      dialect: "postgres",
      logging: false,
    },
    testing: {
      username: localData?.TEST_DB_USERNAME ?? process.env.TEST_DB_USERNAME,
      password: localData?.TEST_DB_PASSWORD ?? process.env.TEST_DB_PASSWORD,
      database: localData?.TEST_DB_NAME ?? process.env.TEST_DB_NAME,
      host: localData?.TEST_DB_HOST ?? process.env.TEST_DB_HOST,
      dialect: "postgres",
      logging: false,
    },
    production: {
      username: localData?.PROD_DB_USERNAME ?? process.env.PROD_DB_USERNAME,
      password: localData?.PROD_DB_PASSWORD ?? process.env.PROD_DB_PASSWORD,
      database: localData?.PROD_DB_NAME ?? process.env.PROD_DB_NAME,
      host: localData?.PROD_DB_HOST ?? process.env.PROD_DB_HOST,
      dialect: "postgres",
      dialectOptions: { ssl: sslOptions },
      logging: false,
    },
    bis_staging: {
      username: localData?.STAG_DB_USERNAME ?? process.env.STAG_DB_USERNAME,
      password: localData?.STAG_DB_PASSWORD ?? process.env.STAG_DB_PASSWORD,
      database: localData?.STAG_DB_NAME ?? process.env.STAG_DB_NAME,
      host: localData?.STAG_DB_HOST ?? process.env.STAG_DB_HOST,
      dialect: "postgres",
      dialectOptions: { ssl: sslOptions },
      logging: false,
    },
    vp_production: {
      username: localData?.PROD_DB_USERNAME ?? process.env.PROD_DB_USERNAME,
      password: localData?.PROD_DB_PASSWORD ?? process.env.PROD_DB_PASSWORD,
      database: localData?.PROD_DB_NAME ?? process.env.PROD_DB_NAME,
      host: localData?.PROD_DB_HOST ?? process.env.PROD_DB_HOST,
      dialect: "postgres",
      dialectOptions: { ssl: sslOptions },
      logging: false,
    },
  };
}

async function getDbConfig() {
  const env = process.env.NODE_ENV || "development";
  if (!secretsLoadedFromFile && ["production", "vp_production", "bis_staging", "testing"].includes(env)) {
    console.log(`☁️ No secrets found in dbSecrets.json, fetching from AWS Secrets Manager...`);
    await getSecrets();
  }
  const config = buildConfig(secretsLoadedFromFile)[env];
  if (!config) throw new Error(`❌ No DB config found for NODE_ENV=${env}`);
  console.log(`✅ Using DB config for env=${env}, host=${config.host}`);
  return config;
}

function getDbConfigSync() {
  const env = process.env.NODE_ENV || "development";
  loadSecretsFromFile();
  const config = buildConfig(secretsLoadedFromFile)[env];
  if (!config) throw new Error(`❌ No DB config found for NODE_ENV=${env}`);
  return config;
}

const configObj = buildConfig(secretsLoadedFromFile);
module.exports = configObj;
module.exports.getDbConfig = getDbConfig;
module.exports.getDbConfigSync = getDbConfigSync;
