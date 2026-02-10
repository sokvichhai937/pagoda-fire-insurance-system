// payment.js - Payment processing
// ឯកសារសម្រាប់ដំណើរការទូទាត់

// Global variables / អថេរសកល
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

// Wait for DOM to load / រង់ចាំផ្ទុកទំព័រ
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication / ពិនិត្យការផ្ទៀងផ្ទាត់
    if (!requireAuth()) return;
    
    // Initialize payment management / ចាប់ផ្តើមគ្រប់គ្រងទូទាត់
    initPaymentManagement();
    
    // Setup event listeners / ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
    setupEventListeners();
});

/**
 * Initialize payment management
 * ចាប់ផ្តើមគ្រប់គ្រងទូទាត់
 */
async function initPaymentManagement() {
    try {
        // Load payments list / ផ្ទុកបញ្ជីទូទាត់
        await loadPayments();
        
        // Load policies for payment form / ផ្ទុកគោលនយោបាយសម្រាប់ទម្រង់ទូទាត់
        await loadPoliciesForPayment();
        
    } catch (error) {
        console.error('Payment management initialization error:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យទូទាត់', 'error');
    }
}

/**
 * Load payments list
 * ផ្ទុកបញ្ជីទូទាត់
 */
async function loadPayments(page = 1) {
    try {
        const tbody = document.getElementById('paymentsTableBody');
        if (!tbody) return;
        
        // Show loading state / បង្ហាញស្ថានភាពកំពុងផ្ទុក
        tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
        
        // Build query parameters / បង្កើតប៉ារ៉ាម៉ែត្រសំណួរ
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        // Fetch payments / យកទិន្នន័យទូទាត់
        const response = await apiRequest(`/api/payments?${params}`);
        
        if (response.success) {
            const payments = response.data;
            currentPage = response.pagination.page;
            totalPages = response.pagination.totalPages;
            
            if (payments.length > 0) {
                // Display payments / បង្ហាញទូទាត់
                const html = payments.map((payment, index) => `
                    <tr>
                        <td>${(currentPage - 1) * 10 + index + 1}</td>
                        <td>${payment.receipt_number}</td>
                        <td>${payment.policy_number}</td>
                        <td>${escapeHtml(payment.pagoda_name)}</td>
                        <td>${formatCurrency(payment.amount)}</td>
                        <td>${formatDate(payment.payment_date)}</td>
                        <td>
                            <span class="badge bg-${getPaymentMethodColor(payment.payment_method)}">
                                ${getPaymentMethodName(payment.payment_method)}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="viewPayment(${payment.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="generateReceipt(${payment.id})">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
                
                tbody.innerHTML = html;
                
                // Update pagination / ធ្វើបច្ចុប្បន្នភាពទំព័រ
                updatePagination();
            } else {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">មិនមានទិន្នន័យទូទាត់</td></tr>';
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ</td></tr>';
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកបញ្ជីទូទាត់', 'error');
    }
}

/**
 * Update pagination controls
 * ធ្វើបច្ចុប្បន្នភាពការគ្រប់គ្រងទំព័រ
 */
function updatePagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    let html = '';
    
    // Previous button / ប៊ូតុងមុន
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadPayments(${currentPage - 1}); return false;">មុន</a>
        </li>
    `;
    
    // Page numbers / លេខទំព័រ
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="loadPayments(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Next button / ប៊ូតុងបន្ទាប់
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadPayments(${currentPage + 1}); return false;">បន្ទាប់</a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

/**
 * Load policies for payment form
 * ផ្ទុកគោលនយោបាយសម្រាប់ទម្រង់ទូទាត់
 */
async function loadPoliciesForPayment() {
    try {
        const response = await apiRequest('/api/insurance/policies?status=active&limit=1000');
        
        if (response.success) {
            const policySelect = document.getElementById('policySelect');
            if (policySelect) {
                policySelect.innerHTML = '<option value="">ជ្រើសរើសគោលនយោបាយ</option>';
                response.data.forEach(policy => {
                    const option = document.createElement('option');
                    option.value = policy.id;
                    option.textContent = `${policy.policy_number} - ${policy.pagoda_name}`;
                    option.dataset.premium = policy.premium;
                    policySelect.appendChild(option);
                });
                
                // Auto-fill amount when policy is selected / បំពេញចំនួនទឹកប្រាក់ដោយស្វ័យប្រវត្តិនៅពេលជ្រើសរើសគោលនយោបាយ
                policySelect.addEventListener('change', function() {
                    const selectedOption = this.options[this.selectedIndex];
                    const premium = selectedOption.dataset.premium;
                    const amountInput = document.getElementById('paymentAmount');
                    if (amountInput && premium) {
                        amountInput.value = premium;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading policies:', error);
    }
}

/**
 * Setup event listeners
 * ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
 */
function setupEventListeners() {
    // Search input / ប្រអប់ស្វែងរក
    const searchInput = document.getElementById('searchPayment');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentFilters.search = this.value;
            loadPayments(1);
        }, 500));
    }
    
    // Payment method filter / តម្រងវិធីទូទាត់
    const methodFilter = document.getElementById('filterPaymentMethod');
    if (methodFilter) {
        methodFilter.addEventListener('change', function() {
            currentFilters.payment_method = this.value;
            loadPayments(1);
        });
    }
    
    // Date range filter / តម្រងចន្លោះកាលបរិច្ឆេទ
    const startDateFilter = document.getElementById('filterStartDate');
    const endDateFilter = document.getElementById('filterEndDate');
    if (startDateFilter && endDateFilter) {
        startDateFilter.addEventListener('change', function() {
            currentFilters.start_date = this.value;
            loadPayments(1);
        });
        endDateFilter.addEventListener('change', function() {
            currentFilters.end_date = this.value;
            loadPayments(1);
        });
    }
    
    // Record payment button / ប៊ូតុងកត់ត្រាទូទាត់
    const recordBtn = document.getElementById('recordPaymentBtn');
    if (recordBtn) {
        recordBtn.addEventListener('click', function() {
            document.getElementById('paymentForm').reset();
            const modal = new bootstrap.Modal(document.getElementById('paymentFormModal'));
            modal.show();
        });
    }
    
    // Payment form submission / ការបញ្ជូនទម្រង់ទូទាត់
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentFormSubmit);
    }
}

/**
 * Handle payment form submission
 * គ្រប់គ្រងការបញ្ជូនទម្រង់ទូទាត់
 */
async function handlePaymentFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>កំពុងរក្សាទុក...';
        
        // Get form data / យកទិន្នន័យពីទម្រង់
        const data = {
            policy_id: document.getElementById('policySelect').value,
            amount: parseFloat(document.getElementById('paymentAmount').value),
            payment_date: document.getElementById('paymentDate').value,
            payment_method: document.getElementById('paymentMethod').value,
            reference_number: document.getElementById('referenceNumber').value,
            notes: document.getElementById('paymentNotes').value
        };
        
        // Validate inputs / ពិនិត្យទិន្នន័យបញ្ចូល
        if (!data.policy_id || !data.amount || !data.payment_date || !data.payment_method) {
            showToast('សូមបំពេញព័ត៌មានចាំបាច់ទាំងអស់', 'warning');
            return;
        }
        
        // Call API / ហៅ API
        const response = await apiRequest('/api/payments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast('កត់ត្រាទូទាត់ជោគជ័យ', 'success');
            bootstrap.Modal.getInstance(document.getElementById('paymentFormModal')).hide();
            await loadPayments(currentPage);
        } else {
            showToast(response.message || 'មានបញ្ហាក្នុងការរក្សាទុក', 'error');
        }
    } catch (error) {
        console.error('Error recording payment:', error);
        showToast('មានបញ្ហាក្នុងការកត់ត្រាទូទាត់', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * View payment details
 * មើលព័ត៌មានលម្អិតទូទាត់
 */
async function viewPayment(id) {
    try {
        // Fetch payment details / យកព័ត៌មានលម្អិតទូទាត់
        const response = await apiRequest(`/api/payments/${id}`);
        
        if (response.success) {
            const payment = response.data;
            
            // Display in modal / បង្ហាញក្នុង modal
            const modalBody = document.getElementById('paymentDetailsBody');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <strong>លេខបង្កាន់ដៃ:</strong><br>
                            ${payment.receipt_number}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>លេខគោលនយោបាយ:</strong><br>
                            ${payment.policy_number}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>វត្ត:</strong><br>
                            ${escapeHtml(payment.pagoda_name)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ចំនួនទឹកប្រាក់:</strong><br>
                            ${formatCurrency(payment.amount)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>កាលបរិច្ឆេទទូទាត់:</strong><br>
                            ${formatDate(payment.payment_date)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>វិធីទូទាត់:</strong><br>
                            ${getPaymentMethodName(payment.payment_method)}
                        </div>
                        ${payment.reference_number ? `
                            <div class="col-md-6 mb-3">
                                <strong>លេខយោង:</strong><br>
                                ${escapeHtml(payment.reference_number)}
                            </div>
                        ` : ''}
                        <div class="col-md-6 mb-3">
                            <strong>កត់ត្រាដោយ:</strong><br>
                            ${escapeHtml(payment.recorded_by)}
                        </div>
                        ${payment.notes ? `
                            <div class="col-12 mb-3">
                                <strong>កំណត់ចំណាំ:</strong><br>
                                ${escapeHtml(payment.notes)}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                // Show modal / បង្ហាញ modal
                const modal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
                modal.show();
            }
        } else {
            showToast('មិនអាចផ្ទុកព័ត៌មានទូទាត់បានទេ', 'error');
        }
    } catch (error) {
        console.error('Error viewing payment:', error);
        showToast('មានបញ្ហាក្នុងការមើលព័ត៌មានទូទាត់', 'error');
    }
}

/**
 * Generate receipt PDF
 * បង្កើតបង្កាន់ដៃ PDF
 */
async function generateReceipt(id) {
    try {
        showToast('កំពុងបង្កើតបង្កាន់ដៃ...', 'info');
        
        // Fetch payment details / យកព័ត៌មានទូទាត់
        const response = await apiRequest(`/api/payments/${id}`);
        
        if (response.success) {
            const payment = response.data;
            
            // Generate PDF using jsPDF / បង្កើត PDF ដោយប្រើ jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add content / បន្ថែមមាតិកា
            doc.setFontSize(18);
            doc.text('បង្កាន់ដៃទូទាត់', 105, 20, { align: 'center' });
            doc.text('Payment Receipt', 105, 28, { align: 'center' });
            
            doc.setFontSize(12);
            let y = 45;
            
            doc.text(`Receipt Number: ${payment.receipt_number}`, 20, y);
            y += 10;
            doc.text(`Policy Number: ${payment.policy_number}`, 20, y);
            y += 10;
            doc.text(`Pagoda: ${payment.pagoda_name}`, 20, y);
            y += 10;
            doc.text(`Amount: ${formatCurrency(payment.amount)}`, 20, y);
            y += 10;
            doc.text(`Payment Date: ${formatDate(payment.payment_date)}`, 20, y);
            y += 10;
            doc.text(`Payment Method: ${getPaymentMethodName(payment.payment_method)}`, 20, y);
            
            if (payment.reference_number) {
                y += 10;
                doc.text(`Reference Number: ${payment.reference_number}`, 20, y);
            }
            
            y += 20;
            doc.setFontSize(10);
            doc.text(`Recorded by: ${payment.recorded_by}`, 20, y);
            y += 8;
            doc.text(`Date: ${formatDate(new Date())}`, 20, y);
            
            // Save PDF / រក្សាទុក PDF
            doc.save(`receipt-${payment.receipt_number}.pdf`);
            
            showToast('បង្កើតបង្កាន់ដៃជោគជ័យ', 'success');
        } else {
            showToast('មិនអាចបង្កើតបង្កាន់ដៃបានទេ', 'error');
        }
    } catch (error) {
        console.error('Error generating receipt:', error);
        showToast('មានបញ្ហាក្នុងការបង្កើតបង្កាន់ដៃ', 'error');
    }
}

/**
 * Get payment method color
 * យកពណ៌វិធីទូទាត់
 */
function getPaymentMethodColor(method) {
    const colors = {
        'cash': 'success',
        'bank_transfer': 'info',
        'check': 'warning'
    };
    return colors[method] || 'secondary';
}

/**
 * Get payment method name in Khmer
 * យកឈ្មោះវិធីទូទាត់ជាភាសាខ្មែរ
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
 * Debounce function
 * មុខងារពន្យារពេល
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Escape HTML
 * គេចពី HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
