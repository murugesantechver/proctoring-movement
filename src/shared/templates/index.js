const Mustache = require("mustache");
const fs = require("fs").promises;

exports.renderTemplate = async (templateName, templateData) => {
  const template = await fs.readFile(`${__dirname}/${templateName}`, "utf-8");
  const rendered = Mustache.render(template.toString(), templateData);
  return rendered;
};

