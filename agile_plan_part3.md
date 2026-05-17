# GoalVerse — Agile Plan (Part 3: Sprints 7–8 + Summary)

> Continuation of the Agile Development Plan. See Parts 1 & 2 for Sprints 1–6.

---

# PHASE 3: DASHBOARDS & VISIBILITY (Sprint 7)

---

## Sprint 7 — Role-Based Dashboards & Historical Filtering

### Sprint Goal
Build all three role-specific dashboards with summary cards, data tables, and historical quarter/year filtering. By sprint end: every role has a rich, informative landing page.

### Features to Build
- **Employee Dashboard**: Goal summary cards, goals table, submission status, manager feedback
- **Manager Dashboard**: Team overview cards, team table, pending approvals tab, delayed goals, employee detail view with history
- **HR/Admin Dashboard**: Org analytics cards, department breakdown, pending submissions/reviews, user management links
- **Historical Filtering**: Quarter + Year dropdowns on all dashboard views
- **Employee Detail View** (Manager): current quarter goals + past quarter history

### Database Changes
- No schema changes
- Read-heavy queries with filters

### Backend Tasks
1. `GET /api/dashboard/employee` — summary stats (total, completed, pending, in-progress)
2. `GET /api/dashboard/manager` — team stats (members, pending approvals, delayed, completed)
3. `GET /api/dashboard/hr` — org stats (employees, departments, active goals, pending reviews)
4. `GET /api/goals?quarter=X&year=Y&scope=team` — filtered goal listing
5. `GET /api/checkins?quarter=X&year=Y&scope=team` — filtered submissions
6. `GET /api/users/:id/goals?quarter=X&year=Y` — employee history (manager view)
7. `GET /api/departments/stats` — goals per department aggregation

### Frontend Tasks
1. **Employee Dashboard**
   - Summary cards: Total Goals, Completed, Pending Approval, In Progress
   - Goals table with current quarter data
   - Submission status indicators
   - Manager feedback section
2. **Manager Dashboard**
   - Summary cards: Team Members, Pending Approvals, Delayed Goals, Completed
   - Tab 1 — Team Overview: table of all team members + goal progress
   - Tab 2 — Pending Approvals: (already built in Sprint 4, integrate here)
   - Employee Detail View: click employee → modal/page with full history
3. **HR/Admin Dashboard**
   - Summary cards: Total Employees, Departments, Active Goals, Pending Reviews
   - Department-wise breakdown table
   - Pending employee submissions list
   - Pending manager reviews list
4. **Historical Filters** (all dashboards)
   - Quarter dropdown (Q1–Q4)
   - Year dropdown
   - "Current Quarter" quick button
   - Filters update all dashboard data

