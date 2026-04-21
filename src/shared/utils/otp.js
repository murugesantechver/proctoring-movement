const db = require("../../models/models");
const { sendOtpEmail } = require("../services/emailCreation.service");

generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendLoginOtp = async (user) => {
  try {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.UserOtp.destroy({ where: { userId: user.id } });
    await db.UserOtp.create({ userId: user.id, otp, expiresAt });
    const mailSatus = await sendOtpEmail({ recipient_email: [user.email], otp });
    if (!mailSatus.success) return { success: false, message: "Failed to send OTP email" };
    return { success: true, message: mailSatus.message };
  } catch (error) {
    console.error("Error sending OTP:", error);
    return { success: false, message: "Failed to send OTP" };
  }
};
