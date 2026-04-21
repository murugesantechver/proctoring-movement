// src/models/index.js
const { Sequelize } = require("sequelize");
const { getDbConfig, getDbConfigSync } = require("../../shared/config/config");

const dbStore = {
  // these will be populated in init()
  Sequelize: null,
  sequelize: null,
  // model placeholders (will be set after init)
  User: undefined,
  Organization: undefined,
  Subscription: undefined,
  CourseAssignment: undefined,
  ProctoringKey: undefined,
  ProctoringRule: undefined,
  Session: undefined,
  AdminSettings: undefined,
  Incident: undefined,
  Report: undefined,
  AuditLog: undefined,
  AIResult: undefined,
  ProctoringType: undefined,
  Course: undefined,
  RefreshToken: undefined,
  ProctoringNote: undefined,
  Job: undefined,
  BisCommunicationLog: undefined,
  PurgeCode: undefined,
};

let inited = false;

const db = {};

/**
 * init() - initialize Sequelize and load models
 * Returns: sequelize instance
 */
db.init = async () => {
  if (inited && dbStore.sequelize) {
    return dbStore.sequelize;
  }

  const env = process.env.NODE_ENV || "development";

  // Use sync config for dev/testing (no secrets fetch)
  const config = ["development", "testing"].includes(env)
    ? getDbConfigSync()
    : await getDbConfig();

  // Create Sequelize instance
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
  });

  // Attach Sequelize references
  dbStore.Sequelize = Sequelize;
  dbStore.sequelize = sequelize;

  // Load models (same pattern as your old code)
  dbStore.User = require("./user.model")(sequelize, Sequelize);
  dbStore.Organization = require("./organization.model")(sequelize, Sequelize);
  dbStore.Subscription = require("./subscription.model")(sequelize, Sequelize);
  dbStore.CourseAssignment = require("./courseAssignment.model")(sequelize, Sequelize);
  dbStore.ProctoringKey = require("./ProctoringKey.model")(sequelize, Sequelize);
  dbStore.ProctoringRule = require("./ProctoringRule.model")(sequelize, Sequelize);
  dbStore.Session = require("./session.model")(sequelize, Sequelize);
  dbStore.AdminSettings = require("./AdminSettings.model")(sequelize, Sequelize);
  dbStore.Incident = require("./incident.model")(sequelize, Sequelize);
  dbStore.Report = require("./report.model")(sequelize, Sequelize);
  dbStore.AuditLog = require("./auditLog.model")(sequelize, Sequelize);
  dbStore.AIResult = require("./aiResult.model")(sequelize, Sequelize);
  dbStore.ProctoringType = require("./proctoringType.model")(sequelize, Sequelize);
  dbStore.Course = require("./course.model")(sequelize, Sequelize);
  dbStore.RefreshToken = require("./refreshToken.model")(sequelize, Sequelize);
  dbStore.ProctoringNote = require("./proctoringNote.model")(sequelize, Sequelize);
  dbStore.Job = require("./job.model")(sequelize, Sequelize);
  dbStore.BisCommunicationLog = require("./biscommunicationlog")(sequelize, Sequelize);
  dbStore.UserOtp = require("./userotp")(sequelize, Sequelize);
  dbStore.PurgeCode = require("./purgecode.model")(sequelize, Sequelize);

  // Setup associations (if any)
  require("./associations")(dbStore);

  inited = true;
  console.log("✅ Models initialized and associations set up.");

  return sequelize;
};

/**
 * Helper to get Sequelize instance (if needed)
 */
db.getSequelize = () => dbStore.sequelize;

/**
 * Build the public export object using getters so destructuring works
 * even before init() completes. Each getter returns current value from dbStore.
 */
const publicExport = {
  init: db.init,
  getSequelize: db.getSequelize,
};

// List the properties we want to expose directly (so controllers can destructure)
const exposedProps = [
  "Sequelize",
  "sequelize",
  "User",
  "Organization",
  "Subscription",
  "CourseAssignment",
  "ProctoringKey",
  "ProctoringRule",
  "Session",
  "AdminSettings",
  "Incident",
  "Report",
  "AuditLog",
  "AIResult",
  "ProctoringType",
  "Course",
  "RefreshToken",
  "ProctoringNote",
  "Job",
  "BisCommunicationLog",
  "UserOtp",
  "PurgeCode",
];

// Define getters on publicExport that read from dbStore
exposedProps.forEach((prop) => {
  Object.defineProperty(publicExport, prop, {
    enumerable: true,
    configurable: false,
    get() {
      // return models if available; otherwise undefined (controllers must call after init but destructuring won't crash)
      return dbStore[prop];
    },
  });
});

module.exports = publicExport;
