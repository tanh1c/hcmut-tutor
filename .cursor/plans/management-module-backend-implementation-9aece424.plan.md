---
name: Kế hoạch Triển khai Backend Management Module
overview: ""
todos:
  - id: 186edc30-4574-4d08-bee3-2f4599808e4c
    content: "Implement UC-M1: Accept/Reject Requests API - Tạo routes/management/approvals với các endpoints approve, reject, clarify, escalate. Implement business logic validate requests, notify stakeholders, update system, handle 48-hour deadline."
    status: pending
  - id: 6e16d7c9-9152-42e2-adb7-889285880a23
    content: "Implement UC-M7: Manage User Permissions API - Tạo routes/management/permissions với các endpoints list users, update permissions, revoke permissions, grant temporary permissions. Implement sync với HCMUT_DATACORE (mock), audit logging."
    status: pending
  - id: 8f906130-b3f0-4d58-adf3-5b943146c948
    content: "Implement UC-M2: Optimize Resource Allocation API - Tạo routes/management/resources với các endpoints overview, identify inefficiencies, optimize, apply optimization, manual override. Implement resource optimization logic trong lib/services/resourceOptimizer.ts."
    status: pending
  - id: 8abc0592-ddee-46ae-99f8-37495410c728
    content: "Implement UC-M3: Create Progress Reports API - Tạo routes/management/reports/progress với các endpoints list, create, get, export reports. Implement report generation logic trong lib/services/reportGenerator.ts với support PDF/Excel export."
    status: pending
  - id: a1a7627f-64e4-43b8-810b-35e1b2cc675e
    content: "Implement UC-M4: Analyze Academic Performance API - Tạo routes/management/analytics/performance với các endpoints analyze, compare, get KPIs. Implement performance analysis logic trong lib/services/performanceAnalyzer.ts."
    status: pending
  - id: 740c3f58-db0a-4a42-9cb0-7b8dd7a6fb9f
    content: "Implement UC-M5: Award Training Credits API - Tạo routes/management/credits với các endpoints get eligible students, award credits, get history, revoke credits. Implement credit awarding logic với policy validation, duplicate check, audit logging."
    status: pending
  - id: 73b26b82-2ae7-4638-b881-601b15ba358f
    content: "Implement UC-M6: Manage Document Sharing API - Tạo routes/management/documents với các endpoints list, upload, update, delete, share, manage access. Implement document management logic với file validation, encryption, malware scanning, access control."
    status: pending
  - id: e2c1f338-b922-4daf-9ca2-6ffb0dc62658
    content: "Implement UC-M8: Facilitate Online Community API - Tạo routes/management/community với các endpoints manage forums, share resources, create events, restrict access. Implement community management logic với access control, encryption, activity logging."
    status: pending
  - id: fbb24737-afdf-41ff-8e24-c99ca4c3424c
    content: Tạo seed data cho management module - Mở rộng data/approvals.json, tạo data/permissions-audit.json, data/resource-allocation.json, data/progress-reports.json, data/analytics.json, data/training-credits.json, data/document-sharing.json, data/community-resources.json. Tạo scripts/seed-management.ts để generate seed data.
    status: pending
  - id: 640b3709-d4a1-4526-907c-2da1449c65a4
    content: Update types và schemas - Mở rộng lib/types.ts với types cho management features (ApprovalRequest, ResourceAllocation, ProgressReport, PerformanceAnalysis, TrainingCredit, DocumentSharing, CommunityResource, PermissionAudit). Thêm validation schemas vào lib/schemas.ts.
    status: pending
  - id: 24672a90-4cbc-449b-89a5-20a05f144a09
    content: Integrate management routes vào server - Update server.ts để thêm tất cả management routes. Update lib/middleware.ts với authorization cho management roles. Test tất cả endpoints với Postman/Thunder Client.
    status: pending
  - id: 46716036-2479-44a0-b22e-533eb983fe14
    content: Update frontend để integrate với backend APIs - Update src/pages/management/ApprovalRequests.tsx, AwardCredits.tsx, ReportsAnalytics.tsx để sử dụng real APIs thay vì mock data. Test end-to-end workflows.
    status: pending
---

# Kế hoạch Triển khai Backend Management Module

## Tổng quan

Triển khai đầy đủ API backend và seed data cho module Management dựa trên 9 UC scenarios trong `md/management_uc.md`. Hệ thống hiện tại đã có Express server, JSON storage, và một số routes cơ bản. Cần bổ sung các API routes và business logic cho management features.

