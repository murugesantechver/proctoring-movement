const db = require("../../models/models");

exports.createJob = async ({ job_type, payload = null, triggeredUser = null, user_id = null, status = "pending", logMessage = null }) => {
  const log = [];
  if (logMessage) log.push({ timestamp: new Date().toISOString(), message: logMessage, status });
  const job = await db.Job.create({ job_type, payload, status, triggeredUser, user_id, log });
  return job;
};

exports.updateJob = async ({ id, data = {}, status = null, logMessage = null, error = null, response_data = null, incrementRetry = false, setRetryFlag = null, retry_status = null }) => {
  const job = await db.Job.findByPk(id);
  if (!job) throw new Error("Job not found");
  const updates = { ...data };
  if (status !== null) updates.status = status;
  if (response_data !== null) updates.response_data = response_data;
  if (error !== null) updates.error = error;
  if (incrementRetry) updates.retry_count = (job.retry_count || 0) + 1;
  if (setRetryFlag !== null) updates.retry_flag = !!setRetryFlag;
  if (retry_status !== null) updates.retry_status = retry_status;
  if (logMessage) {
    const newLog = Array.isArray(job.log) ? job.log.slice() : [];
    newLog.push({ timestamp: new Date().toISOString(), message: logMessage, status: updates.status ?? job.status });
    updates.log = newLog;
  }
  await job.update(updates);
  return job.reload();
};
