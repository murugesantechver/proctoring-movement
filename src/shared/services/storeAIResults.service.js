const db = require("../../models/models");
const { resolveSession } = require("../utils/sessionIdResolver");
const { analyzeAIResponse } = require("./aiResultAnalyzer.service");
const { Op, Sequelize } = require("sequelize");
const { createInvalidProofEmailContent, sendManualVerificationAlertEmail } = require("./emailCreation.service");

const getTolerance = (rule, toleranceArray) => {
  const found = (toleranceArray || []).find(item => item.name.toLowerCase() === rule.toLowerCase());
  return found ? found.tolerance : 1;
};

async function storeAIResult(response) {
  try {
    const analysis = analyzeAIResponse(response);
    const resultType = getResultType(response);
    if (response.type_label && response.type_label === "user_image") return true;

    const payload = {
      session_id: analysis.sessionId, result_type: resultType, raw_response: response,
      request_id: response.request_id || null, frame_image: response.comparison_image || null,
      user_image: response.source_image || null, match: response.face_comparison_result?.match ?? null,
      similarity: response.face_comparison_result?.similarity ?? null,
      warning: getViolationSummaryFromAnalysis(analysis.violations),
      person_count: response.multiple_person_detection_result?.person_count ?? null,
      detected_objects: getDetectedObjects(response),
      id_status: response.id_verification_result?.id_status || "invalid",
      expiry_status: response.id_verification_result?.expiry_status || null,
      extracted_text: response.id_verification_result?.extracted_text || [],
      first_name_match: response.id_verification_result?.name_match?.first_name_match ?? null,
      last_name_match: response.id_verification_result?.name_match?.last_name_match ?? null,
      response_time: response.response_time || null, rules: analysis.violation_rules,
      user_id: analysis.userId,
    };

    const ruleName = payload.rules[0]?.name?.toLowerCase() || "remain in camera view";

    const existingRecord = await db.AIResult.findOne({
      where: {
        session_id: analysis.sessionId, active: false, eye_closure_streak: false,
        [Op.and]: Sequelize.literal(`EXISTS (SELECT 1 FROM jsonb_array_elements("AIResult"."rules") elem WHERE lower(elem->>'name') = '${ruleName}')`)
      },
      raw: true, order: [["AttemptCount", "DESC"]],
    });

    let organization_id = response.organisation_id || null;
    const resolvedSessionId = await resolveSession(analysis.sessionId, organization_id);
    const sessionByExternal = await db.Session.findOne({
      where: { id: resolvedSessionId },
      include: [{ model: db.Course, as: "course", attributes: ["id", "name"] }],
    });
    const proctoringKeyDetails = await db.ProctoringKey.findOne({ where: { key_id: sessionByExternal.key_id } });
    let rule = payload.rules[0]?.name ?? "Remain in Camera View";
    const tolerance = getTolerance(rule, proctoringKeyDetails?.proctoring_tolerance);
    let existingAttemptCount = existingRecord?.AttemptCount ?? 0;

    if (analysis.eye_closure_open) {
      await db.AIResult.destroy({ where: { session_id: analysis.sessionId, eye_closure_streak: true } });
    }

    if (resultType === "eye-closure" && !analysis.eye_closure_open) {
      const currentStreakRecords = await db.AIResult.findAll({ where: { session_id: analysis.sessionId, eye_closure_streak: true } });
      const currentStreakCount = currentStreakRecords.length;
      if (currentStreakCount < tolerance) {
        payload.eye_closure_streak = true; payload.active = false; payload.finalResult = false; payload.AttemptCount = existingAttemptCount;
        return await db.AIResult.create(payload);
      } else {
        await db.AIResult.destroy({ where: { session_id: analysis.sessionId, eye_closure_streak: true } });
        payload.eye_closure_streak = false;
      }
    } else {
      payload.eye_closure_streak = false;
    }

    if (tolerance === existingAttemptCount) {
      payload.active = true; payload.finalResult = true; payload.AttemptCount = existingAttemptCount + 1;
      await db.AIResult.update({ active: true }, { where: { session_id: analysis.sessionId, warning: getViolationSummaryFromAnalysis(analysis.violations), active: false, eye_closure_streak: false } });
      let sessionUpdate = { has_violations: true };
      if (response.id_verification_result) sessionUpdate.verification_status = analysis.verificationStatus === "passed" ? "approved" : "rejected";
      await db.Session.update(sessionUpdate, { where: { id: analysis.sessionId } });
    } else {
      const existingViolation = await db.AIResult.findOne({
        where: {
          session_id: analysis.sessionId, finalResult: true,
          [Op.and]: Sequelize.literal(`EXISTS (SELECT 1 FROM jsonb_array_elements("AIResult"."rules") elem WHERE lower(elem->>'name') = '${ruleName}')`)
        },
        order: [["AttemptCount", "DESC"]],
      });
      if (existingViolation && existingViolation.AttemptCount > 0) {
        payload.active = true; payload.finalResult = true; payload.AttemptCount = existingAttemptCount + 1;
        let sessionUpdate = { has_violations: true };
        if (response.id_verification_result) sessionUpdate.verification_status = analysis.verificationStatus === "passed" ? "approved" : "rejected";
        await db.Session.update(sessionUpdate, { where: { id: analysis.sessionId } });
      } else {
        payload.active = false; payload.finalResult = false; payload.id_status = "valid"; payload.AttemptCount = existingAttemptCount + 1;
      }
    }

    return await db.AIResult.create(payload);
  } catch (error) {
    console.log("Error in storeAIResult:>>>>>>>", error.message);
    return false;
  }
}

function getDetectedObjects(response) {
  const objects = [];
  if (response.book_position) { Object.entries(response.book_position).forEach(([pos, val]) => { if (val) objects.push(`book:${pos}`); }); }
  if (response.phone_detection_result?.phones_detected) objects.push("phone");
  if (response.headphone_detection_result?.headphones_detected) objects.push("headphone");
  if (response.multiple_person_detection_result?.person_count > 1) objects.push("multiple_persons");
  if (response.no_extended_eye_closure_result?.eyes_closed_count > 0) objects.push("eyes_closed");
  return objects.length > 0 ? objects : null;
}

function getViolationSummaryFromAnalysis(violations) {
  if (!violations || violations.length === 0) return null;
  return violations.map(v => v.type === "ID Verification" ? `${v.reason}` : v.type).join(", ");
}

function getResultType(response) {
  if (response.id_verification_result) return "id-verification";
  if (response.object_detection_result) return "object-detection";
  if (response.face_comparison_result) return "face-comparison";
  if (response.multiple_person_detection_result) return "multiple-person";
  if (response.book_detection_result) return "book-detection";
  if (response.headphone_detection_result) return "headphone-detection";
  if (response.no_extended_eye_closure_result) return "eye-closure";
  return "full-analysis";
}

module.exports = { storeAIResult };
