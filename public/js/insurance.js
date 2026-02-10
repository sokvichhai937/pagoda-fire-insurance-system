// insurance.js - Insurance calculations and policy management
// ឯកសារសម្រាប់គណនាធានារ៉ាប់រងនិងគ្រប់គ្រងគោលនយោបាយ

// Wait for DOM to load / រង់ចាំផ្ទុកទំព័រ
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication / ពិនិត្យការផ្ទៀងផ្ទាត់
    if (!requireAuth()) return;
    
    // Initialize insurance management / ចាប់ផ្តើមគ្រប់គ្រងធានារ៉ាប់រង
    initInsuranceManagement();
    
    // Setup event listeners / ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
    setupEventListeners();
});

/**
 * Initialize insurance management
 * ចាប់ផ្តើមគ្រប់គ្រងធានារ៉ាប់រង
 */
async function initInsuranceManagement() {
    try {
        // Load pagodas for dropdown / ផ្ទុកវត្តសម្រាប់ dropdown
        await loadPagodasDropdown();
        
        // Load policies list if on policies page / ផ្ទុកបញ្ជីគោលនយោបាយប្រសិនបើនៅលើទំព័រគោលនយោបាយ
        if (document.getElementById('policiesTableBody')) {
            await loadPolicies();
        }
        
    } catch (error) {
        console.error('Insurance management initialization error:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យធានារ៉ាប់រង', 'error');
    }
}

/**
 * Load pagodas for dropdown
 * ផ្ទុកវត្តសម្រាប់ dropdown
 */
