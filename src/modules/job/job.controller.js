const { Op } = require('sequelize');
const db = require('../../models/models');

// GET /jobs?jobtype=...&page=1&limit=10
exports.listJobs = async (req, res) => {
  try {
    const { jobtype } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (jobtype) where.jobtype = jobtype;

    const { count, rows } = await db.Job.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error listing jobs:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// PUT /jobs/:id/status { status }
exports.overrideStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, message } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });

    const job = await db.Job.findByPk(id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const log = Array.isArray(job.log) ? job.log.slice() : [];
    if (message) {
      log.push({ timestamp: new Date().toISOString(), message, status });
    }

    await job.update({ status, log });
    return res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error overriding job status:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /jobs/:id/retry - re-queue retry using existing payload
exports.triggerRetry = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await db.Job.findByPk(id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const newRetryCount = (job.retrycount || 0) + 1;
    const log = Array.isArray(job.log) ? job.log.slice() : [];
    log.push({ timestamp: new Date().toISOString(), message: 'Retry triggered', status: 'retrying' });

    await job.update({
      retryflag: true,
      retrystatus: 'queued',
      retrycount: newRetryCount,
      status: 'retrying',
      log,
    });

    // If you have a worker/queue, enqueue here using job.payload
    // queue.enqueue(job.jobtype, job.payload)

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error triggering retry:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /jobs - create job
exports.createJob = async (req, res) => {
  try {
    const { jobtype, payload, triggeredUser, user_id, message } = req.body;
    if (!jobtype) return res.status(400).json({ success: false, error: 'jobtype is required' });

    const log = message ? [{ timestamp: new Date().toISOString(), message, status: 'pending' }] : [];
    const job = await db.Job.create({ jobtype, payload: payload || null, triggeredUser: triggeredUser || null, user_id: user_id || null, status: 'pending', log });

    return res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error('Error creating job:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// POST /jobs/:id/log - append a progress log entry
exports.appendLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, status } = req.body; // status optional; if present, we store alongside message
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });

    const job = await db.Job.findByPk(id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const log = Array.isArray(job.log) ? job.log.slice() : [];
    log.push({ timestamp: new Date().toISOString(), message, status: status || job.status });

    await job.update({ log });
    return res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error appending job log:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}; 