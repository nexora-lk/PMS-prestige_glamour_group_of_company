# PMS Application - Agent Task Assignment Guide 🎯

**Purpose:** Comprehensive guide for delegating development tasks to agents

---

## 📋 TASK CATEGORIES

### 1️⃣ Feature Development Tasks
### 2️⃣ Bug Fixes & Improvements
### 3️⃣ Testing & QA Tasks
### 4️⃣ Documentation Tasks
### 5️⃣ Performance & Optimization
### 6️⃣ Deployment & DevOps

---

## TASK ASSIGNMENT TEMPLATE

```markdown
📋 TASK ID: [TASK-001]
📌 Priority: [🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low]
👤 Category: [Feature | Bug Fix | Test | Docs | Performance | DevOps]
🎯 Title: [Clear task name]
📝 Description: [Detailed explanation]
📍 Location: [Files/directories to modify]
✅ Acceptance Criteria:
   - [ ] Criterion 1
   - [ ] Criterion 2
   - [ ] Criterion 3
🧪 Testing: [How to verify the implementation]
⏱️ Estimated Time: [Time estimate]
📚 References: [Related docs/code/issues]
🔗 Dependencies: [Related tasks or prerequisites]
```

---

## 📝 SAMPLE TASKS

### TASK-001: Add New Role "Finance Manager" 🟡 Medium

```markdown
📋 TASK ID: TASK-001
📌 Priority: 🟡 Medium
👤 Category: Feature Development
🎯 Title: Add New Role "Finance Manager" with specific salary rules

📝 Description:
Add support for "Finance Manager" (FM) role with:
- Base salary: 80,000 - 120,000
- EPF: 8% (employee) + 12% (employer)
- ETF: 3%
- Special allowance: 15% of basic
- Performance bonus: Up to 20% of basic

📍 Location:
- server/src/engine/salary-calculator.ts (role configurations)
- server/src/validation/paysheets.ts (schema update)
- client/src/constants/roleSalaries.ts (UI constants)

✅ Acceptance Criteria:
- [ ] Role code "FM" added to salary calculator engine
- [ ] Specific salary rules implemented correctly
- [ ] Bonus calculation working as expected
- [ ] Server tests passing for new role
- [ ] Client UI shows new role in dropdowns
- [ ] API can create paysheets for FM role

🧪 Testing:
1. Login to application
2. Create new user with FM role
3. Generate paysheet for FM employee
4. Verify calculations match specifications
5. Test edge cases (max/min salary)

⏱️ Estimated Time: 2-3 hours

📚 References:
- salary-calculator.ts (existing role implementations)
- FEATURES_GUIDE.md (role documentation)
- Prisma schema (no schema changes needed)

🔗 Dependencies: None
```

---

### TASK-002: Fix Pagination Issue in User List 🔴 Critical

```markdown
📋 TASK ID: TASK-002
📌 Priority: 🔴 Critical
👤 Category: Bug Fix
🎯 Title: Fix pagination calculation showing incorrect total pages

📝 Description:
Users are reporting that pagination shows 8 pages but only 7 pages have content.
When on last page, user list shows only 4 items instead of expected 25.

Issue: Pagination calculation not accounting for partial pages correctly.

📍 Location:
- client/src/components/PaysheetList.tsx (pagination logic)
- server/src/modules/users/users.routes.ts (API pagination)

✅ Acceptance Criteria:
- [ ] Total pages calculation is correct
- [ ] Last page displays remaining items correctly
- [ ] Navigation buttons work for all pages
- [ ] No off-by-one errors
- [ ] Tests pass for edge cases (50, 75, 200 items)

🧪 Testing:
1. Login to app
2. Go to Users section
3. Verify page count accuracy
4. Navigate to last page
5. Verify item count on last page
6. Repeat with different filters

⏱️ Estimated Time: 1-2 hours

📚 References:
- PaysheetList.tsx (pagination implementation)
- API pagination logic (server)

🔗 Dependencies: None (blocking other tasks)
```

