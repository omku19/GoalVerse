# Goalverse Project Audit Summary

Generated for the current implementation on branch `codex/goalverse-mvp`.

## 1. Project Overview

Goalverse is a role-based employee goal management and performance tracking MVP.

Primary roles:

- `HR_ADMIN`: owns organization setup, departments, users, and organization visibility.
- `MANAGER`: approves team goals, monitors team progress, and reviews quarterly submissions.
- `EMPLOYEE`: creates goals, tracks progress, submits quarterly check-ins, and views manager feedback.

Core stack:

- Frontend: React, Vite, JavaScript, Tailwind CSS, Recharts, lucide-react
- Backend: Node.js, Express.js, JavaScript
- Database: PostgreSQL on Neon
- ORM: Prisma
- Auth: JWT with bcrypt password hashing
- Validation: Zod on backend routes

Main local URLs:

- Frontend: `http://localhost:5173/login`
- Backend API: `http://localhost:5000/api`

## 2. Current Database Counts

These counts were checked against the current Neon database after seeding and local workflow testing.

| Entity | Current Count |
|---|---:|
| Users | 12 |
| Departments | 4 |
| Goals | 6 |
| Quarterly check-ins | 2 |
| Activity logs | 6 |
| Notifications | 1 |

User count by role:

| Role | Count |
|---|---:|
| HR Admin | 3 |
| Manager | 3 |
| Employee | 6 |

Goal count by status:

| Status | Approval Status | Count |
|---|---|---:|
| `DRAFT` | `PENDING` | 1 |
| `ACTIVE` | `APPROVED` | 2 |
| `AT_RISK` | `APPROVED` | 1 |
| `COMPLETED` | `APPROVED` | 1 |
| `SUBMITTED` | `APPROVED` | 1 |

Seed baseline after the enhancement reset:

- The seed script creates 4 departments, 2 standard HR users, 3 managers, 6 employees, 6 demo goals, 2 quarterly check-ins, and 1 HR notification.
- If `ADMIN_EMAIL` in `.env` is different from `hr1@goalverse.com`, the seed also creates that configured admin as an extra HR user.
- The previous ad hoc test goal named `increase sale` was removed during the database reset.

## 3. Seeded Demo Accounts

Default password for all seeded demo accounts:

```text
Password@123
```

HR users:

| Email | Name | Notes |
|---|---|---|
| `hr1@goalverse.com` | Aarav Mehta | Main documented HR demo account |
| `hr2@goalverse.com` | Maya Rao | Secondary HR account |
| Configured `ADMIN_EMAIL` | Om Admin | Created only when `.env ADMIN_EMAIL` differs from `hr1@goalverse.com` |

Managers:

| Email | Department | Reports |
|---|---|---|
| `manager1@goalverse.com` | Revenue Operations | employee1, employee2 |
| `manager2@goalverse.com` | Product Engineering | employee3, employee4 |
| `manager3@goalverse.com` | Customer Success | employee5, employee6 |

Employees:

| Email | Department | Manager |
|---|---|---|
| `employee1@goalverse.com` | Revenue Operations | manager1 |
| `employee2@goalverse.com` | Revenue Operations | manager1 |
| `employee3@goalverse.com` | Product Engineering | manager2 |
| `employee4@goalverse.com` | Product Engineering | manager2 |
| `employee5@goalverse.com` | Customer Success | manager3 |
| `employee6@goalverse.com` | Customer Success | manager3 |

## 4. Main User Flow

### HR Admin Flow

1. HR logs in with email/password.
2. HR lands on the HR Command Center.
3. HR can create departments.
4. HR can create users with role, department, manager, job title, email, and password.
5. HR can view organization goal health, department stats, and all goals.
6. HR can query all users, departments, goals, check-ins, analytics, activity logs, and notifications through APIs.

Implemented in:

- Backend: `backend/src/routes/mvpRoutes.js`
- Frontend: `frontend/src/pages/dashboards/WorkspaceDashboard.jsx`

### Employee Flow

1. Employee logs in.
2. Employee sees My Goal Workspace.
3. Employee creates a goal with title, description, target value, unit, quarter, and year.
4. Goal is created as `DRAFT` with `PENDING` approval.
5. Manager approves goal, changing approval to `APPROVED` and status to `ACTIVE`.
6. Employee can update progress on active goals.
7. Employee can submit a quarterly check-in.
8. Submitted goal becomes `SUBMITTED`, which prevents normal progress edits through the API.
9. Employee can view manager feedback after review.