## Cấu trúc hiện tại

- **Backend**: Express server tại `server.ts`, JSON storage tại `lib/storage.ts`
- **Routes**: Auth, Users, Sessions, Classes, Enrollments, Notifications, Progress, Evaluations, Forum, Session Requests
- **Management UI**: Dashboard, ApprovalRequests, AwardCredits, ReportsAnalytics (đang dùng mock data)
- **Data files**: `data/users.json`, `data/approvals.json`, `data/sessions.json`, etc.

## UC Scenarios cần implement

1. **UC-M1**: Accept/Reject Requests - Quản lý yêu cầu từ tutors và students
2. **UC-M2**: Optimize Resource Allocation - Tối ưu hóa phân bổ tài nguyên
3. **UC-M3**: Create Progress Reports - Tạo báo cáo tiến độ
4. **UC-M4**: Analyze Academic Performance - Phân tích hiệu suất học thuật
5. **UC-M5**: Award Training Credits - Trao tín chỉ đào tạo
6. **UC-M6**: Manage Document Sharing - Quản lý chia sẻ tài liệu
7. **UC-M7**: Manage User Permissions - Quản lý quyền người dùng
8. **UC-M8**: Facilitate Online Community - Tạo điều kiện cộng đồng trực tuyến
9. **UC-M9**: SSO Authentication - Xác thực SSO (đã có sẵn)

## Phân chia công việc

### Phase 1: Core Management APIs (UC-M1, UC-M7)

#### 1.1. Approval Requests API (UC-M1)

**Files cần tạo:**

- `routes/management/approvals/index.ts` - List, create approval requests
- `routes/management/approvals/[id].ts` - Get, approve, reject, request clarification
- `lib/schemas.ts` - Thêm schemas cho approval requests (đã có một phần)

**API Endpoints:**

```
GET    /api/management/approvals              # List approvals (với filters)
POST   /api/management/approvals              # Create approval request
GET    /api/management/approvals/:id          # Get approval detail
PUT    /api/management/approvals/:id/approve  # Approve request
PUT    /api/management/approvals/:id/reject   # Reject request
PUT    /api/management/approvals/:id/clarify  # Request clarification
POST   /api/management/approvals/:id/escalate # Escalate to Academic Affairs
```

**Business Logic:**

- Validate request format và data
- Check coordinator permissions
- Notify stakeholders khi approve/reject
- Update hệ thống dựa trên quyết định (sessions, groups, resources)
- Implement 48-hour review deadline
- Handle escalation to Academic Affairs Office

**Seed Data:**

- Mở rộng `data/approvals.json` với các loại requests:
  - Session change requests (cancel/reschedule)
  - Tutor verification requests
  - Group modification requests
  - Resource allocation requests
  - Schedule change requests

#### 1.2. User Permissions API (UC-M7)

**Files cần tạo:**

- `routes/management/permissions/index.ts` - List users, view permissions
- `routes/management/permissions/[userId].ts` - Get, update user permissions
- `lib/schemas.ts` - Thêm schemas cho permissions

**API Endpoints:**

```
GET    /api/management/permissions/users      # List users với permissions
GET    /api/management/permissions/users/:id  # Get user permissions
PUT    /api/management/permissions/users/:id  # Update user permissions
POST   /api/management/permissions/users/:id/revoke  # Revoke permissions
POST   /api/management/permissions/users/:id/temporary  # Grant temporary permissions
```

**Business Logic:**

- Validate administrator/coordinator permissions
- Sync với HCMUT_DATACORE (mock)
- Log all permission changes for audit
- Prevent conflicting role assignments
- Handle permission revocation

**Seed Data:**

- Mở rộng `data/users.json` với management users có đầy đủ permissions
- Tạo `data/permissions-audit.json` để track permission changes

### Phase 2: Resource & Analytics APIs (UC-M2, UC-M3, UC-M4)

#### 2.1. Resource Allocation API (UC-M2)

**Files cần tạo:**

- `routes/management/resources/index.ts` - Resource optimization
- `routes/management/resources/optimize.ts` - Optimize resource allocation
- `lib/services/resourceOptimizer.ts` - Resource optimization logic

**API Endpoints:**

