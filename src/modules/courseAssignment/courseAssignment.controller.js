//const { CourseAssignment } = require("../models");
const db = require('../../models/models');

exports.assignProctoringLevel = async (req, res) => {
  try {
    const { courseId, keyId } = req.body;

    const assignment = await db.CourseAssignment.create({ courseId, keyId });

    res.status(201).json({ message: "Proctoring level assigned", assignment });
  } catch (error) {
    console.error("Error assigning proctoring level:", error);
    res.status(500).json({ error: "Failed to assign proctoring level" });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const assignments = await db.CourseAssignment.findAll({ where: { courseId } });

    res.json(assignments);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
};
