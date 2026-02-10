// reports.js - Reports display and generation
// ឯកសារសម្រាប់បង្ហាញនិងបង្កើតរបាយការណ៍

// Global variables / អថេរសកល
let currentReportType = 'monthly';
let currentChart = null;

// Wait for DOM to load / រង់ចាំផ្ទុកទំព័រ
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication / ពិនិត្យការផ្ទៀងផ្ទាត់
    if (!requireAuth()) return;
    
    // Initialize reports / ចាប់ផ្តើមរបាយការណ៍
    initReports();
    
    // Setup event listeners / ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
    setupEventListeners();
});

/**
 * Initialize reports
 * ចាប់ផ្តើមរបាយការណ៍
 */
async function initReports() {
    try {
        // Set default dates / កំណត់កាលបរិច្ឆេទលំនាំដើម
        setDefaultDates();
        
        // Load default report / ផ្ទុករបាយការណ៍លំនាំដើម
        await loadReport();
        
    } catch (error) {
        console.error('Reports initialization error:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុករបាយការណ៍', 'error');
    }
}

/**
 * Set default dates for filters
 * កំណត់កាលបរិច្ឆេទលំនាំដើមសម្រាប់តម្រង
 */
function setDefaultDates() {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startDateInput = document.getElementById('reportStartDate');
    const endDateInput = document.getElementById('reportEndDate');
    
    if (startDateInput) {
        startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
    }
    if (endDateInput) {
        endDateInput.value = today.toISOString().split('T')[0];
    }
}

/**
 * Setup event listeners
 * ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
 */
function setupEventListeners() {
    // Report type selection / ការជ្រើសរើសប្រភេទរបាយការណ៍
    const reportTypeSelect = document.getElementById('reportType');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', function() {
            currentReportType = this.value;
            loadReport();
        });
    }
    
    // Generate report button / ប៊ូតុងបង្កើតរបាយការណ៍
    const generateBtn = document.getElementById('generateReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', loadReport);
    }
    
    // Export buttons / ប៊ូតុងនាំចេញ
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => exportReport('pdf'));
    }
    
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => exportReport('csv'));
    }
}

/**
 * Load report based on type
 * ផ្ទុករបាយការណ៍ដោយផ្អែកលើប្រភេទ
 */
async function loadReport() {
    const reportType = currentReportType;
    
    switch (reportType) {
        case 'monthly':
            await loadMonthlyReport();
            break;
        case 'yearly':
            await loadYearlyReport();
            break;
        case 'pagoda_status':
            await loadPagodaStatusReport();
            break;
        case 'revenue':
            await loadRevenueReport();
            break;
        default:
            await loadMonthlyReport();
    }
}

/**
 * Load monthly report
 * ផ្ទុករបាយការណ៍ប្រចាំខែ
 */
async function loadMonthlyReport() {
    try {
        showReportLoading();
        
        const startDate = document.getElementById('reportStartDate')?.value;
        const endDate = document.getElementById('reportEndDate')?.value;
        
        const params = new URLSearchParams({
            type: 'monthly',
            start_date: startDate,
            end_date: endDate
        });
        
        const response = await apiRequest(`/api/reports/monthly?${params}`);
        
        if (response.success) {
            displayMonthlyReport(response.data);
        } else {
            showToast('មិនអាចផ្ទុករបាយការណ៍បានទេ', 'error');
        }
    } catch (error) {
        console.error('Error loading monthly report:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុករបាយការណ៍', 'error');
    }
}

/**
 * Display monthly report
 * បង្ហាញរបាយការណ៍ប្រចាំខែ
 */
