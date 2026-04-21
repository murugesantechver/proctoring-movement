const db = require('../../models/models');

exports.createRule = async (req, res) => {
  try {
    const { organization_id, rule_name, description, category } = req.body;
    if (!ProctoringRule) throw new Error("ProctoringRule model is not loaded");
    const newRule = await db.ProctoringRule.create({
      organization_id,
      rule_name,
      description,
      category,
    });

    res.status(201).json({ message: "Rule created", rule: newRule });
  } catch (error) {
    console.error("Error creating rule:", error);
    res.status(500).json({ error: "Failed to create rule" });
  }
};

exports.getRulesByOrganization = async (req, res) => {
  try {
    const { organization_id } = req.params;
    const rules = await db.ProctoringRule.findAll({ where: { organization_id } });

    res.json(rules);
  } catch (error) {
    console.error("Error fetching rules:", error);
    res.status(500).json({ error: "Failed to fetch rules" });
  }
};

exports.updateRulesByOrganization = async(req,res) => {
  try{
  const { id } = req.params;
  const { rule_name, organization_id,description,category } = req.body; 
  if (!id) {
    return res.status(400).json({ error: "Rule ID is required" });
  }

  const rule = await db.ProctoringRule.findByPk(id);
  if (!rule) {
    return res.status(404).json({ error: "Rule not found" });
  }

  // Update the rule
  await rule.update({ rule_name, organization_id,description,category });

  res.json({ message: "Rule updated successfully", rule });
} catch (error) {
  console.error("Error updating rule:", error);
  res.status(500).json({ error: "Internal Server Error" });
}
};