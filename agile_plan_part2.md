# GoalVerse — Agile Plan (Part 2: Sprints 4–6)

> Continuation of the Agile Development Plan. See `implementation_plan.md` for Sprints 1–3.

---

## Sprint 4 — Approval Workflow

### Sprint Goal
Managers can see team goals pending approval, approve or reject with comments, and set priority. By sprint end: the full goal approval lifecycle works end-to-end.

### Features to Build
- Manager views team's pending goals
- Approve goal (sets `approval_status=approved`, `status=in_progress`)
- Reject goal (sets `approval_status=rejected`, manager adds comment)
- Manager assigns/changes priority on approval
- Employee sees approval status update
- Employee can edit and resubmit rejected goals

### Database Changes
- No schema changes
- Update operations on `goals.approval_status`, `goals.priority`, `goals.manager_comment`

### Backend Tasks
1. `GET /api/goals?approval_status=pending` — manager's pending approvals (scoped to team)
2. `PATCH /api/goals/:id/approve` — approve goal, set priority
3. `PATCH /api/goals/:id/reject` — reject goal with comment
4. Authorization: only the assigned manager can approve/reject
5. Validation: goal must be in `pending` approval status
6. On approval: auto-set `status=in_progress`
7. On rejection: allow employee to edit and resubmit

### Frontend Tasks
1. Manager Pending Approvals tab/page
2. Pending goal cards with employee name, goal details
3. Approve modal — priority selector + optional comment
4. Reject modal — required comment field
5. Status updates reflected in employee's goal view
6. Employee: "Rejected" badge with manager comment visible
7. Employee: "Resubmit" button on rejected goals
8. Manager sidebar: Pending Approvals badge with count

