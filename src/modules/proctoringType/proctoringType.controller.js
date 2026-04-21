const db = require('../../models/models');

exports.createProctoringTypes = async (req, res) => {
  try {
    const { id, name, description } = req.body;

    if (!id || !name) {
      return res.status(400).json({ message: "ID and Name are required" });
    }

    const existingType = await db.ProctoringType.findOne({ where: { id } });
    if (existingType) {
      return res.status(409).json({
        message: "Proctoring type with this ID already exists",
      });
    }

    const newProctoringType = await db.ProctoringType.create({
      id,
      name,
      description,
    });

    return res.status(201).json({
      message: "Proctoring type created successfully",
      data: newProctoringType,
    });
  } catch (error) {
    console.error("Error creating proctoring type:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};



exports.updateProctoringTypes = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingType = await db.ProctoringType.findByPk(id);
    if (!existingType) {
      return res.status(404).json({
        message: "Proctoring type not found",
      });
    }

    if (name) existingType.name = name;
    if (description) existingType.description = description;

    await existingType.save();

    return res.status(200).json({
      message: "Proctoring type updated successfully",
      data: existingType,
    });
  } catch (error) {
    console.error("Error updating proctoring type:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.getProctoringTypes = async (req, res) => {
  try {
    const types = await db.ProctoringType.findAll()
    return res.json({ success: true, data: types });
  } catch (error) {
    console.error("Error fetching proctoring types :", error);
    res.status(500).json({ error: "Failed to proctoring types" });
  }
};

exports.deleteProctoringTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await db.ProctoringType.findOne({ where: { id } });
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Proctoring type with id ${id} not found`,
      });
    }

    await db.ProctoringType.destroy({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `Proctoring type with id ${id} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting Proctoring type:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