---

### TASK-003: Add Role Validation Test Suite 🟡 Medium

```markdown
📋 TASK ID: TASK-003
📌 Priority: 🟡 Medium
👤 Category: Testing & QA
🎯 Title: Create comprehensive test suite for all 17+ role codes

📝 Description:
Create unit tests to verify salary calculations for all role codes:
- GM, AGM, PH, DPH, SRM, RM, BM, BDE, CCI, HR_FIN_HEAD, MANAGER_ADMIN, 
  SR_EXEC_HR, SR_EXEC_FINANCE, ASST_HR_EXEC, ASST_FIN_EXEC, MICRO_FIN_MANAGER, MICRO_FIN_EXEC

Test scenarios:
- Min and max salary ranges
- Bonus calculations
- Deduction calculations
- Edge cases

📍 Location:
- server/src/__tests__/salary-calculator.comprehensive.test.ts

✅ Acceptance Criteria:
- [ ] All 17 roles have test coverage
- [ ] Min/max salary validation for each role
- [ ] Bonus calculations verified
- [ ] All tests passing
- [ ] Coverage >90% for salary-calculator.ts

🧪 Testing:
```bash
cd server
npm test salary-calculator.comprehensive.test.ts
npm test:coverage
```

⏱️ Estimated Time: 3-4 hours

📚 References:
- salary-calculator.test.ts (existing tests)
- Role configurations (salary-calculator.ts)
- FEATURES_GUIDE.md (role descriptions)

🔗 Dependencies: None
```

---

### TASK-004: Export Enhancements - Add CSV Format 🟡 Medium

```markdown
📋 TASK ID: TASK-004
📌 Priority: 🟡 Medium
👤 Category: Feature Development
🎯 Title: Add CSV export format alongside existing Excel exports

📝 Description:
Currently exports are only in Excel format. Add CSV export:
- Users to CSV
- Paysheets to CSV
- Support for comma-separated, tab-separated formats
- UTF-8 encoding with BOM for Excel compatibility

New endpoints:
- GET /api/export/users-csv
- GET /api/export/paysheets-csv

📍 Location:
- server/src/modules/payslips/export.routes.ts (add new endpoints)
- server/src/services/exportService.ts (add CSV generation function)

✅ Acceptance Criteria:
- [ ] CSV export routes implemented
- [ ] Files properly encoded (UTF-8 with BOM)
- [ ] Column headers preserved
- [ ] All data fields included
- [ ] Files download correctly
- [ ] Works with 200+ user dataset
- [ ] API tests passing

🧪 Testing:
1. Export users to CSV
2. Open in Excel/Google Sheets
3. Verify data integrity
4. Repeat with paysheets
5. Test with filters applied

⏱️ Estimated Time: 2-3 hours

📚 References:
- exportService.ts (existing Excel export logic)
- export.routes.ts (route structure)

🔗 Dependencies: None
```

---

### TASK-005: Add Email Notifications for Payroll 🟠 High

```markdown
📋 TASK ID: TASK-005
📌 Priority: 🟠 High
👤 Category: Feature Development
🎯 Title: Implement email notifications when payslips are generated

📝 Description:
Send email notifications to employees when their payslips are generated:
- Email template with payslip summary
- Employee email address from user database
- Include net salary, deductions summary
- Add opt-in/opt-out setting for each user

Implementation:
- Use NodeMailer for SMTP
- Queue emails with BullMQ
- Add email templates

📍 Location:
- server/src/services/ (new emailService.ts)
- server/src/modules/payslips/payslips.routes.ts (trigger email on generation)
- server/prisma/schema.prisma (add emailNotifications field to User)
- server/.env (SMTP config)

✅ Acceptance Criteria:
- [ ] Email service integrated
- [ ] Emails queued asynchronously
- [ ] HTML email template created
- [ ] SMTP configuration in .env
- [ ] User can opt-out of emails
- [ ] Emails sent on payslip generation
- [ ] Error handling for failed sends
- [ ] Tests passing

🧪 Testing:
1. Configure SMTP (use Mailhog for testing)
2. Generate payslips
3. Verify emails received
4. Check email content
5. Test opt-out functionality

⏱️ Estimated Time: 4-5 hours

📚 References:
- BullMQ queue setup (queues/)
- Service pattern (existing services)

🔗 Dependencies: SMTP server setup required
```

