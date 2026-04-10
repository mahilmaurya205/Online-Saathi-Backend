# Online Saathi - Architecture & Implementation Document

## Project Overview
**Online Saathi** is a comprehensive job matching platform with international money transfer capabilities, role-based access control, wallet management, and premium membership features.

**Tech Stack:**
- **Backend:** Node.js + Express 5
- **Database:** PostgreSQL
- **ORM:** Prisma 6
- **Authentication:** JWT (JSON Web Tokens)
- **Payment Gateway:** Razorpay (integration ready)
- **Caching:** Redis

---

## System Architecture

### 1. Directory Structure
```
os-backend/
├── prisma/
│   ├── schema.prisma          # Database schema & models
│   ├── migrations/            # Database migration files
│   └── seed.js                # Initial data seeding
├── src/
│   ├── config/
│   │   └── redis.js           # Redis connection configuration
│   ├── controllers/           # Request handlers
│   │   ├── admin.controller.js
│   │   ├── auth.controller.js
│   │   ├── business.controller.js
│   │   ├── job-posting.controller.js
│   │   ├── member-registration.controller.js
│   │   ├── agent-registration.controller.js
│   │   └── ...
│   ├── middleware/            # Request processing middleware
│   │   ├── auth.middleware.js         # JWT authentication
│   │   ├── role.middleware.js         # Role-based access control
│   │   ├── identity.middleware.js     # Identity verification
│   │   ├── hierarchy.middleware.js    # Role hierarchy checks
│   │   ├── tenant.middleware.js       # Multi-tenant support
│   │   └── rateLimit.js               # API rate limiting
│   ├── routes/                # API route definitions
│   │   ├── auth.routes.js
│   │   ├── business.routes.js
│   │   ├── job-posting.routes.js
│   │   ├── member-agent.routes.js
│   │   └── ...
│   ├── modules/               # Feature-specific modules
│   │   ├── ime/               # International Money Express integration
│   │   └── prabhu/            # Prabhu Money Transfer integration
│   ├── services/              # Business logic services
│   │   ├── wallet.service.js
│   │   ├── otp.service.js
│   │   └── sms.service.js
│   ├── utils/                 # Utility functions
│   │   ├── jwt.js
│   │   ├── otp.js
│   │   ├── audit.js
│   │   └── access.js
│   ├── docs/
│   │   └── openapi.js         # Swagger API documentation
│   ├── app.js                 # Express app configuration
│   └── server.js              # Server entry point
├── .env                       # Environment variables
├── package.json
└── API_TESTING_FLOW.md        # API testing guide
```

---

## Core Modules & Functionality

### 1. Authentication & Authorization Module

**Files:**
- `src/controllers/auth.controller.js` - Login, registration, OTP handling
- `src/middleware/auth.middleware.js` - JWT token verification
- `src/middleware/role.middleware.js` - Role-based access control
- `src/middleware/identity.middleware.js` - Identity type verification
- `src/routes/auth.routes.js` - Auth endpoints

**Functionality:**
- Mobile-based authentication with password
- OTP verification system
- JWT token generation with user identity, roles, tenant info
- Multi-tenant support (each tenant isolated)

**Custom Changes Made:**
1. **Fixed role middleware array fallback** - Changed from `req.user.roles || [req.user.role]` to check array length, preventing empty arrays from blocking access
2. **Added membership-based authorization** - Created `checkMember`, `checkAgent`, `checkBusinessPartner` middlewares that verify database records instead of relying on JWT token roles

---

### 2. Member & Agent Registration Module

**Files:**
- `src/controllers/member-registration.controller.js` - Member registration logic
- `src/controllers/agent-registration.controller.js` - Agent registration & upgrade logic
- `src/routes/member-agent.routes.js` - Member/agent endpoints

**Functionality:**
- **Member Registration:**
  - Self-registration with payment (wallet deduction)
  - Admin creation without payment
  - Premium membership with benefits tracking
  - Auto-renewal options

- **Agent (Saathi) Registration:**
  - Self-registration with payment
  - Admin creation without payment
  - Member-to-agent upgrade with payment
  - Aadhaar, PAN verification
  - Shop details & skills tracking
  - Sections/fees management

**Custom Changes Made:**
1. **Removed invalid identity update** - Removed code trying to set `identity: 'MEMBER'` which doesn't exist in Identity enum
2. **Added checkMember middleware** - Checks database for member record instead of JWT role
3. **Added checkAgent middleware** - Checks database for agent record instead of JWT role
4. **Fixed agent upgrade route** - Changed from `checkRole(['MEMBER'])` to `checkMember` middleware

