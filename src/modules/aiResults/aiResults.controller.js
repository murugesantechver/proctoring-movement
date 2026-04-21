const db = require("../../models/models");
const { resolveSession } = require("../../shared/utils/sessionIdResolver");
const { createProctoringNote } = require("../../shared/utils/proctoringNote");
const { Op } = require("sequelize");
const { createVirtualProctoringUpdateEmailContent } = require("../../shared/services/emailCreation.service");

exports.updateFeedback = async (req, res) => {
  const { id } = req.params;
  const { feedback_text, feedback_rating = 0, thumbs_up = null, thumbs_down = null, feedback_added_user, admin_id } = req.body;
  try {
    const aiResult = await db.AIResult.findByPk(id);
    if (!aiResult) return res.status(404).json({ success: false, message: "AI Result not found" });
    const now = new Date();
    if (!aiResult.feedback_text && feedback_text) {
      aiResult.feedback_added_time = now;
      aiResult.feedback_added_user = feedback_added_user || null;
      await createProctoringNote({ commentKey: "proctor_feedback_received", session_id: aiResult.session_id, source: "participant_view", user_id: admin_id, messages: { RuleName: aiResult.result_type, Feedback: feedback_text, SessionID: aiResult.session_id, ParticipantFullName: aiResult.feedback_added_user || "Unknown" } });
    } else { return res.status(404).json({ success: false, message: "Feedback Already Exists" }); }
    if (feedback_text || feedback_rating || thumbs_up !== null || thumbs_down !== null) aiResult.feedback_updated_time = now;
    aiResult.feedback_text = feedback_text; aiResult.feedback_rating = feedback_rating; aiResult.thumbs_up = thumbs_up; aiResult.thumbs_down = thumbs_down;
    await aiResult.save();
    let commentKey = thumbs_up ? "proctor_feedback_received_thumbs_up" : thumbs_down ? "proctor_feedback_received_thumbs_down" : null;
    if (commentKey) await createProctoringNote({ commentKey, session_id: aiResult.session_id, source: "participant_view", user_id: admin_id, messages: { RuleName: aiResult.result_type, SessionID: aiResult.session_id, ParticipantFullName: aiResult.feedback_added_user || "Unknown" } });
    return res.status(200).json({ success: true, aiResult });
  } catch (error) { console.error("Error updating feedback:", error); return res.status(500).json({ success: false, message: "Failed to update feedback" }); }
};

exports.getAIResultById = async (req, res) => {
  const { id } = req.params;
  try {
    const aiResult = await db.AIResult.findByPk(id);
    if (!aiResult) return res.status(404).json({ success: false, message: "AI Result not found" });
    return res.status(200).json({ success: true, aiResult });
  } catch (error) { console.error("Error fetching AI result:", error); return res.status(500).json({ success: false, message: "Failed to fetch AI result" }); }
};

exports.updateResolvedStatus = async (req, res) => {
  const { id } = req.params;
  const { resolved, resolved_comment, resolved_user, admin_id } = req.body;
  try {
    const aiResult = await db.AIResult.findByPk(id);
    if (!aiResult) return res.status(404).json({ success: false, message: "AI Result not found" });
    const now = new Date();
    if (!aiResult.resolved && resolved === true) { aiResult.resolved_time = now; aiResult.resolved_user = resolved_user || null; }
    if (typeof resolved !== "undefined" || resolved_comment) { aiResult.resolved_updated_time = now; if (resolved_user) aiResult.resolved_user = resolved_user; }
    if (typeof resolved !== "undefined") aiResult.resolved = resolved;
    if (typeof resolved_comment !== "undefined") aiResult.resolved_comment = resolved_comment;
    await aiResult.save();
    await createProctoringNote({ commentKey: "proctor_feedback_resolved", session_id: aiResult.session_id, source: "participant_view", user_id: admin_id, messages: { RuleName: aiResult.result_type, SessionID: aiResult.session_id, ResolutionComment: resolved_comment, ParticipantFullName: aiResult.resolved_user || "Unknown" } });
    return res.status(200).json({ success: true, aiResult });
  } catch (error) { console.error("Error updating resolved status:", error); return res.status(500).json({ success: false, message: "Failed to update resolved status" }); }
};

exports.getResultsBySession = async (req, res) => {
  const { session_id } = req.params;
  const { resolved } = req.query;
  try {
    const where = { session_id };
    if (resolved === "true") where.resolved = true;
    else if (resolved === "false") where.resolved = false;
    const results = await db.AIResult.findAll({ where });
    return res.status(200).json({ success: true, results });
  } catch (error) { console.error("Error fetching AI results:", error); return res.status(500).json({ success: false, message: "Failed to fetch AI results" }); }
};

exports.updateIdStatus = async (req, res) => {
  const { id } = req.params;
  const { override_reason, organization_id, admin_id } = req.body;
  try {
    const aiResult = await db.AIResult.findByPk(id);
    if (!aiResult) return res.status(404).json({ success: false, message: "AIResult not found" });
    if (aiResult.id_status === "valid") return res.status(400).json({ success: false, message: "Already in valid status" });
    aiResult.id_status = "valid"; aiResult.override_reason = override_reason || null;
    await aiResult.save();
    const sessionId = aiResult.session_id;
    const resolvedSessionId = await resolveSession(sessionId, organization_id);
    const sessionByExternal = await db.Session.findOne({ where: { id: resolvedSessionId } });
    const proctoringKeyDetails = await db.ProctoringKey.findOne({ where: { key_id: sessionByExternal.key_id } });
    await createProctoringNote({ commentKey: "invalid_proctor_individual_override", session_id: aiResult.session_id, source: "participant_view", user_id: admin_id, messages: { KeyName: proctoringKeyDetails.name, RuleName: aiResult.result_type, SessionID: aiResult.session_id, Reason: override_reason } });
    const invalidCount = await db.AIResult.count({ where: { session_id: sessionId, id_status: { [Op.ne]: "valid" }, warning: { [Op.ne]: null } } });
    if (invalidCount === 0) {
      await db.Session.update({ status: "valid" }, { where: { id: resolvedSessionId } });
      const session = await db.Session.findOne({ where: { id: resolvedSessionId }, include: [{ model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name", "id", ["id", "user_id"]] }, { model: db.Course, as: "course", attributes: ["id", "name"] }] });
      await createVirtualProctoringUpdateEmailContent({ userId: session.user.id, sessionId: session.external_session_id || session.id, organisationId: session.organization_id, course: session.course.name || "Unknown Course", reason: null });
    }
    return res.status(200).json({ success: true, aiResult });
  } catch (error) { console.error("Error updating id_status:", error); return res.status(500).json({ success: false, message: "Failed to update id_status", error: error.message }); }
};