---

### TASK-006: Add Database Backup Feature 🟡 Medium

```markdown
📋 TASK ID: TASK-006
📌 Priority: 🟡 Medium
👤 Category: DevOps
🎯 Title: Implement automated database backup system

📝 Description:
Add automated daily backups of PostgreSQL database:
- Backup at 2 AM daily (configurable)
- Store backups locally and to cloud storage
- Keep last 30 days of backups
- Add restore functionality
- Log backup status

Endpoints needed:
- POST /api/admin/backup (manual trigger)
- GET /api/admin/backups (list backups)
- POST /api/admin/restore/:backupId (restore)

📍 Location:
- server/src/services/backupService.ts (new)
- server/src/workers/ (backup scheduler)
- server/src/modules/admin/ (new admin routes)

✅ Acceptance Criteria:
- [ ] Daily backup scheduler working
- [ ] Manual backup trigger available
- [ ] Backup files stored with timestamp
- [ ] Restore functionality working
- [ ] 30-day retention policy enforced
- [ ] Error notifications sent
- [ ] Tests passing

🧪 Testing:
1. Trigger manual backup
2. Verify backup file created
3. Add test data
4. Restore from backup
5. Verify data restored correctly

⏱️ Estimated Time: 3-4 hours

📚 References:
- Workers pattern (workers/)
- Existing services

🔗 Dependencies: Cloud storage configuration (optional)
```

---

### TASK-007: Improve UI Responsiveness for Mobile 🟡 Medium

```markdown
📋 TASK ID: TASK-007
📌 Priority: 🟡 Medium
👤 Category: Feature Development
🎯 Title: Make dashboard and tables mobile-responsive

📝 Description:
Currently UI is not optimized for mobile/tablet devices:
- Tables not readable on small screens
- Dashboard metrics stack poorly
- Navigation menu not mobile-friendly
- Pagination controls hard to use on mobile

Requirements:
- Mobile-first responsive design
- Hamburger menu for navigation
- Stackable table layout on mobile
- Touch-friendly buttons (min 44x44px)
- Test on iOS and Android

📍 Location:
- client/src/index.css (media queries)
- client/src/components/Layout/ (responsive layout)
- client/src/components/*List.tsx (table components)
- client/src/pages/Dashboard.tsx (dashboard responsive)

✅ Acceptance Criteria:
- [ ] Responsive design implemented
- [ ] Works on 320px+ screens
- [ ] Navigation mobile-friendly
- [ ] Tables readable on mobile
- [ ] Pagination works on touch
- [ ] No horizontal scrolling needed
- [ ] Tested on iOS and Android
- [ ] All tests passing

🧪 Testing:
1. Use Chrome DevTools device emulation
2. Test on actual mobile devices
3. Verify touch interactions
4. Test landscape and portrait modes

⏱️ Estimated Time: 3-4 hours

📚 References:
- CSS media queries best practices
- Mobile UX guidelines

🔗 Dependencies: None
```

---

### TASK-008: Add Advanced Search Filters 🟡 Medium