### Manager Flow

1. Manager logs in.
2. Manager sees Manager Team Workspace.
3. Manager sees team goals scoped to direct reports.
4. Manager sees pending approvals.
5. Manager can approve a pending goal, set priority, and set deadline.
6. Manager can reject a pending goal with a comment.
7. Manager sees submitted quarterly check-ins.
8. Manager can add review feedback.

## 5. Database Schema

### Enums

`Role`

- `HR_ADMIN`
- `ADMIN`
- `MANAGER`
- `EMPLOYEE`

Note: `ADMIN` exists in the enum but is not used in the current app flow.

`GoalStatus`

- `DRAFT`
- `ACTIVE`
- `PAUSED`
- `AT_RISK`
- `COMPLETED`
- `SUBMITTED`
- `ARCHIVED`

`ApprovalStatus`

- `PENDING`
- `APPROVED`
- `REJECTED`

`Priority`

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### Department

Table: `departments`

Fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Department name |
| `slug` | String unique | URL/system-friendly name |
| `description` | String nullable | Optional description |
| `parentDepartmentId` | UUID nullable | Optional hierarchy |
| `isActive` | Boolean | Soft active flag |
| `createdAt` | DateTime | Created timestamp |
| `updatedAt` | DateTime | Updated timestamp |

Relationships:

- One department has many users.
- One department has many goals.
- One department has many activity logs.
- Department can have parent/child departments.

### User

Table: `users`

Fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `departmentId` | UUID nullable | User department |
| `managerId` | UUID nullable | Self-referencing manager |
| `firstName` | String | First name |
| `lastName` | String | Last name |
| `email` | String unique | Login email |
| `passwordHash` | String nullable | bcrypt hash |
| `role` | Enum | HR, manager, employee |
| `jobTitle` | String nullable | Role title |
| `avatarUrl` | String nullable | Not used in UI yet |
| `isActive` | Boolean | Login enabled/disabled |
| `lastLoginAt` | DateTime nullable | Updated on login |
| `createdAt` | DateTime | Created timestamp |
| `updatedAt` | DateTime | Updated timestamp |

Relationships:

- User belongs to one department.
- User may report to another user as manager.
- User may have many direct reports.
- User owns many goals.
- User can create many goals.
- User can approve many goals.
- User can submit many quarterly check-ins.
- User can review many quarterly check-ins.
- User can create activity logs.
- User can receive and trigger notifications.

### Goal

Table: `goals`

Fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `ownerId` | UUID | Employee owner |
| `createdById` | UUID | Creator |
| `approvedById` | UUID nullable | Manager approver |
| `departmentId` | UUID nullable | Goal department |
| `parentGoalId` | UUID nullable | Optional hierarchy |
| `title` | String | Goal name |
| `description` | Text nullable | Goal detail |
| `targetValue` | Float | Target amount |
| `unit` | UnitType enum | One of Min, Max, Timeline, Zero |
| `status` | Enum | Lifecycle status |
| `approvalStatus` | Enum | Approval status |
| `priority` | Enum | Manager-set priority |
| `progress` | Int | Current progress |
| `employeeNote` | Text nullable | Latest employee note |
| `managerComment` | Text nullable | Approval/rejection comment |
| `startDate` | Date nullable | Not heavily used |
| `dueDate` | Date nullable | Manager deadline |
| `quarter` | Int nullable | Goal quarter |
| `year` | Int nullable | Goal year |
| `approvedAt` | DateTime nullable | Approval time |
| `archivedAt` | DateTime nullable | Archive time |
| `createdAt` | DateTime | Created timestamp |
| `updatedAt` | DateTime | Updated timestamp |

Relationships:

- Goal belongs to owner user.
- Goal belongs to creator user.
- Goal may belong to approver user.
- Goal may belong to department.
- Goal can have parent/child goals.
- Goal has many quarterly check-ins.
- Goal has many activity logs.
- Goal has many notifications.

### QuarterlyCheckin

Table: `quarterly_checkins`

Fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `goalId` | UUID | Submitted goal |
| `submittedById` | UUID | Employee submitter |
| `reviewedById` | UUID nullable | Manager reviewer |
| `quarter` | Int | Quarter |
| `year` | Int | Year |
| `progress` | Int | Final submitted progress |
| `status` | String | Employee selected final status |
| `submissionStatus` | String | `submitted` or `reviewed` |
| `wins` | Text nullable | Employee notes |
| `blockers` | Text nullable | Employee blockers |
| `nextSteps` | Text nullable | Employee next steps |
| `reviewerNotes` | Text nullable | Manager feedback |
| `submittedAt` | DateTime nullable | Submission time |
| `reviewedAt` | DateTime nullable | Review time |
| `createdAt` | DateTime | Created timestamp |
| `updatedAt` | DateTime | Updated timestamp |

Constraints:

- Unique on `goalId`, `quarter`, `year`, so one check-in per goal per quarter.

Relationships:

- Check-in belongs to one goal.
- Check-in belongs to one submitting employee.
- Check-in may belong to one reviewing manager.

### ActivityLog

Table: `activity_logs`

Fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `actorId` | UUID nullable | Acting user |
| `goalId` | UUID nullable | Related goal |
| `departmentId` | UUID nullable | Related department |
| `action` | String | Event key |
| `entityType` | String | Entity category |
| `entityId` | UUID nullable | Entity id |
| `summary` | String nullable | Human-readable event |
| `metadata` | Json nullable | Extra event data |
| `ipAddress` | Inet nullable | Not currently populated |
| `userAgent` | Text nullable | Not currently populated |
| `createdAt` | DateTime | Created timestamp |
| `updatedAt` | DateTime | Updated timestamp |

Relationships:

- Activity log may belong to actor user.
- Activity log may belong to goal.
- Activity log may belong to department.

### Notification

Table: `notifications`

Fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `recipientId` | UUID | Receiver |
| `actorId` | UUID nullable | Triggering user |
| `goalId` | UUID nullable | Related goal |
| `type` | String | Notification type |
| `title` | String | Short title |
| `message` | Text | Body |
| `data` | Json nullable | Extra payload |
| `readAt` | DateTime nullable | Read timestamp |
| `createdAt` | DateTime | Created timestamp |
| `updatedAt` | DateTime | Updated timestamp |

Relationships:

- Notification belongs to recipient user.
- Notification may belong to actor user.
- Notification may belong to goal.

## 6. API Surface

### Auth

| Method | Endpoint | Roles | Status |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Implemented |
| POST | `/api/auth/logout` | Authenticated | Implemented as stateless logout |
| GET | `/api/auth/me` | Authenticated | Implemented |

### Departments

| Method | Endpoint | Roles | Status |
|---|---|---|---|
| GET | `/api/departments` | HR | Implemented |
| POST | `/api/departments` | HR | Implemented |
| PUT | `/api/departments/:id` | HR | Implemented |
| GET | `/api/departments/:id/managers` | HR | Implemented |
| GET | `/api/departments/stats` | HR | Implemented |

### Users

| Method | Endpoint | Roles | Status |
|---|---|---|---|
| GET | `/api/users` | HR | Implemented |
| POST | `/api/users` | HR | Implemented |
| GET | `/api/users/:id` | HR, Manager | Implemented |
| PUT | `/api/users/:id` | HR | Implemented |
| PATCH | `/api/users/:id/deactivate` | HR | Implemented |
| GET | `/api/users/:id/goals` | HR, Manager | Implemented |

### Goals

| Method | Endpoint | Roles | Status |
|---|---|---|---|
| GET | `/api/goals` | All scoped by role | Implemented |
| POST | `/api/goals` | Employee | Implemented |
| GET | `/api/goals/:id` | All scoped by role | Implemented |
| PUT | `/api/goals/:id` | Employee | Implemented |
| DELETE | `/api/goals/:id` | Employee | Implemented |
| PATCH | `/api/goals/:id/approve` | Manager | Implemented |
| PATCH | `/api/goals/:id/reject` | Manager | Implemented |
| PATCH | `/api/goals/:id/progress` | Employee | Implemented |
| PATCH | `/api/goals/:id/complete` | Employee | Implemented |

### Check-ins, Logs, Notifications, Dashboards