### API Requirements
| Method | Endpoint | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/dashboard/employee` | Yes | Employee | Employee stats |
| GET | `/api/dashboard/manager` | Yes | Manager | Team stats |
| GET | `/api/dashboard/hr` | Yes | HR | Org stats |
| GET | `/api/users/:id/goals` | Yes | Manager, HR | Employee goal history |
| GET | `/api/departments/stats` | Yes | HR | Dept analytics |

### Validation Rules
- Quarter filter: 1–4 or empty (all)
- Year filter: valid year or empty (all)
- Role-scoping: employee sees own, manager sees team, HR sees all
- No data mutation in this sprint — read-only endpoints

### Dashboard Components
All three dashboards fully built with cards, tables, tabs, and filters.

### User Flow Impact
- Every user now has a meaningful landing page after login
- Historical data is accessible for all roles
- Manager can drill into individual employee performance

### Git Commit Breakdown
```
commit 1: feat(api): employee dashboard stats endpoint
commit 2: feat(api): manager dashboard stats endpoint
commit 3: feat(api): HR dashboard stats endpoint
commit 4: feat(api): employee goal history endpoint
commit 5: feat(api): department stats aggregation endpoint
commit 6: feat(ui): employee dashboard — summary cards
commit 7: feat(ui): employee dashboard — goals table + feedback section
commit 8: feat(ui): manager dashboard — summary cards
commit 9: feat(ui): manager dashboard — team overview tab
commit 10: feat(ui): manager dashboard — employee detail view
commit 11: feat(ui): HR dashboard — summary cards + department breakdown
commit 12: feat(ui): HR dashboard — pending submissions/reviews lists
commit 13: feat(ui): quarter/year filter component (shared)
commit 14: feat(ui): integrate filters into all dashboards
```

### Testing Checklist
- [ ] Employee dashboard shows correct stats for own goals
- [ ] Manager dashboard shows correct team stats
- [ ] HR dashboard shows correct org-wide stats
- [ ] Quarter/year filters update data on all dashboards
- [ ] "Current Quarter" quick filter works
- [ ] Manager employee detail view shows current + past quarters
- [ ] HR department stats aggregate correctly
- [ ] Role-scoping enforced — no cross-role data leaks
- [ ] Empty state handled gracefully (new quarter, no data)
- [ ] Dashboard cards show live counts

### Expected Output After Sprint
All three role dashboards are fully functional with summary cards, data tables, and historical filtering. The application feels complete and usable.

---

# PHASE 4: ANALYTICS & POLISH (Sprint 8)

---

## Sprint 8 — Analytics, Notifications & Final Polish

### Sprint Goal
Add organization analytics, optional notifications, activity logs UI, and polish the entire application. By sprint end: the MVP is hackathon-ready.

### Features to Build
- **Analytics** (HR Dashboard): completion rates, department comparisons, delayed goal trends
- **Activity Logs UI**: viewable timeline per goal
- **Notifications** (optional): goal submitted, approved/rejected, check-in submitted, delayed
- **UI Polish**: loading states, empty states, error handling, responsive design
- **Final integration testing**

### Database Changes
- Insert operations on `notifications` table (if implemented)
- No schema changes

### Backend Tasks
1. `GET /api/analytics/completion-rate?quarter=X&year=Y` — % goals completed
2. `GET /api/analytics/department-comparison` — completion by department
3. `GET /api/analytics/delayed-goals` — delayed goal count by department/time
4. `GET /api/notifications` — user's notifications (if implemented)
5. `PATCH /api/notifications/:id/read` — mark notification as read
6. Notification triggers: integrate into existing approval/submission endpoints
7. `GET /api/activity-logs?user_id=:id` — user activity history

### Frontend Tasks
1. **Analytics Section** (HR Dashboard)
   - Completion rate chart (bar or donut)
   - Department comparison chart
   - Delayed goals trend
2. **Activity Log UI**
   - Timeline component per goal
   - Filter by action type
3. **Notifications** (optional)
   - Notification bell icon in header
   - Notification dropdown/panel
   - Unread count badge
   - Mark as read
4. **Polish**
   - Loading spinners/skeletons on all data fetches
   - Empty state messages ("No goals yet", "No pending approvals")
   - Form error messages and toast notifications
   - Responsive layout for tablet/desktop
   - Consistent color scheme and typography
   - 404 / unauthorized pages

### API Requirements
| Method | Endpoint | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/analytics/completion-rate` | Yes | HR | Completion stats |
| GET | `/api/analytics/department-comparison` | Yes | HR | Dept comparison |
| GET | `/api/analytics/delayed-goals` | Yes | HR | Delayed trends |
| GET | `/api/notifications` | Yes | All | User notifications |
| PATCH | `/api/notifications/:id/read` | Yes | All | Mark read |

### Validation Rules
- Analytics: filter by quarter/year (reuse existing filter logic)
- Notifications: scoped to `user_id` from auth
- Mark-read: only notification owner can mark

### Dashboard Components
- HR: Analytics charts section
- All roles: notification bell (if built)
- Goal detail: activity timeline

### User Flow Impact
- HR has actionable analytics for org visibility
- Users receive targeted notifications (no spam)
- Overall UX is polished and production-quality

### Git Commit Breakdown
```
commit 1: feat(api): completion rate analytics endpoint
commit 2: feat(api): department comparison analytics endpoint
commit 3: feat(api): delayed goals analytics endpoint
commit 4: feat(ui): HR analytics section with charts
commit 5: feat(ui): activity log timeline component
commit 6: feat(api): notifications CRUD endpoints (optional)
commit 7: feat(ui): notification bell and dropdown (optional)
commit 8: fix(ui): add loading spinners to all data views
commit 9: fix(ui): add empty state messages
commit 10: fix(ui): form validation error displays
commit 11: fix(ui): responsive layout adjustments
commit 12: fix(ui): 404 and unauthorized pages
commit 13: chore: final integration testing and bug fixes
```

