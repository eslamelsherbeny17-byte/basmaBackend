const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // 1) إنشاء الـ Transporter الخاص بـ Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT, // 465
      secure: true, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // 2) إعداد محتوى الإيميل
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'E-shop'}" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html || generateHTML(options),
    };

    // 3) إرسال الإيميل
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ تم إرسال الرسالة بنجاح إلى: %s', options.email);
    return info;
  } catch (error) {
    console.error('❌ خطأ في إرسال الإيميل:', error);
    throw new Error('فشل إرسال الإيميل، تحقق من إعدادات Gmail');
  }
};

function generateHTML(options) {
  const { message, subject } = options;
  const resetCode = message.match(/\d{6}/)?.[0];

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .header { background: #667eea; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; text-align: center; }
    .reset-code { font-size: 35px; font-weight: bold; color: #667eea; letter-spacing: 10px; margin: 20px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; }
    .footer { background: #eee; padding: 15px; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🛍️ E-shop</h1></div>
    <div class="content">
      <h2>${subject}</h2>
      <p>مرحباً، استخدم الرمز التالي لإعادة تعيين كلمة المرور:</p>
      <div class="reset-code">${resetCode || '------'}</div>
      <p>هذا الرمز صالح لمدة 10 دقائق فقط.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} E-shop App</div>
  </div>
</body>
</html>`;
}

module.exports = sendEmail;