| Method | Endpoint | Roles | Status |
|---|---|---|---|
| POST | `/api/checkins` | Employee | Implemented |
| GET | `/api/checkins` | All scoped by role | Implemented |
| PATCH | `/api/checkins/:id/review` | Manager | Implemented |
| GET | `/api/activity-logs` | Authenticated | Implemented |
| GET | `/api/notifications` | Authenticated | Implemented |
| PATCH | `/api/notifications/:id/read` | Authenticated owner | Implemented |
| GET | `/api/dashboard/employee` | Employee | Implemented |
| GET | `/api/dashboard/manager` | Manager | Implemented |
| GET | `/api/dashboard/hr` | HR | Implemented |
| GET | `/api/analytics/completion-rate` | HR | Implemented |
| GET | `/api/analytics/department-comparison` | HR | Implemented |
| GET | `/api/analytics/delayed-goals` | HR | Implemented |

## 7. Dashboard Contents

### Shared Dashboard Elements

All dashboards include:

- Goalverse heading
- Signed-in user identity
- Quarter filter
- Year filter
- Current quarter button
- Apply filter button
- Summary cards:
  - Total goals
  - Active goals
  - Pending goals
  - Completed goals
- Loading state
- Success/error message banners

### HR Dashboard: HR Command Center

Current frontend panels:

- Organization Setup
  - Add department form
  - Create user form
  - Role selector
  - Department selector
  - Manager selector filtered by department
  - Password field
- Goal Health
  - Pie chart using active, pending, completed, and delayed counts
- Department Stats
  - Department list
  - Manager count per department
  - Employee count per department
- All Goals
  - Read-only table of all visible goals
  - Owner, progress, status, approval status

Backend supports more than the UI currently exposes:

- User edit
- User deactivate
- Department update
- Department stats endpoint
- Analytics endpoints
- Activity logs endpoint
- Notifications endpoint

### Manager Dashboard: Manager Team Workspace

Current frontend panels:

- Pending Approvals
  - Pending team goals
  - Approve action
  - Reject action
- Submitted Quarterly Check-ins
  - Check-ins ready for review
  - Review action
- Team Goals
  - Read-only team goal table
  - Progress bars
  - Status badges
  - Approval badges

Implementation detail:

- Approve, reject, and review actions now use custom styled modal dialogs.

### Employee Dashboard: My Goal Workspace

Current frontend panels:

- Create Goal
  - Goal name
  - Description
  - Target value
  - Unit
  - Quarter
  - Year
- My Goals
  - Goal list
  - Progress bars
  - Status badges
  - Manager comments
  - Update progress action
  - Submit quarterly check-in action
- Manager Feedback
  - Shows check-in feedback or pending feedback state
- Progress Mix
  - Bar chart of goal progress percentages

Implementation detail:

- Progress update and check-in submission now use custom styled modal dialogs.

## 8. Important Logic Implemented

### Authentication

- Passwords are hashed with bcrypt.
- Login validates email/password.
- Login rejects inactive users.
- JWT contains user id, email, and role.
- Frontend persists token and user profile in local storage.
- Protected frontend routes redirect unauthenticated users to login.
- Role mismatches redirect to unauthorized page.

Estimated implementation: 90%

Correctness confidence: 85%

Notes:

- Logout is stateless; it clears local token client-side but does not blacklist JWTs.
- No refresh-token flow.

### Role-Based Access

- Backend enforces role middleware for protected routes.
- Employee goal access is scoped to own goals.
- Manager goal/check-in access is scoped to direct reports.
- HR can view organization-level data.

Estimated implementation: 85%

Correctness confidence: 80%

Notes:

- Manager `ensureGoalAccess` allows access if owner is direct report or in same department. Main list endpoints use direct reports, but detail access has a department fallback.
- More security tests are recommended before production.

### Department and User Management

- HR can create departments.
- HR can list departments.
- HR can update departments through API.
- HR can create users.
- HR can list users with filters.
- HR can update and deactivate users through API.
- Employee creation requires manager.
- Manager creation requires department.

Estimated implementation: 80%

Correctness confidence: 78%

Notes:

- UI currently supports create department and create user.
- UI does not yet expose edit/deactivate user.
- UI does not show a polished "no manager available" warning, although the empty manager dropdown makes the state visible.

### Goal Lifecycle

Implemented lifecycle:

