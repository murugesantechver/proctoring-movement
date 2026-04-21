const db = require("../../models/models");
const { Op } = require("sequelize");
const axios = require("axios");

const username = process.env.WEBHOOK_USERNAME;
const password = process.env.WEBHOOK_PASSWORD;
const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");

async function postFinalAiResult(requestData) {
  const { session_id, organization_id, over_ride } = requestData;
  const url = process.env.BIS_LIVE_URL
    ? `${process.env.BIS_LIVE_URL}/v1/index.cfm?action=learner.vpvalidate`
    : "https://staging.bissafety.app/v1/index.cfm?action=learner.vpvalidate";
  const headers = { "Content-Type": "application/json", Authorization: `Basic ${basicAuth}` };

  try {
    const session = await db.Session.findOne({
      where: { id: session_id, organization_id },
      attributes: ["external_session_id", "first_name", "user_name", "key_id", "last_name", "user_image", "override_status", "override_reason", "verification_status", "status", "started_at"],
      include: [
        { model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name", "id", ["id", "user_id"]] },
        { model: db.Course, as: "course", attributes: ["id", "name"] },
        {
          model: db.AIResult, as: "aiResults", separate: true, order: [["createdAt", "ASC"]],
          attributes: ["warning", "frame_image", "detected_objects", ["person_count", "count_of_objects"], ["createdAt", "timestamp"], "id", "feedback_text", "feedback_rating", "thumbs_up", "thumbs_down", "resolved", "resolved_comment", "feedback_added_time", "feedback_updated_time", "resolved_time", "resolved_updated_time", "feedback_added_user", "resolved_user", "id_status", "override_reason", "raw_response", "eye_closure_streak"],
          required: false,
          where: { [Op.or]: [{ warning: { [Op.ne]: null } }, { detected_objects: { [Op.ne]: null } }] },
        },
      ],
    });

    if (!session) throw new Error(`Session not found with session_id : ${session_id}`);
    const payload = session.toJSON();
    if (over_ride !== undefined && over_ride === true) payload.over_ride = over_ride;

    return axios.post(url, payload, { headers })
      .then(async (response) => {
        return true;
      })
      .catch(async (err) => {
        console.error("Axios error in postFinalAiResult:", err.message);
        return false;
      });
  } catch (error) {
    console.error("Unexpected error postFinalAiResult:", error);
    return false;
  }
}

async function sendBisSafetyWebhook(organization_id, data) {
  const url = process.env.BIS_LIVE_URL
    ? `${process.env.BIS_LIVE_URL}/webhook/proctoringupdate.cfm?organisationid=${organization_id}`
    : `https://staging.bissafety.app/webhook/proctoringupdate.cfm?organisationid=${organization_id}`;
  const headers = { "Content-Type": "application/json", Authorization: `Basic ${basicAuth}` };

  try {
    return axios.post(url, data, { headers })
      .then(async (response) => {
        return true;
      })
      .catch(async (err) => {
        console.error("Error in axios POST:", err.message);
        return false;
      });
  } catch (error) {
    console.error("Unexpected error sendBisSafetyWebhook:", error);
    return false;
  }
}

module.exports = { postFinalAiResult, sendBisSafetyWebhook };
