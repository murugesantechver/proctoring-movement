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
      PurgeCode
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

};
  