function displayMonthlyReport(data) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    // Display summary / បង្ហាញសង្ខេប
    let html = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h6 class="card-title">គោលនយោបាយថ្មី</h6>
                        <h3 class="text-primary">${data.new_policies || 0}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h6 class="card-title">ប្រាក់ចំណូល</h6>
                        <h3 class="text-success">${formatCurrency(data.total_revenue || 0)}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h6 class="card-title">ទូទាត់សរុប</h6>
                        <h3 class="text-info">${data.total_payments || 0}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h6 class="card-title">វត្តថ្មី</h6>
                        <h3 class="text-warning">${data.new_pagodas || 0}</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Display chart / បង្ហាញគំនូសតាង
    html += `
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0">ប្រាក់ចំណូលប្រចាំថ្ងៃ</h5>
            </div>
            <div class="card-body">
                <canvas id="monthlyReportChart" height="80"></canvas>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Create chart / បង្កើតគំនូសតាង
    if (data.daily_revenue && data.daily_revenue.length > 0) {
        createMonthlyChart(data.daily_revenue);
    }
}

/**
 * Create monthly chart
 * បង្កើតគំនូសតាងប្រចាំខែ
 */
function createMonthlyChart(data) {
    const ctx = document.getElementById('monthlyReportChart');
    if (!ctx) return;
    
    const labels = data.map(item => formatDate(item.date));
    const values = data.map(item => item.revenue);
    
    // Destroy existing chart / លុបគំនូសតាងចាស់
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Create new chart / បង្កើតគំនូសតាងថ្មី
    currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'ប្រាក់ចំណូល (រៀល)',
                data: values,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
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
 * Load yearly report
 * ផ្ទុករបាយការណ៍ប្រចាំឆ្នាំ
 */
async function loadYearlyReport() {
    try {
        showReportLoading();
        
        const year = document.getElementById('reportYear')?.value || new Date().getFullYear();
        
        const response = await apiRequest(`/api/reports/yearly?year=${year}`);
        
        if (response.success) {
            displayYearlyReport(response.data);
        } else {
            showToast('មិនអាចផ្ទុករបាយការណ៍បានទេ', 'error');
        }
    } catch (error) {
        console.error('Error loading yearly report:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុករបាយការណ៍', 'error');
    }
}

/**
 * Display yearly report
 * បង្ហាញរបាយការណ៍ប្រចាំឆ្នាំ
 */
function displayYearlyReport(data) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    let html = `
        <div class="row mb-4">
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h6 class="card-title">ប្រាក់ចំណូលសរុប</h6>
                        <h3 class="text-success">${formatCurrency(data.total_revenue || 0)}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h6 class="card-title">គោលនយោបាយសរុប</h6>
                        <h3 class="text-primary">${data.total_policies || 0}</h3>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card text-center">
                    <div class="card-body">
                        <h6 class="card-title">វត្តសរុប</h6>
                        <h3 class="text-info">${data.total_pagodas || 0}</h3>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">ប្រាក់ចំណូលប្រចាំខែ</h5>
            </div>
            <div class="card-body">
                <canvas id="yearlyReportChart" height="80"></canvas>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Create chart / បង្កើតគំនូសតាង
    if (data.monthly_revenue && data.monthly_revenue.length > 0) {
        createYearlyChart(data.monthly_revenue);
    }
}

/**
 * Create yearly chart
 * បង្កើតគំនូសតាងប្រចាំឆ្នាំ
 */