```text
Employee creates goal
-> status DRAFT, approval PENDING
-> Manager approves
-> status ACTIVE, approval APPROVED
-> Employee updates progress/status
-> Employee submits quarterly check-in
-> status SUBMITTED
-> Manager reviews check-in
-> check-in submissionStatus REVIEWED
```

Estimated implementation: 85%

Correctness confidence: 80%

Notes:

- Rejected goals can be edited because `PUT /goals/:id` allows `approvalStatus=REJECTED`.
- Submitted goals are locked from progress updates because `PATCH /progress` only allows active/paused/at-risk/completed.
- HR unlock capability requested in the original spec is not implemented.

### Progress Logic

- Progress must be non-negative.
- Progress cannot exceed target value.
- If progress reaches target value, status automatically becomes `COMPLETED`.
- Progress is displayed as `progress / targetValue`.
- Progress percentage is calculated as:

```text
min(100, round((progress / max(targetValue, 1)) * 100))
```

Estimated implementation: 80%

Correctness confidence: 82%

Notes:

- Progress is stored as `Int`; target is stored as `Float`.
- Timeline and Zero units now have dedicated scoring behavior.

### Quarterly Submission Logic

- Employee can submit check-in only for approved active-like goals.
- One check-in per goal per quarter/year is enforced by DB unique constraint.
- Submitting a check-in changes the goal status to `SUBMITTED`.
- Manager review sets reviewer, review date, feedback, and `submissionStatus=reviewed`.

Estimated implementation: 82%

Correctness confidence: 80%

Notes:

- Duplicate check-ins rely on Prisma/database error handling instead of a friendly pre-check.
- Bulk quarterly submission is not implemented.

### Analytics and Dashboard Logic

Dashboard stats calculate:

```text
total = visible goals count
completed = goals where status is COMPLETED
pending = goals where approvalStatus is PENDING
active = goals where status is ACTIVE, AT_RISK, or PAUSED
delayed = goals where status is AT_RISK
submitted = goals where status is SUBMITTED
```

Completion rate endpoint calculates:

```text
completed = goals where status is COMPLETED OR progress >= targetValue
rate = round((completed / total) * 100)
```

Estimated implementation: 78%

Correctness confidence: 76%

Notes:

- HR analytics endpoints exist, but the frontend only directly visualizes the dashboard chart, not all analytics endpoints.
- Completion logic differs slightly between dashboard `completed` and analytics `completion-rate`.

## 9. Feature Completion Estimate

These are practical MVP estimates, not formal QA scores.

| Area | Implemented % | Correct Logic Confidence % | Notes |
|---|---:|---:|---|
| Authentication | 90 | 85 | JWT and bcrypt work; no refresh/blacklist |
| Role-based APIs | 85 | 80 | Mostly scoped; detail fallback should be reviewed |
| HR department management | 75 | 78 | Create/list in UI; update API exists |
| HR user management | 75 | 78 | Create/list in UI; update/deactivate API exists |
| Employee goal creation | 90 | 85 | Working create flow |
| Manager approval/rejection | 90 | 84 | Working with custom modals |
| Progress tracking | 88 | 84 | Min, Max, Timeline, and Zero scoring now implemented |
| Quarterly submissions | 82 | 80 | Per-goal check-ins work |
| Manager review feedback | 85 | 82 | Working review action |
| Dashboards | 80 | 78 | Useful but compact MVP UI |
| Analytics | 75 | 78 | HR dashboard now includes status, department, and manager charts |
| Notifications | 45 | 65 | Backend exists; no visible bell/dropdown UI |
| Activity logs | 55 | 70 | Backend writes logs; no rich UI timeline |
| Deployment readiness | 75 | 75 | README included; no deployed URLs |

Overall MVP implementation estimate: 80%

Overall correct-logic confidence: 78%

## 10. Known Bugs, Gaps, and Risks

### High Priority

1. HR cycle management is not implemented.
   - Original spec asks HR to open/close goal cycles.
   - Current app uses quarter/year fields but does not prevent goal creation outside active cycles.

2. HR goal unlock is not implemented.
   - Original spec says HR can unlock submitted goals.
   - Current submitted goals are locked from normal employee progress updates, but no HR unlock endpoint exists.

3. Manager detail access has a department fallback.
   - `ensureGoalAccess` allows manager access when goal owner is in same department.
   - Requirement says assigned manager should act on goals.
   - Approval/rejection/review correctly check assigned manager, but detail read should probably be direct-report only.

