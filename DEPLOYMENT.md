# Deployment & Testing Guide
# មគ្គុទ្ទេសក៍ដាក់ពង្រាយ និងសាកល្បង

## Quick Start Guide / មគ្គុទ្ទេសក៍ចាប់ផ្តើមរហ័ស

### Step 1: Prerequisites Check
```bash
# Check Node.js version (should be v14+)
node --version

# Check npm version
npm --version

# Check MySQL version (should be v8+)
mysql --version

# Check if MySQL is running
sudo systemctl status mysql  # Linux
# or
brew services list | grep mysql  # macOS
```

### Step 2: Clone and Install
```bash
# Clone the repository
git clone https://github.com/sokvichhai937/pagoda-fire-insurance-system.git
cd pagoda-fire-insurance-system

# Install dependencies
npm install
```

### Step 3: Database Setup
```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE pagoda_insurance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Use the database
USE pagoda_insurance;

# Exit MySQL
exit;

# Import schema
mysql -u root -p pagoda_insurance < server/database/schema.sql
```

### Step 4: Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

**Important .env settings:**
```env
# Database - MUST CONFIGURE
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pagoda_insurance

# JWT Secret - MUST CHANGE
JWT_SECRET=generate_a_strong_random_secret_min_32_characters

# Email - Optional for testing
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Step 5: Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Step 6: Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

**Default Login:**
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANT:** Change the admin password immediately after first login!

---

## Testing Guide / មគ្គុទ្ទេសក៍សាកល្បង

### 1. Authentication Testing

**Test Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@pagodainsurance.com",
      "full_name": "System Administrator",
      "role": "admin"
    }
  }
}
```

**Test Get Current User:**
```bash
# Save token from login response
TOKEN="your_token_here"

curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 2. User Management Testing

**Create a New User:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "staff1",
    "email": "staff1@example.com",
    "password": "StaffPass123",
    "full_name": "Staff Member",
    "role": "staff"
  }'
```

**Get All Users:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Pagoda Management Testing

**Create a Pagoda:**
```bash
curl -X POST http://localhost:3000/api/pagodas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name_km": "វត្តធម្មិការាម",
    "name_en": "Wat Dhammikaram",
    "type": "mahanikay",
    "size": "medium",
    "province": "ភ្នំពេញ",
    "district": "ដូនពេញ",
    "phone": "012345678"
  }'
```

**Get All Pagodas:**
```bash
curl -X GET "http://localhost:3000/api/pagodas?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Get Pagoda by ID:**
```bash
curl -X GET http://localhost:3000/api/pagodas/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Insurance Calculation Testing

**Calculate Premium:**
```bash
curl -X POST http://localhost:3000/api/insurance/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pagodaData": {
      "size": "medium"
    },
    "buildings": [
      {"type": "main_temple", "year_built": 2010},
      {"type": "residence", "year_built": 2015}
    ]
  }'
```

**Create Insurance Policy:**
```bash
curl -X POST http://localhost:3000/api/insurance/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pagoda_id": 1,
    "premium_amount": 800,
    "coverage_start": "2024-01-01",
    "coverage_end": "2024-12-31",
    "notes": "Annual policy"
  }'
```

### 5. Payment Testing

**Record a Payment:**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "policy_id": 1,
    "amount": 800,
    "payment_date": "2024-01-15",
    "payment_method": "cash",
    "notes": "Full payment received"
  }'
```

**Get Payment Receipt (PDF):**
```bash
curl -X GET http://localhost:3000/api/payments/1/receipt \
  -H "Authorization: Bearer $TOKEN" \
  --output receipt.pdf
```

### 6. Reports Testing

**Get Dashboard Stats:**
```bash
curl -X GET http://localhost:3000/api/reports/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Get Monthly Report:**
```bash
curl -X GET "http://localhost:3000/api/reports/monthly?month=2024-01" \
  -H "Authorization: Bearer $TOKEN"
```

**Get Yearly Report:**
```bash
curl -X GET "http://localhost:3000/api/reports/yearly?year=2024" \
  -H "Authorization: Bearer $TOKEN"
```

