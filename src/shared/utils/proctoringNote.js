const db = require("../../models/models");

const commentDescriptions = {
  invalid_proctor_individual_override: ({ KeyName, ParticipantFullName, Username, RuleName, Reason }) =>
    `Invalid proctor status override completed (Key: ${KeyName}, Participant: ${ParticipantFullName} - ${Username}, Rule Violation: ${RuleName}, Reason: ${Reason}).`,
  invalid_proctor_full_override: ({ KeyName, ParticipantFullName, Username, Reason }) =>
    `Invalid proctor status override completed (Key: ${KeyName}, Participant: ${ParticipantFullName} - ${Username}, All Rule Violation, Reason: ${Reason}).`,
  participant_proctor_record_viewed: ({ KeyName, ParticipantFullName, Username }) =>
    `Participant proctor record was viewed (Key: ${KeyName}, Participant: ${ParticipantFullName} - ${Username}).`,
  participant_proctor_record_deleted: ({ KeyName, ParticipantFullName, Username }) =>
    `Participant proctor record was deleted (Key: ${KeyName}, Participant: ${ParticipantFullName} - ${Username}).`,
  proctor_feedback_received_thumbs_down: ({ RuleName, SessionID, ParticipantFullName, Username }) =>
    `A thumbs down was given for rule violation, ${RuleName} (Session ID: ${SessionID}, Participant: ${ParticipantFullName} - ${Username}).`,
  proctor_feedback_received_thumbs_up: ({ RuleName, SessionID, ParticipantFullName, Username }) =>
    `A thumbs up was given for rule violation, ${RuleName} (Session ID: ${SessionID}, Participant: ${ParticipantFullName} - ${Username}).`,
  proctor_feedback_received: ({ RuleName, Feedback, SessionID, ParticipantFullName, Username }) =>
    `Feedback was given for rule violation, ${RuleName}: ${Feedback} (Session ID: ${SessionID}, Participant: ${ParticipantFullName} - ${Username}).`,
  proctor_feedback_resolved: ({ ResolutionComment, SessionID, ParticipantFullName, Username }) =>
    `AI proctor feedback was resolved ${ResolutionComment}. (Session ID: ${SessionID}, Participant: ${ParticipantFullName} - ${Username}).`,
  key_deleted: ({ KeyName, KeyType, TimeMinutes, Rules, Cost, Fee }) =>
    `${KeyName} was deleted (Key Type: ${KeyType}, Time: ${TimeMinutes}, Rules: ${Rules}, Cost: ${Cost}, Fee: ${Fee}).`,
};

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

exports.createProctoringNote = async ({ commentKey, session_id, source, user_id = null, organization_id, messages = {} }) => {
  let key_id;
  let final_session_id;

  if (isUUID(session_id)) {
    const sessionById = await db.Session.findOne({ where: { id: session_id } });
    if (sessionById) {
      user_id = user_id ?? sessionById.user_id;
      key_id = sessionById.key_id;
      organization_id = sessionById.organization_id;
      messages.Username = sessionById.user_name || "Unknown";
      messages.ParticipantFullName = sessionById.first_name + " " + sessionById.last_name;
      final_session_id = sessionById.external_session_id;
    }
  } else if (session_id) {
    const sessionByExternal = await db.Session.findOne({ where: { external_session_id: session_id, organization_id } });
    if (sessionByExternal) {
      user_id = user_id ?? sessionByExternal.user_id;
      key_id = sessionByExternal.key_id;
      organization_id = sessionByExternal.organization_id;
      messages.Username = sessionByExternal.user_name || "Unknown";
      messages.ParticipantFullName = sessionByExternal.first_name + " " + sessionByExternal.last_name;
      final_session_id = sessionByExternal.external_session_id;
    }
  }

  messages.SessionID = final_session_id;
  const description = commentDescriptions[commentKey](messages);
  if (!description) throw new Error(`No description found for commentKey: ${commentKey}`);

  const note = await db.ProctoringNote.create({ key_id, session_id: final_session_id, user_id, description, source, organization_id });
  return note;
};