```markdown
📋 TASK ID: TASK-008
📌 Priority: 🟡 Medium
👤 Category: Feature Development
🎯 Title: Add advanced search/filter UI component

📝 Description:
Add advanced search interface with multiple filters:
- Employee code contains/exact
- Name contains
- Email contains
- Salary range (min/max)
- Join date range
- Multiple branch selection
- Status multi-select
- Save filter presets
- Export filtered results

New component: AdvancedSearchPanel.tsx

📍 Location:
- client/src/components/AdvancedSearchPanel.tsx (new component)
- client/src/services/api.ts (update query building)
- client/src/pages/Users.tsx (integrate component)

✅ Acceptance Criteria:
- [ ] Advanced filter UI created
- [ ] All filter types working
- [ ] Save/load presets working
- [ ] Filtered results accurate
- [ ] Export respects filters
- [ ] Performance acceptable (200+ users)
- [ ] Tests passing

🧪 Testing:
1. Apply various filter combinations
2. Verify results accuracy
3. Save and load filter preset
4. Test with 200 users
5. Performance acceptable (<2s load time)

⏱️ Estimated Time: 3-4 hours

📚 References:
- Existing filter patterns in PaysheetList
- React hooks (useState, useCallback)

🔗 Dependencies: None
```

---

### TASK-009: Performance: Add Caching Layer 🟠 High

```markdown
📋 TASK ID: TASK-009
📌 Priority: 🟠 High
👤 Category: Performance & Optimization
🎯 Title: Optimize database queries with Redis caching

📝 Description:
Implement Redis caching for frequently accessed data:
- Cache user list (5-min TTL)
- Cache paysheet data (5-min TTL)
- Cache role configurations (24-hr TTL)
- Cache salary calculations (12-hr TTL)
- Invalidate cache on updates
- Add cache hit rate monitoring

Current implementation has basic caching. Enhance it:
- Add cache warmup on startup
- Implement cache versioning
- Add cache statistics endpoint

📍 Location:
- server/src/services/cache.ts (enhance caching)
- server/src/plugins/redis.ts (Redis configuration)
- server/src/modules/*/routes.ts (use cache)

✅ Acceptance Criteria:
- [ ] Redis caching implemented
- [ ] Cache invalidation working
- [ ] Fallback to in-memory working
- [ ] Cache hit rate >70%
- [ ] Response time improved 50%+
- [ ] No stale data served
- [ ] Monitoring dashboard shows stats
- [ ] Tests passing

🧪 Testing & Monitoring:
1. Monitor cache hits before/after
2. Verify response times improved
3. Check data consistency
4. Test cache invalidation
5. Run load tests

⏱️ Estimated Time: 4-5 hours

📚 References:
- cache.ts (existing implementation)
- Redis configuration
- Redis best practices

🔗 Dependencies: Redis server running
```

---

### TASK-010: Add Audit Logging System 🟡 Medium

```markdown
📋 TASK ID: TASK-010
📌 Priority: 🟡 Medium
👤 Category: Feature Development
🎯 Title: Implement comprehensive audit logging

📝 Description:
Add audit trail for all important actions:
- User CRUD operations (who, when, what changed)
- Payroll operations (creation, updates, deletions)
- Paysheet modifications
- Exports (who exported what, when)
- Login/logout events (already logged)
- Admin actions

New table: AuditLog
Fields: id, action, userId, targetType, targetId, changes, timestamp, ipAddress

Endpoints:
- GET /api/audit-logs (admin only)
- GET /api/audit-logs/:userId (filtered by user)

📍 Location:
- server/prisma/schema.prisma (add AuditLog model)
- server/src/services/auditService.ts (new)
- server/src/modules/*/routes.ts (add audit calls)
- server/src/modules/admin/ (audit log endpoints)

✅ Acceptance Criteria:
- [ ] AuditLog table created
- [ ] All CRUD operations logged
- [ ] Audit endpoints working
- [ ] Log entries contain all required data
- [ ] Can filter by date range
- [ ] Performance not affected
- [ ] Tests passing

🧪 Testing:
1. Perform CRUD operations
2. Check audit logs created
3. Verify all details logged
4. Test filtering
5. Performance check

⏱️ Estimated Time: 3-4 hours

📚 References:
- Winston logger pattern
- Database migration pattern

🔗 Dependencies: None
```

