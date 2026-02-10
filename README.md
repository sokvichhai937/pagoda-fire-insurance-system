"# Pagoda Fire Insurance System
## ប្រព័ន្ធគ្រប់គ្រងការបង់ថ្លៃអគ្គិភ័យវត្ត

[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-v8+-blue.svg)](https://www.mysql.com/)
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
- **MySQL** - Database
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
- **MySQL** (v8 or higher)
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

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

### 3. Setup Database

Create a MySQL database:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE pagoda_insurance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

Import the database schema:

```bash
mysql -u root -p pagoda_insurance < server/database/schema.sql
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

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=pagoda_insurance
DB_PORT=3306

# JWT
JWT_SECRET=your_very_secret_key_at_least_32_characters_long
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

**Important Notes:**
- For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
- Generate a strong JWT secret (at least 32 characters)
- Change all default passwords in production

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

## Default Admin Account / គណនីអ្នកគ្រប់គ្រងលំនាំដើម

The database schema includes a default admin account:

- **Username:** `admin`
- **Password:** `admin123`

**⚠️ IMPORTANT:** Change this password immediately after first login!

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
- Check if MySQL is running
- Verify database credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Email Not Sending
- Verify email configuration in `.env`
- For Gmail, enable "Less secure app access" or use App Password
- Check email service firewall/network settings

### Server Won't Start
- Check if port 3000 is already in use
- Verify all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v14+)

### Login Issues
- Verify database has the default admin user
- Check browser console for errors
- Clear browser cache and cookies

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
- MySQL team
- Chart.js for data visualization
- All open-source contributors

---

**Note:** This is a production-ready system. Always use strong passwords, keep dependencies updated, and follow security best practices in production environments.

**ចំណាំ:** នេះគឺជាប្រព័ន្ធដែលរួចរាល់សម្រាប់ប្រើប្រាស់។ តែងតែប្រើពាក្យសម្ងាត់ខ្លាំង ធ្វើបច្ចុប្បន្នភាពដេពេនដង់ស៊ី និងធ្វើតាមការអនុវត្តសុវត្ថិភាពក្នុងបរិយាកាសផលិតកម្ម។" 
