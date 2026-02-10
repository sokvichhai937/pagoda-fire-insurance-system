// ប្រព័ន្ធបង្កើតរបាយការណ៍
// Report Generation System

const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticate } = require('../middleware/auth');

// Helper function to handle validation errors
// មុខងារជំនួយដើម្បីគ្រប់គ្រងកំហុសនៃការផ្ទៀងផ្ទាត់
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// GET /api/reports/monthly?month=YYYY-MM - Monthly report
// របាយការណ៍ប្រចាំខែ
router.get('/monthly',
  authenticate,
  [
    query('month').matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { month } = req.query;
      const [year, monthNum] = month.split('-');

      // Get payments for the month
      // យកការទូទាត់សម្រាប់ខែនេះ
      const payments = await db.all(`
        SELECT 
          pm.*,
          ip.policy_number as policyNumber,
          p.name as pagodaName,
          p.province
        FROM payments pm
        JOIN insurance_policies ip ON pm.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        WHERE FORMAT(pm.payment_date, 'yyyy-MM') = ?
        AND pm.status = 'completed'
        ORDER BY pm.payment_date
      `, [month]);

      // Calculate totals by payment method
      // គណនាសរុបតាមវិធីសាស្ត្រទូទាត់
      const paymentsByMethod = {};
      let totalRevenue = 0;

      payments.forEach(payment => {
        totalRevenue += payment.amount;
        if (!paymentsByMethod[payment.payment_method]) {
          paymentsByMethod[payment.payment_method] = {
            count: 0,
            amount: 0
          };
        }
        paymentsByMethod[payment.payment_method].count++;
        paymentsByMethod[payment.payment_method].amount += payment.amount;
      });

      // Get new policies for the month
      // យកគោលនយោបាយថ្មីសម្រាប់ខែនេះ
      const newPolicies = await db.all(`
        SELECT 
          ip.*,
          p.name as pagodaName,
          p.province
        FROM insurance_policies ip
        JOIN pagodas p ON ip.pagoda_id = p.id
        WHERE FORMAT(ip.created_at, 'yyyy-MM') = ?
        ORDER BY ip.created_at
      `, [month]);

      // Get policies by province
      // យកគោលនយោបាយតាមខេត្ត
      const policiesByProvince = await db.all(`
        SELECT 
          p.province,
          COUNT(DISTINCT ip.id) as policyCount,
          COUNT(DISTINCT p.id) as pagodaCount,
          SUM(CASE WHEN ip.status = 'active' THEN 1 ELSE 0 END) as activePolicies
        FROM pagodas p
        LEFT JOIN insurance_policies ip ON p.id = ip.pagoda_id
        GROUP BY p.province
        ORDER BY COUNT(DISTINCT ip.id) DESC
      `);

      res.json({
        success: true,
        message: 'Monthly report generated successfully',
        data: {
          period: month,
          summary: {
            totalPayments: payments.length,
            totalRevenue,
            newPolicies: newPolicies.length,
            paymentsByMethod
          },
          payments,
          newPolicies,
          policiesByProvince
        }
      });
    } catch (error) {
      console.error('Error generating monthly report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate monthly report',
        error: error.message
      });
    }
  }
);

