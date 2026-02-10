// pdfGenerator.js - PDF generation for receipts and documents
// ការបង្កើតឯកសារ PDF សម្រាប់បង្កាន់ដៃ និងឯកសារផ្សេងៗ

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * បង្កើតបង្កាន់ដៃការបង់ប្រាក់ជា PDF
 * Generate payment receipt as PDF
 * 
 * @param {Object} payment - Payment data
 * @param {Object} policy - Insurance policy data
 * @param {Object} pagoda - Pagoda data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateReceipt(payment, policy, pagoda) {
  return new Promise((resolve, reject) => {
    try {
      // ត្រួតពិនិត្យទិន្នន័យចូល
      // Validate input data
      if (!payment || !policy || !pagoda) {
        throw new Error('Payment, policy, and pagoda data are required');
      }

      // បង្កើតឯកសារ PDF
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      // បង្កើត buffer ដើម្បីរក្សាទុក PDF
      // Create buffer to store PDF
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // បឋមកថា - Header
      doc.fontSize(24)
         .fillColor('#28a745')
         .text('PAYMENT RECEIPT', { align: 'center' })
         .moveDown(0.3);

      doc.fontSize(16)
         .fillColor('#555')
         .text('បង្កាន់ដៃបង់ប្រាក់', { align: 'center' })
         .moveDown(1);

      // ព័ត៌មានប្រព័ន្ធ - System information
      doc.fontSize(10)
         .fillColor('#333')
         .text('Pagoda Fire Insurance System', { align: 'center' })
         .text('ប្រព័ន្ធធានារ៉ាប់រងភ្លើងវត្តអារាម', { align: 'center' })
         .moveDown(1.5);

      // បន្ទាត់បំបែក - Divider line
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor('#28a745')
         .lineWidth(2)
         .stroke()
         .moveDown(1);

      // ព័ត៌មានបង្កាន់ដៃ - Receipt information
      const receiptInfo = [
        { 
          label: 'Receipt Number / លេខបង្កាន់ដៃ:', 
          value: payment.receipt_number || 'N/A' 
        },
        { 
          label: 'Payment Date / ថ្ងៃបង់ប្រាក់:', 
          value: formatDate(payment.payment_date) 
        },
        { 
          label: 'Policy Number / លេខគោលនយោបាយ:', 
          value: policy.policy_number || 'N/A' 
        },
        { 
          label: 'Payment Status / ស្ថានភាព:', 
          value: payment.payment_status || 'N/A' 
        }
      ];

      doc.fontSize(11).fillColor('#333');
      receiptInfo.forEach(info => {
        doc.font('Helvetica-Bold')
           .text(info.label, 50, doc.y, { continued: true, width: 250 })
           .font('Helvetica')
           .text(info.value, { align: 'right' })
           .moveDown(0.5);
      });

      doc.moveDown(1);

      // ព័ត៌មានវត្ត - Pagoda information
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#28a745')
         .text('PAGODA INFORMATION', 50, doc.y)
         .moveDown(0.5);

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#333');

      const pagodaInfo = [
        { label: 'Pagoda Name / ឈ្មោះវត្ត:', value: pagoda.pagoda_name || 'N/A' },
        { label: 'Village / ភូមិ:', value: pagoda.village || 'N/A' },
        { label: 'Commune / ឃុំ/សង្កាត់:', value: pagoda.commune || 'N/A' },
        { label: 'District / ស្រុក/ខណ្ឌ:', value: pagoda.district || 'N/A' },
        { label: 'Province / ខេត្ត/រាជធានី:', value: pagoda.province || 'N/A' },
        { label: 'Contact / លេខទំនាក់ទំនង:', value: pagoda.contact_phone || 'N/A' }
      ];

      pagodaInfo.forEach(info => {
        doc.font('Helvetica-Bold')
           .text(info.label, 50, doc.y, { continued: true, width: 250 })
           .font('Helvetica')
           .text(info.value, { align: 'right' })
           .moveDown(0.5);
      });

      doc.moveDown(1);

      // ព័ត៌មានការធានារ៉ាប់រង - Insurance coverage information
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#28a745')
         .text('COVERAGE PERIOD', 50, doc.y)
         .moveDown(0.5);

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#333');

      const coverageInfo = [
        { 
          label: 'Start Date / ថ្ងៃចាប់ផ្តើម:', 
          value: formatDate(policy.start_date) 
        },
        { 
          label: 'End Date / ថ្ងៃបញ្ចប់:', 
          value: formatDate(policy.end_date) 
        },
        { 
          label: 'Coverage Days / រយៈពេលការពារ:', 
          value: calculateDays(policy.start_date, policy.end_date) + ' days' 
        }
      ];

      coverageInfo.forEach(info => {
        doc.font('Helvetica-Bold')
           .text(info.label, 50, doc.y, { continued: true, width: 250 })
           .font('Helvetica')
           .text(info.value, { align: 'right' })
           .moveDown(0.5);
      });

      doc.moveDown(1.5);

      // ព័ត៌មានការបង់ប្រាក់ - Payment details
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#28a745')
         .text('PAYMENT DETAILS', 50, doc.y)
         .moveDown(0.5);

      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#333');

      const paymentInfo = [
        { 
          label: 'Payment Method / វិធីបង់ប្រាក់:', 
          value: payment.payment_method || 'N/A' 
        },
        { 
          label: 'Premium Amount / ចំនួនបុព្វលាភ:', 
          value: '$' + parseFloat(policy.premium_amount || 0).toFixed(2) 
        }
      ];

      paymentInfo.forEach(info => {
        doc.font('Helvetica-Bold')
           .text(info.label, 50, doc.y, { continued: true, width: 250 })
           .font('Helvetica')
           .text(info.value, { align: 'right' })
           .moveDown(0.5);
      });

      doc.moveDown(0.5);

      // បន្ទាត់បំបែក - Divider line
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor('#333')
         .lineWidth(1)
         .stroke()
         .moveDown(0.5);

      // ចំនួនសរុប - Total amount
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('#28a745')
         .text('TOTAL AMOUNT PAID', 50, doc.y, { continued: true, width: 300 })
         .text('$' + parseFloat(payment.amount).toFixed(2), { align: 'right' })
         .moveDown(0.3);

      doc.fontSize(14)
         .fillColor('#555')
         .text('ចំនួនទឹកប្រាក់សរុប', 50, doc.y, { continued: true, width: 300 })
         .text('$' + parseFloat(payment.amount).toFixed(2), { align: 'right' });

      // បន្ទាត់បំបែក - Divider line
      doc.moveDown(1);
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor('#333')
         .lineWidth(1)
         .stroke()
         .moveDown(1.5);

      // ចំណាំបន្ថែម - Additional notes
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#666')
         .text('Note: Please keep this receipt for your records. This is a computer-generated receipt and does not require a signature.', 
               50, doc.y, { align: 'center', width: 495 })
         .moveDown(0.3)
         .text('ចំណាំ៖ សូមរក្សាទុកបង្កាន់ដៃនេះសម្រាប់កំណត់ត្រារបស់អ្នក។ នេះជាបង្កាន់ដៃដែលបង្កើតដោយកុំព្យូទ័រ និងមិនត្រូវការហត្ថលេខាទេ។', 
               { align: 'center', width: 495 });

      // បាតកថា - Footer
      doc.moveDown(2);
      doc.fontSize(8)
         .fillColor('#999')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' })
         .text('Pagoda Fire Insurance System - ប្រព័ន្ធធានារ៉ាប់រងភ្លើងវត្តអារាម', { align: 'center' });

      // បញ្ចប់ឯកសារ - Finalize document
      doc.end();

    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      reject(error);
    }
  });
}

