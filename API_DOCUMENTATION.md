# PMS (Payroll Management System) - Complete API Documentation
**For Frontend Development**

---

## Table of Contents
1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [Data Models & Types](#data-models--types)
4. [API Endpoints](#api-endpoints)
   - [Auth Endpoints](#auth-endpoints)
   - [Users Endpoints](#users-endpoints)
   - [Payroll Endpoints](#payroll-endpoints)
   - [Monthly Paysheets Endpoints](#monthly-paysheets-endpoints)
   - [Export Endpoints](#export-endpoints)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)

---

## Base Configuration

### Server Details
- **Base URL**: `http://localhost:4500`
- **API Base Path**: `http://localhost:4500/api`
- **Default Port**: 4500
- **CORS Allowed Origins**: 
  - `http://localhost:5173` (Vite dev server)
  - `http://localhost:3000`

### Axios Instance Setup
```typescript
// services/api.ts
const api = axios.create({
  baseURL: 'http://localhost:4500/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('payroll_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('payroll_token');
      localStorage.removeItem('payroll_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Authentication

### Session Management
- **Token Storage**: `localStorage.payroll_token` (JWT)
- **User Storage**: `localStorage.payroll_user` (JSON)
- **Auto-Redirect**: On 401, redirects to `/login`
- **Token Header**: `Authorization: Bearer {token}`

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

---

## Data Models & Types

### User Interface
```typescript
interface User {
  id: string;                    // UUID
  firstName: string;
  lastName: string;
  email: string;                 // Unique
  phone: string;
  department: string;
  role: string;
  designation: string;
  joinDate: string;              // YYYY-MM-DD
  basicSalary: number;
  allowances: number;
  deductions: number;
  status: 'active' | 'inactive';
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}
```

### PayrollRecord Interface
```typescript
interface PayrollRecord {
  id: string;                    // UUID
  userId: string;
  userName: string;
  period: string;                // YYYY-MM
  basicSalary: number;
  allowances: number;
  deductions: number;
  tax: number;
  grossSalary: number;
  netSalary: number;
  department: string;
  designation: string;
  generatedAt: string;           // ISO 8601
}
```

### MonthlyPaysheet Interface
```typescript
interface MonthlyPaysheetDTO {
  id?: string;                   // UUID
  employeeId: string;            // Must reference existing User
  codeNo: string;                // Employee code
  payMonth: string;              // YYYY-MM format
  role: string;                  // Role code (e.g., GM, AGM, RM, CCI)
  monthsOfService: number;

  // Input Fields
  achieve: number;               // Achievement amount (sales roles)
  allowance: number;             // General allowance (sales roles)
  nopay: number;                 // No-pay days
  late: number;                  // Late hours (e.g., 2.5 = 2h 30m)
  epfAvailability: boolean;      // EPF eligible
  etfAvailability: boolean;      // ETF eligible
  welfare: number;               // Welfare amount
  otherOfficers: number;         // Other officers allowance

  // Calculated Results
  basicSalary?: number;
  assignedTarget?: number;
  achievementPct?: number;
  grossSalary?: number;
  vehicleAllowance?: number;
  fuelAllowance?: number;
  generalAllowance?: number;
  otherOffer?: number;
  orc?: number;                  // On Roof Commission
  subTotal?: number;
  nopayDeduction?: number;
  lateDeduction?: number;
  epfEmployee?: number;          // 8% deduction
  epfEmployer?: number;          // 12% (display only)
  etf?: number;                  // 3% (display only)
  netSalary?: number;

  // Metadata
  createdAt?: string;            // ISO 8601
  updatedAt?: string;            // ISO 8601
}
```

### Role Configuration
```typescript
// Sales/Target-Based Roles (Category A)
"GM"    // General Manager
"AGM"   // Assistant General Manager
"PH"    // Provincial Head
"DPH"   // Deputy Provincial Head
"SRM"   // Senior Regional Manager
"RM"    // Regional Manager
"BM"    // Branch Manager
"BDE"   // Business Development Executive

// Non-Target Roles (Category B)
"CCI"              // Collections/Call Center
"HR_FIN_HEAD"      // HR & Finance Head
"MANAGER_ADMIN"    // Manager Admin
"SR_EXEC_HR"       // Senior Executive – HR
"SR_EXEC_FINANCE"  // Senior Executive – Finance
"ASST_HR_EXEC"     // Assistant HR Executive
"ASST_FIN_EXEC"    // Assistant Finance Executive
"MICRO_FIN_MANAGER" // Micro Finance Manager
"MICRO_FIN_EXEC"   // Micro Finance Executive
```

### AdminCredentials Interface
```typescript
interface AdminCredentials {
  username: string;
  password: string;
  name: string;
  role: string;
}
```

---

## API Endpoints

---

## Auth Endpoints

### 1. POST /api/auth/login
**Description**: Authenticate user and get JWT token

**Request**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "name": "Super Admin",
    "role": "super_admin"
  }
}
```

**Errors**:
- `400 Bad Request`: Missing username or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Login failed

**Frontend Usage**:
```typescript
const login = async (username: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    localStorage.setItem('payroll_token', response.data.token);
    localStorage.setItem('payroll_user', JSON.stringify(response.data.user));
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

---

### 2. GET /api/auth/me
**Description**: Get current authenticated user profile

**Headers**: 
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "username": "admin",
  "name": "Super Admin",
  "role": "super_admin"
}
```

**Errors**:
- `404 Not Found`: Admin not found
- `500 Internal Server Error`: Fetch failed

---

---

## Users Endpoints

### 1. GET /api/users
**Description**: List all users with search, filter, sort, and pagination

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Search in firstName, lastName, email, department, role, designation |
| `department` | string | all | Filter by department |
| `role` | string | all | Filter by role |
| `status` | string | all | Filter by status: `active` or `inactive` |
| `sortBy` | string | createdAt | Sort field (firstName, email, basicSalary, createdAt, etc.) |
| `sortOrder` | string | desc | Sort order: `asc` or `desc` |
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 50 | Items per page |

**Example Request**:
```
GET /api/users?search=john&department=sales&status=active&sortBy=firstName&sortOrder=asc&page=1&limit=10
```

**Response** (200 OK):
```json
{
  "users": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+94712345678",
      "department": "Sales",
      "role": "Senior Manager",
      "designation": "Regional Manager",
      "joinDate": "2023-01-15",
      "basicSalary": 80000,
      "allowances": 15000,
      "deductions": 5000,
      "status": "active",
      "createdAt": "2023-01-15T10:30:00Z",
      "updatedAt": "2024-03-20T15:45:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "totalPages": 1,
  "departments": ["Sales", "HR", "Finance", "Operations"],
  "roles": ["Senior Manager", "Executive", "Assistant"]
}
```

**Errors**:
- `500 Internal Server Error`: Failed to fetch users

---

### 2. GET /api/users/stats
**Description**: Get dashboard statistics for users

**Response** (200 OK):
```json
{
  "totalUsers": 45,
  "activeUsers": 40,
  "inactiveUsers": 5,
  "totalDepartments": 4,
  "departments": ["Sales", "HR", "Finance", "Operations"],
  "totalMonthlySalary": 2500000
}
```

**Errors**:
- `500 Internal Server Error`: Failed to fetch stats

---

### 3. GET /api/users/:id
**Description**: Get a single user by ID

**Parameters**:
- `id` (path): User UUID

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+94712345678",
  "department": "Sales",
  "role": "Senior Manager",
  "designation": "Regional Manager",
  "joinDate": "2023-01-15",
  "basicSalary": 80000,
  "allowances": 15000,
  "deductions": 5000,
  "status": "active",
  "createdAt": "2023-01-15T10:30:00Z",
  "updatedAt": "2024-03-20T15:45:00Z"
}
```

**Errors**:
- `404 Not Found`: User not found
- `500 Internal Server Error`: Failed to fetch user

---

### 4. POST /api/users
**Description**: Create a new user

**Request**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+94787654321",
  "department": "HR",
  "role": "HR Manager",
  "designation": "Senior HR Executive",
  "joinDate": "2024-03-01",
  "basicSalary": 75000,
  "allowances": 10000,
  "deductions": 3000,
  "status": "active"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+94787654321",
  "department": "HR",
  "role": "HR Manager",
  "designation": "Senior HR Executive",
  "joinDate": "2024-03-01",
  "basicSalary": 75000,
  "allowances": 10000,
  "deductions": 3000,
  "status": "active",
  "createdAt": "2024-03-20T16:00:00Z",
  "updatedAt": "2024-03-20T16:00:00Z"
}
```

**Validation Rules**:
- `firstName`, `lastName`, `email` are required
- `email` must be unique (case-insensitive)
- Numeric fields are auto-converted to numbers

**Errors**:
- `400 Bad Request`: Missing required fields
- `409 Conflict`: Email already exists
- `500 Internal Server Error`: Failed to create user

---

### 5. PUT /api/users/:id
**Description**: Update an existing user

**Parameters**:
- `id` (path): User UUID

**Request** (partial update):
```json
{
  "phone": "+94712999999",
  "basicSalary": 85000,
  "status": "inactive"
}
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+94712999999",
  "department": "Sales",
  "role": "Senior Manager",
  "designation": "Regional Manager",
  "joinDate": "2023-01-15",
  "basicSalary": 85000,
  "allowances": 15000,
  "deductions": 5000,
  "status": "inactive",
  "createdAt": "2023-01-15T10:30:00Z",
  "updatedAt": "2024-03-20T16:15:00Z"
}
```

**Notes**:
- `id` and `createdAt` cannot be changed
- Email uniqueness is checked (excluding self)
- `updatedAt` is automatically set

**Errors**:
- `404 Not Found`: User not found
- `409 Conflict`: Email already exists (duplicate)
- `500 Internal Server Error`: Failed to update user

---

### 6. DELETE /api/users/:id
**Description**: Delete a user (hard delete)

**Parameters**:
- `id` (path): User UUID

**Response** (200 OK):
```json
{
  "message": "User deleted successfully.",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+94712345678",
    "department": "Sales",
    "role": "Senior Manager",
    "designation": "Regional Manager",
    "joinDate": "2023-01-15",
    "basicSalary": 80000,
    "allowances": 15000,
    "deductions": 5000,
    "status": "active",
    "createdAt": "2023-01-15T10:30:00Z",
    "updatedAt": "2024-03-20T15:45:00Z"
  }
}
```

**Errors**:
- `404 Not Found`: User not found
- `500 Internal Server Error`: Failed to delete user

---

---

## Payroll Endpoints

### 1. POST /api/payroll/generate
**Description**: Generate payroll records for user(s)

**Request**:
```json
{
  "userIds": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
  "period": "2024-03"
}
```

**Or (generate for all active users)**:
```json
{
  "period": "2024-03"
}
```

**Response** (200 OK):
```json
{
  "message": "Generated 2 payroll record(s).",
  "records": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "userName": "John Doe",
      "period": "2024-03",
      "basicSalary": 80000,
      "allowances": 15000,
      "deductions": 5000,
      "tax": 8000,
      "grossSalary": 95000,
      "netSalary": 82000,
      "department": "Sales",
      "designation": "Regional Manager",
      "generatedAt": "2024-03-20T16:30:00Z"
    }
  ]
}
```

**Notes**:
- If payroll already exists for user/period, it's returned as-is
- If no `userIds` provided, generates for all active users
- `period` format must be `YYYY-MM`

**Errors**:
- `400 Bad Request`: Missing period
- `500 Internal Server Error`: Failed to generate payroll

---

### 2. GET /api/payroll/history
**Description**: List payroll records with filters

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | string | Filter by user ID |
| `period` | string | Filter by period (YYYY-MM) |
| `search` | string | Search in userName or department |

**Example Request**:
```
GET /api/payroll/history?period=2024-03&search=john
```

**Response** (200 OK):
```json
{
  "records": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "userName": "John Doe",
      "period": "2024-03",
      "basicSalary": 80000,
      "allowances": 15000,
      "deductions": 5000,
      "tax": 8000,
      "grossSalary": 95000,
      "netSalary": 82000,
      "department": "Sales",
      "designation": "Regional Manager",
      "generatedAt": "2024-03-20T16:30:00Z"
    }
  ],
  "total": 1
}
```

**Errors**:
- `500 Internal Server Error`: Failed to fetch payroll history

---

### 3. GET /api/payroll/:id
**Description**: Get a single payroll record

**Parameters**:
- `id` (path): Payroll record UUID

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "userName": "John Doe",
  "period": "2024-03",
  "basicSalary": 80000,
  "allowances": 15000,
  "deductions": 5000,
  "tax": 8000,
  "grossSalary": 95000,
  "netSalary": 82000,
  "department": "Sales",
  "designation": "Regional Manager",
  "generatedAt": "2024-03-20T16:30:00Z"
}
```

**Errors**:
- `404 Not Found`: Payroll record not found
- `500 Internal Server Error`: Failed to fetch payroll record

---

### 4. DELETE /api/payroll/:id
**Description**: Delete a payroll record

**Parameters**:
- `id` (path): Payroll record UUID

**Response** (200 OK):
```json
{
  "message": "Payroll record deleted."
}
```

**Errors**:
- `404 Not Found`: Payroll record not found
- `500 Internal Server Error`: Failed to delete payroll record

---

---

## Monthly Paysheets Endpoints

### 1. POST /api/paysheets
**Description**: Create a new monthly paysheet with automatic salary calculations

**Request (Sales Role)**:
```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440000",
  "codeNo": "EMP001",
  "payMonth": "2024-03",
  "role": "RM",
  "monthsOfService": 24,
  "achieve": 50000000,
  "allowance": 25000,
  "nopay": 0,
  "late": 2.5,
  "epfAvailability": true,
  "welfare": 0,
  "otherOfficers": 5000
}
```

**Request (Non-Target Role)**:
```json
{
  "employeeId": "550e8400-e29b-41d4-a716-446655440001",
  "codeNo": "EMP002",
  "payMonth": "2024-03",
  "role": "CCI",
  "monthsOfService": 12,
  "nopay": 1,
  "late": 1.0,
  "epfAvailability": true,
  "welfare": 0,
  "otherOfficers": 2000
}
```

**Response** (201 Created):
```json
{
  "message": "Monthly paysheet created successfully",
  "paysheet": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "employeeId": "550e8400-e29b-41d4-a716-446655440000",
    "codeNo": "EMP001",
    "payMonth": "2024-03",
    "role": "RM",
    "monthsOfService": 24,
    "achieve": 50000000,
    "allowance": 25000,
    "nopay": 0,
    "late": 2.5,
    "epfAvailability": true,
    "etfAvailability": true,
    "welfare": 0,
    "otherOfficers": 5000,
    "basicSalary": 80000,
    "assignedTarget": 25000000,
    "achievementPct": 200,
    "grossSalary": 295000,
    "vehicleAllowance": 85000,
    "fuelAllowance": 30000,
    "generalAllowance": 25000,
    "otherOffer": 5000,
    "orc": 50000,
    "subTotal": 295000,
    "nopayDeduction": 0,
    "lateDeduction": 600,
    "epfEmployee": 23520,
    "epfEmployer": 35280,
    "etf": 8820,
    "netSalary": 263880,
    "createdAt": "2024-03-20T16:45:00Z",
    "updatedAt": "2024-03-20T16:45:00Z"
  }
}
```

**Required Fields**:
- `employeeId`: Must reference existing user
- `codeNo`: Employee code
- `payMonth`: Format YYYY-MM
- `role`: Valid role code
- `monthsOfService`: Number >= 0
- `nopay`: Number >= 0 (no-pay days)
- `late`: Number (hours, can be decimal like 2.5)
- For sales roles: `achieve`, `allowance` (numbers)
- For non-target roles: `otherOfficers` (number)

**Validation**:
- Employee must exist in users
- Role must be valid
- Paysheet for same employee/month cannot exist
- Numeric fields must be valid

**Errors**:
- `400 Bad Request`: Missing/invalid required fields
- `500 Internal Server Error`: Failed to create paysheet

---

### 2. GET /api/paysheets
**Description**: List all monthly paysheets with filters

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `employeeId` | string | Filter by employee ID |
| `payMonth` | string | Filter by month (YYYY-MM) |
| `role` | string | Filter by role |
| `search` | string | Search in codeNo or role |

**Example Request**:
```
GET /api/paysheets?payMonth=2024-03&role=RM
```

**Response** (200 OK):
```json
{
  "paysheets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440200",
      "employeeId": "550e8400-e29b-41d4-a716-446655440000",
      "codeNo": "EMP001",
      "payMonth": "2024-03",
      "role": "RM",
      "monthsOfService": 24,
      "achieve": 50000000,
      "allowance": 25000,
      "nopay": 0,
      "late": 2.5,
      "epfAvailability": true,
      "etfAvailability": true,
      "welfare": 0,
      "otherOfficers": 5000,
      "basicSalary": 80000,
      "assignedTarget": 25000000,
      "achievementPct": 200,
      "grossSalary": 295000,
      "vehicleAllowance": 85000,
      "fuelAllowance": 30000,
      "generalAllowance": 25000,
      "otherOffer": 5000,
      "orc": 50000,
      "subTotal": 295000,
      "nopayDeduction": 0,
      "lateDeduction": 600,
      "epfEmployee": 23520,
      "epfEmployer": 35280,
      "etf": 8820,
      "netSalary": 263880,
      "createdAt": "2024-03-20T16:45:00Z",
      "updatedAt": "2024-03-20T16:45:00Z"
    }
  ],
  "total": 1
}
```

**Errors**:
- `500 Internal Server Error`: Failed to fetch paysheets

---

### 3. GET /api/paysheets/:id
**Description**: Get a single monthly paysheet

**Parameters**:
- `id` (path): Paysheet UUID

**Response** (200 OK):
```json
{
  "paysheet": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "employeeId": "550e8400-e29b-41d4-a716-446655440000",
    "codeNo": "EMP001",
    "payMonth": "2024-03",
    "role": "RM",
    "monthsOfService": 24,
    "achieve": 50000000,
    "allowance": 25000,
    "nopay": 0,
    "late": 2.5,
    "epfAvailability": true,
    "etfAvailability": true,
    "welfare": 0,
    "otherOfficers": 5000,
    "basicSalary": 80000,
    "assignedTarget": 25000000,
    "achievementPct": 200,
    "grossSalary": 295000,
    "vehicleAllowance": 85000,
    "fuelAllowance": 30000,
    "generalAllowance": 25000,
    "otherOffer": 5000,
    "orc": 50000,
    "subTotal": 295000,
    "nopayDeduction": 0,
    "lateDeduction": 600,
    "epfEmployee": 23520,
    "epfEmployer": 35280,
    "etf": 8820,
    "netSalary": 263880,
    "createdAt": "2024-03-20T16:45:00Z",
    "updatedAt": "2024-03-20T16:45:00Z"
  }
}
```

**Errors**:
- `404 Not Found`: Paysheet not found
- `500 Internal Server Error`: Failed to fetch paysheet

---

### 4. PUT /api/paysheets/:id
**Description**: Update an existing monthly paysheet (recalculates automatically)

**Parameters**:
- `id` (path): Paysheet UUID

**Request** (partial update):
```json
{
  "achieve": 60000000,
  "allowance": 30000,
  "nopay": 1,
  "late": 3.0
}
```

**Response** (200 OK):
```json
{
  "message": "Paysheet updated successfully",
  "paysheet": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "employeeId": "550e8400-e29b-41d4-a716-446655440000",
    "codeNo": "EMP001",
    "payMonth": "2024-03",
    "role": "RM",
    "monthsOfService": 24,
    "achieve": 60000000,
    "allowance": 30000,
    "nopay": 1,
    "late": 3.0,
    "epfAvailability": true,
    "etfAvailability": true,
    "welfare": 0,
    "otherOfficers": 5000,
    "basicSalary": 80000,
    "assignedTarget": 25000000,
    "achievementPct": 240,
    "grossSalary": 300000,
    "vehicleAllowance": 85000,
    "fuelAllowance": 30000,
    "generalAllowance": 30000,
    "otherOffer": 5000,
    "orc": 60000,
    "subTotal": 300000,
    "nopayDeduction": 3200,
    "lateDeduction": 900,
    "epfEmployee": 24000,
    "epfEmployer": 36000,
    "etf": 9000,
    "netSalary": 262500,
    "createdAt": "2024-03-20T16:45:00Z",
    "updatedAt": "2024-03-20T17:00:00Z"
  }
}
```

**Notes**:
- Only provided fields are updated
- Salary is automatically recalculated
- `id`, `employeeId`, `payMonth`, `role` cannot be changed
- `updatedAt` is automatically set

**Errors**:
- `404 Not Found`: Paysheet not found
- `400 Bad Request`: Invalid employee or role
- `500 Internal Server Error`: Failed to update paysheet

---

### 5. DELETE /api/paysheets/:id
**Description**: Delete a monthly paysheet

**Parameters**:
- `id` (path): Paysheet UUID

**Response** (200 OK):
```json
{
  "message": "Paysheet deleted successfully",
  "paysheet": {
    "id": "550e8400-e29b-41d4-a716-446655440200",
    "employeeId": "550e8400-e29b-41d4-a716-446655440000",
    "codeNo": "EMP001",
    "payMonth": "2024-03",
    "role": "RM",
    "monthsOfService": 24,
    "achieve": 50000000,
    "allowance": 25000,
    "nopay": 0,
    "late": 2.5,
    "epfAvailability": true,
    "etfAvailability": true,
    "welfare": 0,
    "otherOfficers": 5000,
    "basicSalary": 80000,
    "assignedTarget": 25000000,
    "achievementPct": 200,
    "grossSalary": 295000,
    "vehicleAllowance": 85000,
    "fuelAllowance": 30000,
    "generalAllowance": 25000,
    "otherOffer": 5000,
    "orc": 50000,
    "subTotal": 295000,
    "nopayDeduction": 0,
    "lateDeduction": 600,
    "epfEmployee": 23520,
    "epfEmployer": 35280,
    "etf": 8820,
    "netSalary": 263880,
    "createdAt": "2024-03-20T16:45:00Z",
    "updatedAt": "2024-03-20T16:45:00Z"
  }
}
```

**Errors**:
- `404 Not Found`: Paysheet not found
- `500 Internal Server Error`: Failed to delete paysheet

---

### 6. POST /api/paysheets/calculate
**Description**: Calculate paysheet preview without saving (useful for live calculations)

**Request**:
```json
{
  "role": "RM",
  "monthsOfService": 24,
  "achieve": 50000000,
  "allowance": 25000,
  "nopay": 0,
  "late": 2.5,
  "epfAvailability": true,
  "welfare": 0,
  "otherOfficers": 5000
}
```

**Response** (200 OK):
```json
{
  "message": "Paysheet calculation completed",
  "calculation": {
    "basicSalary": 80000,
    "assignedTarget": 25000000,
    "achievementPct": 200,
    "grossSalary": 295000,
    "vehicleAllowance": 85000,
    "fuelAllowance": 30000,
    "generalAllowance": 25000,
    "otherOffer": 5000,
    "orc": 50000,
    "subTotal": 295000,
    "nopayDeduction": 0,
    "lateDeduction": 600,
    "epfEmployee": 23520,
    "epfEmployer": 35280,
    "etf": 8820,
    "netSalary": 263880
  }
}
```

**Notes**:
- No paysheet is saved
- Useful for form validation and live calculations
- Same input validation as POST endpoint

**Errors**:
- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Calculation failed

---

### 7. GET /api/paysheets/month/:payMonth
**Description**: Get all paysheets for a specific month

**Parameters**:
- `payMonth` (path): Month in YYYY-MM format

**Example Request**:
```
GET /api/paysheets/month/2024-03
```

**Response** (200 OK):
```json
{
  "paysheets": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440200",
      "employeeId": "550e8400-e29b-41d4-a716-446655440000",
      "codeNo": "EMP001",
      "payMonth": "2024-03",
      "role": "RM",
      "monthsOfService": 24,
      "achieve": 50000000,
      "allowance": 25000,
      "nopay": 0,
      "late": 2.5,
      "epfAvailability": true,
      "etfAvailability": true,
      "welfare": 0,
      "otherOfficers": 5000,
      "basicSalary": 80000,
      "assignedTarget": 25000000,
      "achievementPct": 200,
      "grossSalary": 295000,
      "vehicleAllowance": 85000,
      "fuelAllowance": 30000,
      "generalAllowance": 25000,
      "otherOffer": 5000,
      "orc": 50000,
      "subTotal": 295000,
      "nopayDeduction": 0,
      "lateDeduction": 600,
      "epfEmployee": 23520,
      "epfEmployer": 35280,
      "etf": 8820,
      "netSalary": 263880,
      "createdAt": "2024-03-20T16:45:00Z",
      "updatedAt": "2024-03-20T16:45:00Z"
    }
  ],
  "total": 1,
  "month": "2024-03"
}
```

**Errors**:
- `500 Internal Server Error`: Failed to fetch paysheets

---

---

## Export Endpoints

### 1. GET /api/export/users-excel
**Description**: Export all users to Excel file

**Response**: File download (Excel format)
- **File Format**: `.xlsx`
- **Columns**: All User fields
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Errors**:
- `400 Bad Request`: No user data to export
- `500 Internal Server Error`: Export failed

**Frontend Usage**:
```typescript
const downloadUsersExcel = async () => {
  try {
    const response = await api.get('/export/users-excel', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

---

### 2. GET /api/export/payroll-excel
**Description**: Export all payroll records to Excel file

**Response**: File download (Excel format)
- **File Format**: `.xlsx`
- **Columns**: All PayrollRecord fields
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Errors**:
- `400 Bad Request`: No payroll data to export
- `500 Internal Server Error`: Export failed

**Frontend Usage**:
```typescript
const downloadPayrollExcel = async () => {
  try {
    const response = await api.get('/export/payroll-excel', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll-${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

---

### 3. POST /api/export/backup
**Description**: Placeholder for Google Drive backup (requires OAuth2 setup)

**Response** (200 OK):
```json
{
  "message": "Google Drive backup feature requires OAuth2 setup. See README for configuration.",
  "status": "not_configured",
  "instructions": [
    "1. Create a Google Cloud project",
    "2. Enable Google Drive API",
    "3. Create OAuth2 credentials",
    "4. Set environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET",
    "5. Complete the OAuth consent flow"
  ]
}
```

---

---

## Error Handling

### Standard Error Response Format
```json
{
  "error": "Descriptive error message"
}
```

### HTTP Status Codes

| Code | Meaning | Common Scenario |
|------|---------|-----------------|
| `200` | OK | Successful GET/PUT request |
| `201` | Created | Successful POST request |
| `400` | Bad Request | Invalid input, missing fields, validation failed |
| `401` | Unauthorized | Invalid/missing token or invalid credentials |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Email already exists, duplicate paysheet |
| `500` | Server Error | Unexpected error on server |

### Frontend Error Handling Pattern
```typescript
try {
  const response = await api.post('/users', userData);
  // Handle success
} catch (error) {
  if (error.response?.status === 400) {
    // Handle validation error
    console.error('Validation error:', error.response.data.error);
  } else if (error.response?.status === 409) {
    // Handle conflict (e.g., duplicate email)
    console.error('Conflict:', error.response.data.error);
  } else if (error.response?.status === 401) {
    // Handle unauthorized (token expired)
    // Interceptor handles redirect to /login
  } else {
    // Handle other errors
    console.error('Error:', error.response?.data?.error || error.message);
  }
}
```

---

---

## Code Examples

### Example 1: Login Flow
```typescript
// services/authService.ts
import api from './api';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    username: string;
    name: string;
    role: string;
  };
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      localStorage.setItem('payroll_token', response.data.token);
      localStorage.setItem('payroll_user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch current user');
    }
  },

  logout(): void {
    localStorage.removeItem('payroll_token');
    localStorage.removeItem('payroll_user');
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem('payroll_token');
  },
};
```

---

### Example 2: User Management Service
```typescript
// services/userService.ts
import api from './api';
import { User } from '../types';

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
  departments: string[];
  roles: string[];
}