**Why Changes Were Needed:**
The Identity enum only contains: `SUPER_ADMIN, ADMIN, SUB_ADMIN, COUNTRY_HEAD, STATE_HEAD, STATE_PARTNER, DISTRICT_PARTNER, AGENT, USER`. There's no `MEMBER` value, so we check the database instead.

---

### 3. Business Partner & Job Posting Module

**Files:**
- `src/controllers/business.controller.js` - Business profile & job management
- `src/controllers/job-posting.controller.js` - Job posting with admin controls
- `src/routes/business.routes.js` - Business partner endpoints
- `src/routes/job-posting.routes.js` - Job posting endpoints

**Functionality:**
- **Business Profile:**
  - Create/update business profile
  - Company details (name, registration, GST)
  - Verification by admin
  - Job posting credits management

- **Job Posting:**
  - Businesses post jobs (requires verified profile)
  - Admin can post jobs directly
  - Job facilities management (admin-controlled)
  - Job posting fee configuration
  - Application tracking

**Custom Changes Made:**
1. **Updated job creation to match new Prisma schema** - Changed field names:
   - `title` → `jobRole`
   - `description` → `jobDescription`
   - `requirements` → `requiredSkills`
   - `location` → `fullAddress`
   - `city` → `district`
   - `employmentType` → `jobType`
   - `salaryMin/salaryMax` → `offeredAmount`
   - `experienceMin/experienceMax` → `experience`
   - `maxApplicants` → `openings`

2. **Added checkBusinessPartner middleware** - Verifies user has business profile in database
3. **Added checkAdminOrBusinessPartner middleware** - Allows both admins (via JWT) and business partners (via database)
4. **Fixed business.job.create relation** - Changed from `businessId: business.id` to `business: { connect: { id: business.id } }`
5. **Updated getJobCredits controller** - Changed from checking JWT identity to checking database for business profile

**Why Changes Were Needed:**
The Prisma Job model was updated with new field names to match client requirements. The old controller was using deprecated field names.

---

### 4. Wallet & Payment Module

**Files:**
- `src/controllers/wallet.controller.js` - Wallet operations
- `src/controllers/payment.controller.js` - Razorpay integration
- `src/services/wallet.service.js` - Wallet business logic
- `src/routes/wallet.routes.js` - Wallet endpoints
- `src/routes/payment.routes.js` - Payment endpoints

**Functionality:**
- Wallet balance management
- Direct top-up requests (admin approval workflow)
- Wallet transactions tracking
- Razorpay payment gateway integration
- Payment order creation & verification

**Current Status:**
- Direct wallet top-up works: `POST /api/wallet/topup`
- Razorpay integration needs API keys configured in `.env`:
  ```
  RAZORPAY_KEY_ID=rzp_test_xxxxx
  RAZORPAY_KEY_SECRET=xxxxx
  ```

---

### 5. Job Matching & Applications Module

**Files:**
- `src/controllers/jobs.controller.js` - Job search & recommendations
- `src/routes/jobs.routes.js` - Job search endpoints

**Functionality:**
- Job search with filters (keyword, location, skills, etc.)
- Job recommendations based on user profile
- Job applications
- Application status tracking

**Custom Changes Made:**
1. **Fixed field name mappings** - Updated search to use correct Prisma fields:
   - `title` → `jobRole`
   - `description` → `jobDescription`
   - `city` → `district`
   - `requirements` → `requiredSkills`
   - `salaryMin/salaryMax` → `offeredAmount`
   - `employmentType` → `jobType`

2. **Fixed route ordering** - Added `/search` route before `/:id` to prevent route collision
3. **Fixed business verification filter** - Included admin-posted jobs (businessId: null)

---

### 6. International Money Transfer (IME & Prabhu)

**Files:**
- `src/modules/ime/ime.service.js` - IME API integration
- `src/modules/ime/ime.controller.js` - IME transaction handling
- `src/modules/prabhu/prabhu.service.js` - Prabhu API integration
- `src/modules/prabhu/prabhu.controller.js` - Prabhu transaction handling

**Functionality:**
- IME money transfer service integration
- Prabhu money transfer service integration
- Transaction tracking
- Callback/webhook handling

---

### 7. Role Hierarchy & Multi-Tenant System

**Files:**
- `src/middleware/hierarchy.middleware.js` - Role hierarchy enforcement
- `src/middleware/tenant.middleware.js` - Tenant isolation