4. Frontend workflow actions now use custom modals, but the forms can still be made richer.
   - Approval, rejection, progress updates, submissions, and review feedback no longer use browser prompts.
   - A future polish pass can add deeper field-level validation and multi-step review states.

### Medium Priority

5. User edit/deactivate exists in API but not in UI.

6. Department update exists in API but not in UI.

7. Notifications exist in API but no notification bell/dropdown UI is implemented.

8. Activity logs exist but no full audit log UI exists.

9. Analytics endpoints exist but HR dashboard does not fully show all analytics endpoints.

10. Goal delete exists in API but no delete button in current employee dashboard.

11. Rejected goal resubmission has API support through editing, but the UI does not show a dedicated "resubmit rejected goal" button.

12. Progress is stored as integer, so decimal progress is rounded.

14. Duplicate quarterly submission errors are not converted into a friendly message.

15. UI is desktop-first as requested; mobile polish is limited.

### Lower Priority

16. `ADMIN` enum exists but is unused.

17. `parentGoalId` and department hierarchy exist but are not used in the MVP UI.

18. `avatarUrl`, `ipAddress`, and `userAgent` fields exist but are not populated.

19. Sidebar is minimal and mostly links to dashboards.

20. Frontend bundle has a Vite chunk-size warning because Recharts and app code are bundled together. It does not block the build.

## 11. Recommended Fix Order

1. Add HR cycle model and enforce active quarter/year on goal create/update.
2. Add HR unlock endpoint and UI action for submitted goals.
3. Add deeper field-level validation to the new modals.
4. Tighten manager read access to direct reports only.
5. Add HR user edit/deactivate UI.
6. Add activity log UI for HR and per-goal audit history.
7. Add notification bell/dropdown.
8. Add richer analytics cards/charts using existing analytics endpoints.
9. Add friendly duplicate check-in error handling.
10. Add tests for role scoping and workflow transitions.

## 12. Files That Matter Most

Backend:

- `backend/prisma/schema.prisma`: database schema and relationships.
- `backend/prisma/seed.js`: demo data seed.
- `backend/src/routes/mvpRoutes.js`: MVP business API.
- `backend/src/routes/authRoutes.js`: auth routes.
- `backend/src/services/authService.js`: login/current-user logic.
- `backend/src/middleware/authMiddleware.js`: JWT and role checks.
- `backend/src/middleware/errorHandler.js`: centralized API errors.

Frontend:

- `frontend/src/pages/dashboards/WorkspaceDashboard.jsx`: all role dashboards and workflow actions.
- `frontend/src/pages/dashboards/EmployeeDashboard.jsx`: employee dashboard wrapper.
- `frontend/src/pages/dashboards/ManagerDashboard.jsx`: manager dashboard wrapper.
- `frontend/src/pages/dashboards/HrAdminDashboard.jsx`: HR dashboard wrapper.
- `frontend/src/context/AuthContext.jsx`: frontend auth state.
- `frontend/src/routes/AppRoutes.jsx`: protected routing.
- `frontend/src/services/api.js`: API client and auth storage.

Docs:

- `README.md`: setup, seed, run, deployment, and demo flow.

## 13. Current Demo Readiness

The app is hackathon-demo ready for the core story:

```text
HR logs in
-> views organization dashboard
-> creates department/user
Employee logs in
-> creates goal
Manager logs in
-> approves goal
Employee logs in
-> updates progress and submits check-in
Manager logs in
-> reviews check-in
HR logs in
-> sees organization visibility
```

Best demo accounts:

```text
HR: hr1@goalverse.com / Password@123
Manager: manager1@goalverse.com / Password@123
Employee: employee1@goalverse.com / Password@123
```

Best current quarter/year for seeded data:

```text
Q2 2026
```

## 14. Final Assessment

Goalverse currently has a working full-stack MVP with real authentication, role-specific dashboards, seeded organization data, a PostgreSQL schema, goal approval workflow, progress tracking, quarterly submissions, and manager reviews.

It is strong enough for a hackathon demo and beginner-readable enough for continued development. The main remaining work is not the core backend flow; it is production polish, stricter edge-case enforcement, HR cycle/unlock controls, and deeper validation around the new modal workflows.
