## PMS API - Quick Reference Guide

### Base URL
```
http://localhost:4500
```

### Default Admin Credentials
- Username: `admin`
- Password: `admin123`

---

## 🔐 AUTHENTICATION ENDPOINTS

### 1. Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "username": "admin", "name": "Super Admin", "role": "super_admin" }
}
```

### 2. Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}

Response:
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### 3. Logout
```
POST /api/auth/logout
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "refreshToken": "YOUR_REFRESH_TOKEN"
}

Response:
{
  "message": "Logged out successfully."
}
```

### 4. Get Current User
```
GET /api/auth/me
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "username": "admin",
  "name": "Super Admin",
  "role": "super_admin"
}
```

---

## 👥 USER MANAGEMENT ENDPOINTS

### 5. Get All Users (Paginated)
```
GET /api/users?page=1&limit=25&search=&status=&branch=
Authorization: Bearer YOUR_ACCESS_TOKEN

Query Parameters:
- page: 1-N (default: 1)
- limit: 1-100 (default: 25)
- search: optional search text
- status: active|delete|all (optional)
- branch: branch name (optional)

Response:
{
  "users": [...],
  "total": 200,
  "page": 1,
  "totalPages": 8
}
```

### 6. Get User Statistics
```
GET /api/users/stats
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "totalUsers": 200,
  "activeUsers": 180,
  "deletedUsers": 20,
  "totalBranches": 5,
  "branches": ["Colombo", "Kandy", "Jaffna", "Galle", "Matara"],
  "totalMonthlySalary": 8500000
}
```

### 7. Get User by Code
```
GET /api/users/:codeNo
Authorization: Bearer YOUR_ACCESS_TOKEN

Example: GET /api/users/EMP-00001

Response:
{
  "codeNo": "EMP-00001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phone": "+94 712 345678",
  "branch": "Colombo",
  "role": "BDE",
  "designation": "Business Development Executive",
  "joinDate": "2024-01-15",
  "bankAccount": "1234567890",
  "bankName": "Commercial Bank",
  "basicSalary": 50000,
  "allowances": 10000,
  "deductions": 2000,
  "status": "active"
}
```

### 8. Create User
```
POST /api/users
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "codeNo": "EMP-NEW001",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@company.com",
  "phone": "+94 712 987654",
  "branch": "Colombo",
  "role": "BDE",
  "designation": "Business Development Executive",
  "joinDate": "2026-01-15",
  "bankAccount": "9876543210",
  "bankName": "National Bank",
  "basicSalary": 55000,
  "allowances": 12000,
  "deductions": 2500,
  "status": "active"
}

Response:
{
  "message": "User created successfully.",
  "user": { ...user object... }
}
```

### 9. Update User
```
PUT /api/users/:codeNo
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Anderson",
  "basicSalary": 60000,
  "status": "active"
}

Response:
{
  "message": "User updated successfully.",
  "user": { ...updated user object... }
}
```

### 10. Delete User
```
DELETE /api/users/:codeNo
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "message": "User deleted successfully.",
  "user": { ...deleted user object... }
}
```

---

## 💰 PAYROLL ENDPOINTS

### 11. Get All Payroll Records
```
GET /api/payroll?page=1&limit=25&search=&period=
Authorization: Bearer YOUR_ACCESS_TOKEN

Query Parameters:
- page: page number
- limit: records per page
- search: search employee code
- period: YYYY-MM format

Response:
{
  "payrollRecords": [...],
  "total": N,
  "page": 1,
  "totalPages": N
}
```

### 12. Get Payroll by ID
```
GET /api/payroll/:id
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "id": "payroll-id",
  "codeNo": "EMP-00001",
  "userName": "John Doe",
  "period": "2026-04",
  "basicSalary": 50000,
  "allowances": 10000,
  "deductions": 2000,
  "tax": 3000,
  "grossSalary": 60000,
  "netSalary": 55000,
  "branch": "Colombo",
  "designation": "BDE"
}
```

### 13. Create Payroll
```
POST /api/payroll
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "codeNo": "EMP-00001",
  "period": "2026-04",
  "basicSalary": 50000,
  "allowances": 10000,
  "deductions": 2000,
  "tax": 3000
}

