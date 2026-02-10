-- Pagoda Fire Insurance System Database Schema for SQL Server
-- =============================================

-- Drop existing tables if they exist
IF OBJECT_ID('reminders', 'U') IS NOT NULL DROP TABLE reminders;
IF OBJECT_ID('payments', 'U') IS NOT NULL DROP TABLE payments;
IF OBJECT_ID('insurance_policies', 'U') IS NOT NULL DROP TABLE insurance_policies;
IF OBJECT_ID('buildings', 'U') IS NOT NULL DROP TABLE buildings;
IF OBJECT_ID('monks', 'U') IS NOT NULL DROP TABLE monks;
IF OBJECT_ID('pagodas', 'U') IS NOT NULL DROP TABLE pagodas;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
GO

-- =============================================
-- Users Table (អ្នកប្រើប្រាស់)
-- =============================================
CREATE TABLE users (
  id INT PRIMARY KEY IDENTITY(1,1),
  username NVARCHAR(50) UNIQUE NOT NULL,
  email NVARCHAR(100) UNIQUE NOT NULL,
  password NVARCHAR(255) NOT NULL,
  full_name NVARCHAR(100) NOT NULL,
  role NVARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'staff', 'viewer')),
  is_active BIT DEFAULT 1,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE()
);
GO

-- =============================================
-- Pagodas Table (វត្ត)
-- =============================================
CREATE TABLE pagodas (
  id INT PRIMARY KEY IDENTITY(1,1),
  name_km NVARCHAR(200) NOT NULL,
  name_en NVARCHAR(200),
  type NVARCHAR(20) NOT NULL CHECK (type IN ('dhammayut', 'mahanikay')),
  size NVARCHAR(20) NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  village NVARCHAR(100),
  commune NVARCHAR(100),
  district NVARCHAR(100),
  province NVARCHAR(100) NOT NULL,
  phone NVARCHAR(20),
  email NVARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photo_url NVARCHAR(255),
  notes NVARCHAR(MAX),
  created_by INT,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
GO

-- =============================================
-- Monks Table (ព្រះសង្ឃ)
-- =============================================
CREATE TABLE monks (
  id INT PRIMARY KEY IDENTITY(1,1),
  pagoda_id INT NOT NULL,
  name NVARCHAR(200) NOT NULL,
  role NVARCHAR(20) NOT NULL CHECK (role IN ('chief', 'deputy', 'monk')),
  phone NVARCHAR(20),
  notes NVARCHAR(MAX),
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (pagoda_id) REFERENCES pagodas(id) ON DELETE CASCADE
);
GO

-- =============================================
-- Buildings Table (អគារ)
-- =============================================
CREATE TABLE buildings (
  id INT PRIMARY KEY IDENTITY(1,1),
  pagoda_id INT NOT NULL,
  type NVARCHAR(30) NOT NULL CHECK (type IN ('main_temple', 'chanting_hall', 'residence', 'other')),
  name NVARCHAR(200),
  year_built INT,
  area_sqm DECIMAL(10, 2),
  condition NVARCHAR(20) CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  notes NVARCHAR(MAX),
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (pagoda_id) REFERENCES pagodas(id) ON DELETE CASCADE
);
GO

-- =============================================
-- Insurance Policies Table (គម្រោងធានារ៉ាប់រង)
-- =============================================
CREATE TABLE insurance_policies (
  id INT PRIMARY KEY IDENTITY(1,1),
  pagoda_id INT NOT NULL,
  policy_number NVARCHAR(50) UNIQUE NOT NULL,
  premium_amount DECIMAL(10, 2) NOT NULL,
  coverage_start DATE NOT NULL,
  coverage_end DATE NOT NULL,
  status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  calculation_details NVARCHAR(MAX),
  notes NVARCHAR(MAX),
  created_by INT,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (pagoda_id) REFERENCES pagodas(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
GO

-- =============================================
-- Payments Table (ការបង់ប្រាក់)
-- =============================================
CREATE TABLE payments (
  id INT PRIMARY KEY IDENTITY(1,1),
  policy_id INT NOT NULL,
  receipt_number NVARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method NVARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'check')),
  reference_number NVARCHAR(100),
  notes NVARCHAR(MAX),
  processed_by INT,
  created_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (policy_id) REFERENCES insurance_policies(id),
  FOREIGN KEY (processed_by) REFERENCES users(id)
);
GO

-- =============================================
-- Reminders Table (ការរំលឹក)
-- =============================================
CREATE TABLE reminders (
  id INT PRIMARY KEY IDENTITY(1,1),
  policy_id INT NOT NULL,
  reminder_date DATE NOT NULL,
  reminder_type NVARCHAR(20) NOT NULL CHECK (reminder_type IN ('email', 'sms', 'both')),
  status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at DATETIME NULL,
  notes NVARCHAR(MAX),
  created_at DATETIME DEFAULT GETDATE(),
  FOREIGN KEY (policy_id) REFERENCES insurance_policies(id)
);
GO

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
  1
);
GO

-- Insert Punleu admin user
-- Password: 00008888 (hashed with bcrypt)
INSERT INTO users (username, email, password, full_name, role, is_active)
VALUES (
  'Punleu',
  'punleu@pagoda-insurance.com',
  '$2b$10$tXE7vQN5qJ5FxYp.rKZ8JeL6Y3KVWxGqYmxH4nZJHN.KJ5KYz8mKW',
  'Punleu',
  'admin',
  1
);
GO

-- =============================================
-- Create indexes for better performance
-- =============================================
CREATE INDEX idx_pagodas_province ON pagodas(province);
CREATE INDEX idx_policies_status ON insurance_policies(status);
CREATE INDEX idx_policies_dates ON insurance_policies(coverage_start, coverage_end);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_reminders_status ON reminders(status);
GO

PRINT '✅ Database schema created successfully';
PRINT '✅ Default users created: admin, Punleu';
GO

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================

-- Insert sample pagoda
INSERT INTO pagodas (name_km, name_en, type, size, village, commune, district, province, phone, created_by)
VALUES (
  N'វត្តព្រះកែវ',
  'Wat Preah Keo',
  'mahanikay',
  'medium',
  N'ភូមិទី១',
  N'សង្កាត់ជ័យបុរី',
  N'ខណ្ឌដូនពេញ',
  N'រាជធានីភ្នំពេញ',
  '012345678',
  1
);
GO

-- Insert sample monk
INSERT INTO monks (pagoda_id, name, role, phone)
VALUES (
  1,
  N'ព្រះអង្គ ធម្មវន្តោ',
  'chief',
  '012345678'
);
GO

-- Insert sample building
INSERT INTO buildings (pagoda_id, type, name, year_built, area_sqm, condition)
VALUES (
  1,
  'main_temple',
  N'វិហារធំ',
  2010,
  200.00,
  'good'
);
GO