// GET /api/reports/yearly?year=YYYY - Yearly report
// របាយការណ៍ប្រចាំឆ្នាំ
router.get('/yearly',
  authenticate,
  [
    query('year').matches(/^\d{4}$/).withMessage('Year must be in YYYY format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { year } = req.query;

      // Get monthly breakdown
      // យករបាយការណ៍រាយខែ
      const monthlyData = await db.all(`
        SELECT 
          FORMAT(pm.payment_date, 'MM') as month,
          COUNT(*) as paymentCount,
          SUM(pm.amount) as totalAmount
        FROM payments pm
        WHERE YEAR(pm.payment_date) = ?
        AND pm.status = 'completed'
        GROUP BY FORMAT(pm.payment_date, 'MM')
        ORDER BY FORMAT(pm.payment_date, 'MM')
      `, [year]);

      // Get total revenue
      const revenueResult = await db.get(`
        SELECT SUM(amount) as totalRevenue
        FROM payments
        WHERE YEAR(payment_date) = ?
        AND status = 'completed'
      `, [year]);

      // Get new policies count
      const policiesResult = await db.get(`
        SELECT COUNT(*) as count
        FROM insurance_policies
        WHERE YEAR(created_at) = ?
      `, [year]);

      // Get active policies at year end
      const activePoliciesResult = await db.get(`
        SELECT COUNT(*) as count
        FROM insurance_policies
        WHERE status = 'active'
        AND YEAR(start_date) <= ?
        AND YEAR(end_date) >= ?
      `, [year, year]);

      // Get policies by type
      const policiesByType = await db.all(`
        SELECT 
          p.type,
          COUNT(ip.id) as count,
          SUM(ip.premium_amount) as totalPremium
        FROM insurance_policies ip
        JOIN pagodas p ON ip.pagoda_id = p.id
        WHERE YEAR(ip.created_at) = ?
        GROUP BY p.type
      `, [year]);

      // Get top provinces by revenue
      const topProvinces = await db.all(`
        SELECT 
          p.province,
          COUNT(DISTINCT ip.id) as policyCount,
          SUM(pm.amount) as totalRevenue
        FROM payments pm
        JOIN insurance_policies ip ON pm.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        WHERE YEAR(pm.payment_date) = ?
        AND pm.status = 'completed'
        GROUP BY p.province
        ORDER BY SUM(pm.amount) DESC
        OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
      `, [year]);

      res.json({
        success: true,
        message: 'Yearly report generated successfully',
        data: {
          year,
          summary: {
            totalRevenue: revenueResult.totalRevenue || 0,
            newPolicies: policiesResult.count,
            activePolicies: activePoliciesResult.count,
            totalPayments: monthlyData.reduce((sum, m) => sum + m.paymentCount, 0)
          },
          monthlyBreakdown: monthlyData,
          policiesByType,
          topProvinces
        }
      });
    } catch (error) {
      console.error('Error generating yearly report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate yearly report',
        error: error.message
      });
    }
  }
);

// GET /api/reports/pagoda-status - Pagoda payment status
// ស្ថានភាពការទូទាត់របស់វត្តអារាម
router.get('/pagoda-status',
  authenticate,
  async (req, res) => {
    try {
      // Get all pagodas with their policy and payment status
      // យកវត្តអារាមទាំងអស់ជាមួយស្ថានភាពគោលនយោបាយ និងការទូទាត់
      const pagodaStatus = await db.all(`
        SELECT 
          p.id,
          p.name,
          p.name_khmer as nameKhmer,
          p.province,
          p.district,
          ip.id as policyId,
          ip.policy_number as policyNumber,
          ip.status as policyStatus,
          ip.start_date as startDate,
          ip.end_date as endDate,
          ip.premium_amount as premiumAmount,
          (SELECT SUM(amount) FROM payments WHERE policy_id = ip.id AND status = 'completed') as totalPaid,
          (SELECT MAX(payment_date) FROM payments WHERE policy_id = ip.id AND status = 'completed') as lastPaymentDate
        FROM pagodas p
        LEFT JOIN insurance_policies ip ON p.id = ip.pagoda_id AND ip.status = 'active'
        ORDER BY p.province, p.name
      `);

      // Categorize pagodas
      // ចាត់ថ្នាក់វត្តអារាម
      const categories = {
        withActivePolicy: [],
        withoutPolicy: [],
        overdue: [],
        upToDate: []
      };

      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      pagodaStatus.forEach(pagoda => {
        if (!pagoda.policyId) {
          categories.withoutPolicy.push(pagoda);
        } else {
          categories.withActivePolicy.push(pagoda);
          
          const totalPaid = pagoda.totalPaid || 0;
          const premiumAmount = pagoda.premiumAmount || 0;
          const lastPayment = pagoda.lastPaymentDate ? new Date(pagoda.lastPaymentDate) : null;

          // Check if overdue (premium not fully paid or last payment > 30 days ago)
          if (totalPaid < premiumAmount || (lastPayment && lastPayment < thirtyDaysAgo)) {
            categories.overdue.push(pagoda);
          } else {
            categories.upToDate.push(pagoda);
          }
        }
      });

      res.json({
        success: true,
        message: 'Pagoda status report generated successfully',
        data: {
          summary: {
            total: pagodaStatus.length,
            withActivePolicy: categories.withActivePolicy.length,
            withoutPolicy: categories.withoutPolicy.length,
            overdue: categories.overdue.length,
            upToDate: categories.upToDate.length
          },
          categories
        }
      });
    } catch (error) {
      console.error('Error generating pagoda status report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate pagoda status report',
        error: error.message
      });
    }
  }
);

