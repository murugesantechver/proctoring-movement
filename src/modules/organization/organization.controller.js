const db = require("../../models/models");
const { sendMail } = require("../../shared/utils/sendMail");
const { resolveSession } = require("../../shared/utils/sessionIdResolver");
const AWS = require("aws-sdk");
const path = require("path");
const redisClient = require("../../shared/config/redis");
const { createInvalidProofEmailContent, sendManualVerificationAlertEmail, resubmitSuccessMail, sendAlreadySubmittedEmail } = require("../../shared/services/emailCreation.service");

const s3 = new AWS.S3({ region: process.env.AWS_REGION });

exports.createOrganization = async (req, res) => {
  try {
    const { name, industry, subscription_id, contact_email, contact_phone, notification_emails } = req.body;
    if (!name || !contact_email) return res.status(400).json({ success: false, message: "Missing required fields: name or contact_email" });
    const organization = await db.Organization.create({ name, industry, subscription_id: subscription_id || null, contact_email, contact_phone, notification_emails });
    res.status(201).json({ success: true, data: organization });
  } catch (error) { console.error("Error creating organization:", error); res.status(500).json({ success: false, message: "Internal server error" }); }
};

exports.sendManualVerificationAlert = async (req, res) => {
  try {
    const { organization_id } = req.params;
    const { participant_name, course_name, date } = req.body;
    if (!participant_name || !course_name || !date) return res.status(400).json({ success: false, message: "Missing required fields" });
    const organization = await db.Organization.findByPk(organization_id);
    if (!organization || !organization.notification_emails || organization.notification_emails.length === 0) return res.status(404).json({ success: false, message: "No notification emails configured" });
    const subject = "Manual Proctor Verification Required";
    const html = `<h2>Manual Participant ID Verification</h2><p>Hello,</p><p>The virtual proctor could not verify the identity of <strong>${participant_name}</strong> with the government-issued photo ID they provided.</p><p>They continued to take the online course <strong>${course_name}</strong> on <strong>${date}</strong>.</p><p>Please verify the participant's identity immediately. Their course status will remain pending until your manual verification is complete.</p><p>Thanks kindly,<br/>BIS Safety Software</p>`;
    await sendMail({ to: organization.notification_emails.join(","), subject, html });
    return res.status(200).json({ success: true, message: "Notification sent" });
  } catch (err) { console.error("Manual verification email error:", err); return res.status(500).json({ success: false, message: "Failed to send notification" }); }
};

exports.updateNotificationEmails = async (req, res) => {
  const { organization_id } = req.params;
  const { notification_emails } = req.body;
  if (!Array.isArray(notification_emails)) return res.status(400).json({ error: "notification_emails must be an array of strings" });
  try {
    const [updatedCount] = await db.Organization.update({ notification_emails }, { where: { id: organization_id } });
    if (updatedCount === 0) return res.status(404).json({ error: "Organization not found or no changes made" });
    return res.json({ success: true, message: "Notification emails updated successfully" });
  } catch (error) { console.error("Error updating notification_emails:", error); return res.status(500).json({ error: "Internal server error" }); }
};

exports.reuploadGovtId = async (req, res) => {
  const { session_key, organization_id } = req.body;
  const file = req.file;
  if (!session_key || !organization_id || !file) return res.status(400).json({ success: false, error: "Missing required fields" });
  try {
    const session_id = await resolveSession(session_key, organization_id);
    if (!session_id) return res.status(404).json({ success: false, error: "Session not found" });
    const session = await db.Session.findOne({ where: { id: session_id, organization_id } });
    if (!session) return res.status(404).json({ success: false, error: "Session not found" });
    const aiResult = await db.AIResult.findOne({ where: { session_id, result_type: "id-verification" } });
    if (!aiResult) return res.status(404).json({ success: false, error: "ID verification result not found" });
    const payload = { session_id, result_type: "id-verification-reSubmit", raw_response: { session_key, organization_id }, request_id: aiResult.request_id || null, user_image: aiResult.source_image || null, warning: "Validate Resubmitted ID - Requires Manual Verification", id_status: "invalid", rules: aiResult.rules };
    const extension = file.originalname.split(".").pop() || "jpg";
    const key = `${organization_id}/manual-id-reupload/${session_id}/${Date.now()}.${extension}`;
    await s3.putObject({ Bucket: process.env.S3_BUCKET_NAME, Key: key, Body: file.buffer, ContentType: file.mimetype }).promise();
    payload.frame_image = key;
    payload.active = false;
    payload.finalResult = true;
    await db.AIResult.create(payload);
    return res.json({ success: true, message: "ID reuploaded successfully", data: { key } });
  } catch (err) { console.error("Error during manual ID reupload:", err); return res.status(500).json({ success: false, error: "Internal server error" }); }
};

exports.getOrganizationDetails = async (req, res) => {
  const { organization_id } = req.params;
  try {
    const data = await db.Organization.findByPk(organization_id);
    return res.json({ success: true, message: "success", res: data });
  } catch (error) { console.error("Error fetching organization:", error); return res.status(500).json({ error: "Internal server error" }); }
};

