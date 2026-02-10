// utils.js - Utility Functions
// មុខងារឧបករណ៍ប្រើប្រាស់

// API Base URL
const API_BASE_URL = '/api';

// Get auth token from localStorage
// ទទួលបាន token ពី localStorage
function getAuthToken() {
  return localStorage.getItem('token');
}

// Set auth token in localStorage
// រក្សាទុក token ក្នុង localStorage
function setAuthToken(token) {
  localStorage.setItem('token', token);
}

// Remove auth token from localStorage
// លុប token ពី localStorage
function removeAuthToken() {
  localStorage.removeItem('token');
}

// Get current user from localStorage
// ទទួលបានអ្នកប្រើប្រាស់បច្ចុប្បន្នពី localStorage
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Set current user in localStorage
// រក្សាទុកអ្នកប្រើប្រាស់បច្ចុប្បន្នក្នុង localStorage
function setCurrentUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Remove current user from localStorage
// លុបអ្នកប្រើប្រាស់បច្ចុប្បន្នពី localStorage
function removeCurrentUser() {
  localStorage.removeItem('user');
}

// Make authenticated API request
// ធ្វើសំណើ API ដោយមានការផ្ទៀងផ្ទាត់
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    // Handle unauthorized (token expired or invalid)
    if (response.status === 401) {
      removeAuthToken();
      removeCurrentUser();
      window.location.href = '/index.html';
      return null;
    }

    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    console.error('API Request Error:', error);
    showToast('Network error / កំហុសបណ្តាញ', 'danger');
    return {
      success: false,
      error: error.message
    };
  }
}

// Show toast notification
// បង្ហាញការជូនដំណឹង
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toastId = 'toast-' + Date.now();
  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  `;
  
  toastContainer.insertAdjacentHTML('beforeend', toastHTML);
  
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
  toast.show();
  
  // Remove toast element after it's hidden
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

// Create toast container if it doesn't exist
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container position-fixed top-0 end-0 p-3';
  document.body.appendChild(container);
  return container;
}

// Show loading spinner
// បង្ហាញកង់បង្វិល loading
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `
      <div class="spinner-container">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
  }
}

// Hide loading spinner
// លាក់កង់បង្វិល loading
function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = '';
  }
}

// Format date to Khmer format
// ទ្រង់ទ្រាយកាលបរិច្ឆេទជាទម្រង់ខ្មែរ
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('km-KH', options);
}

// Format date to YYYY-MM-DD
// ទ្រង់ទ្រាយកាលបរិច្ឆេទជា YYYY-MM-DD
function formatDateISO(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Format currency
// ទ្រង់ទ្រាយរូបិយប័ណ្ណ
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Format phone number
// ទ្រង់ទ្រាយលេខទូរស័ព្ទ
function formatPhone(phone) {
  if (!phone) return '-';
  // Format Cambodian phone number
  phone = phone.replace(/\D/g, '');
  if (phone.startsWith('855')) {
    return '+855 ' + phone.slice(3, 5) + ' ' + phone.slice(5);
  } else if (phone.startsWith('0')) {
    return phone.slice(0, 3) + ' ' + phone.slice(3, 6) + ' ' + phone.slice(6);
  }
  return phone;
}

// Check if user is authenticated
// ពិនិត្យមើលថាតើអ្នកប្រើប្រាស់បានផ្ទៀងផ្ទាត់
function isAuthenticated() {
  return !!getAuthToken();
}

// Check user role
// ពិនិត្យតួនាទីអ្នកប្រើប្រាស់
function hasRole(role) {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  return user.role === role;
}

// Redirect if not authenticated
// បញ្ជូនបន្តទៅទំព័រ login ប្រសិនបើមិនបានផ្ទៀងផ្ទាត់
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

// Logout user
// ចេញពីគណនី
async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    removeAuthToken();
    removeCurrentUser();
    window.location.href = '/index.html';
  }
}

// Confirm action
// បញ្ជាក់សកម្មភាព
function confirmAction(message) {
  return confirm(message);
}

// Debounce function for search
// មុខងារ debounce សម្រាប់ការស្វែងរក
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Get query parameter from URL
// ទទួលបាន parameter ពី URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Set query parameter in URL
// កំណត់ parameter ក្នុង URL
function setQueryParam(param, value) {
  const url = new URL(window.location);
  url.searchParams.set(param, value);
  window.history.pushState({}, '', url);
}

// Validate email format
// ផ្ទៀងផ្ទាត់ទ្រង់ទ្រាយអ៊ីមែល
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone format (Cambodian)
// ផ្ទៀងផ្ទាត់ទ្រង់ទ្រាយលេខទូរស័ព្ទ (កម្ពុជា)
function isValidPhone(phone) {
  const phoneRegex = /^(\+855|0)[1-9]\d{7,8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Get status badge class
// ទទួលបាន class សម្រាប់ badge ស្ថានភាព
function getStatusBadgeClass(status) {
  const statusMap = {
    'active': 'bg-success',
    'expired': 'bg-danger',
    'cancelled': 'bg-secondary',
    'pending': 'bg-warning',
    'sent': 'bg-success',
    'failed': 'bg-danger',
    'paid': 'bg-success',
    'unpaid': 'bg-warning',
    'overdue': 'bg-danger'
  };
  return statusMap[status] || 'bg-secondary';
}

// Translate status to Khmer
// បកប្រែស្ថានភាពជាភាសាខ្មែរ
function translateStatus(status) {
  const translations = {
    'active': 'សកម្ម',
    'expired': 'ផុតកំណត់',
    'cancelled': 'បានបោះបង់',
    'pending': 'រងចាំ',
    'sent': 'បានផ្ញើ',
    'failed': 'បរាជ័យ',
    'paid': 'បានបង់',
    'unpaid': 'មិនទាន់បង់',
    'overdue': 'ហួសកំណត់',
    'small': 'តូច',
    'medium': 'មធ្យម',
    'large': 'ធំ',
    'dhammayut': 'ធម្មយុត្តិកៈ',
    'mahanikay': 'មហានិកាយ',
    'chief': 'អធិការ',
    'deputy': 'អនុអធិការ',
    'monk': 'ព្រះសង្ឃ',
    'admin': 'អ្នកគ្រប់គ្រង',
    'staff': 'បុគ្គលិក',
    'viewer': 'អ្នកមើល'
  };
  return translations[status] || status;
}

// Export functions (for use in other modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAuthToken,
    setAuthToken,
    removeAuthToken,
    getCurrentUser,
    setCurrentUser,
    removeCurrentUser,
    apiRequest,
    showToast,
    showLoading,
    hideLoading,
    formatDate,
    formatDateISO,
    formatCurrency,
    formatPhone,
    isAuthenticated,
    hasRole,
    requireAuth,
    logout,
    confirmAction,
    debounce,
    getQueryParam,
    setQueryParam,
    isValidEmail,
    isValidPhone,
    getStatusBadgeClass,
    translateStatus
  };
}