**Role Hierarchy (Top to Bottom):**
```
SUPER_ADMIN
  └─ ADMIN
      └─ SUB_ADMIN
          └─ COUNTRY_HEAD
              └─ STATE_HEAD
                  └─ STATE_PARTNER
                      └─ DISTRICT_PARTNER
                          └─ AGENT
                              └─ USER
```

**Tenant System:**
- Each tenant is isolated (separate data)
- Users belong to one tenant
- All queries scoped to tenant

---

## Database Schema (Key Models)

### User Model
- Authentication (mobile, password)
- Identity type (SUPER_ADMIN, ADMIN, USER, etc.)
- Approval status
- Referral code
- Relations: Wallet, Member, Agent, Business

### Member Model
- Personal details (name, DOB, gender, education, occupation)
- Addresses (multiple)
- Documents (multiple)
- Membership plan (PREMIUM, validity period)
- Payment history
- Benefits tracking

### Agent Model
- Aadhaar, PAN details
- Shop information
- Skills & sections
- Parent hierarchy
- Verification status
- Commission tracking

### Business Model
- Company details
- Registration & GST
- Verification status
- Relations: Jobs, Schemes

### Job Model (Updated Schema)
```
jobRole: String          // Job title
jobDescription: String   // Detailed description
requiredSkills: String[] // Required skills
jobType: String          // Full Time, Part Time, etc.
payStructure: String     // Payment structure
offeredAmount: Float     // Salary/wage
openings: Int           // Number of positions
shift: String           // Day, Night, etc.
urgentHiring: Boolean
education: String
experience: Int         // Years required
gender: String          // Male, Female, Any
minAge, maxAge: Int
country, state, district: String
pincode: String
fullAddress: String
weekOffDays: String
facilities: String[]    // Benefits offered
joiningFees: Boolean
contactName, contactNumber: String
status: String          // ACTIVE, CLOSED, FILLED
```

### BusinessJobCredit Model
- Total credits (jobs they can post)
- Used credits
- Remaining credits
- Plan details
- Validity period

### Wallet Model
- Balance
- Transactions (credit/debit)
- Transaction history

---

## Custom Implementation Details

### 1. Database-Based Authorization Pattern

**Problem:** JWT tokens contain static identity/role from login time. When user's status changes (e.g., becomes member/agent/business), the token doesn't update until re-login.

**Solution:** Created database-checking middlewares:

```javascript
// Example: checkMember middleware
const checkMember = async (req, res, next) => {
  const userId = req.user.user_id || req.user.id;
  const member = await prisma.member.findUnique({
    where: { userId }
  });
  
  if (!member) {
    return res.status(403).json({ message: 'forbidden' });
  }
  next();
};
```

**Files Modified:**
- `src/routes/member-agent.routes.js` - Added `checkMember`, `checkAgent`
- `src/routes/job-posting.routes.js` - Added `checkBusinessPartner`, `checkAdminOrBusinessPartner`
- `src/controllers/job-posting.controller.js` - Updated `getJobCredits` to check database

### 2. Field Name Compatibility Layer

**Problem:** API_TESTING_FLOW.md documentation uses new field names, but controller was using old field names.

**Solution:** Accept both old and new field names with fallback logic:

```javascript
const {
  title, jobRole,              // Both accepted
  description, jobDescription, // Both accepted
  // ... more fields
} = req.body;

// Map to unified variables
const jobTitle = jobRole || title;
const jobDesc = jobDescription || description;
```

**Files Modified:**
- `src/controllers/business.controller.js` - Updated `createJob` function
- `src/controllers/jobs.controller.js` - Updated `searchJobs` function

### 3. Prisma Relation Syntax Fix

**Problem:** Creating jobs with `businessId: business.id` failed with Prisma error.

**Solution:** Use relation connect syntax:

```javascript
// Wrong:
businessId: business.id

// Correct:
business: { connect: { id: business.id } }
```

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login
- `POST /api/auth/otp/request` - Request OTP
- `POST /api/auth/otp/verify` - Verify OTP

### Member/Agent
- `POST /api/member-agent/members/register` - Register as member
- `GET /api/member-agent/members/me` - Get my member profile
- `PATCH /api/member-agent/members/me` - Update member profile
- `POST /api/member-agent/agents/register` - Register as agent
- `POST /api/member-agent/agents/upgrade` - Member to agent upgrade
- `GET /api/member-agent/agents/me` - Get my agent profile
- `PATCH /api/member-agent/agents/me` - Update agent profile

### Business
- `POST /api/business/` - Create business profile
- `GET /api/business/my` - Get my business
- `POST /api/business/jobs` - Post a job
- `GET /api/business/jobs/my` - Get my posted jobs

