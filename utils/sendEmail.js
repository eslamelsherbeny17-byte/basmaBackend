// utils/sendEmail.js
const { Resend } = require('resend');

// Initialize Resend with API Key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send Email using Resend Service
 * @param {Object} options - Email configuration
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email text content
 * @param {string} [options.html] - Optional HTML content
 */
const sendEmail = async (options) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    // Validate required fields
    if (!options.email || !options.subject) {
      throw new Error('Email and subject are required');
    }

    let result;

    // 🧪 Development Mode: استخدام Mailtrap
    if (isDevelopment && process.env.MAILTRAP_HOST) {
      console.log('📧 [DEV] Sending via Mailtrap...');
      
      const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: parseInt(process.env.MAILTRAP_PORT),
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASSWORD,
        },
      });

      result = await transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'E-shop'}" <no-reply@eshop.com>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || generateHTML(options),
      });

      console.log('✅ [DEV] Email sent to Mailtrap inbox');
      console.log('   Message ID:', result.messageId);
      console.log('   Preview: https://mailtrap.io/inboxes');
      
      return result;
    }

    // 🚀 Production Mode: استخدام Resend
    console.log('📧 [PROD] Sending via Resend...');
    
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailData = {
      from: `${process.env.FROM_NAME || 'E-shop'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || generateHTML(options),
    };

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error('❌ Resend Error:', error);
      throw new Error(error.message || 'Failed to send email via Resend');
    }

    console.log('✅ [PROD] Email sent via Resend');
    console.log('   Email ID:', data.id);
    console.log('   Recipient:', options.email);

    return data;

  } catch (error) {
    console.error('❌ Email sending failed:', {
      mode: isDevelopment ? 'Development' : 'Production',
      error: error.message,
      recipient: options.email,
      subject: options.subject,
    });

    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Generate HTML Email Template
 */
function generateHTML(options) {
  const { message, subject } = options;
  const resetCode = message.match(/\d{6}/)?.[0];

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .logo { font-size: 48px; margin-bottom: 10px; }
    .header h1 { font-size: 28px; margin: 0; }
    .content { padding: 40px 30px; color: #333; }
    .content h2 { color: #667eea; margin-bottom: 20px; font-size: 24px; }
    .reset-code {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 36px;
      font-weight: bold;
      padding: 20px;
      text-align: center;
      border-radius: 12px;
      letter-spacing: 12px;
      margin: 30px 0;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      font-family: 'Courier New', monospace;
    }
    .info-box {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      color: #856404;
    }
    .footer {
      background: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(to left, transparent, #ddd, transparent);
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🛍️</div>
      <h1>E-shop</h1>
    </div>
    <div class="content">
      <h2>${subject}</h2>
      ${resetCode ? `
        <p>مرحباً،</p>
        <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
        <div class="reset-code">${resetCode}</div>
        <div class="info-box">
          ⏰ هذا الرمز صالح لمدة <strong>10 دقائق فقط</strong>
        </div>
        <p>أدخل هذا الرمز في صفحة إعادة تعيين كلمة المرور.</p>
        <div class="divider"></div>
        <p style="color: #dc3545; font-weight: bold;">⚠️ تحذير أمني:</p>
        <p style="font-size: 14px; color: #6c757d;">
          إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.
        </p>
      ` : `
        <p style="white-space: pre-line;">${message}</p>
      `}
      <div class="divider"></div>
      <p style="font-size: 14px; color: #6c757d;">شكراً لاستخدامك E-shop 💙</p>
    </div>
    <div class="footer">
      <p><strong>فريق E-shop</strong></p>
      <p style="font-size: 12px; margin-top: 15px;">
        © ${new Date().getFullYear()} E-shop. جميع الحقوق محفوظة.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = sendEmail;