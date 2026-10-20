import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const devMailFallback = !emailConfigured && process.env.NODE_ENV !== 'production';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

if (emailConfigured) {
  transporter.verify((error) => {
    if (error) {
      console.error('Email transport error:', error.message);
    } else {
      console.log('Email transport verified');
    }
  });
} else if (devMailFallback) {
  console.warn('EMAIL_USER/EMAIL_PASS not set: OTP codes will be printed to this console (development only).');
}

export const sendOTPEmail = async (toEmail, otp) => {
  if (devMailFallback) {
    console.log(`[dev] OTP for ${toEmail}: ${otp}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"FriendZone" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your FriendZone verification code',
      text: `Your FriendZone verification code is ${otp}. It expires in 3 minutes. If you did not request it, you can ignore this email.`,
    });
  } catch (err) {
    console.error('Failed to send OTP email:', err.message);
    throw err;
  }
};