**Get Pagoda Status Report:**
```bash
curl -X GET http://localhost:3000/api/reports/pagoda-status \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Frontend Testing

**Test Login Page:**
1. Navigate to `http://localhost:3000`
2. Enter username: `admin`
3. Enter password: `admin123`
4. Click "Login" button
5. Should redirect to dashboard

**Test Dashboard:**
1. After login, verify you see:
   - Welcome message with user name
   - Four stat cards (Total Pagodas, Payments, Revenue, Overdue)
   - Charts (Revenue chart, Province chart)
   - Quick action buttons

**Test Pagoda Management:**
1. Click "Pagodas" in navigation
2. Click "Add Pagoda" button
3. Fill in the form with test data
4. Click "Save"
5. Verify pagoda appears in the table
6. Test Edit and Delete buttons

**Test Insurance Calculator:**
1. Click "Insurance" in navigation
2. Select a pagoda from dropdown
3. Add building types
4. Click "Calculate Premium"
5. Verify calculation results display
6. Click "Create Policy" to save

**Test Payment Recording:**
1. Click "Payments" in navigation
2. Click "Record Payment" button
3. Select a policy
4. Fill in payment details
5. Click "Save"
6. Verify payment appears in table
7. Click "Download Receipt" to test PDF generation

**Test Reports:**
1. Click "Reports" in navigation
2. Select "Monthly Report"
3. Choose a month
4. Click "Generate Report"
5. Verify charts and data display
6. Test "Export PDF" and "Export CSV" buttons

**Test User Management (Admin only):**
1. Click "Users" in navigation
2. Click "Add User" button
3. Fill in user details
4. Select role (staff or viewer)
5. Click "Save"
6. Verify user appears in table

---

## Common Issues & Solutions / បញ្ហាទូទៅ និងដំណោះស្រាយ

### Issue 1: Database Connection Failed
**Error:** "Failed to connect to database"

**Solutions:**
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start MySQL if not running
sudo systemctl start mysql

# Verify database exists
mysql -u root -p -e "SHOW DATABASES;"

# Check .env credentials are correct
cat .env | grep DB_
```

### Issue 2: Port Already in Use
**Error:** "Port 3000 is already in use"

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port in .env
echo "PORT=3001" >> .env
```

### Issue 3: Login Failed
**Error:** "Invalid username or password"

**Solutions:**
```bash
# Verify admin user exists in database
mysql -u root -p pagoda_insurance -e "SELECT * FROM users WHERE username='admin';"

# If not exists, re-import schema
mysql -u root -p pagoda_insurance < server/database/schema.sql

# Verify password is 'admin123'
```

### Issue 4: JWT Token Invalid
**Error:** "Invalid token"

**Solutions:**
```bash
# Ensure JWT_SECRET in .env is set and at least 32 characters
grep JWT_SECRET .env

# Clear browser localStorage
# In browser console, run: localStorage.clear()

# Login again
```

### Issue 5: Email Not Sending
**Error:** Email sending fails

**Solutions:**
```bash
# For Gmail, enable 2-factor authentication
# Generate App Password: https://myaccount.google.com/apppasswords

# Update .env with app password
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_16_digit_app_password

# For testing, you can skip email verification
# Email service will log errors but won't stop the application
```

### Issue 6: PDF Generation Fails
**Error:** Cannot generate receipt PDF

**Solutions:**
```bash
# Ensure pdfkit is installed
npm list pdfkit

# Reinstall if needed
npm install pdfkit

# Check write permissions for tmp directory
mkdir -p /tmp
chmod 777 /tmp
```

---

## Performance Testing / ការធ្វើតេស្តសមត្ថភាព

### Load Testing with Apache Bench
```bash
# Install Apache Bench (if not installed)
sudo apt-get install apache2-utils  # Linux
brew install httpd  # macOS

# Test login endpoint
ab -n 1000 -c 10 -p login.json -T application/json \
  http://localhost:3000/api/auth/login

# Where login.json contains:
# {"username":"admin","password":"admin123"}
```

