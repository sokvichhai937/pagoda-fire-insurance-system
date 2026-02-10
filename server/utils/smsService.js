// smsService.js - SMS sending utility
// សេវាកម្មផ្ញើសារ SMS

const config = require('../config/config');

/**
 * ផ្ញើសារ SMS ទូទៅ
 * Send a general SMS message (stub implementation)
 * 
 * @param {string} phone - Phone number
 * @param {string} message - SMS message content
 * @returns {Promise<Object>} Send result
 */
async function sendSMS(phone, message) {
  try {
    // ត្រួតពិនិត្យលេខទូរស័ព្ទ
    // Validate phone number
    if (!phone || !isValidPhone(phone)) {
      throw new Error('Invalid phone number');
    }

    if (!message || message.trim().length === 0) {
      throw new Error('Message content is required');
    }

    // ការអនុវត្តបណ្តោះអាសន្ន - កត់ត្រាក្នុង console
    // Stub implementation - log to console
    // នៅពេលមានសេវា SMS ពិតប្រាកដ អាចបន្ថែមកូដផ្ញើទៅ API
    // When real SMS service is available, add code to send to API

    console.log('=====================================');
    console.log('SMS SERVICE (STUB)');
    console.log('-------------------------------------');
    console.log(`To: ${phone}`);
    console.log(`Message: ${message}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('=====================================');

    // ប្រសិនបើមាន SMS API ត្រូវបានកំណត់រចនាសម្ព័ន្ធ
    // If SMS API is configured
    if (config.sms.apiKey && config.sms.apiUrl) {
      // នៅទីនេះអាចបន្ថែមការហៅទៅ SMS API ពិតប្រាកដ
      // Here you can add actual SMS API call
      // Example:
      // const response = await axios.post(config.sms.apiUrl, {
      //   phone: phone,
      //   message: message,
      //   api_key: config.sms.apiKey
      // });
      
      console.log('SMS API configured but using stub mode');
    }

    return {
      success: true,
      phone: phone,
      message: 'SMS sent (stub mode)',
      messageLength: message.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ផ្ញើសាររំលឹកការបង់ប្រាក់តាម SMS
 * Send payment reminder via SMS
 * 
 * @param {string} phone - Phone number
 * @param {string} pagodaName - Name of the pagoda
 * @param {number} daysUntilExpiry - Days until policy expires
 * @returns {Promise<Object>} Send result
 */
async function sendPaymentReminderSMS(phone, pagodaName, daysUntilExpiry) {
  try {
    if (!phone || !pagodaName || daysUntilExpiry === undefined) {
      throw new Error('Phone, pagoda name, and days until expiry are required');
    }

    // បង្កើតសារជាភាសាអង់គ្លេស និងខ្មែរ
    // Create message in English and Khmer
    let message;
    
    if (daysUntilExpiry <= 0) {
      message = `URGENT: Your fire insurance policy for ${pagodaName} has EXPIRED. Please renew immediately to maintain coverage. វិញ្ញាបនបត្រធានារ៉ាប់រងភ្លើងរបស់ ${pagodaName} បានផុតកំណត់។ សូមបន្តភ្លាមៗ។`;
    } else if (daysUntilExpiry <= 7) {
      message = `REMINDER: Your fire insurance for ${pagodaName} expires in ${daysUntilExpiry} days. Please renew soon. ការរំលឹក៖ ធានារ៉ាប់រងភ្លើងរបស់ ${pagodaName} នឹងផុតកំណត់ក្នុងរយៈពេល ${daysUntilExpiry} ថ្ងៃ។`;
    } else if (daysUntilExpiry <= 30) {
      message = `Reminder: Fire insurance for ${pagodaName} expires in ${daysUntilExpiry} days. Plan your renewal. ធានារ៉ាប់រងភ្លើងរបស់ ${pagodaName} នឹងផុតកំណត់ក្នុងរយៈពេល ${daysUntilExpiry} ថ្ងៃ។`;
    } else {
      message = `Hello from Pagoda Insurance System. Your policy for ${pagodaName} expires in ${daysUntilExpiry} days. សួស្តីពីប្រព័ន្ធធានារ៉ាប់រងវត្ត។ គោលនយោបាយរបស់ ${pagodaName} ផុតកំណត់ក្នុងរយៈពេល ${daysUntilExpiry} ថ្ងៃ។`;
    }

    return await sendSMS(phone, message);

  } catch (error) {
    console.error('Error sending payment reminder SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ផ្ញើសារបញ្ជាក់ការបង់ប្រាក់តាម SMS
 * Send payment confirmation via SMS
 * 
 * @param {string} phone - Phone number
 * @param {string} pagodaName - Name of the pagoda
 * @param {number} amount - Payment amount
 * @param {string} receiptNumber - Receipt number
 * @returns {Promise<Object>} Send result
 */
async function sendPaymentConfirmationSMS(phone, pagodaName, amount, receiptNumber) {
  try {
    if (!phone || !pagodaName || !amount || !receiptNumber) {
      throw new Error('All parameters are required');
    }

    // សារបញ្ជាក់ជាភាសាអង់គ្លេស និងខ្មែរ
    // Confirmation message in English and Khmer
    const message = `Payment received for ${pagodaName}. Amount: $${amount}. Receipt: ${receiptNumber}. Thank you! បានទទួលការបង់ប្រាក់សម្រាប់ ${pagodaName}។ ចំនួន៖ $${amount}។ លេខបង្កាន់ដៃ៖ ${receiptNumber}។ អរគុណ!`;

    return await sendSMS(phone, message);

  } catch (error) {
    console.error('Error sending payment confirmation SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ផ្ញើសារជូនដំណឹងផុតកំណត់គោលនយោបាយ
 * Send policy expiration notification
 * 
 * @param {string} phone - Phone number
 * @param {string} pagodaName - Name of the pagoda
 * @param {string} expiryDate - Expiry date
 * @returns {Promise<Object>} Send result
 */
async function sendExpiryNotificationSMS(phone, pagodaName, expiryDate) {
  try {
    if (!phone || !pagodaName || !expiryDate) {
      throw new Error('All parameters are required');
    }

    const message = `NOTICE: Insurance policy for ${pagodaName} expired on ${expiryDate}. Contact us to renew. ជូនដំណឹង៖ គោលនយោបាយធានារ៉ាប់រងសម្រាប់ ${pagodaName} បានផុតកំណត់នៅ ${expiryDate}។ សូមទាក់ទងយើងដើម្បីបន្ត។`;

    return await sendSMS(phone, message);

  } catch (error) {
    console.error('Error sending expiry notification SMS:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ត្រួតពិនិត្យទម្រង់លេខទូរស័ព្ទ
 * Validate phone number format
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether phone is valid
 */
function isValidPhone(phone) {
  // ទម្រង់លេខទូរស័ព្ទកម្ពុជា និងអន្តរជាតិ
  // Cambodian and international phone format
  // ឧទាហរណ៍: +855123456789, 0123456789, 855123456789
  // Examples: +855123456789, 0123456789, 855123456789
  const phoneRegex = /^(\+?855|0)?[1-9]\d{7,9}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

/**
 * ធ្វើឱ្យលេខទូរស័ព្ទមានទម្រង់ស្តង់ដារ
 * Format phone number to standard format
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhone(phone) {
  // លុបចេញនូវតួអក្សរពិសេស
  // Remove special characters
  const cleaned = phone.replace(/[\s-()]/g, '');
  
  // បន្ថែម +855 ប្រសិនបើចាប់ផ្តើមដោយ 0
  // Add +855 if starts with 0
  if (cleaned.startsWith('0')) {
    return '+855' + cleaned.substring(1);
  }
  
  // បន្ថែម + ប្រសិនបើចាប់ផ្តើមដោយ 855
  // Add + if starts with 855
  if (cleaned.startsWith('855')) {
    return '+' + cleaned;
  }
  
  return cleaned;
}

module.exports = {
  sendSMS,
  sendPaymentReminderSMS,
  sendPaymentConfirmationSMS,
  sendExpiryNotificationSMS,
  isValidPhone,
  formatPhone
};