```
GET    /api/management/resources/overview     # Resource overview
GET    /api/management/resources/inefficiencies  # Identify inefficiencies
POST   /api/management/resources/optimize     # Generate optimization plan
POST   /api/management/resources/apply        # Apply optimization
POST   /api/management/resources/manual-override  # Manual override
```

**Business Logic:**

- Analyze tutor workload
- Balance group sizes
- Detect resource conflicts
- Suggest reallocations
- Validate against HCMUT policies
- Notify affected parties

**Seed Data:**

- Tạo `data/resource-allocation.json` để track allocations
- Mở rộng `data/sessions.json` với resource allocation data
- Mở rộng `data/availability.json` với tutor availability

#### 2.2. Progress Reports API (UC-M3)

**Files cần tạo:**

- `routes/management/reports/progress.ts` - Create progress reports
- `lib/services/reportGenerator.ts` - Report generation logic

**API Endpoints:**

```
GET    /api/management/reports/progress       # List progress reports
POST   /api/management/reports/progress       # Create progress report
GET    /api/management/reports/progress/:id   # Get report detail
GET    /api/management/reports/progress/:id/export  # Export report (PDF/Excel)
PUT    /api/management/reports/progress/:id   # Update report
```

**Business Logic:**

- Fetch session data, attendance, evaluations
- Compile progress data
- Generate reports với filters (student, tutor, department, time range)
- Export to PDF/Excel
- Store reports for future access
- Log report creation for audit

**Seed Data:**

- Tạo `data/progress-reports.json` để store reports
- Mở rộng `data/progress.json` với detailed progress data
- Mở rộng `data/evaluations.json` với evaluation data

#### 2.3. Academic Performance Analysis API (UC-M4)

**Files cần tạo:**

- `routes/management/analytics/performance.ts` - Academic performance analysis
- `lib/services/performanceAnalyzer.ts` - Performance analysis logic

**API Endpoints:**

```
GET    /api/management/analytics/performance  # Get performance analysis
POST   /api/management/analytics/performance  # Generate analysis với filters
GET    /api/management/analytics/performance/compare  # Compare performance
GET    /api/management/analytics/performance/kpis     # Get KPIs
```

**Business Logic:**

- Analyze student performance
- Analyze tutor effectiveness
- Calculate KPIs (attendance, ratings, completion rates)
- Generate comparative analysis
- Create visualizations data
- Handle insufficient data cases

**Seed Data:**

- Tạo `data/analytics.json` để store analytics data
- Mở rộng `data/evaluations.json` với detailed evaluation data
- Mở rộng `data/sessions.json` với attendance data

### Phase 3: Credits & Document Management (UC-M5, UC-M6)

#### 3.1. Award Training Credits API (UC-M5)

**Files cần tạo:**

- `routes/management/credits/index.ts` - Award training credits
- `lib/services/creditAwarder.ts` - Credit awarding logic

**API Endpoints:**

```
GET    /api/management/credits/eligible       # Get eligible students
POST   /api/management/credits/award          # Award credits to student(s)
GET    /api/management/credits/history        # Get credit award history
PUT    /api/management/credits/:id/revoke     # Revoke credits (if needed)
```

**Business Logic:**

- Validate eligibility against policy rules
- Check for duplicate awards (BR-1: one per session/semester)
- Update student profile
- Log award action với timestamp và staff ID
- Notify students về awards
- Handle policy violations

**Seed Data:**

- Tạo `data/training-credits.json` để track credits
- Mở rộng `data/users.json` với credit information
- Tạo policy rules trong `lib/config.ts`

#### 3.2. Document Sharing Management API (UC-M6)

**Files cần tạo:**

- `routes/management/documents/index.ts` - Manage documents
- `routes/management/documents/share.ts` - Share documents
- `lib/services/documentManager.ts` - Document management logic

**API Endpoints:**

```
GET    /api/management/documents              # List documents
POST   /api/management/documents              # Upload document
GET    /api/management/documents/:id          # Get document detail
PUT    /api/management/documents/:id          # Update document
DELETE /api/management/documents/:id          # Delete document
POST   /api/management/documents/:id/share    # Share document
GET    /api/management/documents/:id/access   # Get access permissions
PUT    /api/management/documents/:id/access   # Update access permissions
```

**Business Logic:**

- Validate file type và size
- Encrypt và store documents securely
- Manage access permissions
- Scan for malware/prohibited content
- Log all document activities
- Integrate với HCMUT_LIBRARY (mock)

