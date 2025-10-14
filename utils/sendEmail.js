const nodemailer = require("nodemailer");

// ---------- TRANSPORTER ----------
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  secure: false,   // Mailtrap usually works with false
  logger: true,    // log SMTP activity
  debug: true,     // detailed debug info
});

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.MAIL_FROM,
    to,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to}`);
};

const sendVerificationEmail = async (user, token) => {
  const verifyLink = `${process.env.CLIENT_URL}/api/auth/verify-email/${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; background: #f4f6f8; padding: 30px;">
      <div style="max-width: 500px; margin: auto; background: #fff; padding: 25px; border-radius: 10px;">
        <h2>Welcome, ${user.firstName} 👋</h2>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <div style="text-align:center; margin:30px 0;">
          <a href="${verifyLink}" style="background:#4f46e5; color:#fff; padding:12px 25px; text-decoration:none; border-radius:5px;">Verify Email</a>
        </div>
        <p style="font-size:13px; color:#888;">This link will expire in 24 hours.</p>
      </div>
    </div>
  `;
  await sendEmail(user.email, "✅ Verify your MyAuth account", html);
};

module.exports = { sendEmail, sendVerificationEmail };
