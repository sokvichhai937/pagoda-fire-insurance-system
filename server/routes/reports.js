// ប្រព័ន្ធបង្កើតរបាយការណ៍
// Report Generation System

const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const Pagoda = require('../models/Pagoda');
const Insurance = require('../models/Insurance');
const Payment = require('../models/Payment');
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
      const result = await pool.request()
        .input('month', month)
        .query(`
          SELECT 
            pm.*,
            ip.policy_number as policyNumber,
            p.name_en as pagodaName,
            p.province
          FROM payments pm
          JOIN insurance_policies ip ON pm.policy_id = ip.id
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE FORMAT(pm.payment_date, 'yyyy-MM') = @month
          ORDER BY pm.payment_date
        `);
      const payments = result.recordset;

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
      const newPoliciesResult = await pool.request()
        .input('month', month)
        .query(`
          SELECT 
            ip.*,
            p.name_en as pagodaName,
            p.province
          FROM insurance_policies ip
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE FORMAT(ip.created_at, 'yyyy-MM') = @month
          ORDER BY ip.created_at
        `);
      const newPolicies = newPoliciesResult.recordset;

      // Get policies by province
      // យកគោលនយោបាយតាមខេត្ត
      const provinceResult = await pool.request().query(`
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
      const policiesByProvince = provinceResult.recordset;

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
      const monthlyResult = await pool.request()
        .input('year', year)
        .query(`
          SELECT 
            FORMAT(pm.payment_date, 'MM') as month,
            COUNT(*) as paymentCount,
            SUM(pm.amount) as totalAmount
          FROM payments pm
          WHERE YEAR(pm.payment_date) = @year
          GROUP BY FORMAT(pm.payment_date, 'MM')
          ORDER BY FORMAT(pm.payment_date, 'MM')
        `);
      const monthlyData = monthlyResult.recordset;

      // Get total revenue
      const revenueData = await pool.request()
        .input('year', year)
        .query(`
          SELECT SUM(amount) as totalRevenue
          FROM payments
          WHERE YEAR(payment_date) = @year
        `);
      const revenueResult = revenueData.recordset[0];

      // Get new policies count
      const policiesData = await pool.request()
        .input('year', year)
        .query(`
          SELECT COUNT(*) as count
          FROM insurance_policies
          WHERE YEAR(created_at) = @year
        `);
      const policiesResult = policiesData.recordset[0];

      // Get active policies at year end
      const activePoliciesData = await pool.request()
        .input('year', year)
        .query(`
          SELECT COUNT(*) as count
          FROM insurance_policies
          WHERE status = 'active'
          AND YEAR(coverage_start) <= @year
          AND YEAR(coverage_end) >= @year
        `);
      const activePoliciesResult = activePoliciesData.recordset[0];

      // Get policies by type
      const typeResult = await pool.request()
        .input('year', year)
        .query(`
          SELECT 
            p.type,
            COUNT(ip.id) as count,
            SUM(ip.premium_amount) as totalPremium
          FROM insurance_policies ip
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE YEAR(ip.created_at) = @year
          GROUP BY p.type
        `);
      const policiesByType = typeResult.recordset;

      // Get top provinces by revenue
      const provincesResult = await pool.request()
        .input('year', year)
        .query(`
          SELECT 
            p.province,
            COUNT(DISTINCT ip.id) as policyCount,
            SUM(pm.amount) as totalRevenue
          FROM payments pm
          JOIN insurance_policies ip ON pm.policy_id = ip.id
          JOIN pagodas p ON ip.pagoda_id = p.id
          WHERE YEAR(pm.payment_date) = @year
          GROUP BY p.province
          ORDER BY SUM(pm.amount) DESC
          OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
        `);
      const topProvinces = provincesResult.recordset;

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
      const statusResult = await pool.request().query(`
        SELECT 
          p.id,
          p.name_en as name,
          p.name_km as nameKhmer,
          p.province,
          ip.id as policyId,
          ip.policy_number as policyNumber,
          ip.status as policyStatus,
          ip.coverage_start as startDate,
          ip.coverage_end as endDate,
          ip.premium_amount as premiumAmount,
          (SELECT SUM(amount) FROM payments WHERE policy_id = ip.id) as totalPaid,
          (SELECT MAX(payment_date) FROM payments WHERE policy_id = ip.id) as lastPaymentDate
        FROM pagodas p
        LEFT JOIN insurance_policies ip ON p.id = ip.pagoda_id AND ip.status = 'active'
        ORDER BY p.province, p.name_en
      `);
      const pagodaStatus = statusResult.recordset;

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
      const totalPagodasData = await pool.request().query('SELECT COUNT(*) as count FROM pagodas');
      const totalPagodas = totalPagodasData.recordset[0];

      // Active policies
      const activePoliciesData = await pool.request().query(`
        SELECT COUNT(*) as count 
        FROM insurance_policies 
        WHERE status = 'active'
      `);
      const activePolicies = activePoliciesData.recordset[0];

      // Payments this month
      const paymentsMonthData = await pool.request()
        .input('monthStr', monthStr)
        .query(`
          SELECT 
            COUNT(*) as count,
            SUM(amount) as total
          FROM payments
          WHERE FORMAT(payment_date, 'yyyy-MM') = @monthStr
        `);
      const paymentsThisMonth = paymentsMonthData.recordset[0];

      // Total revenue (all time)
      const totalRevenueData = await pool.request().query(`
        SELECT SUM(amount) as total
        FROM payments
      `);
      const totalRevenue = totalRevenueData.recordset[0];

      // Overdue payments (policies with unpaid premiums)
      const overdueData = await pool.request().query(`
        SELECT COUNT(*) as count
        FROM insurance_policies ip
        WHERE ip.status = 'active'
        AND (
          SELECT COALESCE(SUM(amount), 0)
          FROM payments
          WHERE policy_id = ip.id
        ) < ip.premium_amount
      `);
      const overduePayments = overdueData.recordset[0];

      // Recent policies (last 5)
      const recentPoliciesData = await pool.request().query(`
        SELECT 
          ip.*,
          p.name_en as pagodaName,
          p.name_km as pagodaNameKhmer
        FROM insurance_policies ip
        JOIN pagodas p ON ip.pagoda_id = p.id
        ORDER BY ip.created_at DESC
        OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
      `);
      const recentPolicies = recentPoliciesData.recordset;

      // Recent payments (last 5)
      const recentPaymentsData = await pool.request().query(`
        SELECT 
          pm.*,
          ip.policy_number as policyNumber,
          p.name_en as pagodaName
        FROM payments pm
        JOIN insurance_policies ip ON pm.policy_id = ip.id
        JOIN pagodas p ON ip.pagoda_id = p.id
        ORDER BY pm.payment_date DESC
        OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
      `);
      const recentPayments = recentPaymentsData.recordset;

      // Policies by province
      const provinceData = await pool.request().query(`
        SELECT 
          p.province,
          COUNT(ip.id) as count
        FROM pagodas p
        LEFT JOIN insurance_policies ip ON p.id = ip.pagoda_id AND ip.status = 'active'
        GROUP BY p.province
        ORDER BY COUNT(ip.id) DESC
        OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
      `);
      const policiesByProvince = provinceData.recordset;

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
