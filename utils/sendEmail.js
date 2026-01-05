// utils/sendEmail.js
const nodemailer = require('nodemailer');

/**
 * Send Email - يدعم Mailtrap و Ethereal و Gmail
 */
const sendEmail = async (options) => {
  try {
    // Validate
    if (!options.email || !options.subject) {
      throw new Error('Email and subject are required');
    }

    let transporter;
    let previewUrl = null;

    // ==================== تحديد طريقة الإرسال ====================

    // 1️⃣ إذا موجود Mailtrap credentials
    if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASSWORD) {
      console.log('📧 Using Mailtrap...');
      
      transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_HOST,
        port: parseInt(process.env.MAILTRAP_PORT),
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASSWORD,
        },
      });
    }
    // 2️⃣ إذا موجود Gmail credentials
    else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      console.log('📧 Using Gmail...');
      
      transporter = nodemailer.createTransport({
        service: 'gmail',
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    }
    // 3️⃣ استخدام Ethereal (تلقائي - بدون إعداد)
    else {
      console.log('📧 Using Ethereal (auto-generated test account)...');
      
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    // ==================== إرسال الإيميل ====================

    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'E-shop'}" <noreply@eshop.com>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || generateHTML(options),
    });

    // ==================== النتيجة ====================

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', options.email);

    // Ethereal preview URL
    previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('   Preview URL:', previewUrl);
      console.log('   👆 Open this link to see the email');
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };

  } catch (error) {
    console.error('❌ Email sending failed:', {
      error: error.message,
      to: options.email,
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
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .logo { 
      font-size: 56px; 
      margin-bottom: 15px;
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .header h1 { 
      font-size: 32px; 
      margin: 0;
      font-weight: 700;
    }
    .content { 
      padding: 40px 30px; 
      color: #333; 
    }
    .content h2 { 
      color: #667eea; 
      margin-bottom: 20px; 
      font-size: 26px;
      font-weight: 700;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #555;
    }
    .reset-code {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 42px;
      font-weight: bold;
      padding: 25px;
      text-align: center;
      border-radius: 15px;
      letter-spacing: 15px;
      margin: 30px 0;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.5);
      font-family: 'Courier New', monospace;
    }
    .info-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
      margin: 25px 0;
      color: #856404;
      font-size: 15px;
    }
    .info-box strong {
      color: #664d03;
    }
    .footer {
      background: linear-gradient(to bottom, #f8f9fa, #e9ecef);
      padding: 30px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    .footer-brand {
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
    }
    .divider {
      height: 2px;
      background: linear-gradient(to left, transparent, #667eea, transparent);
      margin: 30px 0;
    }
    .warning {
      color: #dc3545;
      font-weight: bold;
      margin-top: 25px;
      font-size: 16px;
    }
    .warning-text {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 15px;
      margin-top: 10px;
      border-radius: 8px;
      color: #721c24;
      font-size: 14px;
    }
    @media only screen and (max-width: 600px) {
      .content { padding: 30px 20px; }
      .reset-code { 
        font-size: 32px; 
        letter-spacing: 10px; 
        padding: 20px;
      }
      .header h1 { font-size: 24px; }
      .logo { font-size: 48px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">🛍️</div>
      <h1>E-shop</h1>
    </div>
    
    <!-- Content -->
    <div class="content">
      <h2>${subject}</h2>
      
      ${resetCode ? `
        <p class="greeting">مرحباً،</p>
        <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في E-shop.</p>
        
        <div class="reset-code">${resetCode}</div>
        
        <div class="info-box">
          ⏰ <strong>مهم:</strong> هذا الرمز صالح لمدة <strong>10 دقائق فقط</strong>
        </div>
        
        <p style="font-size: 16px; line-height: 1.8;">
          أدخل هذا الرمز في صفحة إعادة تعيين كلمة المرور لإكمال العملية.
        </p>
        
        <div class="divider"></div>
        
        <p class="warning">⚠️ تحذير أمني</p>
        <div class="warning-text">
          إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني.
          حسابك آمن ولن يتم إجراء أي تغييرات.
        </div>
      ` : `
        <p style="white-space: pre-line; font-size: 16px; line-height: 1.8;">${message}</p>
      `}
      
      <div class="divider"></div>
      
      <p style="font-size: 15px; color: #6c757d; text-align: center;">
        شكراً لاستخدامك E-shop 💙
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">فريق E-shop</div>
      <p style="margin: 10px 0;">
        <a href="mailto:support@eshop.com" style="color: #667eea; text-decoration: none;">
          support@eshop.com
        </a>
      </p>
      <p style="font-size: 13px; margin-top: 15px; color: #868e96;">
        © ${new Date().getFullYear()} E-shop. جميع الحقوق محفوظة.
      </p>
      <p style="font-size: 12px; color: #adb5bd; margin-top: 10px;">
        هذا بريد إلكتروني آلي، الرجاء عدم الرد عليه.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = sendEmail;