Response:
{
  "message": "Payroll created successfully.",
  "payroll": { ...payroll object... }
}
```

### 14. Update Payroll
```
PUT /api/payroll/:id
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "basicSalary": 55000,
  "allowances": 12000
}

Response:
{
  "message": "Payroll updated successfully.",
  "payroll": { ...updated object... }
}
```

### 15. Delete Payroll
```
DELETE /api/payroll/:id
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "message": "Payroll record deleted."
}
```

---

## 📄 PAYSHEET ENDPOINTS

### 16. Get All Paysheets
```
GET /api/paysheets?page=1&limit=25&search=&status=all&branch=&role=
Authorization: Bearer YOUR_ACCESS_TOKEN

Query Parameters:
- page: page number (paginated at 25 items)
- limit: items per page
- search: search by code
- status: active|draft|finalized|delete|all
- branch: filter by branch
- role: filter by role code

Response:
{
  "paysheets": [...],
  "total": 200,
  "page": 1,
  "totalPages": 8
}
```

### 17. Get Paysheets by Month
```
GET /api/paysheets/month/2026-04?page=1&limit=25&search=&status=all&branch=&role=
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "paysheets": [...],
  "total": 200,
  "page": 1,
  "totalPages": 8,
  "month": "2026-04"
}
```

### 18. Get Paysheet by ID
```
GET /api/paysheets/:id
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "id": "paysheet-id",
  "codeNo": "EMP-00001",
  "payMonth": "2026-04",
  "role": "BDE",
  "monthsOfService": 24,
  "achieve": 5000,
  "allowance": 2000,
  "basicSalary": 50000,
  "grossSalary": 57000,
  "netSalary": 51500,
  "status": "active",
  ...40+ fields...
}
```

### 19. Calculate Paysheet (Preview Only)
```
POST /api/paysheets/calculate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "role": "BDE",
  "monthsOfService": 24,
  "achieve": 5000,
  "allowance": 2000,
  "otherOffer": 1000,
  "nopay": 0,
  "lateHours": 0,
  "lateMinutes": 0,
  "welfare": 500,
  "epfAvailability": true,
  "customEarningAmount": 0,
  "customDeductionAmount": 0
}

Response:
{
  "message": "Paysheet calculation completed",
  "calculation": {
    "grossSalary": 57000,
    "epfEmployee": 4560,
    "epfEmployer": 6840,
    "netSalary": 51500,
    ...all calculated fields...
  }
}
```

### 20. Create Paysheet
```
POST /api/paysheets
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "codeNo": "EMP-00001",
  "payMonth": "2026-04",
  "role": "BDE",
  "monthsOfService": 24,
  "achieve": 5000,
  "allowance": 2000,
  "otherOffer": 1000,
  "nopay": 0,
  "lateHours": 0,
  "lateMinutes": 0,
  "welfare": 500,
  "epfAvailability": true,
  "customEarningAmount": 0,
  "customDeductionAmount": 0
}

Response:
{
  "message": "Paysheet created successfully.",
  "paysheet": { ...paysheet object... }
}
```

### 21. Bulk Create Paysheets
```
POST /api/paysheets/bulk-create
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "payMonth": "2026-04",
  "paysheets": [
    {
      "codeNo": "EMP-00001",
      "role": "BDE",
      "monthsOfService": 24,
      "achieve": 5000
    },
    {
      "codeNo": "EMP-00002",
      "role": "BDE",
      "monthsOfService": 12,
      "achieve": 3000
    }
  ]
}

Response:
{
  "message": "Bulk paysheets created successfully.",
  "count": 2
}
```

### 22. Update Paysheet
```
PUT /api/paysheets/:id
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "achieve": 6000,
  "allowance": 2500,
  "nopay": 1
}

Response:
{
  "message": "Paysheet updated successfully.",
  "paysheet": { ...updated object... }
}
```

### 23. Update Paysheet Status
```
PUT /api/paysheets/:id/status
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "status": "finalized"
}

Status options: active, draft, finalized, delete

