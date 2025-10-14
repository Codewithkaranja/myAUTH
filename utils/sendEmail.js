const nodemailer = require("nodemailer");

// ---------- Generic email sender ----------
const sendEmail = async (to, subject, htmlContent) => {
  // Create transporter using Mailtrap credentials
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.MAIL_FROM || '"MyAuth System" <no-reply@myauth.com>',
    to,
    subject,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to} | Message ID: ${info.messageId}`);
};

// ---------- Specific helper: verification email ----------
const sendVerificationEmail = async (to, firstName, token) => {
  const verifyLink = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background: #f4f6f8; padding: 30px;">
      <div style="max-width: 500px; margin: auto; background: #fff; padding: 25px; border-radius: 10px;">
        <h2 style="text-align:center;">Welcome, ${firstName} 👋</h2>
        <p>Please verify your email:</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${verifyLink}" style="background:#4f46e5; color:#fff; padding:12px 25px; text-decoration:none; border-radius:5px;">Verify Email</a>
        </div>
        <p style="font-size:13px; color:#888;">This link expires in 24 hours.</p>
      </div>
    </div>
  `;
  await sendEmail(to, "✅ Verify your MyAuth account", htmlContent);
};

module.exports = {
  sendEmail,             // generic
  sendVerificationEmail, // specific helper
};
