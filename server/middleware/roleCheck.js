// roleCheck.js - Role-based Authorization Middleware
// មីឌលវែរពិនិត្យតួនាទីអ្នកប្រើប្រាស់

// Check if user has required role
// ពិនិត្យមើលថាតើអ្នកប្រើប្រាស់មានតួនាទីត្រឹមត្រូវ
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required / ត្រូវការផ្ទៀងផ្ទាត់អត្តសញ្ញាណ'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions / ការចូលប្រើត្រូវបានបដិសេធ។ មិនមានសិទ្ធិគ្រប់គ្រាន់'
      });
    }

    next();
  };
};

// Check if user is admin
// ពិនិត្យមើលថាតើអ្នកប្រើប្រាស់ជាអ្នកគ្រប់គ្រង
const isAdmin = checkRole('admin');

// Check if user is admin or staff
// ពិនិត្យមើលថាតើអ្នកប្រើប្រាស់ជាអ្នកគ្រប់គ្រង ឬបុគ្គលិក
const isAdminOrStaff = checkRole('admin', 'staff');

// Check if user can modify resource (owner or admin)
// ពិនិត្យមើលថាតើអ្នកប្រើប្រាស់អាចកែប្រែធនធាន
const canModify = (resourceUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required / ត្រូវការផ្ទៀងផ្ទាត់អត្តសញ្ញាណ'
      });
    }

    // Admin can modify anything
    if (req.user.role === 'admin') {
      return next();
    }

    // User can only modify their own resources
    if (req.user.id === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied / ការចូលប្រើត្រូវបានបដិសេធ'
    });
  };
};

module.exports = {
  checkRole,
  isAdmin,
  isAdminOrStaff,
  canModify
};
