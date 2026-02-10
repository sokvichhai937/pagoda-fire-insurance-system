"# Pagoda Fire Insurance System
## ប្រព័ន្ធគ្រប់គ្រងការបង់ថ្លៃអគ្គិភ័យវត្ត

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-2019+-blue.svg)](https://www.microsoft.com/sql-server)
[![Express.js](https://img.shields.io/badge/Express.js-v4.18+-lightgrey.svg)](https://expressjs.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-v5.3+-purple.svg)](https://getbootstrap.com/)

A comprehensive insurance payment management system for Buddhist temples (pagodas) in Cambodia. This system helps manage pagoda registrations, insurance premium calculations, payment processing, and reporting.

ប្រព័ន្ធគ្រប់គ្រងការបង់ថ្លៃអគ្គិភ័យសម្រាប់វត្តអារាម។ ប្រព័ន្ធនេះជួយក្នុងការគ្រប់គ្រងការចុះឈ្មោះវត្ត ការគណនាថ្លៃអគ្គិភ័យ ការបង់ប្រាក់ និងការរាយការណ៍។

## Features / មុខងារ

### 🔐 Authentication & Authorization
- JWT token-based authentication
- Role-based access control (Admin, Staff, Viewer)
- Secure password hashing with bcrypt
- Session management

### 👥 User Management
- Create, read, update, delete users
- Role assignment (admin, staff, viewer)
- Password change functionality
- Active/inactive user status

### 📝 Pagoda Registration
- Register pagodas with detailed information
- Khmer and English name support
- Location tracking (GPS coordinates)
- Monk management
- Building inventory

### 💰 Insurance Premium Calculation
- Calculate premiums based on pagoda size
- Building-specific pricing
- Age factor consideration
- Detailed breakdown display

### 💳 Payment Management
- Record and track payments
- Multiple payment methods (cash, transfer, check)
- Payment history
- Automatic receipt generation (PDF)

### 📊 Reports & Analytics
- Monthly and yearly reports
- Pagoda payment status
- Revenue analytics
- Statistical dashboards with charts

### 🔔 Reminder System
- Automatic payment reminders
- Email notifications
- SMS notifications (configurable)
- Pending reminder tracking

## Technology Stack / បច្ចេកវិទ្យា

### Backend
- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Microsoft SQL Server** - Database
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Nodemailer** - Email service
- **PDFKit** - PDF generation

### Frontend
- **HTML5** - Markup
- **Bootstrap 5** - UI framework
- **Vanilla JavaScript** - Client-side logic
- **Chart.js** - Data visualization
- **Google Fonts** - Khmer Unicode fonts (Battambang, Hanuman)

## Prerequisites / តម្រូវការ

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **Microsoft SQL Server** (Express, Standard, or Enterprise edition)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)
- **SQL Server Management Studio (SSMS)** - Optional but recommended for database management

## Installation / ការតម្លើង

### 1. Clone the Repository

```bash
git clone https://github.com/sokvichhai937/pagoda-fire-insurance-system.git
cd pagoda-fire-insurance-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database (SQL Server)

#### Option 1: Using sqlcmd (Command Line)

Create the database:

```bash
sqlcmd -S localhost -E
```

```sql
CREATE DATABASE pagoda_insurance;
GO
USE pagoda_insurance;
GO
```

Import the database schema:

```bash
sqlcmd -S localhost -E -d pagoda_insurance -i server/database/schema.sql
```

#### Option 2: Using SQL Server Management Studio (SSMS)

1. Open SSMS and connect to your SQL Server instance
2. Right-click on "Databases" → "New Database"
3. Name it `pagoda_insurance`
4. Click OK
5. Open a new query window
6. Load the `server/database/schema.sql` file
7. Execute the script (F5)

#### Verify Installation

Check that tables were created:

```sql
SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
GO

-- Check default users
SELECT * FROM users;
GO
```

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure your settings:

```env
# Application
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# SQL Server Configuration
DB_HOST=localhost
DB_NAME=pagoda_insurance
DB_USER=
DB_PASSWORD=
DB_DOMAIN=
DB_ENCRYPT=false

# JWT
JWT_SECRET=pagoda_secret_key_2026_change_in_production
JWT_EXPIRE=7d

# Email (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM="Pagoda Insurance <noreply@pagodainsurance.com>"

# SMS (Optional)
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://api.sms-provider.com/send

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads/
```

**Database Authentication Options:**

**Option 1: Windows Authentication (Recommended)**
- Leave `DB_USER` and `DB_PASSWORD` empty
- The server will use your Windows credentials automatically
- This is the most secure option if running on Windows

```env
DB_HOST=localhost
DB_NAME=pagoda_insurance
DB_USER=
DB_PASSWORD=
```

**Option 2: SQL Server Authentication**
- Requires a SQL Server login account
- Set `DB_USER` and `DB_PASSWORD` with your SQL Server credentials

```env
DB_HOST=localhost
DB_NAME=pagoda_insurance
DB_USER=sa
DB_PASSWORD=your_sql_server_password
```

**Important Notes:**
- For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
- Generate a strong JWT secret (at least 32 characters)
- Change all default passwords in production
- `DB_ENCRYPT` should be `false` for local development, `true` for Azure SQL or production

### 5. Start the Server

For development (with auto-reload):

```bash
npm run dev
```

For production:

```bash
npm start
```

The server will start on `http://localhost:3000`

## Default Admin Accounts / គណនីអ្នកគ្រប់គ្រងលំនាំដើម

The database schema includes two default admin accounts:

**Admin Account:**
- **Username:** `admin`
- **Password:** `admin123`

**Punleu Account:**
- **Username:** `Punleu`
- **Password:** `00008888`

**⚠️ IMPORTANT:** Change these passwords immediately after first login!

## Project Structure / រចនាសម្ព័ន្ធគម្រោង

```
pagoda-fire-insurance-system/
├── server/                      # Backend code
│   ├── config/                  # Configuration files
│   │   ├── config.js           # App configuration
│   │   └── database.js         # Database connection
│   ├── models/                  # Data models
│   │   ├── User.js             # User model
│   │   ├── Pagoda.js           # Pagoda model
│   │   ├── Monk.js             # Monk model
│   │   ├── Building.js         # Building model
│   │   ├── Insurance.js        # Insurance policy model
│   │   ├── Payment.js          # Payment model
│   │   └── Reminder.js         # Reminder model
│   ├── routes/                  # API routes
│   │   ├── auth.js             # Authentication
│   │   ├── users.js            # User management
│   │   ├── pagodas.js          # Pagoda management
│   │   ├── insurance.js        # Insurance policies
│   │   ├── payments.js         # Payments
│   │   ├── reports.js          # Reports
│   │   └── reminders.js        # Reminders
│   ├── middleware/              # Middleware
│   │   ├── auth.js             # JWT authentication
│   │   └── roleCheck.js        # Role authorization
│   ├── utils/                   # Utility functions
│   │   ├── emailService.js     # Email sending
│   │   ├── smsService.js       # SMS sending
│   │   ├── pdfGenerator.js     # PDF generation
│   │   └── insuranceCalculator.js # Premium calculation
│   ├── database/                # Database files
│   │   └── schema.sql          # Database schema
│   └── server.js                # Main entry point
├── public/                      # Frontend files
│   ├── css/                     # Stylesheets
│   │   └── style.css           # Custom styles
│   ├── js/                      # JavaScript files
│   │   ├── utils.js            # Utility functions
│   │   ├── auth.js             # Authentication
│   │   ├── main.js             # Dashboard
│   │   ├── pagoda.js           # Pagoda management
│   │   ├── insurance.js        # Insurance
│   │   ├── payment.js          # Payments
│   │   └── reports.js          # Reports
│   ├── index.html              # Login page
│   ├── dashboard.html          # Dashboard
│   ├── pagodas.html            # Pagoda management
│   ├── insurance.html          # Insurance
│   ├── payments.html           # Payments
│   ├── reports.html            # Reports
│   ├── users.html              # User management
│   └── reminders.html          # Reminders
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore file
├── package.json                # Node.js dependencies
└── README.md                   # This file
```

## API Endpoints / ចំណុចចូល API

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)
- `PUT /api/users/:id/password` - Change password

### Pagodas
- `GET /api/pagodas` - Get all pagodas (with filters)
- `GET /api/pagodas/:id` - Get pagoda details
- `POST /api/pagodas` - Create pagoda
- `PUT /api/pagodas/:id` - Update pagoda
- `DELETE /api/pagodas/:id` - Delete pagoda
- `GET /api/pagodas/:id/monks` - Get pagoda monks
- `GET /api/pagodas/:id/buildings` - Get pagoda buildings
- `GET /api/pagodas/:id/policies` - Get pagoda policies

### Insurance
- `POST /api/insurance/calculate` - Calculate premium
- `GET /api/insurance/policies` - Get all policies
- `GET /api/insurance/policies/:id` - Get policy details
- `POST /api/insurance/policies` - Create policy
- `PUT /api/insurance/policies/:id` - Update policy
- `DELETE /api/insurance/policies/:id` - Cancel policy

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments` - Record payment
- `GET /api/payments/:id/receipt` - Generate receipt PDF
- `GET /api/payments/policy/:policyId` - Get policy payments

### Reports
- `GET /api/reports/monthly?month=YYYY-MM` - Monthly report
- `GET /api/reports/yearly?year=YYYY` - Yearly report
- `GET /api/reports/pagoda-status` - Pagoda payment status
- `GET /api/reports/stats` - Dashboard statistics

### Reminders
- `GET /api/reminders` - Get all reminders
- `GET /api/reminders/pending` - Get pending reminders
- `POST /api/reminders/send` - Send reminder manually
- `PUT /api/reminders/:id` - Update reminder status

## Usage Guide / មគ្គុទ្ទេសក៍ប្រើប្រាស់

### 1. Login
- Navigate to `http://localhost:3000`
- Enter username and password
- Click "Login" button

### 2. Dashboard
- View statistics and quick insights
- Access different modules through navigation

### 3. Register a Pagoda
- Go to "Pagodas" page
- Click "Add Pagoda" button
- Fill in pagoda details
- Add monks and buildings
- Save

### 4. Calculate Insurance Premium
- Go to "Insurance" page
- Select a pagoda
- Enter building details
- View calculation breakdown
- Create policy

### 5. Record Payment
- Go to "Payments" page
- Click "Record Payment" button
- Select policy
- Enter payment details
- Save and generate receipt

### 6. View Reports
- Go to "Reports" page
- Select report type
- Choose date range
- View charts and data
- Export if needed

## Security Features / សុវត្ថិភាព

- ✅ JWT token authentication
- ✅ Password hashing with bcrypt (10 salt rounds)
- ✅ Role-based access control
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Secure HTTP headers with Helmet.js
- ✅ Environment variables for sensitive data
- ✅ Token expiration and refresh

## Browser Support / កម្មវិធីរុករកដែលគាំទ្រ

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting / ដោះស្រាយបញ្ហា

### Database Connection Failed
- Check if SQL Server is running:
  - Open "SQL Server Configuration Manager"
  - Verify "SQL Server (MSSQLSERVER)" service is running
- Verify database credentials in `.env`
- Ensure database exists: `SELECT name FROM sys.databases;`
- For Windows Authentication, ensure your Windows user has access to SQL Server
- Check SQL Server TCP/IP is enabled in Configuration Manager

### Email Not Sending
- Verify email configuration in `.env`
- For Gmail, enable "Less secure app access" or use App Password
- Check email service firewall/network settings

### Server Won't Start
- Check if port 3000 is already in use
- Verify all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v14+)
- Verify SQL Server connection settings

