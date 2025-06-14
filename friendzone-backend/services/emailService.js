require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Email transport error:', error);
  } else {
    console.log('Gmail SMTP verified successfully');
  }
});

/**
 * Sends an OTP email using Gmail
 * @param {string} toEmail - Recipient's email address
 * @param {string} otp - OTP code to send
 */
const sendOTPEmail = async (toEmail, otp) => {
  console.log(`[EmailService] Sending OTP email to: ${toEmail}`);
  try {
    await transporter.sendMail({
      from: `"FriendZone" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    });
    console.log(`[EmailService] ✅ Email successfully sent to ${toEmail}`);
  } catch (err) {
    console.error('❌ Failed to send OTP email:', err);
    throw err;
  }
};

module.exports = { sendOTPEmail };
