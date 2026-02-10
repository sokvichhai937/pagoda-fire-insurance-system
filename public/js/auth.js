// auth.js - Authentication handling
// ឯកសារសម្រាប់គ្រប់គ្រងការផ្ទៀងផ្ទាត់ភាពត្រឹមត្រូវ

// Wait for DOM to load / រង់ចាំផ្ទុកទំព័រ
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

/**
 * Handle login form submission
 * គ្រប់គ្រងការបញ្ជូនទម្រង់ចូលប្រើប្រាស់
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        // Show loading state / បង្ហាញស្ថានភាពកំពុងដំណើរការ
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>កំពុងចូល...';
        
        // Get form data / យកទិន្នន័យពីទម្រង់
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        // Validate inputs / ពិនិត្យទិន្នន័យបញ្ចូល
        if (!username || !password) {
            showToast('សូមបំពេញឈ្មោះនិងពាក្យសម្ងាត់', 'warning');
            return;
        }
        
        // Call login API / ហៅ API ចូលប្រើប្រាស់
        const response = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.success) {
            // Store authentication data / រក្សាទុកទិន្នន័យផ្ទៀងផ្ទាត់
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            // Show success message / បង្ហាញសារជោគជ័យ
            showToast('ចូលប្រើប្រាស់ជោគជ័យ!', 'success');
            
            // Redirect to dashboard / ប្តូរទៅទំព័រ dashboard
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 500);
        } else {
            // Show error message / បង្ហាញសារបរាជ័យ
            showToast(response.message || 'ឈ្មោះឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('មានបញ្ហាក្នុងការចូលប្រើប្រាស់', 'error');
    } finally {
        // Restore button state / ស្តារស្ថានភាពប៊ូតុង
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Handle logout
 * គ្រប់គ្រងការចាកចេញ
 */
function handleLogout() {
    // Clear authentication data / លុបទិន្នន័យផ្ទៀងផ្ទាត់
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Show message / បង្ហាញសារ
    showToast('ចាកចេញជោគជ័យ', 'success');
    
    // Redirect to login / ប្តូរទៅទំព័រចូលប្រើប្រាស់
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 500);
}

/**
 * Check if user is authenticated
 * ពិនិត្យថាតើអ្នកប្រើប្រាស់បានផ្ទៀងផ្ទាត់ឬនៅ
 */
function isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
}

/**
 * Get current user data
 * យកទិន្នន័យអ្នកប្រើប្រាស់បច្ចុប្បន្ន
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    return null;
}

/**
 * Require authentication - redirect to login if not authenticated
 * តម្រូវឱ្យមានការផ្ទៀងផ្ទាត់ - ប្តូរទៅទំព័រចូលប្រើប្រាស់ប្រសិនបើមិនបានផ្ទៀងផ្ទាត់
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/**
 * Check permissions
 * ពិនិត្យសិទ្ធិអនុញ្ញាត
 */
function hasPermission(permission) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Admin has all permissions / អ្នកគ្រប់គ្រងមានសិទ្ធិទាំងអស់
    if (user.role === 'admin') return true;
    
    // Check specific permissions / ពិនិត្យសិទ្ធិជាក់លាក់
    const rolePermissions = {
        'staff': ['view_pagodas', 'edit_pagodas', 'view_insurance', 'create_insurance', 'view_payments', 'create_payments'],
        'viewer': ['view_pagodas', 'view_insurance', 'view_payments', 'view_reports']
    };
    
    return rolePermissions[user.role]?.includes(permission) || false;
}

// Export functions for use in other files
// នាំចេញមុខងារសម្រាប់ប្រើក្នុងឯកសារផ្សេង
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        handleLogout,
        isAuthenticated,
        getCurrentUser,
        requireAuth,
        hasPermission
    };
}
