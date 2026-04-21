const { createInvalidProofEmailContent } = require("./emailCreation.service");

function analyzeAIResponse(response) {
  const result = { userId: response.userId, sessionId: response.session_id, organisationId: response.organisation_id, request_id: response.request_id, fileName: response.fileName, violations: [], violation_rules: [] };

  const addViolation = (type, reason, details) => { result.violations.push({ type, isViolation: true, reason, details }); };

  if (response.type_label === "user_image") {
    if (response?.face_detection_result?.faces_detected === false) {
      if (response.message === "no_valid_virtual_proctor_type") addViolation("User Image", typeof response.failed_reasons === "string" ? response.failed_reasons : "No valid virtual proctor type", response.failed_reasons);
      else addViolation("User Image", "No face detected in the provided user image", response.failed_reasons);
      result.verificationStatus = "failed";
    } else if (response?.face_detection_result?.faces_detected === true && response?.face_detection_result?.face_count >= 2) {
      addViolation("User Image", "Multiple persons present in the provided user image", response.failed_reasons);
      result.verificationStatus = "failed";
    } else { result.verificationStatus = "passed"; }
  }

  if (response.id_verification_result) {
    const res = response.id_verification_result;
    const nameMismatch = !res.name_match?.first_name_match || !res.name_match?.last_name_match;
    let failedReasons = [];
    if (Array.isArray(res.failed_reasons)) failedReasons = res.failed_reasons.filter((r) => r.trim().toLowerCase() !== "all checks passed");
    else if (typeof res.failed_reasons === "string") { const trimmed = res.failed_reasons.trim().toLowerCase(); if (trimmed && trimmed !== "all checks passed") failedReasons = [res.failed_reasons]; }
    const hasIDFailure = failedReasons.length > 0 || nameMismatch;
    if (hasIDFailure) { result.verificationStatus = "failed"; addViolation("ID Verification", failedReasons.length > 0 ? failedReasons.join(", ") : "Name mismatch or other ID check failed", { name_match: res.name_match, failed_reasons: failedReasons }); result.violation_rules.push({ id: 1, name: "Name and Photo ID Match" }); }
    else result.verificationStatus = "passed";
  }

  if (response.face_comparison_result) {
    const res = response.face_comparison_result;
    if (res.match === false) { addViolation("Participant does not match", response.failed_reasons || "Face did not match", res); result.violation_rules.push({ id: 2, name: "Remain in Camera View" }); }
    if (res.reason === "Participant left camera view") { addViolation("Participant left camera view", res.failed_reasons || "Participant left camera view", res); result.violation_rules.push({ id: 2, name: "Remain in Camera View" }); }
  }

  if (response.face_liveness && !response.face_liveness.is_live) { addViolation("Low Engagement", response.face_liveness.reason || "Face is not live", response.face_liveness); result.violation_rules.push({ id: 2, name: "Remain in Camera View" }); }
  if (response.active_participation) { addViolation("Participant found inactive", response.active_participation.reason || "Face is not live", response.failed_reasons); result.violation_rules.push({ id: 3, name: "Active Participation" }); }
  if (response.multiple_person_detection_result?.person_count > 1) { addViolation("Participant received unauthorized help", `${response.multiple_person_detection_result.person_count} people detected`, response.multiple_person_detection_result); result.violation_rules.push({ id: 4, name: "No Other Participants" }); }

  if (response.book_detection_result?.books_detected) { const reason = Array.isArray(response.failed_reasons) ? response.failed_reasons.join(", ") : response.failed_reasons || "Book detected"; addViolation("Participant used unauthorized materials", reason, response.book_detection_result); result.violation_rules.push({ id: 5, name: "No External Resources" }); }
  if (response.book_position) { const positions = Object.entries(response.book_position).filter(([_, isPresent]) => isPresent).map(([pos]) => pos); if (positions.length > 0) { const reason = Array.isArray(response.failed_reasons) ? response.failed_reasons.join(", ") : response.failed_reasons || `Book detected in: ${positions.join(", ")}`; addViolation("Participant used unauthorized materials", reason, response.book_position); result.violation_rules.push({ id: 5, name: "No External Resources" }); } }
  if (response.phone_detection_result?.phones_detected) { addViolation("Participant used unauthorized devices", "Phone detected in frame", response.phone_detection_result); result.violation_rules.push({ id: 6, name: "No Electronic Devices" }); }
  if (response.headphone_detection_result?.headphones_detected) { addViolation("Participant used headphones", "Headphones detected in frame", response.headphone_detection_result); result.violation_rules.push({ id: 7, name: "No Headphones" }); }
  if (response.monitor_switch) { addViolation("Multiple monitors detected", response.monitor_switch.reason || "Face is not live", response.failed_reasons); result.violation_rules.push({ id: 8, name: "Single Monitor Only" }); }
  if (response.screen_monitoring) { addViolation("User opened new browser tab", response.screen_monitoring.reason || "Face is not live", response.failed_reasons); result.violation_rules.push({ id: 9, name: "Screen Monitoring" }); }
  if (response.full_view_of_monitor) { const violationType = response.message || "User opened new browser"; addViolation(violationType, response.full_view_of_monitor.reason || response.message || "Face is not live", response.failed_reasons); result.violation_rules.push({ id: 10, name: "Full View of Monitor" }); }

  if (response.no_extended_eye_closure_result) {
    if (response.no_extended_eye_closure_result.eyes_closed_count > 0) { addViolation("Participant Eyes Closed", response.message || "Extended eye closure detected", response.no_extended_eye_closure_result); result.violation_rules.push({ id: 11, name: "No Extended Eye Closure" }); }
    if (response.no_extended_eye_closure_result.eyes_closed_count === 0) result.eye_closure_open = true;
  }

  result.hasViolations = result.violations.length > 0;
  return result;
}

module.exports = { analyzeAIResponse };