/**
 * រក្សាទុក PDF ទៅឯកសារ
 * Save PDF to file
 * 
 * @param {Buffer} pdfBuffer - PDF buffer
 * @param {string} filename - Output filename
 * @param {string} directory - Output directory
 * @returns {Promise<string>} File path
 */
async function savePDFToFile(pdfBuffer, filename, directory = 'uploads/receipts') {
  return new Promise((resolve, reject) => {
    try {
      // បង្កើតថតប្រសិនបើមិនមាន
      // Create directory if it doesn't exist
      const fullDirectory = path.join(process.cwd(), directory);
      if (!fs.existsSync(fullDirectory)) {
        fs.mkdirSync(fullDirectory, { recursive: true });
      }

      const filePath = path.join(fullDirectory, filename);
      
      fs.writeFile(filePath, pdfBuffer, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`PDF saved to: ${filePath}`);
          resolve(filePath);
        }
      });

    } catch (error) {
      console.error('Error saving PDF:', error);
      reject(error);
    }
  });
}

/**
 * បង្កើតឈ្មោះឯកសារសម្រាប់បង្កាន់ដៃ
 * Generate filename for receipt
 * 
 * @param {string} receiptNumber - Receipt number
 * @returns {string} Filename
 */
function generateReceiptFilename(receiptNumber) {
  const timestamp = new Date().getTime();
  const sanitized = receiptNumber.replace(/[^a-zA-Z0-9]/g, '_');
  return `receipt_${sanitized}_${timestamp}.pdf`;
}

/**
 * ធ្វើទ្រង់ទ្រាយកាលបរិច្ឆេទ
 * Format date for display
 * 
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

/**
 * គណនាចំនួនថ្ងៃរវាងកាលបរិច្ឆេទពីរ
 * Calculate days between two dates
 * 
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of days
 */
function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

module.exports = {
  generateReceipt,
  savePDFToFile,
  generateReceiptFilename
};
