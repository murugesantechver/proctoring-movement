const ExcelJS = require("exceljs");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const db = require("../../models/models");
const { createJob, updateJob } = require("../../shared/utils/job.util");

exports.generateAiFeedbackReport = async (req, res) => {
  try {
    const { startDate: startDateInput, endDate: endDateInput, key_id, completed = "Off", organization_id } = req.body;
    if (!organization_id) return res.status(400).json({ error: "organization_id is required" });
    if (completed !== "On" && completed !== "Off") return res.status(400).json({ error: 'completed must be "On" or "Off"' });
    const endDate = endDateInput ? new Date(endDateInput) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = startDateInput ? new Date(startDateInput) : new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    const dateLabel = endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
    const whereClause = { organization_id, started_at: { [Op.gte]: startDate, [Op.lte]: endDate } };
    if (key_id) whereClause.key_id = key_id;
    if (completed === "On") whereClause.status = { [Op.ne]: "in_progress" };
    else whereClause.status = { [Op.in]: ["valid", "in_progress", "invalid"] };
    const sessions = await db.Session.findAll({ where: whereClause, include: [{ model: db.AIResult, as: "aiResults" }, { model: db.Organization, as: "organization", attributes: ["name"] }, { model: db.Course, as: "course", attributes: ["name"] }] });
    const rows = [];
    function formatDateDDmmmYY(date) {
      if (!date) return "";
      const options = { timeZone: "America/Denver", day: "2-digit", month: "short", year: "2-digit" };
      const formatter = new Intl.DateTimeFormat("en-GB", options);
      const parts = formatter.formatToParts(new Date(date));
      return `${parts.find(p => p.type === "day")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "year")?.value}`;
    }
    for (const session of sessions) {
      const proctoringKeyDetails = await db.ProctoringKey.findOne({ where: { key_id: session.key_id } });
      let violations = [];
      for (const aiResult of session.aiResults) { if (aiResult.warning) violations.push(aiResult.warning); }
      const uniqueViolations = violations.filter((item, index) => violations.indexOf(item) === index);
      rows.push({ "UserName": session.user_name || "N/A", "First Name": session.first_name || "N/A", "Last Name": session.last_name || "N/A", "Company Name": session.organization.name === "Test Org" ? "1 In-House BIS" : session.organization.name || "1 In-House BIS", "Key Name": proctoringKeyDetails.name || "N/A", "Course Name": session.course.name || "N/A", "Purchase Date": formatDateDDmmmYY(session.created_at) || "N/A", "Start Date": formatDateDDmmmYY(session.started_at), "Completion Date": formatDateDDmmmYY(session.ended_at), "Completion ID": session.external_session_id || session.id, "Violations": uniqueViolations.join(", "), "Validation Status": session.status || "N/A", "Order ID": session.order_id || "N/A", "Proctor Fee": proctoringKeyDetails.fee || "N/A", "Permission Type": session.permission_type || "N/A", "Transaction Type": session.transaction_type || "N/A", "Estimated Duration (Minutes)": proctoringKeyDetails.duration_minutes ?? "N/A", "Total Proctored Time (Minutes)": (session.started_at && session.ended_at) ? Math.ceil((new Date(session.ended_at) - new Date(session.started_at)) / 60000) : "N/A", "Attempt/Total Attempts": session.attempt ? `${session.attempt || 1} /${session.total_attempts || 1}` : "N/A" });
    }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");
    const filename = `AI Virtual Proctor Feedback Report ${dateLabel}.xlsx`;
    const outputDir = path.join(__dirname, "..", "..", "adminModule", "reports");
    const filepath = path.join(outputDir, filename);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    await XLSX.writeFile(workbook, filepath);
    res.download(filepath);
  } catch (err) { console.error("Error generating report:", err); return res.status(500).json({ error: "Failed to generate report" }); }
};