---

## 🚀 PRIORITY MATRIX

| Priority | Task ID | Title | Impact | Effort |
|----------|---------|-------|--------|--------|
| 🔴 Critical | TASK-002 | Fix pagination bug | High | 1-2 hrs |
| 🟠 High | TASK-005 | Email notifications | High | 4-5 hrs |
| 🟠 High | TASK-009 | Redis caching optimization | High | 4-5 hrs |
| 🟡 Medium | TASK-001 | New role "Finance Manager" | Medium | 2-3 hrs |
| 🟡 Medium | TASK-003 | Role validation tests | Medium | 3-4 hrs |
| 🟡 Medium | TASK-004 | CSV export feature | Medium | 2-3 hrs |
| 🟡 Medium | TASK-006 | Database backup system | Medium | 3-4 hrs |
| 🟡 Medium | TASK-007 | Mobile responsive UI | Medium | 3-4 hrs |
| 🟡 Medium | TASK-008 | Advanced search filters | Medium | 3-4 hrs |
| 🟡 Medium | TASK-010 | Audit logging system | Medium | 3-4 hrs |

---

## 📊 DEVELOPMENT ROADMAP

### Sprint 1 (Week 1)
- [ ] TASK-002: Fix critical pagination bug
- [ ] TASK-001: Add Finance Manager role
- [ ] TASK-003: Create role test suite

### Sprint 2 (Week 2)
- [ ] TASK-004: CSV export feature
- [ ] TASK-007: Mobile responsive UI
- [ ] TASK-008: Advanced search filters

### Sprint 3 (Week 3)
- [ ] TASK-005: Email notifications
- [ ] TASK-006: Database backup system
- [ ] TASK-010: Audit logging

### Sprint 4 (Week 4)
- [ ] TASK-009: Redis caching optimization
- [ ] Bug fixes & polish
- [ ] Performance testing

---

## ✅ DEFINITION OF DONE

For each task to be considered complete:

1. **Code**
   - [ ] Implementation complete
   - [ ] Code follows project standards
   - [ ] No console errors/warnings
   - [ ] ESLint passing

2. **Testing**
   - [ ] Unit tests written & passing
   - [ ] Integration tests passing
   - [ ] Manual testing completed
   - [ ] Edge cases handled

3. **Documentation**
   - [ ] Code comments added
   - [ ] README updated if needed
   - [ ] API docs updated
   - [ ] Architecture decisions documented

4. **Review**
   - [ ] Code reviewed by peer
   - [ ] No critical issues
   - [ ] Performance acceptable
   - [ ] Security review passed

5. **Deployment**
   - [ ] Build successful
   - [ ] No breaking changes
   - [ ] Migration scripts ready (if needed)
   - [ ] Rollback plan documented

---

## 🔧 TOOLS & RESOURCES

### Development Tools
- Git for version control
- Postman for API testing (use `PMS_API_Collection.postman_collection.json`)
- VS Code for development
- Chrome DevTools for debugging

### Documentation
- FEATURES_GUIDE.md - All features overview
- API_REFERENCE.md - Complete API documentation
- TESTING_GUIDE.md - Testing procedures
- This file - Task assignments

### Code References
- server/src/modules/ - Module implementations
- client/src/components/ - React components
- server/src/__tests__/ - Test examples

---

## 📞 GETTING HELP

When assigning tasks:
1. Point agent to FEATURES_GUIDE.md for context
2. Share relevant code files in API_REFERENCE.md
3. Provide links to existing implementations
4. Share test files as examples
5. Clarify acceptance criteria

---

**Last Updated:** April 11, 2026  
**Document Version:** 1.0  
**Total Available Tasks:** 10+  
**Estimated Total Effort:** 35-45 hours

