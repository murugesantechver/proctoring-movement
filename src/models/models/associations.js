module.exports = (db) => {
    const {
      Session,
      ProctoringKey,
      User,
      Course,
      AIResult,
      CourseAssignment,
      Organization,
      ProctoringNote,
      PurgeCode,
      Plan,
      Payment,
      Subscription,
      Invoice,
    } = db;
  

  Session.belongsTo(ProctoringKey, {
  foreignKey: 'key_id',
  targetKey: 'key_id', // <-- explicitly use key_id instead of id
  as: 'proctoringKey',
  });

  Session.belongsTo(Organization, { 
  foreignKey: 'organization_id', 
  as: 'organization' });


  ProctoringKey.hasMany(Session, {
    foreignKey: 'key_id',
    sourceKey: 'key_id', 
    as: 'sessions',
  });  

  Session.belongsTo(User, {
    foreignKey: 'user_id',   
    as: 'user',
  });

  Session.belongsTo(Course, {
    foreignKey: 'course_id',
    as: 'course',
  });

  Course.hasMany(Session, {
    foreignKey: 'course_id',
    as: 'sessions',
  });

  Session.hasMany(AIResult, {
    foreignKey: 'session_id',
    as: 'aiResults',
  });

  AIResult.belongsTo(Session, {
    foreignKey: 'session_id',
    as: 'session',
  });
   
  CourseAssignment.belongsTo(ProctoringKey, {
  foreignKey: 'key_id',
  targetKey: 'key_id', 
  as: 'proctoringKey',
  });

  ProctoringKey.hasMany(CourseAssignment, {
    foreignKey: 'key_id',
    sourceKey: 'key_id', 
    as: 'courseAssignments',
  });

  CourseAssignment.belongsTo(Session, {
    foreignKey: 'session_id',
    as: 'session',
  });

  Session.hasMany(CourseAssignment, {
    foreignKey: 'session_id',
    as: 'courseAssignments',
  });

  CourseAssignment.belongsTo(User, {
  foreignKey: 'user_id',
  targetKey: 'id',
  as: 'user',
});

User.hasMany(CourseAssignment, {
  foreignKey: 'user_id',
  sourceKey: 'id',
  as: 'courseAssignments',
});

CourseAssignment.belongsTo(db.Organization, {
  foreignKey: 'organization_id',
  as: 'organization',
});

Organization.hasMany(db.CourseAssignment, {
  foreignKey: 'organization_id',
  as: 'courseAssignments',
});

ProctoringNote.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(ProctoringNote, {
  foreignKey: 'user_id',
  as: 'proctoringNotes',
});

ProctoringNote.belongsTo(Organization, {
  foreignKey: 'organization_id',
  as: 'organization',
});

Organization.hasMany(ProctoringNote, {
  foreignKey: 'organization_id',
  as: 'proctoringNotes',
});

// PurgeCode associations
PurgeCode.belongsTo(Organization, {
  foreignKey: 'organization_id',
  as: 'organization',
});

Organization.hasMany(PurgeCode, {
  foreignKey: 'organization_id',
  as: 'purgeCodes',
});

// ── Payment associations ──────────────────────────────────────────────────

// Plan <-> Payment
Plan.hasMany(Payment, { foreignKey: 'plan_id', as: 'payments' });
Payment.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });

// Organization <-> Payment
Organization.hasMany(Payment, { foreignKey: 'organization_id', as: 'payments' });
Payment.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Organization <-> Subscription
Organization.hasMany(Subscription, { foreignKey: 'organization_id', as: 'subscriptions' });
Subscription.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Plan <-> Subscription
// NOTE: alias is 'planDetails' not 'plan' — Subscription model already has a column named 'plan'
// Using 'plan' as both a column and association alias causes a Sequelize naming collision
Plan.hasMany(Subscription, { foreignKey: 'plan_id', as: 'subscriptions' });
Subscription.belongsTo(Plan, { foreignKey: 'plan_id', as: 'planDetails' });

// Payment <-> Subscription (payment that activated this subscription)
Payment.hasOne(Subscription, { foreignKey: 'payment_id', as: 'subscription' });
Subscription.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

// Organization <-> Invoice
Organization.hasMany(Invoice, { foreignKey: 'organization_id', as: 'invoices' });
Invoice.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// Subscription <-> Invoice
Subscription.hasMany(Invoice, { foreignKey: 'subscription_id', as: 'invoices' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscription_id', as: 'subscription' });

// Payment <-> Invoice
Payment.hasMany(Invoice, { foreignKey: 'payment_id', as: 'invoices' });
Invoice.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

};
  