exports.generateAiFeedbackReportChunks = async (req, res) => {
  let jobDetails = await createJob({ job_type: "ai_feedback_report", payload: JSON.stringify(req.body), triggeredUser: null, user_id: null, status: "pending", logMessage: "Generating AI Feedback Report Started" });
  try {
    const { startDate: startDateInput, endDate: endDateInput, key_id, completed = "Off", organization_id } = req.body;
    if (!organization_id) return res.status(400).json({ error: "organization_id is required" });
    if (completed !== "On" && completed !== "Off") return res.status(400).json({ error: 'completed must be "On" or "Off"' });
    const endDate = endDateInput ? new Date(endDateInput) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = startDateInput ? new Date(startDateInput) : new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    const dateLabel = endDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
    const whereClause = { organization_id, started_at: { [Op.gte]: startDate, [Op.lte]: endDate } };
    if (key_id) whereClause.key_id = key_id;
    if (completed === "On") whereClause.status = { [Op.ne]: "in_progress" }; else whereClause.status = { [Op.in]: ["valid", "in_progress", "invalid"] };
    await updateJob({ id: jobDetails.id, status: "in_progress", logMessage: `Query initiated for sessions with criteria: ${JSON.stringify(whereClause)}` });
    const sessions = await db.Session.findAll({ where: whereClause, include: [{ model: db.AIResult, as: "aiResults" }, { model: db.Organization, as: "organization", attributes: ["name"] }, { model: db.Course, as: "course", attributes: ["name"] }] });
    await updateJob({ id: jobDetails.id, status: "in_progress", logMessage: `Found ${sessions.length} sessions matching criteria` });
    if (sessions.length === 0) return res.status(400).json({ error: "Unable to generate report no matching data." });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="AI Virtual Proctor Feedback Report ${dateLabel}.xlsx"`);
    await updateJob({ id: jobDetails.id, status: "in_progress", logMessage: "Response set headers for streaming download" });
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
    const worksheet = workbook.addWorksheet("Participants");
    worksheet.addRow(["UserName", "First Name", "Last Name", "Company Name", "Key Name", "Course Name", "Start Date", "Completion Date", "Completion ID", "Violations", "Validation Status", "Proctor Fee", "Total Proctored Time (Minutes)"]).commit();
    function formatDateDDmmmYY(date) { if (!date) return ""; const options = { timeZone: "America/Denver", day: "2-digit", month: "short", year: "2-digit" }; return new Intl.DateTimeFormat("en-GB", options).format(new Date(date)); }
    await updateJob({ id: jobDetails.id, status: "in_progress", logMessage: "Data loop started for streaming download" });
    for (const session of sessions) {
      const proctoringKeyDetails = await db.ProctoringKey.findOne({ where: { key_id: session.key_id } });
      const violations = session.aiResults.map(ai => ai.warning).filter(Boolean);
      const uniqueViolations = [...new Set(violations)];
      worksheet.addRow([session.user_name || "N/A", session.first_name || "N/A", session.last_name || "N/A", session.organization?.name === "Test Org" ? "1 In-House BIS" : (session.organization?.name || "1 In-House BIS"), proctoringKeyDetails?.name || "N/A", session.course?.name || "N/A", formatDateDDmmmYY(session.started_at), formatDateDDmmmYY(session.ended_at), session.external_session_id || session.id, uniqueViolations.join(", "), session.status || "N/A", proctoringKeyDetails.fee || "N/A", (session.started_at && session.ended_at) ? Math.ceil((new Date(session.ended_at) - new Date(session.started_at)) / 60000) : "N/A"]).commit();
    }
    await updateJob({ id: jobDetails.id, status: "in_progress", logMessage: "Data loop completed, committing workbook" });
    await workbook.commit();
    await updateJob({ id: jobDetails.id, status: "done", logMessage: "Workbook committed and download completed successfully" });
  } catch (err) {
    await updateJob({ id: jobDetails.id, status: "failed", logMessage: `Error during report generation: ${err.message}`, error: err.message });
    console.error("Error generating report:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};
