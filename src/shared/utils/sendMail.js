const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@yourdomain.com',
    to,
    subject,
    html,
    replyTo: process.env.HELP_MAIL
  };

  return transporter.sendMail(mailOptions);
};
