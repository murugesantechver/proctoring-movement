module.exports = (sequelize, DataTypes) => {
    const AIResult = sequelize.define("AIResult", {
      session_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      result_type: {
        type: DataTypes.STRING, // 'object-detection', 'id-verification', etc.
        allowNull: false,
      },
      raw_response: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      match: DataTypes.BOOLEAN,
      similarity: DataTypes.FLOAT,
      warning: DataTypes.STRING,
      person_count: DataTypes.INTEGER,
      detected_objects: DataTypes.ARRAY(DataTypes.STRING),
      id_status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'invalid',
      },
      override_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      expiry_status: DataTypes.STRING,
      extracted_text: DataTypes.ARRAY(DataTypes.STRING),
      first_name_match: DataTypes.BOOLEAN,
      last_name_match: DataTypes.BOOLEAN,
      response_time: DataTypes.STRING,
      request_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      frame_image: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      user_image: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      feedback_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      feedback_rating: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      thumbs_up: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      thumbs_down: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      resolved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      resolved_comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      feedback_added_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      feedback_updated_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolved_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolved_updated_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      feedback_added_user: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolved_user: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      violation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      AttemptCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      finalResult: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      rules: {
        type: DataTypes.JSONB,
        defaultValue: []
      },
      isManualVerificationSend: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      eye_closure_streak: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    });
  
    AIResult.associate = (models) => {
      AIResult.belongsTo(models.Session, { foreignKey: "session_id" });
    };
  
    return AIResult;
  };
  