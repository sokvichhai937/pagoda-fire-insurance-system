// emailService.js - Email sending utility
// សេវាកម្មផ្ញើអ៊ីមែល

const nodemailer = require('nodemailer');
const config = require('../config/config');

/**
 * បង្កើត transporter សម្រាប់ផ្ញើអ៊ីមែល
 * Create email transporter
 */
let transporter = null;

function getTransporter() {
  if (!transporter) {
    // ត្រួតពិនិត្យការកំណត់អ៊ីមែល
    // Check email configuration
    if (!config.email.auth.user || !config.email.auth.pass) {
      console.warn('Email credentials not configured. Emails will not be sent.');
      return null;
    }

    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });
  }
  return transporter;
}

/**
 * ផ្ញើអ៊ីមែលទូទៅ
 * Send a general email
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @returns {Promise<Object>} Send result
 */
async function sendEmail(to, subject, html) {
  try {
    const emailTransporter = getTransporter();
    
    if (!emailTransporter) {
      console.log(`[DEV MODE] Email would be sent to: ${to}`);
      console.log(`Subject: ${subject}`);
      return { success: false, message: 'Email not configured' };
    }

    // ត្រួតពិនិត្យអាសយដ្ឋានអ៊ីមែល
    // Validate email address
    if (!to || !isValidEmail(to)) {
      throw new Error('Invalid recipient email address');
    }

    const mailOptions = {
      from: config.email.from,
      to: to,
      subject: subject,
      html: html
    };

    const info = await emailTransporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      recipient: to
    };

  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ផ្ញើការរំលឹកការបង់ប្រាក់
 * Send payment reminder email
 * 
 * @param {Object} policy - Insurance policy data
 * @param {Object} pagoda - Pagoda data
 * @param {number} daysUntilExpiry - Days until policy expires
 * @returns {Promise<Object>} Send result
 */
async function sendPaymentReminder(policy, pagoda, daysUntilExpiry) {
  try {
    if (!policy || !pagoda) {
      throw new Error('Policy and pagoda data are required');
    }

    const subject = `Payment Reminder - ${pagoda.pagoda_name} - ការរំលឹកបង់ប្រាក់`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff6b35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #ff6b35; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 10px 20px; background-color: #ff6b35; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Payment Reminder</h2>
            <h3>ការរំលឹកបង់ប្រាក់ធានារ៉ាប់រង</h3>
          </div>
          <div class="content">
            <p>Dear ${pagoda.pagoda_name},</p>
            <p>សូមគោរព ${pagoda.pagoda_name},</p>
            
            <div class="info">
              <p><strong>Policy Number / លេខបណ្ណ:</strong> ${policy.policy_number || 'N/A'}</p>
              <p><strong>Expiry Date / ថ្ងៃផុតកំណត់:</strong> ${new Date(policy.end_date).toLocaleDateString()}</p>
              <p><strong>Days Until Expiry / ថ្ងៃដល់ផុតកំណត់:</strong> ${daysUntilExpiry} days</p>
              <p><strong>Premium Amount / ចំនួនទឹកប្រាក់:</strong> $${policy.premium_amount || 'N/A'}</p>
            </div>

            ${daysUntilExpiry <= 7 ? 
              '<p style="color: #d9534f; font-weight: bold;">⚠️ Your policy is expiring soon! Please renew to maintain coverage.</p>' +
              '<p style="color: #d9534f; font-weight: bold;">⚠️ គោលនយោបាយរបស់អ្នកជិតផុតកំណត់ហើយ! សូមបន្តដើម្បីរក្សាការធានារ៉ាប់រង។</p>' : 
              '<p>This is a friendly reminder to renew your fire insurance policy.</p>' +
              '<p>នេះគឺជាការរំលឹកមិត្តភាពដើម្បីបន្តគោលនយោបាយធានារ៉ាប់រងភ្លើងរបស់អ្នក។</p>'
            }

            <div style="text-align: center;">
              <a href="${config.baseUrl}/payments/new?policy=${policy.policy_id}" class="button">Make Payment / បង់ប្រាក់</a>
            </div>

            <p>If you have already made payment, please disregard this reminder.</p>
            <p>ប្រសិនបើអ្នកបានបង់ប្រាក់រួចហើយ សូមអើពើនឹងការរំលឹកនេះ។</p>
          </div>
          <div class="footer">
            <p>Pagoda Fire Insurance System</p>
            <p>ប្រព័ន្ធធានារ៉ាប់រងភ្លើងវត្តអារាម</p>
            <p>For assistance, contact us at: ${config.email.from}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmail(pagoda.contact_email, subject, html);

  } catch (error) {
    console.error('Error sending payment reminder:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ផ្ញើបង្កាន់ដៃការបង់ប្រាក់
 * Send payment receipt email
 * 
 * @param {Object} payment - Payment data
 * @param {Object} policy - Insurance policy data
 * @param {Object} pagoda - Pagoda data
 * @returns {Promise<Object>} Send result
 */
async function sendPaymentReceipt(payment, policy, pagoda) {
  try {
    if (!payment || !policy || !pagoda) {
      throw new Error('Payment, policy, and pagoda data are required');
    }

    const subject = `Payment Receipt - ${payment.receipt_number} - បង្កាន់ដៃបង់ប្រាក់`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .receipt { background-color: white; padding: 20px; margin: 20px 0; border: 2px solid #28a745; }
          .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .receipt-label { font-weight: bold; }
          .total { font-size: 1.2em; color: #28a745; font-weight: bold; padding-top: 10px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .success-icon { font-size: 48px; color: #28a745; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✓</div>
            <h2>Payment Successful</h2>
            <h3>ការបង់ប្រាក់បានជោគជ័យ</h3>
          </div>
          <div class="content">
            <p>Dear ${pagoda.pagoda_name},</p>
            <p>សូមគោរព ${pagoda.pagoda_name},</p>
            
            <p>Thank you for your payment. Your insurance is now active.</p>
            <p>សូមអរគុណចំពោះការបង់ប្រាក់របស់អ្នក។ ធានារ៉ាប់រងរបស់អ្នកឥឡូវនេះសកម្ម។</p>

            <div class="receipt">
              <h3 style="text-align: center; color: #28a745;">RECEIPT / បង្កាន់ដៃ</h3>
              
              <div class="receipt-row">
                <span class="receipt-label">Receipt Number / លេខបង្កាន់ដៃ:</span>
                <span>${payment.receipt_number}</span>
              </div>
              
              <div class="receipt-row">
                <span class="receipt-label">Payment Date / ថ្ងៃបង់ប្រាក់:</span>
                <span>${new Date(payment.payment_date).toLocaleDateString()}</span>
              </div>
              
              <div class="receipt-row">
                <span class="receipt-label">Policy Number / លេខគោលនយោបាយ:</span>
                <span>${policy.policy_number}</span>
              </div>
              
              <div class="receipt-row">
                <span class="receipt-label">Pagoda Name / ឈ្មោះវត្ត:</span>
                <span>${pagoda.pagoda_name}</span>
              </div>
              
              <div class="receipt-row">
                <span class="receipt-label">Payment Method / វិធីបង់ប្រាក់:</span>
                <span>${payment.payment_method}</span>
              </div>
              
              <div class="receipt-row">
                <span class="receipt-label">Coverage Period / រយៈពេលការពារ:</span>
                <span>${new Date(policy.start_date).toLocaleDateString()} - ${new Date(policy.end_date).toLocaleDateString()}</span>
              </div>
              
              <div class="receipt-row total">
                <span class="receipt-label">Amount Paid / ចំនួនទឹកប្រាក់:</span>
                <span>$${parseFloat(payment.amount).toFixed(2)}</span>
              </div>
            </div>

            <p style="background-color: #d4edda; padding: 10px; border-radius: 5px;">
              <strong>Status / ស្ថានភាព:</strong> ${payment.payment_status === 'completed' ? 'Completed ✓ / បានបញ្ចប់ ✓' : payment.payment_status}
            </p>

            <p><em>Please keep this receipt for your records.</em></p>
            <p><em>សូមរក្សាទុកបង្កាន់ដៃនេះសម្រាប់កំណត់ត្រារបស់អ្នក។</em></p>
          </div>
          <div class="footer">
            <p>Pagoda Fire Insurance System</p>
            <p>ប្រព័ន្ធធានារ៉ាប់រងភ្លើងវត្តអារាម</p>
            <p>For assistance, contact us at: ${config.email.from}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmail(pagoda.contact_email, subject, html);

  } catch (error) {
    console.error('Error sending payment receipt:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ត្រួតពិនិត្យអាសយដ្ឋានអ៊ីមែល
 * Validate email address format
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * សាកល្បងការតភ្ជាប់អ៊ីមែល
 * Test email connection
 * 
 * @returns {Promise<boolean>} Connection status
 */
async function testConnection() {
  try {
    const emailTransporter = getTransporter();
    
    if (!emailTransporter) {
      console.log('Email transporter not configured');
      return false;
    }

    await emailTransporter.verify();
    console.log('Email server connection successful');
    return true;

  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
}

module.exports = {
  sendEmail,
  sendPaymentReminder,
  sendPaymentReceipt,
  testConnection,
  isValidEmail
};