exports.checkReUpload = async (req, res) => {
  try {
    const { session_key, organization_id, sendMail: shouldSendMail = false, email } = req.body;
    if (!session_key || !organization_id) return res.status(400).json({ success: false, error: "Missing required fields" });
    const session_id = await resolveSession(session_key, organization_id);
    if (!session_id) return res.status(404).json({ success: false, error: "Session not found" });
    const aiResultReSubmitted = await db.AIResult.findOne({ where: { session_id, result_type: "id-verification-reSubmit", active: true } });
    if (aiResultReSubmitted) {
      if (shouldSendMail) {
        let sessionDetails = await db.Session.findOne({ where: { id: session_id }, include: [{ model: db.Course, as: "course", attributes: ["id", "name"] }] });
        await sendAlreadySubmittedEmail({ sessionId: session_id, email, course_name: sessionDetails.course.name || "Unknown Course" });
      }
      return res.status(400).json({ success: false, error: "ID verification Already Re submitted" });
    }
    return res.json({ success: true, message: "ID can be re submitted" });
  } catch (error) { return res.status(500).json({ error: "Internal server error", message: error.message }); }
};

exports.updateReuploadStatus = async (req, res) => {
  try {
    const { session_key, organization_id } = req.body;
    if (!session_key || !organization_id) return res.status(400).json({ success: false, error: "Missing required fields" });
    const session_id = await resolveSession(session_key, organization_id);
    if (!session_id) return res.status(404).json({ success: false, error: "Session not found" });
    const session = await db.Session.findOne({ where: { id: session_id, organization_id }, include: [{ model: db.User, as: "user", attributes: ["first_name", "last_name", "email", "user_name", "id", "status"] }, { model: db.Course, as: "course", attributes: ["name"] }] });
    const aiResultReSubmitted = await db.AIResult.findOne({ where: { session_id, result_type: "id-verification-reSubmit", active: true } });
    if (aiResultReSubmitted) return res.status(404).json({ success: false, error: "ID verification Already Re submitted" });
    const aiResultReSubmittedExist = await db.AIResult.findOne({ where: { session_id, result_type: "id-verification-reSubmit", active: false } });
    if (!aiResultReSubmittedExist) return res.status(404).json({ success: false, error: "ID verification Not Re submitted Yet" });
    await db.AIResult.update({ active: true }, { where: { session_id, result_type: "id-verification-reSubmit", active: false } });
    if (session.status === "valid" || session.status === "invalid") {
      await sendManualVerificationAlertEmail(organization_id, {
        participant_name: (session.user?.first_name || session.user?.last_name) ? `${session.user.first_name || ""} ${session.user.last_name || ""}` : "Unknown",
        course_name: session.course?.name || "Unknown Course",
        date: new Date(session.createdAt).toLocaleDateString("en-GB"),
      });
    }
    return res.json({ success: true, message: "ID can be re submitted." });
  } catch (error) { return res.status(500).json({ error: "Internal server error", message: error.message }); }
};

exports.reuploadStatusCheck = async (req, res) => {
  try {
    const { session_key, organization_id } = req.body;
    if (!session_key || !organization_id) return res.status(400).json({ success: false, error: "Missing required fields" });
    const session_id = await resolveSession(session_key, organization_id);
    if (!session_id) return res.status(404).json({ success: false, error: "Session not found" });
    const aiResultReSubmittedExist = await db.AIResult.findOne({ where: { session_id, result_type: "id-verification-reSubmit", active: false } });
    if (aiResultReSubmittedExist) return res.status(200).json({ success: true, message: "ID verification not re submitted" });
    return res.status(200).json({ success: false, error: "ID verification already re-submitted" });
  } catch (error) { return res.status(500).json({ error: "Internal server error", message: error.message }); }
};

exports.sendManualVerificationAlertMail = async (req, res) => {
  try {
    const { session_key, organization_id } = req.body;
    if (!session_key || !organization_id) return res.status(400).json({ success: false, error: "Missing required fields" });
    const session_id = await resolveSession(session_key, organization_id);
    if (!session_id) return res.status(404).json({ success: false, error: "Session not found" });
    let sessionDetails = await db.Session.findOne({ where: { id: session_id }, include: [{ model: db.Course, as: "course", attributes: ["id", "name"] }] });
    const aiResult = await db.AIResult.findOne({ where: { session_id, result_type: "id-verification" } });
    if (!aiResult) return res.status(404).json({ success: false, error: "ID verification result not found" });
    if (aiResult.isManualVerificationSend === true) return res.status(404).json({ success: true, message: "Mail Already send" });
    await db.AIResult.update({ isManualVerificationSend: true }, { where: { session_id, result_type: "id-verification" } });
    await createInvalidProofEmailContent({ sessionId: aiResult.session_id, organisationId: organization_id, userId: aiResult.user_id, course_name: sessionDetails.course.name || "Unknown Course" });
    return res.status(200).json({ success: true, message: "Notification sent" });
  } catch (err) { console.error("Manual verification email error:", err); return res.status(500).json({ success: false, message: "Failed to send notification" }); }
};
