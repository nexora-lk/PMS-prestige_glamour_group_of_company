# PMS Application - Complete Features & Capabilities Guide 📋

**Application:** Payroll Management System (PMS)  
**Date:** April 11, 2026  
**Stack:** React + Electron + Fastify + PostgreSQL + Prisma  

---

## 📑 TABLE OF CONTENTS

1. [Core Modules](#core-modules)
2. [User Management Features](#user-management-features)
3. [Authentication & Security](#authentication--security)
4. [Payroll Management Features](#payroll-management-features)
5. [Paysheet Management Features](#paysheet-management-features)
6. [Payslip Generation Features](#payslip-generation-features)
7. [Export Features](#export-features)
8. [Printing Features](#printing-features)
9. [Dashboard Features](#dashboard-features)
10. [Data & Database Features](#data--database-features)
11. [Performance & Infrastructure](#performance--infrastructure)
12. [API Endpoints](#api-endpoints)
13. [Testing Features](#testing-features)

---

## CORE MODULES

### 🏗️ Application Architecture
- **Frontend Layer:** React 19 + React Router v7 + Vite
- **Desktop Layer:** Electron 30 with IPC communication
- **Backend Layer:** Fastify 5.8 + Node.js with TypeScript
- **Database:** PostgreSQL via Neon + Prisma ORM
- **Caching:** Redis (with in-memory fallback)
- **Job Queue:** BullMQ for async processing
- **PDF Generation:** Puppeteer 24.40

### 📦 Core Modules Structure
```
auth/         - JWT authentication & token management
users/        - Employee/user management
payroll/      - Payroll calculation engine
paysheets/    - Monthly paysheet management
payslips/     - Payslip generation & printing
export/       - Excel/CSV export functionality
dot-matrix/   - Dot matrix printer integration
```

---

## USER MANAGEMENT FEATURES

### 👥 User CRUD Operations
- ✅ **Create User:** Add new employee with full details
  - Employee code, name, email, phone
  - Branch assignment, role, designation
  - Join date, bank account details
  - Basic salary, allowances, deductions
  - Status tracking (active/inactive/on_leave)

- ✅ **Read Users:** Fetch user list with filtering
  - Get all users (200+ mock users available)
  - Get individual user by code
  - Filter by branch, status
  - Pagination support (25 items per page)
  - Real-time search capability

- ✅ **Update User:** Modify user details
  - Update personal information
  - Change salary components
  - Modify branch/role/designation
  - Update bank account details
  - Change employment status

- ✅ **Delete User:** Remove employee records
  - Soft delete (archive)
  - Permanent delete with validation
  - Cascade delete with related paysheets

### 📊 User Statistics & Analytics
- ✅ Total user count
- ✅ Active vs. deleted user counts
- ✅ Branch-wise distribution
- ✅ Total monthly salary aggregation
- ✅ User role classification

### 🔍 User Filtering & Search
- ✅ Search by employee code
- ✅ Search by name (first/last)
- ✅ Filter by branch (5 branches: Colombo, Kandy, Jaffna, Galle, Matara)
- ✅ Filter by employment status
- ✅ Multi-criteria filtering

### 💾 User Data Management
- ✅ Bulk user import via Excel
- ✅ User export to Excel with full details
- ✅ Bank account tracking
- ✅ Join date tracking
- ✅ Employment history

---

## AUTHENTICATION & SECURITY

### 🔐 Authentication System
- ✅ **Login:** Username & password authentication
  - Secure password hashing (bcryptjs)
  - Default admin: `admin / admin123`
  - Login attempt logging (IP tracking)
  - Session timeout handling

- ✅ **JWT Token Management:**
  - Access token (short-lived, ~15 min)
  - Refresh token (long-lived, rotated on use)
  - Token refresh endpoint
  - Automatic token rotation

- ✅ **Logout:** Revoke refresh tokens
  - Token blacklisting
  - Session termination
  - Audit logging

- ✅ **Token Refresh:** Seamless session continuation
  - Automatic token rotation
  - Background refresh capability
  - Queue pending requests during refresh

### 🛡️ Security Features
- ✅ CORS protection (configured origins)
- ✅ Helmet security headers
- ✅ Rate limiting on endpoints
- ✅ Authorization middleware
- ✅ Protected routes (all except /auth)
- ✅ Password hashing (bcrypt, salt rounds: 10)
- ✅ JWT signing with secret key
- ✅ Refresh token hashing & validation

### 📋 Audit & Logging
- ✅ Login/logout logging
- ✅ Failed login attempts tracking
- ✅ IP address logging
- ✅ Error logging to Winston
- ✅ Request/response logging

---

## PAYROLL MANAGEMENT FEATURES

### 💰 Payroll Records Management
- ✅ **Create Payroll Record:**
  - Generate payroll for employee(s)
  - Multiple role support (17+ role codes)
  - Period tracking (YYYY-MM format)
  - Auto-calculation of salary components

- ✅ **Read Payroll Records:**
  - Get all payroll records
  - Get payroll by period
  - Filter by employee code
  - Pagination support
  - Caching for performance

- ✅ **Update Payroll Record:**
  - Modify existing payroll
  - Recalculate on changes
  - Update status

- ✅ **Delete Payroll Record:**
  - Remove incorrect records
  - Cascade relationships

### 🧮 Salary Calculation Engine
- ✅ **Role-Based Configuration:** 17+ role codes
  - GM (General Manager)
  - AGM (Assistant General Manager)
  - BM (Branch Manager)
  - BDE (Business Development Executive)
  - HR/Finance roles
  - Sales roles (CCI, micro-finance)
  - And more...

- ✅ **Salary Components Calculation:**
  - Basic salary
  - Gross salary (basic + allowances)
  - Allowances (vehicle, fuel, general)
  - Achievements & bonuses
  - Other offers
  - Custom earnings

- ✅ **Deduction Calculations:**
  - EPF Employee contribution (8%)
  - EPF Employer contribution (12%)
  - ETF contribution (3%)
  - Tax calculation
  - Custom deductions
  - No-pay deductions (absences)
  - Late deductions

- ✅ **Advanced Calculations:**
  - Net salary computation
  - Achievement percentage tracking
  - Months of service calculation
  - Welfare fund contributions
  - ORC (Other Regular Compensation)

- ✅ **Sales Role Specific:**
  - Target-based bonuses
  - Achievement percentage calculation
  - Performance incentives
  - Variable component calculation

- ✅ **Non-Sales Role Specific:**
  - Fixed salary structure
  - Grade-based calculation
  - Seniority bonuses

### 📈 Payroll Reports
- ✅ Payroll summary by branch
- ✅ Payroll summary by role
- ✅ Total salary breakdown
- ✅ Payroll comparison across periods
- ✅ Employee-wise payroll details

---

## PAYSHEET MANAGEMENT FEATURES

### 📄 Monthly Paysheet Operations
- ✅ **Create Paysheet:**
  - Create single paysheet
  - Bulk create paysheets (up to batch limits)
  - Automatic validation
  - Period-based generation

- ✅ **Read Paysheets:**
  - List all paysheets (paginated, 25/page)
  - Get paysheets by month
  - Get paysheets by employee
  - Get single paysheet details
  - Filter by multiple criteria

- ✅ **Update Paysheet:**
  - Edit paysheet details
  - Recalculate on edit
  - Update status
  - Modify all salary fields

- ✅ **Delete Paysheet:**
  - Soft delete (archive)
  - Permanent delete
  - Cascade cleanup

### 🔍 Paysheet Filtering & Search
- ✅ Filter by month (YYYY-MM)
- ✅ Filter by status (active/draft/finalized/delete)
- ✅ Filter by branch
- ✅ Filter by role code
- ✅ Search by employee code
- ✅ Multi-criteria filtering

### 💵 Paysheet Calculation Fields
- ✅ Base salary fields (basic, gross, net)
- ✅ Allowance tracking
- ✅ Achievement & target tracking
- ✅ Months of service
- ✅ Late hours/minutes
- ✅ No-pay days
- ✅ EPF/ETF calculations
- ✅ Welfare & custom fields
- ✅ All deduction fields

### 📊 Paysheet Status Management
- ✅ Draft status
- ✅ Active status
- ✅ Finalized status
- ✅ Deleted (soft delete)
- ✅ Status update tracking

### 🔄 Paysheet Restoration
- ✅ Restore deleted paysheets
- ✅ View deleted paysheets
- ✅ Permanent deletion option

---

## PAYSLIP GENERATION FEATURES

### 🖨️ Payslip Generation
- ✅ **Single Payslip Generation:**
  - Generate PDF for individual employee
  - Month-specific payslips
  - PDF formatting with Puppeteer

- ✅ **Bulk Payslip Generation:**
  - Generate for multiple employees
  - Batch processing with BullMQ
  - Progress tracking
  - Job status monitoring

- ✅ **Payslip Content:**
  - Employee details
  - Salary breakdown
  - Deductions breakdown
  - Net salary display
  - QR code/barcode (if configured)
  - Company branding

### 📥 Payslip Download & Delivery
- ✅ ZIP file generation (batch)
- ✅ Individual PDF download
- ✅ Download by job ID
- ✅ File cleanup (auto deletion after period)
- ✅ Progress tracking during generation

### 🖨️ Printing Functionality
- ✅ **Dot Matrix Printing:**
  - Send to physical dot matrix printer
  - Windows print queue integration
  - Multiple printer support
  - Print settings configuration

- ✅ **Print Queue Management:**
  - Queue management
  - Print status tracking
  - Error handling & retry

### 📋 Payslip Management
- ✅ Get payslip by ID
- ✅ List payslips by period
- ✅ Payslip status tracking
- ✅ Generation history

---

## EXPORT FEATURES

### 📊 Excel Export Functionality
- ✅ **User Export:**
  - Export all users to Excel (.xlsx)
  - All user fields included
  - Formatted spreadsheet
  - Headers with styling

- ✅ **Paysheet Export:**
  - Export all paysheets to Excel
  - Export by month
  - All calculation fields
  - Summary sheets

- ✅ **Export by Branch:**
  - Branch-wise paysheet export
  - Separate sheets per branch
  - Branch summary included

- ✅ **Export by Role:**
  - Role-wise paysheet export
  - Role summary statistics
  - Comparison data

### 📄 CSV Export
- ✅ Paysheet CSV export
- ✅ User CSV export
- ✅ Comma-separated format
- ✅ Excel-compatible

### 💾 Export Management
- ✅ Automatic file naming with timestamps
- ✅ File storage in `/exports` directory
- ✅ Auto-cleanup of old exports
- ✅ Download via HTTP stream
- ✅ File validation before export

---

## PRINTING FEATURES

### 🖨️ Dot Matrix Printing
- ✅ **Print Payslips to Dot Matrix:**
  - Windows printer support
  - Page format configuration (A4/Letter)
  - Multi-copy printing
  - Error handling

- ✅ **Print Queue Management:**
  - Queue jobs
  - Monitor print status
  - Retry failed prints
  - Clear stuck jobs

- ✅ **Print Configuration:**
  - Printer name selection
  - Page orientation
  - Margin settings
  - Paper size options

### 📋 Print Preview
- ✅ HTML preview before printing
- ✅ PDF preview
- ✅ Print layout validation

---

## DASHBOARD FEATURES

### 📈 Dashboard Metrics
- ✅ Total users count
- ✅ Active users count
- ✅ Total payroll amount
- ✅ Monthly paysheet count
- ✅ Pending paysheets
- ✅ Export history

### 🔔 Real-time Updates
- ✅ WebSocket connection for live updates
- ✅ Paysheet status changes
- ✅ User count updates
- ✅ Network status indicator

### 📊 Analytics
- ✅ Branch-wise salary distribution
- ✅ Role-wise employee count
- ✅ Payroll trend analysis
- ✅ Department-wise breakdown

### 🌐 Network Status
- ✅ Server connectivity check
- ✅ Offline/online indicator
- ✅ Automatic reconnection
- ✅ Sync on reconnection

---

## DATA & DATABASE FEATURES

### 💾 Database Schema
- ✅ **Admin Table:**
  - Username, password (hashed)
  - Name, role
  - Audit timestamp

- ✅ **Users Table:**
  - Employee code (primary key)
  - Personal info (name, email, phone)
  - Job info (role, designation, branch)
  - Salary fields (basic, allowances, deductions)
  - Bank account details
  - Status tracking
  - Timestamps (created, updated)

- ✅ **PayrollRecords Table:**
  - ID, employee code, period
  - Salary components
  - Tax calculations
  - Branch & designation info
  - Generated timestamp
  - Unique constraint on (codeNo, period)

- ✅ **MonthlyPaysheets Table:**
  - ID, employee code, pay month
  - All calculation fields (40+ fields)
  - Status tracking
  - Timestamps
  - Unique constraint on (codeNo, payMonth)

- ✅ **RefreshTokens Table:**
  - Hash, creation & expiration
  - Automatic cleanup

### 🔍 Database Indexing
- ✅ Indexes on frequently queried fields
- ✅ Branch, role, status indexes
- ✅ Period-based indexes
- ✅ Employee code indexes

### 📊 Mock Data
- ✅ 200 mock users pre-generated
- ✅ 200 paysheets for April 2026
- ✅ Realistic data (names, emails, phone numbers)
- ✅ Distributed across 5 branches
- ✅ Various roles and designations
- ✅ Ready for testing

### 🔄 Caching Strategy
- ✅ User list caching (5 min TTL)
- ✅ Paysheet caching (5 min TTL)
- ✅ Role configuration caching
- ✅ Cache invalidation on updates
- ✅ Redis with in-memory fallback

---

## PERFORMANCE & INFRASTRUCTURE

### ⚡ Performance Features
- ✅ Gzip compression for responses
- ✅ Rate limiting to prevent abuse
- ✅ Connection pooling (Neon adapter)
- ✅ Query optimization with Prisma
- ✅ Pagination (25 items per page)
- ✅ Batch operations support

### 🚀 Scalability
- ✅ Async job processing (BullMQ)
- ✅ Queue-based payslip generation
- ✅ Worker processes for heavy tasks
- ✅ Connection pooling

### 📡 Server Infrastructure
- ✅ Fastify framework (high-performance)
- ✅ TypeScript for type safety
- ✅ Environment configuration (.env)
- ✅ Health check endpoint
- ✅ Error handling middleware
- ✅ CORS configuration

### 📦 Deployment Ready
- ✅ Build optimization
- ✅ Source map generation
- ✅ Production builds tested
- ✅ Docker-ready (potential)
- ✅ Configuration management

---

## API ENDPOINTS

### 🔐 Authentication Endpoints
```
POST   /api/auth/login           - Login & get tokens
POST   /api/auth/refresh         - Refresh access token
POST   /api/auth/logout          - Revoke refresh token
GET    /api/auth/me              - Get current user info [Protected]
```

### 👥 User Management Endpoints
```
GET    /api/users                - List users [Paginated, Protected]
GET    /api/users/stats          - User statistics [Protected]
GET    /api/users/:codeNo        - Get user by code [Protected]
POST   /api/users                - Create new user [Protected]
PUT    /api/users/:codeNo        - Update user [Protected]
DELETE /api/users/:codeNo        - Delete user [Protected]
```

### 💰 Payroll Endpoints
```
GET    /api/payroll              - List payroll records [Paginated, Protected]
GET    /api/payroll/:id          - Get payroll by ID [Protected]
POST   /api/payroll              - Create payroll [Protected]
PUT    /api/payroll/:id          - Update payroll [Protected]
DELETE /api/payroll/:id          - Delete payroll [Protected]
```

### 📄 Paysheet Endpoints
```
GET    /api/paysheets            - List all paysheets [Paginated, Protected]
GET    /api/paysheets/:id        - Get paysheet by ID [Protected]
GET    /api/paysheets/month/:month - Get paysheets by month [Paginated, Protected]
POST   /api/paysheets            - Create paysheet [Protected]
POST   /api/paysheets/calculate  - Calculate paysheet (preview) [Protected]
POST   /api/paysheets/bulk-create - Bulk create paysheets [Protected]
PUT    /api/paysheets/:id        - Update paysheet [Protected]
PUT    /api/paysheets/:id/status - Update paysheet status [Protected]
DELETE /api/paysheets/:id        - Delete paysheet [Protected]
```

### 🖨️ Payslip Endpoints
```
POST   /api/payslips/generate    - Generate payslips [Protected]
GET    /api/payslips/job/:jobId  - Get job status [Protected]
GET    /api/payslips/download/:jobId - Download ZIP [Protected]
POST   /api/payslips/print       - Print payslips [Protected]
GET    /api/payslips/:id/pdf     - Get single PDF [Protected]
```

### 📊 Export Endpoints
```
GET    /api/export/users-excel              - Export users to Excel [Protected]
GET    /api/export/paysheets-excel          - Export paysheets to Excel [Protected]
GET    /api/export/paysheets-excel-by-role  - Export paysheets by role [Protected]
GET    /api/export/paysheets-excel-by-branch - Export paysheets by branch [Protected]
GET    /api/export/paysheets-json           - Export paysheets as JSON [Protected]
```

### 🖨️ Dot Matrix Endpoints
```
GET    /api/dot-matrix/status    - Get printer status [Protected]
POST   /api/dot-matrix/print     - Send to printer [Protected]
```

### 🏥 System Endpoints
```
GET    /api/health               - Server health check [Public]
GET    /                         - Serve frontend SPA [Public]
```

---

## TESTING FEATURES

### ✅ Unit Testing Framework
- ✅ Vitest for all layers
- ✅ Jest DOM testing library
- ✅ React Testing Library
- ✅ Supertest for API testing
- ✅ Code coverage reporting

### 🧪 Test Coverage
- ✅ Server tests (auth, users, payroll, paysheets, exports)
- ✅ Client tests (components, hooks, services)
- ✅ Electron tests (IPC, preload scripts)
- ✅ Integration tests

### 📊 Test Commands
```bash
npm test              # Run all tests
npm test:watch        # Watch mode
npm test:coverage     # Coverage report
npm run test:electron # Electron layer tests
```

### 🎯 Test Data
- ✅ 200 mock users available
- ✅ Mock paysheets for April 2026
- ✅ Seed script for data generation
- ✅ Test database fixtures

---

## ADDITIONAL FEATURES

### 🛠️ Development Tools
- ✅ TypeScript strict mode
- ✅ ESLint code quality
- ✅ Hot reload (dev mode)
- ✅ Debug logging
- ✅ Winston logging system

### 📱 UI/UX Features
- ✅ Responsive design
- ✅ Dark/Light theme support
- ✅ Real-time notifications (Toast)
- ✅ Loading indicators
- ✅ Error handling & display
- ✅ Form validation
- ✅ Data table with sorting

### 🔄 Data Synchronization
- ✅ Background sync on reconnect
- ✅ Cache invalidation
- ✅ Real-time updates
- ✅ Conflict resolution

### 📝 Audit Trail
- ✅ Creation timestamps
- ✅ Update timestamps
- ✅ Login/logout logs
- ✅ Action history (soft deletes)

---

## FEATURE SUMMARY

### ✨ Key Highlights
- **200+ Mock Users** ready for testing
- **25 Items Per Page** pagination (recently updated)
- **17+ Role Codes** with specific salary rules
- **5 Branches** supported
- **Comprehensive Calculations** including EPF, ETF, Tax
- **Real-time Dashboard** with metrics
- **Excel/CSV Export** functionality
- **Dot Matrix Printing** support
- **JWT Authentication** with token rotation
- **PostgreSQL Database** with Prisma ORM
- **Redis Caching** with fallback
- **BullMQ Queue** for async jobs
- **Electron Desktop App** for standalone usage
- **Full Test Coverage** (unit, integration, E2E ready)

---

## TASK ASSIGNMENT TEMPLATE

For delegating tasks to an agent, use this format:

```
📋 TASK: [Feature Name]
🎯 Objective: [What needs to be done]
📍 Location: [Files to modify]
✅ Acceptance Criteria:
   - [ ] Criterion 1
   - [ ] Criterion 2
   - [ ] Criterion 3
🧪 Testing: [How to verify]
📚 References: [Related docs/code]
```

---

## QUICK REFERENCE

| Component | Count | Status |
|-----------|-------|--------|
| API Endpoints | 40+ | ✅ Active |
| Database Tables | 4 | ✅ Active |
| Mock Users | 200 | ✅ Available |
| Mock Paysheets | 200 | ✅ Available |
| Role Codes | 17+ | ✅ Configured |
| Branches | 5 | ✅ Active |
| Test Suites | 10+ | ✅ Running |
| UI Components | 15+ | ✅ Active |
| Hooks | 4 | ✅ Active |
| Services | 5 | ✅ Active |

---

**Document Version:** 1.0  
**Last Updated:** April 11, 2026  
**Author:** PMS Development Team  

For questions or updates, refer to TESTING_GUIDE.md or review individual module files.