### API Requirements
| Method | Endpoint | Auth | Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/goals?approval_status=pending&scope=team` | Yes | Manager | Pending goals |
| PATCH | `/api/goals/:id/approve` | Yes | Manager | Approve goal |
| PATCH | `/api/goals/:id/reject` | Yes | Manager | Reject goal |

### Validation Rules
- Only the employee's assigned manager can approve/reject
- Goal must be in `approval_status=pending`
- Reject requires `manager_comment` (non-empty)
- Priority on approve: enum `[critical, high, medium, low]`
- Employee can only resubmit if `approval_status=rejected`

### Dashboard Components
- Manager: Pending Approvals count badge
- Manager: Pending approvals table with action buttons
- Employee: Approval status indicator on each goal

### User Flow Impact
- Complete create → approve → active flow works
- Employee creates goal → Manager approves → Goal becomes In Progress
- Rejected goals can be revised and resubmitted

### Git Commit Breakdown
```
commit 1: feat(api): manager pending approvals endpoint (team-scoped)
commit 2: feat(api): approve goal endpoint with priority assignment
commit 3: feat(api): reject goal endpoint with required comment
commit 4: feat(api): authorization — only assigned manager can act
commit 5: feat(ui): manager pending approvals page
commit 6: feat(ui): approve modal with priority selector
commit 7: feat(ui): reject modal with required comment
commit 8: feat(ui): employee goal view — approval status + manager comment
commit 9: feat(ui): employee resubmit rejected goal flow
commit 10: feat(ui): pending approval count badge in manager sidebar
```

### Testing Checklist
- [ ] Manager sees only their team's pending goals
- [ ] Manager cannot see other teams' goals
- [ ] Approve sets approval_status=approved, status=in_progress
- [ ] Reject sets approval_status=rejected with comment
- [ ] Reject without comment fails validation
- [ ] Priority is set during approval
- [ ] Employee sees updated approval status
- [ ] Employee sees manager comment on rejection
- [ ] Employee can edit and resubmit rejected goals
- [ ] Resubmitted goal returns to pending status
- [ ] Non-manager cannot access approve/reject endpoints
- [ ] Already approved/rejected goal cannot be re-actioned

### Expected Output After Sprint
Full approval workflow is functional. Goals flow from creation through approval to active status. Managers have a clear queue of pending approvals. Employees get feedback on rejected goals.

---

## Sprint 5 — Progress Tracking

### Sprint Goal
Employees can update live progress on approved goals, change status, and add notes. Managers see the latest snapshot of team progress. By sprint end: real-time progress visibility works.

### Features to Build
- Employee updates `current_progress` on active goals
- Employee updates status: On Track / Delayed / Completed
- Employee adds notes/comments to goals
- Progress bar visualization based on UoM type
- Manager Team Overview — latest progress snapshot
- Activity log entries for progress changes
- Early completion marking

### Database Changes
- No schema changes
- Update operations on `goals.current_progress`, `goals.status`
- Insert operations on `activity_logs`

### Backend Tasks
1. `PATCH /api/goals/:id/progress` — update progress + status + note
2. Validation: only employee who owns goal can update
3. Validation: goal must be `status=in_progress` (approved)
4. Validation: progress cannot exceed target (for numeric/percentage)
5. Auto-log to `activity_logs`: action_type, old_value, new_value
6. `PATCH /api/goals/:id/complete` — mark as completed early
7. `GET /api/goals?scope=team` — manager team view with latest progress
8. `GET /api/activity-logs?goal_id=:id` — goal activity history

### Frontend Tasks
1. Progress update form — slider or input based on UoM type
2. Status dropdown: On Track / Delayed / Completed
3. Notes textarea for update context
4. Progress bar component (adapts to UoM type)
5. Goal card: show progress bar + status badge
6. Manager Team Overview tab — table with all team goals + progress
7. Manager: click employee row → see their goals
8. Goal activity timeline (list of updates)
9. "Mark Complete" button with confirmation

### API Requirements
| Method | Endpoint | Auth | Roles | Purpose |
|---|---|---|---|---|
| PATCH | `/api/goals/:id/progress` | Yes | Employee | Update progress |
| PATCH | `/api/goals/:id/complete` | Yes | Employee | Mark complete |
| GET | `/api/goals?scope=team` | Yes | Manager | Team progress |
| GET | `/api/activity-logs?goal_id=:id` | Yes | All | Goal history |

### Validation Rules
- Progress: must be >= 0, <= target_value (numeric/percentage)
- Status change: enum `[on_track, delayed, completed]`
- Only goal owner can update progress
- Goal must be in `in_progress` or `approved` status
- Completed goals: set `current_progress = target_value` auto
- Note: optional, max 500 chars

### Dashboard Components
- Employee: progress bars on each goal card
- Employee: status badges (color-coded: green=on track, yellow=delayed, blue=completed)
- Manager: Team Overview table with employee name, goal, progress %, status

### User Flow Impact
- Employees actively update progress throughout the quarter
- Managers see a live snapshot without notification spam
- Activity log provides audit trail

### Git Commit Breakdown
```
commit 1: feat(api): progress update endpoint with validation
commit 2: feat(api): auto-log progress changes to activity_logs
commit 3: feat(api): mark goal complete endpoint
commit 4: feat(api): team progress view for managers
commit 5: feat(api): activity log retrieval endpoint
commit 6: feat(ui): progress update form with UoM-aware input
commit 7: feat(ui): progress bar component (numeric/percentage/timeline)
commit 8: feat(ui): status badges with color coding
commit 9: feat(ui): manager team overview table
commit 10: feat(ui): goal activity timeline
commit 11: feat(ui): mark complete button with confirmation
```

### Testing Checklist
- [ ] Employee can update progress on approved goals only
- [ ] Progress validation works per UoM type
- [ ] Status changes reflected immediately
- [ ] Activity log records every progress change with old/new values
- [ ] Manager sees latest progress snapshot for all team goals
- [ ] Manager does NOT see intermediate update notifications
- [ ] Early completion sets status correctly
- [ ] Progress bar renders correctly for each UoM type
- [ ] Non-owner cannot update another employee's goal
- [ ] Completed goal progress equals target value

### Expected Output After Sprint
Live progress tracking is fully operational. Employees update goals in real-time. Managers have a clear team overview. Activity logs provide an audit trail. The system is ready for quarterly submissions.

---

## Sprint 6 — Quarterly Submissions & Manager Review

### Sprint Goal
Employees submit official quarterly reviews. Submissions lock goal editing. Managers review submissions and add feedback. By sprint end: the complete quarterly review cycle works.

### Features to Build
- Employee quarterly submission form
- Submit final progress, status, completion notes, reason if incomplete
- Submission locks goal from further employee editing
- Manager review interface for submissions
- Manager adds feedback to submissions
- Submission state machine: Pending → Submitted → Reviewed

### Database Changes
- No schema changes
- Insert operations on `quarterly_checkins`
- Update `goals.status` to `submitted` on submission

### Backend Tasks
1. `POST /api/checkins` — submit quarterly check-in
2. `GET /api/checkins?quarter=X&year=Y` — list check-ins (scoped)
3. `GET /api/checkins/:id` — check-in detail
4. `PATCH /api/checkins/:id/review` — manager adds feedback
5. On submission: lock goal (prevent employee edits)
6. Validation: one check-in per goal per quarter
7. Validation: only approved/in-progress goals can be submitted
8. Auto-populate: `submitted_at`, `submission_status=submitted`
9. On review: set `reviewed_at`, `submission_status=reviewed`

### Frontend Tasks
1. Quarterly Submission page — list of active goals with submission form
2. For each goal: final progress input, status dropdown, notes textarea
3. "Submit Quarter Review" button — bulk or per-goal
4. Confirmation dialog: "This will lock your goals for editing"
5. Post-submission: goals show "Submitted" badge, editing disabled
6. Manager: Submissions Review tab — list of team submissions
7. Manager: review modal — view submission details, add feedback
8. Employee: see manager feedback after review
9. Submission status badges: Pending / Submitted / Reviewed

### API Requirements
| Method | Endpoint | Auth | Roles | Purpose |
|---|---|---|---|---|
| POST | `/api/checkins` | Yes | Employee | Submit check-in |
| GET | `/api/checkins` | Yes | All | List check-ins |
| GET | `/api/checkins/:id` | Yes | All | Check-in detail |
| PATCH | `/api/checkins/:id/review` | Yes | Manager | Add feedback |

### Validation Rules
- One check-in per goal per quarter (unique constraint)
- Final progress: required, valid for UoM type
- Status: required, enum `[completed, delayed, abandoned]`
- Employee note: optional, max 1000 chars
- Manager feedback: optional on review, max 1000 chars
- Cannot submit for goals not in `in_progress`/`approved` status
- Cannot edit goal after submission exists for that quarter
- Only assigned manager can review

### Dashboard Components
- Employee: Quarterly Submission section with submit button
- Employee: Manager feedback display after review
- Manager: Submissions tab with review actions

### User Flow Impact
- End-of-quarter: employees submit official reviews
- Submissions lock goals — no more edits
- Managers review and provide feedback
- Complete quarterly cycle: Create → Approve → Track → Submit → Review

### Git Commit Breakdown
```
commit 1: feat(api): quarterly check-in submission endpoint
commit 2: feat(api): check-in listing and detail endpoints
commit 3: feat(api): goal locking on submission
commit 4: feat(api): manager review endpoint with feedback
commit 5: feat(api): validation — one check-in per goal per quarter
commit 6: feat(ui): quarterly submission page with goal list
commit 7: feat(ui): submission form per goal (progress, status, notes)
commit 8: feat(ui): submission confirmation and lock warning
commit 9: feat(ui): post-submission locked state UI
commit 10: feat(ui): manager submissions review tab
commit 11: feat(ui): manager review modal with feedback
commit 12: feat(ui): employee view of manager feedback
```

### Testing Checklist
- [ ] Employee can submit check-in for active goals
- [ ] Duplicate check-in for same goal+quarter is rejected
- [ ] Goal editing is locked after submission
- [ ] Submission populates `submitted_at` and `submission_status`
- [ ] Manager sees team submissions in review tab
- [ ] Manager can add feedback to submission
- [ ] Review sets `reviewed_at` and `submission_status=reviewed`
- [ ] Employee sees manager feedback after review
- [ ] Only assigned manager can review
- [ ] Status badges update correctly through workflow
- [ ] Cannot submit for draft/pending/rejected goals

### Expected Output After Sprint
The complete goal lifecycle works end-to-end: Create → Approve → Track Progress → Submit Quarterly → Manager Review. This is the **core MVP milestone**. The system is functionally complete for basic usage.

---

> [!IMPORTANT]
> **MVP Checkpoint**: After Sprint 6, the core product is usable. Sprints 7–8 add dashboards, analytics, and polish but the system is functional without them.