async function loadPagodasDropdown() {
    try {
        const response = await apiRequest('/api/pagodas?status=active&limit=1000');
        
        if (response.success) {
            const pagodaSelect = document.getElementById('pagodaSelect');
            if (pagodaSelect) {
                pagodaSelect.innerHTML = '<option value="">ជ្រើសរើសវត្ត</option>';
                response.data.forEach(pagoda => {
                    const option = document.createElement('option');
                    option.value = pagoda.id;
                    option.textContent = `${pagoda.name} - ${pagoda.province}`;
                    option.dataset.province = pagoda.province;
                    pagodaSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error loading pagodas:', error);
    }
}

/**
 * Setup event listeners
 * ដំឡើងកម្មវិធីស្តាប់ព្រឹត្តិការណ៍
 */
function setupEventListeners() {
    // Calculate insurance button / ប៊ូតុងគណនាធានារ៉ាប់រង
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', handleCalculate);
    }
    
    // Create policy button / ប៊ូតុងបង្កើតគោលនយោបាយ
    const createPolicyBtn = document.getElementById('createPolicyBtn');
    if (createPolicyBtn) {
        createPolicyBtn.addEventListener('click', handleCreatePolicy);
    }
    
    // Building type change / ប្តូរប្រភេទអាគារ
    const buildingType = document.getElementById('buildingType');
    if (buildingType) {
        buildingType.addEventListener('change', updateBuildingTypeInfo);
    }
    
    // Property value input / បញ្ចូលតម្លៃទ្រព្យសម្បត្តិ
    const propertyValue = document.getElementById('propertyValue');
    if (propertyValue) {
        propertyValue.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
}

/**
 * Update building type information
 * ធ្វើបច្ចុប្បន្នភាពព័ត៌មានប្រភេទអាគារ
 */
function updateBuildingTypeInfo() {
    const buildingType = document.getElementById('buildingType').value;
    const infoDiv = document.getElementById('buildingTypeInfo');
    
    if (!infoDiv) return;
    
    const rateInfo = {
        'concrete': 'អត្រា: 0.15% - អាគារបេតុងមានសុវត្ថិភាពខ្ពស់',
        'wood': 'អត្រា: 0.30% - អាគារឈើមានហានិភ័យកណ្តាល',
        'mixed': 'អត្រា: 0.20% - អាគារចម្រុះមានហានិភ័យមធ្យម'
    };
    
    infoDiv.innerHTML = `<small class="text-muted">${rateInfo[buildingType] || ''}</small>`;
}

/**
 * Handle insurance calculation
 * គ្រប់គ្រងការគណនាធានារ៉ាប់រង
 */
async function handleCalculate() {
    try {
        const calculateBtn = document.getElementById('calculateBtn');
        const originalText = calculateBtn.innerHTML;
        
        calculateBtn.disabled = true;
        calculateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>កំពុងគណនា...';
        
        // Get form data / យកទិន្នន័យពីទម្រង់
        const pagodaId = document.getElementById('pagodaSelect').value;
        const buildingType = document.getElementById('buildingType').value;
        const propertyValue = parseFloat(document.getElementById('propertyValue').value);
        const duration = parseInt(document.getElementById('duration').value);
        
        // Validate inputs / ពិនិត្យទិន្នន័យបញ្ចូល
        if (!pagodaId || !buildingType || !propertyValue || !duration) {
            showToast('សូមបំពេញព័ត៌មានទាំងអស់', 'warning');
            return;
        }
        
        if (propertyValue < 1000000) {
            showToast('តម្លៃទ្រព្យសម្បត្តិត្រូវតែលើសពី 1,000,000 រៀល', 'warning');
            return;
        }
        
        // Call calculate API / ហៅ API គណនា
        const response = await apiRequest('/api/insurance/calculate', {
            method: 'POST',
            body: JSON.stringify({
                pagoda_id: pagodaId,
                building_type: buildingType,
                property_value: propertyValue,
                duration: duration
            })
        });
        
        if (response.success) {
            displayCalculationResults(response.data);
            showToast('គណនាជោគជ័យ', 'success');
        } else {
            showToast(response.message || 'មានបញ្ហាក្នុងការគណនា', 'error');
        }
    } catch (error) {
        console.error('Calculation error:', error);
        showToast('មានបញ្ហាក្នុងការគណនាធានារ៉ាប់រង', 'error');
    } finally {
        const calculateBtn = document.getElementById('calculateBtn');
        calculateBtn.disabled = false;
        calculateBtn.innerHTML = 'គណនា';
    }
}

/**
 * Display calculation results
 * បង្ហាញលទ្ធផលគណនា
 */
function displayCalculationResults(data) {
    const resultsDiv = document.getElementById('calculationResults');
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = `
        <div class="card border-success">
            <div class="card-header bg-success text-white">
                <h5 class="mb-0">លទ្ធផលគណនា</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="text-muted">តម្លៃទ្រព្យសម្បត្តិ:</label>
                        <div class="h5">${formatCurrency(data.property_value)}</div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="text-muted">ប្រភេទអាគារ:</label>
                        <div class="h5">${getBuildingTypeName(data.building_type)}</div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="text-muted">អត្រាធានារ៉ាប់រង:</label>
                        <div class="h5">${data.rate}%</div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="text-muted">រយៈពេល:</label>
                        <div class="h5">${data.duration} ឆ្នាំ</div>
                    </div>
                    <div class="col-12">
                        <hr>
                        <label class="text-muted">ថ្លៃធានារ៉ាប់រងសរុប:</label>
                        <div class="h3 text-success">${formatCurrency(data.premium)}</div>
                    </div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-primary" id="createPolicyBtn">
                        <i class="fas fa-file-contract me-2"></i>បង្កើតគោលនយោបាយ
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Store calculation data / រក្សាទុកទិន្នន័យគណនា
    window.calculationData = data;
    
    // Setup create policy button / ដំឡើងប៊ូតុងបង្កើតគោលនយោបាយ
    document.getElementById('createPolicyBtn').addEventListener('click', handleCreatePolicy);
    
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Get building type name in Khmer
 * យកឈ្មោះប្រភេទអាគារជាភាសាខ្មែរ
 */
function getBuildingTypeName(type) {
    const names = {
        'concrete': 'អាគារបេតុង',
        'wood': 'អាគារឈើ',
        'mixed': 'អាគារចម្រុះ'
    };
    return names[type] || type;
}

/**
 * Handle create policy
 * គ្រប់គ្រងការបង្កើតគោលនយោបាយ
 */
async function handleCreatePolicy() {
    if (!window.calculationData) {
        showToast('សូមគណនាធានារ៉ាប់រងជាមុនសិន', 'warning');
        return;
    }
    
    if (!confirm('តើអ្នកពិតជាចង់បង្កើតគោលនយោបាយនេះមែនទេ?')) {
        return;
    }
    
    try {
        const response = await apiRequest('/api/insurance/policies', {
            method: 'POST',
            body: JSON.stringify({
                pagoda_id: window.calculationData.pagoda_id,
                building_type: window.calculationData.building_type,
                property_value: window.calculationData.property_value,
                duration: window.calculationData.duration,
                premium: window.calculationData.premium,
                rate: window.calculationData.rate
            })
        });
        
        if (response.success) {
            showToast('បង្កើតគោលនយោបាយជោគជ័យ', 'success');
            
            // Clear form and results / សម្អាតទម្រង់និងលទ្ធផល
            document.getElementById('calculatorForm').reset();
            document.getElementById('calculationResults').innerHTML = '';
            window.calculationData = null;
            
            // Redirect to policies page / ប្តូរទៅទំព័រគោលនយោបាយ
            setTimeout(() => {
                window.location.href = '/policies.html';
            }, 1500);
        } else {
            showToast(response.message || 'មិនអាចបង្កើតគោលនយោបាយបានទេ', 'error');
        }
    } catch (error) {
        console.error('Error creating policy:', error);
        showToast('មានបញ្ហាក្នុងការបង្កើតគោលនយោបាយ', 'error');
    }
}

/**
 * Load policies list
 * ផ្ទុកបញ្ជីគោលនយោបាយ
 */
async function loadPolicies(page = 1) {
    try {
        const tbody = document.getElementById('policiesTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
        
        const params = new URLSearchParams({
            page: page,
            limit: 10
        });
        
        const response = await apiRequest(`/api/insurance/policies?${params}`);
        
        if (response.success && response.data.length > 0) {
            const html = response.data.map((policy, index) => `
                <tr>
                    <td>${(page - 1) * 10 + index + 1}</td>
                    <td>${policy.policy_number}</td>
                    <td>${escapeHtml(policy.pagoda_name)}</td>
                    <td>${formatCurrency(policy.property_value)}</td>
                    <td>${formatCurrency(policy.premium)}</td>
                    <td>${formatDate(policy.start_date)}</td>
                    <td>${formatDate(policy.end_date)}</td>
                    <td>
                        <span class="badge bg-${getStatusColor(policy.status)}">
                            ${getStatusName(policy.status)}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-info" onclick="viewPolicy(${policy.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">មិនមានគោលនយោបាយ</td></tr>';
        }
    } catch (error) {
        console.error('Error loading policies:', error);
        showToast('មានបញ្ហាក្នុងការផ្ទុកបញ្ជីគោលនយោបាយ', 'error');
    }
}

/**
 * View policy details
 * មើលព័ត៌មានលម្អិតគោលនយោបាយ
 */
async function viewPolicy(id) {
    try {
        const response = await apiRequest(`/api/insurance/policies/${id}`);
        
        if (response.success) {
            const policy = response.data;
            
            const modalBody = document.getElementById('policyDetailsBody');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <strong>លេខគោលនយោបាយ:</strong><br>
                            ${policy.policy_number}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>វត្ត:</strong><br>
                            ${escapeHtml(policy.pagoda_name)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ប្រភេទអាគារ:</strong><br>
                            ${getBuildingTypeName(policy.building_type)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>តម្លៃទ្រព្យសម្បត្តិ:</strong><br>
                            ${formatCurrency(policy.property_value)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ថ្លៃធានារ៉ាប់រង:</strong><br>
                            ${formatCurrency(policy.premium)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>អត្រា:</strong><br>
                            ${policy.rate}%
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ថ្ងៃចាប់ផ្តើម:</strong><br>
                            ${formatDate(policy.start_date)}
                        </div>
                        <div class="col-md-6 mb-3">
                            <strong>ថ្ងៃបញ្ចប់:</strong><br>
                            ${formatDate(policy.end_date)}
                        </div>
                        <div class="col-12 mb-3">
                            <strong>ស្ថានភាព:</strong><br>
                            <span class="badge bg-${getStatusColor(policy.status)}">
                                ${getStatusName(policy.status)}
                            </span>
                        </div>
                    </div>
                `;
                
                const modal = new bootstrap.Modal(document.getElementById('policyDetailsModal'));
                modal.show();
            }
        }
    } catch (error) {
        console.error('Error viewing policy:', error);
        showToast('មានបញ្ហាក្នុងការមើលព័ត៌មានគោលនយោបាយ', 'error');
    }
}

/**
 * Get status color
 * យកពណ៌ស្ថានភាព
 */
function getStatusColor(status) {
    const colors = {
        'active': 'success',
        'expired': 'danger',
        'cancelled': 'secondary'
    };
    return colors[status] || 'secondary';
}

/**
 * Get status name in Khmer
 * យកឈ្មោះស្ថានភាពជាភាសាខ្មែរ
 */
function getStatusName(status) {
    const names = {
        'active': 'សកម្ម',
        'expired': 'ផុតកំណត់',
        'cancelled': 'បានបោះបង់'
    };
    return names[status] || status;
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
