-- Pagoda Fire Insurance System Database Schema
-- =============================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS insurance_policies;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS monks;
DROP TABLE IF EXISTS pagodas;
DROP TABLE IF EXISTS users;

-- =============================================
-- Users Table
-- =============================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'staff', 'viewer') DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Pagodas Table
-- =============================================
CREATE TABLE pagodas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_km VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  type ENUM('dhammayut', 'mahanikay') NOT NULL,
  size ENUM('small', 'medium', 'large') NOT NULL,
  village VARCHAR(100),
  commune VARCHAR(100),
  district VARCHAR(100),
  province VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photo_url VARCHAR(255),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_province (province),
  INDEX idx_type (type),
  INDEX idx_size (size),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Monks Table
-- =============================================
CREATE TABLE monks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pagoda_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  role ENUM('chief', 'deputy', 'monk') NOT NULL,
  phone VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pagoda_id) REFERENCES pagodas(id) ON DELETE CASCADE,
  INDEX idx_pagoda_id (pagoda_id),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Buildings Table
-- =============================================
CREATE TABLE buildings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pagoda_id INT NOT NULL,
  type ENUM('main_temple', 'chanting_hall', 'residence', 'other') NOT NULL,
  name VARCHAR(200),
  year_built INT,
  area_sqm DECIMAL(10, 2),
  condition ENUM('excellent', 'good', 'fair', 'poor'),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pagoda_id) REFERENCES pagodas(id) ON DELETE CASCADE,
  INDEX idx_pagoda_id (pagoda_id),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Insurance Policies Table
-- =============================================
CREATE TABLE insurance_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pagoda_id INT NOT NULL,
  policy_number VARCHAR(50) UNIQUE NOT NULL,
  premium_amount DECIMAL(10, 2) NOT NULL,
  coverage_start DATE NOT NULL,
  coverage_end DATE NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  calculation_details JSON,
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (pagoda_id) REFERENCES pagodas(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pagoda_id (pagoda_id),
  INDEX idx_policy_number (policy_number),
  INDEX idx_status (status),
  INDEX idx_coverage_end (coverage_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Payments Table
-- =============================================
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  policy_id INT NOT NULL,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('cash', 'transfer', 'check') NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  processed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_policy_id (policy_id),
  INDEX idx_receipt_number (receipt_number),
  INDEX idx_payment_date (payment_date),
  INDEX idx_processed_by (processed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Reminders Table
-- =============================================
CREATE TABLE reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  policy_id INT NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_type ENUM('email', 'sms', 'both') NOT NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE CASCADE,
  INDEX idx_policy_id (policy_id),
  INDEX idx_reminder_date (reminder_date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Insert Default Admin User
-- Password: admin123 (hashed with bcrypt, salt rounds: 10)
-- =============================================
INSERT INTO users (username, email, password, full_name, role, is_active)
VALUES (
  'admin',
  'admin@pagodainsurance.com',
  '$2b$10$rGQYQv3KO8mX8Y.0H9fLaOXHvZJ6K7xGZ8bYxl3K5q3nBxH7Y5ZKm',
  'System Administrator',
  'admin',
  TRUE
);

-- Note: The password 'admin123' is hashed. In production, change this immediately after first login.

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================

-- Insert sample pagoda
INSERT INTO pagodas (name_km, name_en, type, size, village, commune, district, province, phone, created_by)
VALUES (
  'វត្តព្រះកែវ',
  'Wat Preah Keo',
  'mahanikay',
  'medium',
  'ភូមិទី១',
  'សង្កាត់ជ័យបុរី',
  'ខណ្ឌដូនពេញ',
  'រាជធានីភ្នំពេញ',
  '012345678',
  1
);

-- Insert sample monk
INSERT INTO monks (pagoda_id, name, role, phone)
VALUES (
  1,
  'ព្រះអង្គ ធម្មវន្តោ',
  'chief',
  '012345678'
);

-- Insert sample building
INSERT INTO buildings (pagoda_id, type, name, year_built, area_sqm, condition)
VALUES (
  1,
  'main_temple',
  'វិហារធំ',
  2010,
  200.00,
  'good'
);