### Job Posting
- `POST /api/job-posting/jobs` - Create job (admin/business)
- `GET /api/job-posting/jobs/my-posted` - Get my posted jobs
- `GET /api/job-posting/jobs/credits` - Get job credits
- `GET /api/job-posting/jobs/facilities` - Get all facilities

### Jobs
- `GET /api/jobs/search` - Search jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/apply` - Apply to job
- `GET /api/jobs/recommended` - Get recommended jobs

### Wallet
- `GET /api/wallet` - Get wallet balance
- `POST /api/wallet/topup` - Request top-up
- `GET /api/wallet/transactions` - Get transactions

### Payments
- `POST /api/payments/order/wallet` - Create Razorpay order (needs config)
- `POST /api/payments/verify` - Verify payment

### Admin
- `POST /api/admin/pricing/:key` - Set pricing
- `GET /api/admin/jobs` - Get all jobs
- `PATCH /api/business/:id/verify` - Verify business

---

## Current Server Ports

Due to port conflicts during development, multiple server instances were created:
- **Port 3023** - Current active server
- Old ports: 3005, 3010, 3012, 3014, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022

**To start server:**
```bash
cd "c:\Users\Mahil\Downloads\os-backend-main (1)\os-backend-main"
$env:PORT=3023; node src/server.js
```

---

## Environment Configuration

**Required `.env` variables:**
```
DATABASE_URL="postgresql://user:password@localhost:5432/os_db"
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"

# Razorpay (optional for testing)
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="xxxxx"

# SMS Gateway
SMS_API_KEY="xxxxx"
```

---

## Known Issues & Workarounds

### 1. Razorpay Integration
**Issue:** 401 Authentication error (API keys not configured)
**Workaround:** Use direct wallet top-up: `POST /api/wallet/topup`

### 2. Redis Connection
**Issue:** Intermittent connection errors to remote Redis (3.111.55.59)
**Impact:** Non-critical, server continues working
**Solution:** Use local Redis or configure proper Redis credentials

### 3. Token Expiration
**Issue:** JWT tokens expire after 1 hour
**Solution:** Re-login to get fresh token

---

## Testing Guide

### 1. User Registration & Login
```bash
# Register
POST /api/auth/register
{
  "mobile": "9876543210",
  "fullName": "Test User",
  "gender": "MALE",
  "dateOfBirth": "1990-01-01",
  "password": "test123"
}

# Login
POST /api/auth/login
{
  "mobile": "9876543210",
  "password": "test123"
}
```

### 2. Member Registration
```bash
POST /api/member-agent/members/register
Authorization: Bearer <user_token>
{
  "firstName": "John",
  "lastName": "Doe",
  "birthDate": "1990-01-01",
  "email": "john@example.com",
  ...
}
```

### 3. Business Profile & Job Posting
```bash
# Create business
POST /api/business/
Authorization: Bearer <user_token>
{
  "companyName": "Tech Solutions",
  "address": "Business Address",
  "city": "Ahmedabad",
  "state": "Gujarat",
  "pincode": "380001",
  ...
}

# Post job
POST /api/business/jobs
Authorization: Bearer <user_token>
{
  "jobRole": "Sales Executive",
  "jobDescription": "Looking for sales executive",
  "requiredSkills": ["Sales", "Communication"],
  "jobType": "Full Time",
  "offeredAmount": 25000,
  "openings": 3,
  "state": "Gujarat",
  "district": "Ahmedabad",
  "fullAddress": "Business Park",
  ...
}
```

---

## Future Enhancements

1. **Complete Razorpay Integration** - Configure API keys for payment gateway
2. **IME/Prabhu Production Integration** - Complete money transfer APIs
3. **WebSocket Notifications** - Real-time updates
4. **File Upload Service** - Document/image uploads
5. **Email Service Integration** - Email notifications
6. **Advanced Search Filters** - More job search options
7. **Analytics Dashboard** - Admin analytics
8. **Mobile App API** - Optimize for mobile clients

---

## Development Notes

### Git Workflow
```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/branch-name

# Commit changes
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/branch-name
```

### Database Migrations
```bash
# Create migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Swagger Documentation
Access at: `http://localhost:3023/api-docs`

---

## Contact & Support

For questions or issues:
- Check `API_TESTING_FLOW.md` for API examples
- Review Swagger docs at `/api-docs`
- Check server logs for error details

---

**Document Version:** 1.0
**Last Updated:** April 2026
**Project:** Online Saathi Backend
**Status:** Active Development