Response:
{
  "message": "Paysheet status updated.",
  "paysheet": { ...updated object... }
}
```

### 24. Delete Paysheet
```
DELETE /api/paysheets/:id
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "message": "Paysheet deleted successfully."
}
```

---

## 🖨️ PAYSLIP ENDPOINTS

### 25. Generate Payslips
```
POST /api/payslips/generate
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "payMonth": "2026-04",
  "employeeCodes": ["EMP-00001", "EMP-00002"]
}

Response:
{
  "jobId": "job-uuid",
  "status": "processing",
  "message": "Payslip generation started"
}
```

### 26. Get Job Status
```
GET /api/payslips/job/:jobId
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "id": "job-uuid",
  "status": "completed",
  "progress": 100,
  "zipPath": "/path/to/payslips.zip",
  "count": 2
}
```

### 27. Download Payslips
```
GET /api/payslips/download/:jobId
Authorization: Bearer YOUR_ACCESS_TOKEN

Response: ZIP file download
```

### 28. Get Single PDF
```
GET /api/payslips/:id/pdf
Authorization: Bearer YOUR_ACCESS_TOKEN

Response: PDF file download
```

### 29. Print Payslips
```
POST /api/payslips/print
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "payMonth": "2026-04",
  "employeeCodes": ["EMP-00001"],
  "printerName": "Dot Matrix Printer"
}

Response:
{
  "message": "Print job sent",
  "status": "printing"
}
```

---

## 📊 EXPORT ENDPOINTS

### 30. Export Users to Excel
```
GET /api/export/users-excel
Authorization: Bearer YOUR_ACCESS_TOKEN

Response: Excel file download
```

### 31. Export Paysheets to Excel
```
GET /api/export/paysheets-excel
Authorization: Bearer YOUR_ACCESS_TOKEN

Response: Excel file download
```

### 32. Export Paysheets by Branch
```
GET /api/export/paysheets-excel-by-branch
Authorization: Bearer YOUR_ACCESS_TOKEN

Response: Excel file download (grouped by branch)
```

### 33. Export Paysheets by Role
```
GET /api/export/paysheets-excel-by-role
Authorization: Bearer YOUR_ACCESS_TOKEN

Response: Excel file download (grouped by role)
```

### 34. Export Paysheets as JSON
```
GET /api/export/paysheets-json?payMonth=2026-04
Authorization: Bearer YOUR_ACCESS_TOKEN

Query Parameters:
- payMonth: YYYY-MM format

Response:
{
  "paysheets": [...],
  "month": "2026-04"
}
```

---

## 🖨️ DOT MATRIX PRINTING

### 35. Get Printer Status
```
GET /api/dot-matrix/status
Authorization: Bearer YOUR_ACCESS_TOKEN

Response:
{
  "status": "ready"|"offline"|"error",
  "printerName": "Dot Matrix Printer",
  "message": "Printer is ready"
}
```

### 36. Send to Printer
```
POST /api/dot-matrix/print
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "printerName": "Dot Matrix Printer",
  "content": "HTML content",
  "pageSize": "A4",
  "orientation": "portrait"
}

Response:
{
  "message": "Document sent to printer",
  "status": "printing"
}
```

---

## 🏥 SYSTEM ENDPOINTS

### 37. Health Check
```
GET /api/health

Response:
{
  "status": "ok",
  "timestamp": "2026-04-11T10:30:00.000Z"
}
```

---

## TESTING WORKFLOW

1. **Login first**
   ```
   POST /api/auth/login → Get accessToken and refreshToken
   ```

2. **Store tokens** in Postman environment variables:
   - `accessToken`
   - `refreshToken`

3. **Use Authorization header** for all protected endpoints:
   ```
   Authorization: Bearer {{accessToken}}
   ```

4. **Refresh token** when needed:
   ```
   POST /api/auth/refresh → Get new accessToken
   ```

5. **Test different scenarios** with 200+ mock users and 200 paysheets

---

## ERROR RESPONSES

### 400 Bad Request
```json
{
  "error": "Invalid payload",
  "details": ["field1: error message"]
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid credentials."
}
```

### 404 Not Found
```json
{
  "error": "User not found."
}
```

### 500 Server Error
```json
{
  "error": "Failed to fetch users."
}
```

---

**Total Endpoints:** 37+  
**Available Users:** 200  
**Available Paysheets:** 200  
**Test Data Month:** April 2026  
**Pagination:** 25 items per page