**Seed Data:**

- Mở rộng `data/library.json` với management documents
- Tạo `data/document-sharing.json` để track sharing activities
- Tạo `data/document-permissions.json` để track access

### Phase 4: Community Management (UC-M8)

#### 4.1. Online Community Management API (UC-M8)

**Files cần tạo:**

- `routes/management/community/index.ts` - Community management
- `routes/management/community/forums.ts` - Forum management
- `lib/services/communityManager.ts` - Community management logic

**API Endpoints:**

```
GET    /api/management/community/forums       # List forums
POST   /api/management/community/forums       # Create forum
PUT    /api/management/community/forums/:id   # Update forum
DELETE /api/management/community/forums/:id   # Delete forum
POST   /api/management/community/forums/:id/pin    # Pin forum
POST   /api/management/community/forums/:id/lock   # Lock forum
GET    /api/management/community/resources    # List shared resources
POST   /api/management/community/resources    # Share resource
PUT    /api/management/community/resources/:id/restrict  # Restrict access
POST   /api/management/community/events       # Create virtual event
```

**Business Logic:**

- Manage discussion forums
- Share resources với access control
- Organize virtual events
- Encrypt sensitive resources
- Log all community activities
- Enforce community guidelines
- Integrate với HCMUT_LIBRARY (mock)

**Seed Data:**

- Mở rộng `data/forum-posts.json` với management posts
- Tạo `data/community-resources.json` để track shared resources
- Tạo `data/community-events.json` để track virtual events

### Phase 5: Integration & Testing

#### 5.1. Update Existing Routes

**Files cần sửa:**

- `server.ts` - Thêm management routes
- `lib/middleware.ts` - Thêm authorization cho management roles
- `lib/schemas.ts` - Thêm validation schemas cho management APIs

#### 5.2. Seed Data Generation

**Files cần tạo/sửa:**

- `scripts/seed-management.ts` - Generate seed data cho management
- Mở rộng `lib/seed.ts` với management data generators

**Seed Data cần tạo:**

- Approval requests (various types)
- Resource allocation data
- Progress reports
- Analytics data
- Training credits
- Document sharing records
- Community resources và events
- Permission audit logs

#### 5.3. Type Definitions

**Files cần sửa:**

- `lib/types.ts` - Thêm types cho management features:
  - ApprovalRequest (mở rộng)
  - ResourceAllocation
  - ProgressReport
  - PerformanceAnalysis
  - TrainingCredit
  - DocumentSharing
  - CommunityResource
  - PermissionAudit

## Implementation Details

### Authentication & Authorization

- Tất cả management APIs yêu cầu authentication
- Sử dụng `authorize(UserRole.MANAGEMENT)` middleware
- Check specific permissions trong Management user object
- Log all management actions for audit

### Error Handling

- Validate input với Zod schemas
- Return proper error codes (400, 401, 403, 404, 500)
- Log errors với context
- Provide meaningful error messages

### Notifications

- Integrate với notification system hiện có
- Notify stakeholders khi có thay đổi
- Send notifications cho approvals, resource changes, etc.

### Business Rules Implementation

- UC-M1: 48-hour review deadline
- UC-M2: Balance group sizes, tutor workload limits
- UC-M3: Report must contain student/tutor IDs, attendance, performance
- UC-M4: Include attendance và performance metrics
- UC-M5: One credit per session/semester, policy compliance
- UC-M6: File type/size validation, encryption, malware scanning
- UC-M7: Permission sync với HCMUT_DATACORE, audit logging
- UC-M8: Access control, community guidelines, encryption for sensitive content

## Testing Strategy

1. **Unit Tests**: Test business logic functions
2. **Integration Tests**: Test API endpoints
3. **E2E Tests**: Test complete workflows
4. **Manual Testing**: Test với Postman/Thunder Client

## Timeline

- **Week 1**: Phase 1 (Approval Requests, User Permissions)
- **Week 2**: Phase 2 (Resource Allocation, Reports, Analytics)
- **Week 3**: Phase 3 (Credits, Document Management)
- **Week 4**: Phase 4 (Community Management) + Phase 5 (Integration & Testing)

## Success Criteria

- Tất cả 9 UC scenarios được implement đầy đủ
- API endpoints hoạt động đúng với business rules
- Seed data đầy đủ cho testing
- Frontend có thể integrate với backend APIs
- Documentation đầy đủ cho các APIs