// GET /api/reports/stats - Dashboard statistics
// ស្ថិតិផ្ទាំងគ្រប់គ្រង
router.get('/stats',
  authenticate,
  async (req, res) => {
    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      // Total pagodas
      const totalPagodas = await db.get('SELECT COUNT(*) as count FROM pagodas');

      // Active policies
      const activePolicies = await db.get(`
        SELECT COUNT(*) as count 
        FROM insurance_policies 
        WHERE status = 'active'
      `);

      // Payments this month
      const paymentsThisMonth = await db.get(`
        SELECT 
          COUNT(*) as count,
          SUM(amount) as total
        FROM payments
        WHERE FORMAT(payment_date, 'yyyy-MM') = ?
        AND status = 'completed'
      `, [monthStr]);

      // Total revenue (all time)
      const totalRevenue = await db.get(`
        SELECT SUM(amount) as total
        FROM payments
        WHERE status = 'completed'
      `);

      // Overdue payments (policies with unpaid premiums)
      const overduePayments = await db.get(`
        SELECT COUNT(*) as count
        FROM insurance_policies ip
        WHERE ip.status = 'active'
        AND (
          SELECT COALESCE(SUM(amount), 0)
          FROM payments
          WHERE policy_id = ip.id AND status = 'completed'
        ) < ip.premium_amount
      `);

      // Recent policies (last 5)
      const recentPolicies = await db.all(`
        SELECT 
          ip.*,
          p.name as pagodaName,
          p.name_khmer as pagodaNameKhmer
        FROM insurance_policies ip
        JOIN pagodas p ON ip.pagoda_id = p.id
        ORDER BY ip.created_at DESC
        OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
      `);

      // Recent payments (last 5)
      const recentPayments = await db.all(`
        SELECT 
          pm.*,
          ip.policy_number as policyNumber,
          p.name as pagodaName
        FROM payments pm
        JOIN insurance_policies ip ON pm.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        ORDER BY pm.payment_date DESC
        OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
      `);

      // Policies by province
      const policiesByProvince = await db.all(`
        SELECT 
          p.province,
          COUNT(ip.id) as count
        FROM pagodas p
        LEFT JOIN insurance_policies ip ON p.id = ip.pagoda_id AND ip.status = 'active'
        GROUP BY p.province
        ORDER BY COUNT(ip.id) DESC
        OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
      `);

      res.json({
        success: true,
        message: 'Dashboard statistics retrieved successfully',
        data: {
          overview: {
            totalPagodas: totalPagodas.count,
            activePolicies: activePolicies.count,
            paymentsThisMonth: paymentsThisMonth.count || 0,
            revenueThisMonth: paymentsThisMonth.total || 0,
            totalRevenue: totalRevenue.total || 0,
            overduePayments: overduePayments.count
          },
          recentPolicies,
          recentPayments,
          policiesByProvince
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics',
        error: error.message
      });
    }
  }
);

module.exports = router;
