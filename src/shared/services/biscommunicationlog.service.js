const db = require("../../models/models");

exports.createCommunicationLog = async ({ organization_id, session_id, url, payload, header, response, action }) => {
  try {
    await db.BisCommunicationLog.create({
      organization_id: organization_id || null,
      session_id: session_id || null,
      url: url || null,
      payload: payload ? JSON.stringify(payload) : null,
      header: header ? JSON.stringify(header) : null,
      response: response ? JSON.stringify(response) : null,
      action: action || null,
      timestamp: new Date(),
    });
    return true;
  } catch (error) {
    console.error("Error creating BisCommunicationLog:", error);
    return false;
  }
};
