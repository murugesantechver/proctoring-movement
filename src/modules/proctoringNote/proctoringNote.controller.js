const { Op,fn, col, where, literal } = require('sequelize');
//const { ProctoringNote, User } = require('../models');
const db = require('../../models/models')
const moment = require('moment');

exports.createNote = async (req, res) => {
  try {
    const { key_id, session_id, user_id, description, source, organization_id } = req.body;
    

    if (!description || !source || !user_id || !organization_id) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const note = await db.ProctoringNote.create({
      key_id,
      session_id,
      user_id,
      description,
      source,
      organization_id,
    });

    return res.status(201).json({ success: true, data: note });
  } catch (err) {
    console.error("Error creating proctoring note:", err);
    return res.status(500).json({ success: false, message: "Failed to create note" });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const {
      key_id,
      session_id,
      source,
      keyword,
      organization_id, 
      page = 1,
      limit = 10,
    } = req.query;

    if (!organization_id) {
      return res.status(400).json({ success: false, message: 'organization_id is required' });
    }

    const offset = (page - 1) * limit;
    const whereClause = { organization_id };
    const orConditions = [];

    const isMainAdmin = source === 'main_admin';

    if (isMainAdmin) {
      whereClause.source = {
        [Op.and]: [
          { [Op.in]: ['main_admin', 'key_details'] },
          { [Op.not]: 'participant_view' },
        ],
      };
    } else if (source) {
      whereClause.source = source;
    }

    if (!isMainAdmin) {
      if (key_id) whereClause.key_id = key_id;
      if (session_id) whereClause.session_id = session_id;
    }

    if (keyword) {
      const words = keyword.trim().split(/\s+/);

      // Match text fields
      orConditions.push(
        { description: { [Op.iLike]: `%${keyword}%` } },
        ...words.map(word => ({
          '$user.first_name$': { [Op.iLike]: `%${word}%` }
        })),
        ...words.map(word => ({
          '$user.last_name$': { [Op.iLike]: `%${word}%` }
        })),
        ...words.map(word => ({
          '$user.user_name$': { [Op.iLike]: `%${word}%` } 
        })),
        where(
          literal(`"user"."first_name" || ' ' || "user"."last_name"`),
          { [Op.iLike]: `%${keyword}%` }
        )
      );

      // Normalize keyword date format: from `/` or `.` to `-`
      const normalizedKeyword = keyword.replace(/[/.]/g, '-');

      // Determine granularity: year, month, or full date
      const formatsToCheck = [
        { format: 'YYYY-MM-DD', unit: 'day' },
        { format: 'YYYY-MM', unit: 'month' },
        { format: 'YYYY', unit: 'year' },
      ];

      for (const fmt of formatsToCheck) {
        const parsed = moment(normalizedKeyword, fmt.format, true);
        if (parsed.isValid()) {
          const start = parsed.startOf(fmt.unit).toDate();
          const end = parsed.endOf(fmt.unit).toDate();
          orConditions.push({
            createdAt: {
              [Op.between]: [start, end]
            }
          });
          break; // Stop after first valid match
        }
      }
    }

    if (orConditions.length > 0) {
      whereClause[Op.or] = orConditions;
    }

    const notes = await db.ProctoringNote.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['first_name', 'last_name', 'user_name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit: parseInt(limit),
    });

    return res.status(200).json({
      success: true,
      total: notes.count,
      page: parseInt(page),
      limit: parseInt(limit),
      data: notes.rows,
    });

  } catch (err) {
    console.error('Error fetching notes:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notes' });
  }
};