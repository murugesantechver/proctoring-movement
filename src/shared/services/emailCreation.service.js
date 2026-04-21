const { renderTemplate } = require("../templates");
const { sendMail } = require("../utils/sendMail");
const db = require("../../models/models");
const crypto = require("crypto");
const redisClient = require("../config/redis");
const { generateCrfToken } = require("../utils/jwt");

const supportMail = process.env.HELP_MAIL_SUPPORT || "";
const termsUrl = process.env.TERMS_URL || "";
const privacyUrl = process.env.PRIVACY_URL || "";

exports.sendAlreadySubmittedEmail = async (params) => {
  try {
    const { email, participant_name, course_name, custom_message } = params || {};
    const subject = `Submission Already Received${course_name ? ` - ${course_name}` : ""}`;
    const data = { participant_name: participant_name || "Participant", course_name: course_name || "your course", custom_message: custom_message || null, supportMail, termsUrl, privacyUrl };
    const html = await renderTemplate("alreadySubmittedMail.mustache", data);
    await sendMail({ to: [email], subject, html });
    return { success: true, message: "Already submitted email sent" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

exports.createInvalidProofEmailContent = async (details) => {
  try {
    let { userId, sessionId, organisationId, course_name } = details;
    const user = await db.User.findOne({ where: { id: userId } });
    const token = generateCrfToken({ user_id: userId, user_mail: user.email, role: user.role, crf: true }, "48h");
    let data = { participant_name: `${user.first_name} ${user.last_name}` || "Unknown", Link: `${process.env.WEB_URL}/participants/${organisationId}/manual-verification/${sessionId}?token=${token}`, course_name, supportMail, termsUrl, privacyUrl, EmailAddress: user.email };
    const subject = `Government ID Upload for ${course_name} Required`;
    const html = await renderTemplate("proofVerificationResubmit.mustache", data);
    await sendMail({ to: [user.email], subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id: organisationId, action: "createInvalidProofEmailContent", action_type: "CREATE", affected_entity: "Session", description: `Manual verification email sent to user (${userId}) for session (${sessionId}).` });
    await redisClient.set(`resubmit:${token}`, "token");
    return { success: true, message: "Notification sent" };
  } catch (error) {
    console.log(error.message, "Error in sending mail");
    return error;
  }
};

exports.createVirtualProctoringValidatedEmailContent = async (details) => {
  try {
    let { userId, sessionId, organisationId, course } = details;
    const user = await db.User.findOne({ where: { id: userId } });
    let data = { participant_name: `${user.first_name} ${user.last_name}` || "Unknown", Link: `${process.env.WEB_URL}/participants/${organisationId}/manual-verification/${sessionId}`, supportMail, termsUrl, privacyUrl };
    const subject = `${course} Virtual Proctoring Validated`;
    const html = await renderTemplate("proctoringValidated.mustache", data);
    await sendMail({ to: [user.email], subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id: organisationId, action: "createVirtualProctoringValidatedEmailContent", action_type: "CREATE", affected_entity: "Session", description: `Virtual proctoring validated email sent to user (${userId}) for course "${course}".` });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    return error;
  }
};

exports.createVirtualProctoringUnsuccessfulEmailContent = async (details) => {
  try {
    let { userId, sessionId, organisationId, course } = details;
    const user = await db.User.findOne({ where: { id: userId } });
    const token = generateCrfToken({ user_id: userId, user_mail: user.email, sessionId, organisationId, role: user.role, crf: true }, "48h");
    let data = { participant_name: `${user.first_name} ${user.last_name}` || "Unknown", Link: `${process.env.WEB_URL}/validation/${organisationId}/${sessionId}/flags?token=${token}`, course_name: course || "Unknown Course", supportMail, termsUrl, privacyUrl };
    const subject = `${course} Virtual Proctoring Violation`;
    const html = await renderTemplate("proctoringUnsuccessfulCourseCompletion.mustache", data);
    await sendMail({ to: [user.email], subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id: organisationId, action: "createVirtualProctoringUnsuccessfulEmailContent", action_type: "CREATE", affected_entity: "Session", description: `Proctoring unsuccessful email sent to user (${userId}) for course "${course}".` });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    return error;
  }
};

exports.createVirtualProctoringUpdateEmailContent = async (details) => {
  try {
    let { userId, sessionId, organisationId, course, reason } = details;
    const user = await db.User.findOne({ where: { id: userId } });
    let data = { participant_name: `${user.first_name} ${user.last_name}` || "Unknown", Link: `${process.env.WEB_URL}/participants/${organisationId}/manual-verification/${sessionId}`, course_name: course || "Unknown Course", reason, supportMail, termsUrl, privacyUrl };
    const subject = `${course} Virtual Proctor Update - Valid`;
    const html = await renderTemplate("proctoringValidUpdate.mustache", data);
    await sendMail({ to: [user.email], subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id: organisationId, action: "createVirtualProctoringUpdateEmailContent", action_type: "CREATE", affected_entity: "Session", description: `Proctoring update email sent to user (${userId}) for course "${course}".` });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    return error;
  }
};

exports.courseCompleteEmail = async (details) => {
  try {
    let { userId, course, organisationId } = details;
    const user = await db.User.findOne({ where: { id: userId } });
    let data = { user_name: `${user.first_name} ${user.last_name}` || "Unknown", course_name: course || "Unknown Course", supportMail, termsUrl, privacyUrl };
    const organization = await db.Organization.findByPk(organisationId);
    if (!organization || !organization.notification_emails || organization.notification_emails.length === 0) return { success: false, message: "No notification emails configured" };
    const subject = `Action Required: Manual Verification for Completed Course`;
    const html = await renderTemplate("courseComplete.mustache", data);
    await sendMail({ to: organization.notification_emails, subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id: organisationId, action: "courseCompleteEmail", action_type: "CREATE", affected_entity: "User", description: `Course completion notification sent for user (${userId}).` });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    return error;
  }
};

exports.createVirtualProctoringOnPendingUpdateEmailContent = async (details) => {
  try {
    let { userId, sessionId, organisationId, course } = details;
    const user = await db.User.findOne({ where: { id: userId } });
    let data = { participant_name: `${user.first_name} ${user.last_name}` || "Unknown", Link: `${process.env.WEB_URL}/participants/${organisationId}/manual-verification/${sessionId}`, course_name: course || "Unknown Course", supportMail, termsUrl, privacyUrl };
    const subject = `${course} Virtual Proctoring Results Pending`;
    const html = await renderTemplate("proctoringOnPendingUpdate.mustache", data);
    await sendMail({ to: [user.email], subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id: organisationId, action: "createVirtualProctoringOnPendingUpdateEmailContent", action_type: "CREATE", affected_entity: "Session", description: `Proctoring (ON) pending update email sent to user (${userId}).` });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    return error;
  }
};

exports.createVirtualProctoringOffPendingUpdateEmailContent = async (details) => {
  try {
    let { userId, sessionId, organisationId, course } = details;
    const user = await db.User.findOne({ where: { id: userId } });
    let data = { participant_name: `${user.first_name} ${user.last_name}` || "Unknown", Link: `${process.env.WEB_URL}/participants/${organisationId}/manual-verification/${sessionId}`, course_name: course || "Unknown Course", supportMail, termsUrl, privacyUrl };
    const subject = `${course} Virtual Proctoring Results Pending`;
    const html = await renderTemplate("proctoringOffPendingUpdate.mustache", data);
    await sendMail({ to: [user.email], subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id: organisationId, action: "createVirtualProctoringOffPendingUpdateEmailContent", action_type: "CREATE", affected_entity: "Session", description: `Proctoring (OFF) pending update email sent to user (${userId}).` });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    return error;
  }
};

exports.testMailSend = async (details) => {
  try {
    let { userId, sessionId = 2222, organisationId = 1, course = "Testing", templateId = 1, to = ["vijay@techversantinfo.com"] } = details;
    const templateMap = { 1: "proctoringInvalidUpdate.mustache", 2: "proctoringOffPendingUpdate.mustache", 3: "proctoringOnPendingUpdate.mustache", 4: "proctoringUnsuccessfulCourseCompletion.mustache", 5: "proctoringValidated.mustache", 6: "proctoringValidUpdate.mustache", 7: "proofVerificationResubmit.mustache" };
    const templateName = templateMap[templateId];
    if (!templateName) throw new Error(`Invalid templateId: ${templateId}`);
    const token = crypto.randomBytes(64).toString("hex");
    let data = { participant_name: "Unknown", Link: `${process.env.WEB_URL}/participants/${organisationId}/manual-verification/${sessionId}?token=${token}`, course_name: course || "Unknown Course", supportMail, termsUrl, privacyUrl };
    const subject = `${course} Virtual Proctor Update - Valid`;
    const html = await renderTemplate(templateName, data);
    await sendMail({ to, subject, html });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

exports.sendManualVerificationAlertEmail = async (organization_id, emailData) => {
  try {
    const { participant_name, course_name, date } = emailData;
    const organization = await db.Organization.findByPk(organization_id);
    if (!organization || !organization.notification_emails || organization.notification_emails.length === 0) return { success: false, message: "No notification emails configured" };
    const subject = "Manual Proctor Verification Required";
    let data = { participant_name: participant_name || "Unknown", course_name: course_name || "Unknown Course", supportMail, termsUrl, privacyUrl, date };
    const html = await renderTemplate("sendManualVerificationAlert.mustache", data);
    await sendMail({ to: organization.notification_emails, subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id, action: "sendManualVerificationAlertEmail", action_type: "CREATE", affected_entity: "Organization", description: `Manual verification alert sent for participant "${participant_name}".` });
    return { success: true, message: "Notification sent" };
  } catch (error) {
    console.error("sendManualVerificationAlert error:", error);
    return { success: false, message: error.message };
  }
};

exports.sendOtpEmail = async (emailData) => {
  try {
    const { recipient_email, otp } = emailData;
    if (!recipient_email.length || !otp) return { success: false, message: "Otp data missing." };
    const subject = "Your One-Time Password (OTP)";
    const data = { otp, supportMail, termsUrl, privacyUrl, EmailAddress: recipient_email.join(", ") };
    const html = await renderTemplate("sendOtpEmail.mustache", data);
    await sendMail({ to: [...recipient_email], subject, html });
    return { success: true, message: "OTP email sent successfully" };
  } catch (error) {
    console.error("sendOtpEmail error:", error);
    return { success: false, message: error.message };
  }
};

exports.resubmitSuccessMail = async (emailData) => {
  const { user_name, organization_id } = emailData;
  const organization = await db.Organization.findByPk(organization_id);
  if (!organization || !organization.notification_emails || organization.notification_emails.length === 0) return { success: false, message: "No notification emails configured" };
  try {
    const data = { user_name, supportMail, termsUrl, privacyUrl };
    const subject = "Action Required: Manual Verification for ID Resubmission";
    const html = await renderTemplate("resubmitCompleted.mustache", data);
    await sendMail({ to: organization.notification_emails, subject, html });
    await db.AuditLog.create({ admin_id: null, organization_id, action: "resubmitSuccessMail", action_type: "CREATE", affected_entity: "User", description: `Resubmission success notification sent for participant "${user_name}".` });
    return { success: true, message: "Notification sent successfully" };
  } catch (error) {
    console.error("Error in resubmitSuccessMail:", error.message);
    return { success: false, message: error.message || "Failed to send notification" };
  }
};