interface UserListParams {
  search?: string;
  department?: string;
  role?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const userService = {
  async listUsers(params: UserListParams): Promise<UserListResponse> {
    try {
      const response = await api.get<UserListResponse>('/users', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch users');
    }
  },

  async getUser(id: string): Promise<User> {
    try {
      const response = await api.get<User>(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch user');
    }
  },

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const response = await api.post<User>('/users', user);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create user');
    }
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const response = await api.put<User>(`/users/${id}`, updates);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update user');
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await api.delete(`/users/${id}`);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete user');
    }
  },

  async getStats() {
    try {
      const response = await api.get('/users/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch stats');
    }
  },
};
```

---

### Example 3: Paysheet Management Service
```typescript
// services/paysheetService.ts
import api from './api';
import { MonthlyPaysheetDTO } from '../types';

export const paysheetService = {
  async createPaysheet(data: Omit<MonthlyPaysheetDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
    message: string;
    paysheet: MonthlyPaysheetDTO;
  }> {
    try {
      const response = await api.post('/paysheets', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create paysheet');
    }
  },

  async listPaysheets(filters?: {
    employeeId?: string;
    payMonth?: string;
    role?: string;
    search?: string;
  }) {
    try {
      const response = await api.get('/paysheets', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch paysheets');
    }
  },

  async getPaysheet(id: string): Promise<{ paysheet: MonthlyPaysheetDTO }> {
    try {
      const response = await api.get(`/paysheets/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch paysheet');
    }
  },

  async updatePaysheet(id: string, updates: Partial<MonthlyPaysheetDTO>): Promise<{
    message: string;
    paysheet: MonthlyPaysheetDTO;
  }> {
    try {
      const response = await api.put(`/paysheets/${id}`, updates);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update paysheet');
    }
  },

  async deletePaysheet(id: string): Promise<{ message: string; paysheet: MonthlyPaysheetDTO }> {
    try {
      const response = await api.delete(`/paysheets/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete paysheet');
    }
  },

  async calculatePaysheet(data: {
    role: string;
    monthsOfService: number;
    achieve?: number;
    allowance?: number;
    nopay: number;
    late: number;
    epfAvailability: boolean;
    welfare?: number;
    otherOfficers?: number;
  }): Promise<{ message: string; calculation: any }> {
    try {
      const response = await api.post('/paysheets/calculate', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Calculation failed');
    }
  },

  async getMonthPaysheets(payMonth: string) {
    try {
      const response = await api.get(`/paysheets/month/${payMonth}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch month paysheets');
    }
  },
};
```

---

### Example 4: Payroll Service
```typescript
// services/payrollService.ts
import api from './api';
import { PayrollRecord } from '../types';

export const payrollService = {
  async generatePayroll(userIds?: string[], period?: string): Promise<{
    message: string;
    records: PayrollRecord[];
  }> {
    try {
      const response = await api.post('/payroll/generate', {
        userIds,
        period,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to generate payroll');
    }
  },

  async getPayrollHistory(filters?: {
    userId?: string;
    period?: string;
    search?: string;
  }) {
    try {
      const response = await api.get('/payroll/history', { params: filters });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch payroll history');
    }
  },

  async getPayroll(id: string): Promise<PayrollRecord> {
    try {
      const response = await api.get(`/payroll/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch payroll');
    }
  },

  async deletePayroll(id: string): Promise<{ message: string }> {
    try {
      const response = await api.delete(`/payroll/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to delete payroll');
    }
  },
};
```

---

### Example 5: Export Service
```typescript
// services/exportService.ts
import api from './api';

export const exportService = {
  async downloadUsersExcel(): Promise<void> {
    try {
      const response = await api.get('/export/users-excel', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to download users');
    }
  },

  async downloadPayrollExcel(): Promise<void> {
    try {
      const response = await api.get('/export/payroll-excel', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to download payroll');
    }
  },
};
```

---

### Example 6: React Hook for Users
```typescript
// hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { User } from '../types';

interface UseUsersOptions {
  search?: string;
  department?: string;
  role?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

export const useUsers = (options: UseUsersOptions = {}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.listUsers(options);
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [options.search, options.department, options.role, options.status, options.page]);

  const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newUser = await userService.createUser(userData);
      setUsers([...users, newUser]);
      return newUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const updated = await userService.updateUser(id, updates);
      setUsers(users.map((u) => (u.id === id ? updated : u)));
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await userService.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    total,
    totalPages,
    createUser,
    updateUser,
    deleteUser,
  };
};
```

---

### Example 7: React Hook for Paysheets
```typescript
// hooks/usePaysheets.ts
import { useState, useEffect } from 'react';
import { paysheetService } from '../services/paysheetService';
import { MonthlyPaysheetDTO } from '../types';

export const usePaysheets = (payMonth?: string) => {
  const [paysheets, setPaysheets] = useState<MonthlyPaysheetDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payMonth) return;

    const fetchPaysheets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await paysheetService.getMonthPaysheets(payMonth);
        setPaysheets(data.paysheets);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaysheets();
  }, [payMonth]);

  const createPaysheet = async (data: Omit<MonthlyPaysheetDTO, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const result = await paysheetService.createPaysheet(data);
      setPaysheets([...paysheets, result.paysheet]);
      return result.paysheet;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updatePaysheet = async (id: string, updates: Partial<MonthlyPaysheetDTO>) => {
    try {
      const result = await paysheetService.updatePaysheet(id, updates);
      setPaysheets(paysheets.map((p) => (p.id === id ? result.paysheet : p)));
      return result.paysheet;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deletePaysheet = async (id: string) => {
    try {
      await paysheetService.deletePaysheet(id);
      setPaysheets(paysheets.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    paysheets,
    loading,
    error,
    createPaysheet,
    updatePaysheet,
    deletePaysheet,
  };
};
```

---

### Example 8: React Component Using Service
```typescript
// components/UserForm.tsx
import { FormEvent, useState } from 'react';
import { userService } from '../services/userService';
import { User } from '../types';

interface UserFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
}

export const UserForm = ({ onSuccess, onError }: UserFormProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    role: '',
    designation: '',
    joinDate: new Date().toISOString().split('T')[0],
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    status: 'active' as const,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('Salary') || name.includes('allowances') || name.includes('deductions')
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await userService.createUser(formData);
      onSuccess?.(user);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        role: '',
        designation: '',
        joinDate: new Date().toISOString().split('T')[0],
        basicSalary: 0,
        allowances: 0,
        deductions: 0,
        status: 'active',
      });
    } catch (err) {
      const errorMsg = err.message || 'Failed to create user';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <input
        type="text"
        name="firstName"
        placeholder="First Name"
        value={formData.firstName}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="lastName"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={handleChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone"
        value={formData.phone}
        onChange={handleChange}
      />
      <input
        type="text"
        name="department"
        placeholder="Department"
        value={formData.department}
        onChange={handleChange}
      />
      <input
        type="text"
        name="role"
        placeholder="Role"
        value={formData.role}
        onChange={handleChange}
      />
      <input
        type="text"
        name="designation"
        placeholder="Designation"
        value={formData.designation}
        onChange={handleChange}
      />
      <input
        type="date"
        name="joinDate"
        value={formData.joinDate}
        onChange={handleChange}
      />
      <input
        type="number"
        name="basicSalary"
        placeholder="Basic Salary"
        value={formData.basicSalary}
        onChange={handleChange}
      />
      <input
        type="number"
        name="allowances"
        placeholder="Allowances"
        value={formData.allowances}
        onChange={handleChange}
      />
      <input
        type="number"
        name="deductions"
        placeholder="Deductions"
        value={formData.deductions}
        onChange={handleChange}
      />
      <select name="status" value={formData.status} onChange={handleChange}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
};
```

---

## Summary

This comprehensive API documentation covers:

✅ **Authentication** - JWT token-based auth with auto-logout  
✅ **Users** - Full CRUD operations with search, filter, sort, pagination  
✅ **Payroll** - Generate, list, and manage payroll records  
✅ **Monthly Paysheets** - Advanced salary calculations with role-based configurations  
✅ **Exports** - Excel export functionality  
✅ **Error Handling** - Standard error responses and HTTP status codes  
✅ **Code Examples** - Real-world implementation patterns  

**Start developing!** Use the provided service classes and hooks to build your frontend quickly and efficiently.


