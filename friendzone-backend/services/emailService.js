import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const gmailApiConfigured = Boolean(
  process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN &&
    process.env.EMAIL_FROM
);
const brevoConfigured = Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
const smtpConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const emailConfigured = gmailApiConfigured || brevoConfigured || smtpConfigured;
const devMailFallback = !emailConfigured && process.env.NODE_ENV !== 'production';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

if (gmailApiConfigured) {
  console.log('Email sending through the Gmail API');
} else if (brevoConfigured) {
  console.log('Email sending through Brevo API');
} else if (smtpConfigured) {
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

let gmailToken = { value: null, expiresAt: 0 };

const getGmailAccessToken = async () => {
  if (gmailToken.value && Date.now() < gmailToken.expiresAt - 60000) return gmailToken.value;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.access_token) {
    throw new Error(`Gmail token refresh failed ${response.status} ${json.error || ''}`);
  }
  gmailToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return gmailToken.value;
};

const sendWithGmailApi = async (toEmail, subject, text) => {
  const accessToken = await getGmailAccessToken();
  const message = [
    `From: FriendZone <${process.env.EMAIL_FROM}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    text,
  ].join('\r\n');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(message).toString('base64url') }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Gmail API responded ${response.status} ${detail.slice(0, 160)}`);
  }
};

const sendWithBrevo = async (toEmail, subject, text) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'FriendZone', email: process.env.EMAIL_FROM },
      to: [{ email: toEmail }],
      subject,
      textContent: text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo responded ${response.status} ${detail.slice(0, 160)}`);
  }
};

export const sendOTPEmail = async (toEmail, otp) => {
  if (devMailFallback) {
    console.log(`[dev] OTP for ${toEmail}: ${otp}`);
    return;
  }
  const subject = 'Your FriendZone verification code';
  const text = `Your FriendZone verification code is ${otp}. It expires in 3 minutes. If you did not request it, you can ignore this email.`;
  try {
    if (gmailApiConfigured) {
      await sendWithGmailApi(toEmail, subject, text);
      return;
    }
    if (brevoConfigured) {
      await sendWithBrevo(toEmail, subject, text);
      return;
    }
    await transporter.sendMail({
      from: `"FriendZone" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      text,
    });
  } catch (err) {
    console.error('Failed to send OTP email:', err.message);
    throw err;
  }
};