function createYearlyChart(data) {
    const ctx = document.getElementById('yearlyReportChart');
    if (!ctx) return;
    
    const monthNames = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
    const labels = data.map(item => monthNames[item.month - 1]);
    const values = data.map(item => item.revenue);
    
    // Destroy existing chart / លុបគំនូសតាងចាស់
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Create new chart / បង្កើតគំនូសតាងថ្មី
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'ប្រាក់ចំណូល (រៀល)',
                data: values,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgb(54, 162, 235)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
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
 * Load pagoda status report
 * ផ្ទុករបាយការណ៍ស្ថានភាពវត្ត
 */
async function loadPagodaStatusReport() {
    try {
        showReportLoading();
        
        const response = await apiRequest('/api/reports/pagoda-status');
        
        if (response.success) {
            displayPagodaStatusReport(response.data);
        } else {
            showToast('មិនអាចផ្ទុករបាយការណ៍បានទេ', 'error');
        }
    } catch (error) {
        console.error('Error loading pagoda status report:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុករបាយការណ៍', 'error');
    }
}

/**
 * Display pagoda status report
 * បង្ហាញរបាយការណ៍ស្ថានភាពវត្ត
 */
function displayPagodaStatusReport(data) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    let html = `
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0">វត្តតាមខេត្ត</h5>
            </div>
            <div class="card-body">
                <canvas id="provinceChart" height="100"></canvas>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">វត្តតាមស្ថានភាព</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <canvas id="statusPieChart" height="80"></canvas>
                    </div>
                    <div class="col-md-6">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ស្ថានភាព</th>
                                    <th class="text-end">ចំនួន</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>វត្តសកម្ម</td>
                                    <td class="text-end">${data.active_count || 0}</td>
                                </tr>
                                <tr>
                                    <td>វត្តអសកម្ម</td>
                                    <td class="text-end">${data.inactive_count || 0}</td>
                                </tr>
                                <tr class="table-primary">
                                    <th>សរុប</th>
                                    <th class="text-end">${data.total_count || 0}</th>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Create charts / បង្កើតគំនូសតាង
    if (data.by_province && data.by_province.length > 0) {
        createProvinceBarChart(data.by_province);
    }
    
    createStatusPieChart(data.active_count || 0, data.inactive_count || 0);
}

/**
 * Create province bar chart
 * បង្កើតគំនូសតាងរបារខេត្ត
 */
function createProvinceBarChart(data) {
    const ctx = document.getElementById('provinceChart');
    if (!ctx) return;
    
    const labels = data.map(item => item.province);
    const values = data.map(item => item.count);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'ចំនួនវត្ត',
                data: values,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
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
 * Create status pie chart
 * បង្កើតគំនូសតាងរង្វង់ស្ថានភាព
 */
function createStatusPieChart(active, inactive) {
    const ctx = document.getElementById('statusPieChart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['សកម្ម', 'អសកម្ម'],
            datasets: [{
                data: [active, inactive],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(255, 99, 132, 0.5)'
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 99, 132)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Load revenue report
 * ផ្ទុករបាយការណ៍ប្រាក់ចំណូល
 */
async function loadRevenueReport() {
    try {
        showReportLoading();
        
        const startDate = document.getElementById('reportStartDate')?.value;
        const endDate = document.getElementById('reportEndDate')?.value;
        
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate
        });
        
        const response = await apiRequest(`/api/reports/revenue?${params}`);
        
        if (response.success) {
            displayRevenueReport(response.data);
        } else {
            showToast('មិនអាចផ្ទុករបាយការណ៍បានទេ', 'error');
        }
    } catch (error) {
        console.error('Error loading revenue report:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុករបាយការណ៍', 'error');
    }
}

/**
 * Display revenue report
 * បង្ហាញរបាយការណ៍ប្រាក់ចំណូល
 */
function displayRevenueReport(data) {
    const container = document.getElementById('reportContent');
    if (!container) return;
    
    let html = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">សង្ខេបប្រាក់ចំណូល</h5>
            </div>
            <div class="card-body">
                <div class="row text-center mb-4">
                    <div class="col-md-4">
                        <h6>ប្រាក់ចំណូលសរុប</h6>
                        <h3 class="text-success">${formatCurrency(data.total_revenue || 0)}</h3>
                    </div>
                    <div class="col-md-4">
                        <h6>ចំនួនទូទាត់</h6>
                        <h3 class="text-info">${data.payment_count || 0}</h3>
                    </div>
                    <div class="col-md-4">
                        <h6>មធ្យមភាគ</h6>
                        <h3 class="text-primary">${formatCurrency(data.average_payment || 0)}</h3>
                    </div>
                </div>
                
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>វិធីទូទាត់</th>
                            <th class="text-end">ចំនួនទឹកប្រាក់</th>
                            <th class="text-end">ភាគរយ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.by_method?.map(item => `
                            <tr>
                                <td>${getPaymentMethodName(item.method)}</td>
                                <td class="text-end">${formatCurrency(item.amount)}</td>
                                <td class="text-end">${item.percentage}%</td>
                            </tr>
                        `).join('') || '<tr><td colspan="3" class="text-center">មិនមានទិន្នន័យ</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Get payment method name
 * យកឈ្មោះវិធីទូទាត់
 */
function getPaymentMethodName(method) {
    const names = {
        'cash': 'សាច់ប្រាក់',
        'bank_transfer': 'ផ្ទេរធនាគារ',
        'check': 'មូលប្បទានប័ត្រ'
    };
    return names[method] || method;
}

/**
 * Show report loading state
 * បង្ហាញស្ថានភាពកំពុងផ្ទុករបាយការណ៍
 */
function showReportLoading() {
    const container = document.getElementById('reportContent');
    if (container) {
        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border" role="status"></div><p class="mt-3">កំពុងផ្ទុករបាយការណ៍...</p></div>';
    }
}

/**
 * Export report
 * នាំចេញរបាយការណ៍
 */
async function exportReport(format) {
    try {
        showToast(`កំពុងនាំចេញរបាយការណ៍ជា ${format.toUpperCase()}...`, 'info');
        
        if (format === 'pdf') {
            await exportToPDF();
        } else if (format === 'csv') {
            await exportToCSV();
        }
        
        showToast('នាំចេញរបាយការណ៍ជោគជ័យ', 'success');
    } catch (error) {
        console.error('Error exporting report:', error);
        showToast('មានបញ្ហាក្នុងការនាំចេញរបាយការណ៍', 'error');
    }
}

/**
 * Export report to PDF
 * នាំចេញរបាយការណ៍ទៅ PDF
 */
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title / បន្ថែមចំណងជើង
    doc.setFontSize(16);
    doc.text('របាយការណ៍ប្រព័ន្ធធានារ៉ាប់រងភ្លើងវត្ត', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`ប្រភេទរបាយការណ៍: ${getReportTypeName(currentReportType)}`, 20, 35);
    doc.text(`កាលបរិច្ឆេទ: ${formatDate(new Date())}`, 20, 45);
    
    // Add content from report / បន្ថែមមាតិកាពីរបាយការណ៍
    // This would need to be customized based on the report type
    
    // Save PDF / រក្សាទុក PDF
    doc.save(`report-${currentReportType}-${Date.now()}.pdf`);
}

/**
 * Export report to CSV
 * នាំចេញរបាយការណ៍ទៅ CSV
 */
async function exportToCSV() {
    // This would need to fetch the data and convert to CSV format
    // For now, showing a placeholder implementation
    
    let csv = 'Report Type,Date\n';
    csv += `${currentReportType},${new Date().toISOString()}\n`;
    
    // Create download link / បង្កើតតំណទាញយក
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${currentReportType}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Get report type name in Khmer
 * យកឈ្មោះប្រភេទរបាយការណ៍ជាភាសាខ្មែរ
 */
function getReportTypeName(type) {
    const names = {
        'monthly': 'របាយការណ៍ប្រចាំខែ',
        'yearly': 'របាយការណ៍ប្រចាំឆ្នាំ',
        'pagoda_status': 'របាយការណ៍ស្ថានភាពវត្ត',
        'revenue': 'របាយការណ៍ប្រាក់ចំណូល'
    };
    return names[type] || type;
}
