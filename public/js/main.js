// main.js - Main dashboard functionality
// ឯកសារសម្រាប់មុខងារ Dashboard

// Wait for DOM to load / រង់ចាំផ្ទុកទំព័រ
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication / ពិនិត្យការផ្ទៀងផ្ទាត់
    if (!requireAuth()) return;
    
    // Initialize dashboard / ចាប់ផ្តើម dashboard
    initDashboard();
    
    // Setup event listeners / ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
    setupEventListeners();
});

/**
 * Initialize dashboard
 * ចាប់ផ្តើម dashboard
 */
async function initDashboard() {
    try {
        // Load user info / ផ្ទុកព័ត៌មានអ្នកប្រើប្រាស់
        displayUserInfo();
        
        // Load dashboard stats / ផ្ទុកស្ថិតិ dashboard
        await loadDashboardStats();
        
        // Load recent activities / ផ្ទុកសកម្មភាពថ្មីៗ
        await loadRecentActivities();
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុក Dashboard', 'error');
    }
}

/**
 * Display user info in navbar
 * បង្ហាញព័ត៌មានអ្នកប្រើប្រាស់ក្នុង navbar
 */
function displayUserInfo() {
    const user = getCurrentUser();
    if (!user) return;
    
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userNameElement) {
        userNameElement.textContent = user.full_name || user.username;
    }
    
    if (userRoleElement) {
        const roleNames = {
            'admin': 'អ្នកគ្រប់គ្រង',
            'staff': 'បុគ្គលិក',
            'viewer': 'អ្នកមើល'
        };
        userRoleElement.textContent = roleNames[user.role] || user.role;
    }
}

/**
 * Load dashboard statistics
 * ផ្ទុកស្ថិតិ dashboard
 */
async function loadDashboardStats() {
    try {
        // Show loading state / បង្ហាញស្ថានភាពកំពុងផ្ទុក
        showStatsLoading();
        
        // Fetch stats from API / យកស្ថិតិពី API
        const response = await apiRequest('/api/reports/stats');
        
        if (response.success) {
            const stats = response.data;
            
            // Update stat cards / ធ្វើបច្ចុប្បន្នភាពកាតស្ថិតិ
            updateStatCard('totalPagodas', stats.totalPagodas || 0);
            updateStatCard('activePolicies', stats.activePolicies || 0);
            updateStatCard('totalRevenue', formatCurrency(stats.totalRevenue || 0));
            updateStatCard('pendingPayments', stats.pendingPayments || 0);
            
            // Create charts / បង្កើតគំនូសតាង
            if (stats.revenueByMonth) {
                createRevenueChart(stats.revenueByMonth);
            }
            
            if (stats.pagodasByProvince) {
                createProvinceChart(stats.pagodasByProvince);
            }
        } else {
            showToast('មិនអាចផ្ទុកស្ថិតិបានទេ', 'warning');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកស្ថិតិ', 'error');
    }
}

/**
 * Show loading state for stats
 * បង្ហាញស្ថានភាពកំពុងផ្ទុកសម្រាប់ស្ថិតិ
 */
function showStatsLoading() {
    const statCards = document.querySelectorAll('.stat-value');
    statCards.forEach(card => {
        card.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"></div>';
    });
}

/**
 * Update stat card value
 * ធ្វើបច្ចុប្បន្នភាពតម្លៃកាតស្ថិតិ
 */
function updateStatCard(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

/**
 * Create revenue chart
 * បង្កើតគំនូសតាងប្រាក់ចំណូល
 */
function createRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    // Prepare data / រៀបចំទិន្នន័យ
    const labels = data.map(item => item.month);
    const values = data.map(item => item.revenue);
    
    // Destroy existing chart if exists / លុបគំនូសតាងចាស់ប្រសិនបើមាន
    if (window.revenueChartInstance) {
        window.revenueChartInstance.destroy();
    }
    
    // Create new chart / បង្កើតគំនូសតាងថ្មី
    window.revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'ប្រាក់ចំណូល (រៀល)',
                data: values,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'ប្រាក់ចំណូល: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create province chart
 * បង្កើតគំនូសតាងខេត្ត
 */
function createProvinceChart(data) {
    const ctx = document.getElementById('provinceChart');
    if (!ctx) return;
    
    // Prepare data / រៀបចំទិន្នន័យ
    const labels = data.map(item => item.province);
    const values = data.map(item => item.count);
    
    // Destroy existing chart if exists / លុបគំនូសតាងចាស់ប្រសិនបើមាន
    if (window.provinceChartInstance) {
        window.provinceChartInstance.destroy();
    }
    
    // Create new chart / បង្កើតគំនូសតាងថ្មី
    window.provinceChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'ចំនួនវត្ត',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Load recent activities
 * ផ្ទុកសកម្មភាពថ្មីៗ
 */
async function loadRecentActivities() {
    try {
        const container = document.getElementById('recentActivities');
        if (!container) return;
        
        // Show loading / បង្ហាញកំពុងផ្ទុក
        container.innerHTML = '<div class="text-center py-3"><div class="spinner-border" role="status"></div></div>';
        
        // Fetch activities / យកសកម្មភាព
        const response = await apiRequest('/api/reports/activities?limit=10');
        
        if (response.success && response.data.length > 0) {
            // Display activities / បង្ហាញសកម្មភាព
            const html = response.data.map(activity => `
                <div class="activity-item border-bottom pb-2 mb-2">
                    <div class="d-flex justify-content-between">
                        <span class="activity-text">${escapeHtml(activity.description)}</span>
                        <small class="text-muted">${formatDate(activity.created_at)}</small>
                    </div>
                    <small class="text-muted">ដោយ: ${escapeHtml(activity.user_name)}</small>
                </div>
            `).join('');
            
            container.innerHTML = html;
        } else {
            container.innerHTML = '<p class="text-center text-muted">មិនមានសកម្មភាពថ្មីៗទេ</p>';
        }
    } catch (error) {
        console.error('Error loading activities:', error);
        const container = document.getElementById('recentActivities');
        if (container) {
            container.innerHTML = '<p class="text-center text-danger">មានបញ្ហាក្នុងការផ្ទុកសកម្មភាព</p>';
        }
    }
}

/**
 * Setup event listeners
 * ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
 */
function setupEventListeners() {
    // Logout button / ប៊ូតុងចាកចេញ
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }
    
    // Refresh stats button / ប៊ូតុងផ្ទុកស្ថិតិម្តងទៀត
    const refreshBtn = document.getElementById('refreshStats');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            await loadDashboardStats();
            showToast('បានផ្ទុកស្ថិតិម្តងទៀតហើយ', 'success');
        });
    }
}

/**
 * Escape HTML to prevent XSS
 * គេចពី HTML ដើម្បីការពារ XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