### Login Issues
- Verify database has the default admin users
- Check browser console for errors
- Clear browser cache and cookies

### SQL Server Specific Issues
- **Named Instance:** If using a named instance, use `DB_HOST=localhost\\INSTANCENAME`
- **Firewall:** Ensure SQL Server port (default 1433) is not blocked
- **TCP/IP Protocol:** Enable TCP/IP in SQL Server Configuration Manager
- **Authentication Mode:** Ensure SQL Server is configured for Mixed Mode authentication if using SQL Server Authentication

## Development / ការអភិវឌ្ឍន៍

For development with auto-reload:

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

## Testing / ការសាកល្បង

To test the API endpoints, you can use:
- **Postman** - Import the API collection
- **cURL** - Command-line testing
- **Browser DevTools** - Network tab for frontend testing

Example cURL login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Contributing / ការរួមចំណែក

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License / អាជ្ញាប័ណ្ណ

This project is licensed under the ISC License.

## Author / អ្នកនិពន្ធ

Created for Cambodian Buddhist pagoda insurance management.

## Support / ជំនួយ

For issues and questions:
- Create an issue on GitHub
- Email: support@pagodainsurance.com (example)

## Acknowledgments / ការស្គាល់ចំណាំ

- Bootstrap team for the excellent UI framework
- Express.js community
- Microsoft SQL Server team
- Chart.js for data visualization
- All open-source contributors

---

**Note:** This is a production-ready system. Always use strong passwords, keep dependencies updated, and follow security best practices in production environments.

**ចំណាំ:** នេះគឺជាប្រព័ន្ធដែលរួចរាល់សម្រាប់ប្រើប្រាស់។ តែងតែប្រើពាក្យសម្ងាត់ខ្លាំង ធ្វើបច្ចុប្បន្នភាពដេពេនដង់ស៊ី និងធ្វើតាមការអនុវត្តសុវត្ថិភាពក្នុងបរិយាកាសផលិតកម្ម។" 
