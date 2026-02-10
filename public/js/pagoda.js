// pagoda.js - Pagoda management
// ឯកសារសម្រាប់គ្រប់គ្រងវត្ត

// Global variables / អថេរសកល
let currentPage = 1;
let totalPages = 1;
let currentFilters = {};

// Wait for DOM to load / រង់ចាំផ្ទុកទំព័រ
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication / ពិនិត្យការផ្ទៀងផ្ទាត់
    if (!requireAuth()) return;
    
    // Initialize pagoda management / ចាប់ផ្តើមគ្រប់គ្រងវត្ត
    initPagodaManagement();
    
    // Setup event listeners / ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
    setupEventListeners();
});

/**
 * Initialize pagoda management
 * ចាប់ផ្តើមគ្រប់គ្រងវត្ត
 */
async function initPagodaManagement() {
    try {
        // Load pagodas list / ផ្ទុកបញ្ជីវត្ត
        await loadPagodas();
        
    } catch (error) {
        console.error('Pagoda management initialization error:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យវត្ត', 'error');
    }
}

/**
 * Load pagodas list with filters
 * ផ្ទុកបញ្ជីវត្តជាមួយតម្រង
 */
async function loadPagodas(page = 1) {
    try {
        const tbody = document.getElementById('pagodaTableBody');
        if (!tbody) return;
        
        // Show loading state / បង្ហាញស្ថានភាពកំពុងផ្ទុក
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
        
        // Build query parameters / បង្កើតប៉ារ៉ាម៉ែត្រសំណួរ
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilters
        });
        
        // Fetch pagodas / យកទិន្នន័យវត្ត
        const response = await apiRequest(`/api/pagodas?${params}`);
        
        if (response.success) {
            const pagodas = response.data;
            currentPage = response.pagination.page;
            totalPages = response.pagination.totalPages;
            
            if (pagodas.length > 0) {
                // Display pagodas / បង្ហាញវត្ត
                const html = pagodas.map((pagoda, index) => `
                    <tr>
                        <td>${(currentPage - 1) * 10 + index + 1}</td>
                        <td>${escapeHtml(pagoda.name)}</td>
                        <td>${escapeHtml(pagoda.province)}</td>
                        <td>${escapeHtml(pagoda.district)}</td>
                        <td>${escapeHtml(pagoda.abbot_name)}</td>
                        <td>
                            <span class="badge bg-${pagoda.status === 'active' ? 'success' : 'secondary'}">
                                ${pagoda.status === 'active' ? 'សកម្ម' : 'អសកម្ម'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="viewPagoda(${pagoda.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${hasPermission('edit_pagodas') ? `
                                <button class="btn btn-sm btn-warning" onclick="editPagoda(${pagoda.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                            ` : ''}
                            ${hasPermission('delete_pagodas') ? `
                                <button class="btn btn-sm btn-danger" onclick="deletePagoda(${pagoda.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `).join('');
                
                tbody.innerHTML = html;
                
                // Update pagination / ធ្វើបច្ចុប្បន្នភាពទំព័រ
                updatePagination();
            } else {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">មិនមានទិន្នន័យវត្ត</td></tr>';
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ</td></tr>';
        }
    } catch (error) {
        console.error('Error loading pagodas:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកបញ្ជីវត្ត', 'error');
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
            <a class="page-link" href="#" onclick="loadPagodas(${currentPage - 1}); return false;">មុន</a>
        </li>
    `;
    
    // Page numbers / លេខទំព័រ
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="loadPagodas(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // Next button / ប៊ូតុងបន្ទាប់
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadPagodas(${currentPage + 1}); return false;">បន្ទាប់</a>
        </li>
    `;
    
    pagination.innerHTML = html;
}

/**
 * View pagoda details
 * មើលព័ត៌មានលម្អិតវត្ត
 */
async function viewPagoda(id) {
    try {
        // Fetch pagoda details / យកព័ត៌មានលម្អិតវត្ត
        const response = await apiRequest(`/api/pagodas/${id}`);
        
        if (response.success) {
            const pagoda = response.data;
            
            // Display in modal / បង្ហាញក្នុង modal
            const modalBody = document.getElementById('pagodaDetailsBody');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <strong>ឈ្មោះវត្ត:</strong><br>
                            ${escapeHtml(pagoda.name)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ខេត្ត:</strong><br>
                            ${escapeHtml(pagoda.province)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ស្រុក/ខណ្ឌ:</strong><br>
                            ${escapeHtml(pagoda.district)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ឈ្មោះអាចារ្យ:</strong><br>
                            ${escapeHtml(pagoda.abbot_name)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>លេខទូរសព្ទ:</strong><br>
                            ${escapeHtml(pagoda.phone || 'មិនមាន')}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ស្ថានភាព:</strong><br>
                            <span class="badge bg-${pagoda.status === 'active' ? 'success' : 'secondary'}">
                                ${pagoda.status === 'active' ? 'សកម្ម' : 'អសកម្ម'}
                            </span>
                        </div>
                        <div class="col-12 mb-3">
                            <strong>អាសយដ្ឋាន:</strong><br>
                            ${escapeHtml(pagoda.address || 'មិនមាន')}
                        </div>
                        <div class="col-12 mb-3">
                            <strong>កំណត់ចំណាំ:</strong><br>
                            ${escapeHtml(pagoda.notes || 'មិនមាន')}
                        </div>
                    </div>
                `;
                
                // Show modal / បង្ហាញ modal
                const modal = new bootstrap.Modal(document.getElementById('pagodaDetailsModal'));
                modal.show();
            }
        } else {
            showToast('មិនអាចផ្ទុកព័ត៌មានវត្តបានទេ', 'error');
        }
    } catch (error) {
        console.error('Error viewing pagoda:', error);
        showToast('មានបញ្ហាក្នុងការមើលព័ត៌មានវត្ត', 'error');
    }
}

/**
 * Edit pagoda
 * កែប្រែវត្ត
 */
async function editPagoda(id) {
    try {
        // Fetch pagoda details / យកព័ត៌មានវត្ត
        const response = await apiRequest(`/api/pagodas/${id}`);
        
        if (response.success) {
            const pagoda = response.data;
            
            // Populate form / បំពេញទម្រង់
            document.getElementById('pagodaId').value = pagoda.id;
            document.getElementById('pagodaName').value = pagoda.name;
            document.getElementById('pagodaProvince').value = pagoda.province;
            document.getElementById('pagodaDistrict').value = pagoda.district;
            document.getElementById('pagodaAbbotName').value = pagoda.abbot_name;
            document.getElementById('pagodaPhone').value = pagoda.phone || '';
            document.getElementById('pagodaAddress').value = pagoda.address || '';
            document.getElementById('pagodaStatus').value = pagoda.status;
            document.getElementById('pagodaNotes').value = pagoda.notes || '';
            
            // Show modal / បង្ហាញ modal
            const modal = new bootstrap.Modal(document.getElementById('pagodaFormModal'));
            modal.show();
        }
    } catch (error) {
        console.error('Error loading pagoda for edit:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ', 'error');
    }
}

/**
 * Delete pagoda
 * លុបវត្ត
 */
async function deletePagoda(id) {
    if (!confirm('តើអ្នកពិតជាចង់លុបវត្តនេះមែនទេ?')) {
        return;
    }
    
    try {
        const response = await apiRequest(`/api/pagodas/${id}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showToast('លុបវត្តជោគជ័យ', 'success');
            await loadPagodas(currentPage);
        } else {
            showToast(response.message || 'មិនអាចលុបវត្តបានទេ', 'error');
        }
    } catch (error) {
        console.error('Error deleting pagoda:', error);
        showToast('មានបញ្ហាក្នុងការលុបវត្ត', 'error');
    }
}

/**
 * Setup event listeners
 * ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
 */
function setupEventListeners() {
    // Search input / ប្រអប់ស្វែងរក
    const searchInput = document.getElementById('searchPagoda');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            currentFilters.search = this.value;
            loadPagodas(1);
        }, 500));
    }
    
    // Province filter / តម្រងខេត្ត
    const provinceFilter = document.getElementById('filterProvince');
    if (provinceFilter) {
        provinceFilter.addEventListener('change', function() {
            currentFilters.province = this.value;
            loadPagodas(1);
        });
    }
    
    // Status filter / តម្រងស្ថានភាព
    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            currentFilters.status = this.value;
            loadPagodas(1);
        });
    }
    
    // Add pagoda button / ប៊ូតុងបន្ថែមវត្ត
    const addBtn = document.getElementById('addPagodaBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            document.getElementById('pagodaForm').reset();
            document.getElementById('pagodaId').value = '';
            const modal = new bootstrap.Modal(document.getElementById('pagodaFormModal'));
            modal.show();
        });
    }
    
    // Pagoda form submission / ការបញ្ជូនទម្រង់វត្ត
    const pagodaForm = document.getElementById('pagodaForm');
    if (pagodaForm) {
        pagodaForm.addEventListener('submit', handlePagodaFormSubmit);
    }
}