### Database Performance Testing
```bash
# Connect to MySQL
mysql -u root -p pagoda_insurance

# Check table sizes
SELECT 
  table_name,
  table_rows,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'pagoda_insurance';

# Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

---

## Production Deployment Checklist / បញ្ជីពិនិត្យការដាក់ពង្រាយផលិតកម្ម

### Pre-Deployment
- [ ] Change all default passwords
- [ ] Generate strong JWT secret (min 64 characters)
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure email service
- [ ] Set NODE_ENV=production
- [ ] Review and update CORS settings
- [ ] Set up backup strategy
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3000

# Strong secrets
JWT_SECRET=<generate_with_openssl_rand_-base64_64>

# Production database
DB_HOST=<production_db_host>
DB_USER=<db_user>
DB_PASSWORD=<strong_password>
DB_NAME=pagoda_insurance

# Production email
EMAIL_HOST=<your_smtp_host>
EMAIL_USER=<production_email>
EMAIL_PASSWORD=<production_password>

# Production URL
BASE_URL=https://yourdomain.com
```

### Deployment Steps
```bash
# 1. Update and install dependencies
npm install --production

# 2. Run database migrations
mysql -u <user> -p <database> < server/database/schema.sql

# 3. Start with PM2 (process manager)
npm install -g pm2
pm2 start server/server.js --name pagoda-insurance
pm2 save
pm2 startup

# 4. Set up Nginx reverse proxy
# Example Nginx configuration:
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# 5. Set up SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

### Post-Deployment Verification
```bash
# Check if service is running
pm2 status

# Check logs
pm2 logs pagoda-insurance

# Test endpoints
curl https://yourdomain.com/api

# Monitor resource usage
pm2 monit
```

---

## Backup & Restore / ការបម្រុងទុក និងស្តារ

### Backup Database
```bash
# Full backup
mysqldump -u root -p pagoda_insurance > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
mysqldump -u root -p pagoda_insurance | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Automated daily backup script
cat > /usr/local/bin/backup-pagoda-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/pagoda-insurance"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u root -p<password> pagoda_insurance | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-pagoda-db.sh

# Add to crontab (run daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-pagoda-db.sh" | crontab -
```

### Restore Database
```bash
# Restore from backup
mysql -u root -p pagoda_insurance < backup_20240101_120000.sql

# Restore from compressed backup
gunzip < backup_20240101_120000.sql.gz | mysql -u root -p pagoda_insurance
```

---

## Monitoring & Maintenance / ការត្រួតពិនិត្យ និងថែទាំ

### Application Monitoring
```bash
# Monitor with PM2
pm2 monit

# View logs
pm2 logs pagoda-insurance --lines 100

# Restart application
pm2 restart pagoda-insurance

# Stop application
pm2 stop pagoda-insurance
```

### Database Maintenance
```sql
-- Optimize tables
OPTIMIZE TABLE users, pagodas, insurance_policies, payments;

-- Analyze tables for query optimization
ANALYZE TABLE users, pagodas, insurance_policies, payments;

-- Check table integrity
CHECK TABLE users, pagodas, insurance_policies, payments;

-- View table statistics
SHOW TABLE STATUS FROM pagoda_insurance;
```

### Security Audits
```bash
# Check for npm security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

---

## Support & Resources / ការគាំទ្រ និងធនធាន

### Documentation
- **Project README:** [README.md](README.md)
- **API Documentation:** Available at `/api` endpoint
- **Database Schema:** `server/database/schema.sql`

### Useful Commands
```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Monitor resources
pm2 monit

# Restart application
pm2 restart all

# Database backup
mysqldump -u root -p pagoda_insurance > backup.sql

# Update dependencies
npm update

# Security audit
npm audit
```

### Getting Help
- GitHub Issues: https://github.com/sokvichhai937/pagoda-fire-insurance-system/issues
- Email Support: support@example.com

---

**Last Updated:** February 10, 2024
**Version:** 1.0.0