### Testing Checklist
- [ ] Analytics endpoints return correct aggregated data
- [ ] Completion rate calculates correctly per quarter
- [ ] Department comparison shows accurate breakdowns
- [ ] Charts render with real data
- [ ] Activity log timeline displays in correct order
- [ ] Notifications created on trigger events (if built)
- [ ] Notification mark-as-read works
- [ ] Loading states show on all async data fetches
- [ ] Empty states display appropriate messages
- [ ] Form errors display correctly
- [ ] App is responsive on different screen sizes
- [ ] 404 page renders for invalid routes
- [ ] Unauthorized redirects work correctly
- [ ] **Full end-to-end flow works**: Login → Create Goal → Approve → Track → Submit → Review → Dashboard

### Expected Output After Sprint
**MVP is complete and hackathon-ready.** All core workflows function end-to-end. Dashboards provide visibility for all roles. Analytics give HR actionable insights. The app is polished with proper loading/error/empty states.

---

# PROJECT SUMMARY

## Phase & Sprint Mapping

| Phase | Sprint | Focus | Milestone |
|---|---|---|---|
| 1: Foundation | Sprint 1 | Auth, Roles, DB Schema | Users can login |
| 1: Foundation | Sprint 2 | Departments, User Management | Org structure built |
| 2: Core Workflow | Sprint 3 | Goal CRUD | Employees create goals |
| 2: Core Workflow | Sprint 4 | Approval Workflow | Managers approve goals |
| 2: Core Workflow | Sprint 5 | Progress Tracking | Live progress updates |
| 2: Core Workflow | Sprint 6 | Quarterly Submissions | Full review cycle |
| 3: Dashboards | Sprint 7 | Role Dashboards + Filters | All dashboards live |
| 4: Polish | Sprint 8 | Analytics + Notifications + Polish | MVP complete |

## GitHub Milestone Mapping

| GitHub Milestone | Sprints | Deliverable |
|---|---|---|
| `v0.1-foundation` | 1–2 | Auth + Org Setup |
| `v0.2-goal-workflow` | 3–4 | Goal CRUD + Approvals |
| `v0.3-tracking` | 5–6 | Progress + Submissions |
| `v0.4-mvp` | 7–8 | Dashboards + Analytics |

## Total Git Commits Estimate

| Sprint | Commits | Cumulative |
|---|---|---|
| Sprint 1 | 11 | 11 |
| Sprint 2 | 11 | 22 |
| Sprint 3 | 10 | 32 |
| Sprint 4 | 10 | 42 |
| Sprint 5 | 11 | 53 |
| Sprint 6 | 12 | 65 |
| Sprint 7 | 14 | 79 |
| Sprint 8 | 13 | 92 |
| **Total** | **~92 commits** | |

## Risk Assessment

| Risk | Impact | Mitigation |
|---|---|---|
| Scope creep on dashboards | High | Stick to cards + tables, charts only in Sprint 8 |
| Complex UoM validation | Medium | Keep timeline/zero-based simple in MVP |
| Historical filter performance | Low | Index on `quarter`, `year`, `employee_id` |
| Notification complexity | Low | Marked optional — skip if behind schedule |
| Role-based data leaks | High | Test scoping in every sprint |

## What to Cut If Behind Schedule

| Priority | Feature | Action |
|---|---|---|
| 1 (cut first) | Notifications | Skip entirely |
| 2 | Analytics charts | Use tables instead of charts |
| 3 | Activity logs UI | Keep backend logging, skip UI |
| 4 | Historical filtering | Default to current quarter only |
| **Never cut** | Auth, Goals, Approvals, Submissions, Dashboards | Core MVP |

## Post-MVP / Future Features (Do NOT Build Now)

- Email notifications
- PDF export of quarterly reviews
- Advanced appraisal scoring engine
- Multi-level approval chains
- Entra ID / SSO integration
- Teams/Slack integration
- AI-powered goal suggestions
- Mobile app
- Bulk goal import/export
- Manager-to-manager goal cascading