/**
 * Handle pagoda form submission
 * គ្រប់គ្រងការបញ្ជូនទម្រង់វត្ត
 */
async function handlePagodaFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>កំពុងរក្សាទុក...';
        
        const id = document.getElementById('pagodaId').value;
        const data = {
            name: document.getElementById('pagodaName').value,
            province: document.getElementById('pagodaProvince').value,
            district: document.getElementById('pagodaDistrict').value,
            abbot_name: document.getElementById('pagodaAbbotName').value,
            phone: document.getElementById('pagodaPhone').value,
            address: document.getElementById('pagodaAddress').value,
            status: document.getElementById('pagodaStatus').value,
            notes: document.getElementById('pagodaNotes').value
        };
        
        const url = id ? `/api/pagodas/${id}` : '/api/pagodas';
        const method = id ? 'PUT' : 'POST';
        
        const response = await apiRequest(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        if (response.success) {
            showToast(id ? 'កែប្រែវត្តជោគជ័យ' : 'បន្ថែមវត្តជោគជ័យ', 'success');
            bootstrap.Modal.getInstance(document.getElementById('pagodaFormModal')).hide();
            await loadPagodas(currentPage);
        } else {
            showToast(response.message || 'មានបញ្ហាក្នុងការរក្សាទុក', 'error');
        }
    } catch (error) {
        console.error('Error saving pagoda:', error);
        showToast('មានបញ្ហាក្នុងការរក្សាទុក', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
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
