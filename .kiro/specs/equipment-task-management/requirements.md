# Requirements Document

## Introduction

The equipment-task-management feature extends the existing Muzuka Gilbert production management system (Phase 3) to support a full equipment lifecycle workflow. It introduces an equipment inventory system, ties equipment assignments directly to project tasks and their staff assignees, and adds a media submission pathway so photographers and video editors can upload deliverables straight from their assigned task into the client gallery. The workflow runs from admin task creation → staff assignment → production manager equipment assignment → field work → media submission → equipment return approval.

All capabilities are built on the existing STAFF user role; no new database role enum is added. Production Manager capabilities are surfaced through a dedicated permission flag on the User model. Photographer and Video Editor are informal designations already tracked through `StaffAssignment.role` and `ProjectTask` assignee patterns already in the codebase.

## Glossary

- **System**: The Muzuka Gilbert Next.js web application.
- **Admin**: A user whose `role` is `FOUNDER` or `ADMIN`.
- **Production_Manager**: A user whose `role` is `STAFF` and whose `isProductionManager` flag is `true`.
- **Staff_Member**: A user whose `role` is `STAFF` (includes Production Managers, Photographers, Video Editors).
- **Photographer**: A Staff_Member assigned to a project task with a role designation of `"Photographer"`.
- **Video_Editor**: A Staff_Member assigned to a project task with a role designation of `"Video Editor"`.
- **Task**: A `ProjectTask` record linked to a `Project`, representing a discrete unit of work.
- **Task_Assignee**: The `User` referenced by `ProjectTask.assigneeId`.
- **Equipment_Category**: A named grouping of equipment items (e.g. Camera, Audio, Lighting, Transport).
- **Equipment_Item**: An individual physical tool tracked in the inventory with name, serial number, category, and condition.
- **Equipment_Assignment**: A record linking an Equipment_Item to a Task_Assignee on a specific Task, representing a loan of equipment for that task.
- **Return_Request**: A request submitted by a Task_Assignee to return an Equipment_Item after task completion.
- **Media_Submission**: The act of a Task_Assignee uploading photos or videos from their task directly into the Gallery linked to the task's project.
- **Gallery**: The `Gallery` record linked to the `Booking` that belongs to the `Project` that contains the Task.
- **Condition_Status**: The physical state of an Equipment_Item — one of `EXCELLENT`, `GOOD`, `FAIR`, `DAMAGED`.
- **Equipment_Status**: The availability state of an Equipment_Item — one of `AVAILABLE`, `ASSIGNED`, `UNDER_MAINTENANCE`, `RETIRED`.

---

## Requirements

### Requirement 1: Equipment Category Management

**User Story:** As a Production Manager, I want to create and manage equipment categories, so that I can organise the inventory into logical groups like Camera, Audio, Lighting, and Transport.

#### Acceptance Criteria

1. THE System SHALL provide a category name field that accepts between 1 and 100 characters.
2. WHEN a Production_Manager submits a valid new category name, THE System SHALL persist the Equipment_Category and return it in subsequent category listings.
3. IF a Production_Manager submits a category name that is identical (case-insensitive) to an existing Equipment_Category name, THEN THE System SHALL reject the request and return an error message stating the category already exists.
4. WHEN a Production_Manager updates an Equipment_Category name, THE System SHALL apply the change and reflect the new name on all Equipment_Items that belong to that category.
5. WHEN a Production_Manager requests deletion of an Equipment_Category that has no Equipment_Items, THE System SHALL permanently delete the category.
6. IF a Production_Manager requests deletion of an Equipment_Category that has one or more Equipment_Items, THEN THE System SHALL reject the deletion, return an error indicating the category contains equipment, and SHALL NOT partially delete or modify the category.
7. THE System SHALL list all Equipment_Categories ordered alphabetically by name.

---

### Requirement 2: Equipment Item Inventory

**User Story:** As a Production Manager, I want to add and manage individual equipment items with full details, so that I have an accurate inventory of every tool available for assignment.

#### Acceptance Criteria

1. WHEN a Production_Manager creates an Equipment_Item, THE System SHALL require: item name (1–150 characters), Equipment_Category, and Condition_Status.
2. WHERE a serial number is provided, THE System SHALL store the serial number and enforce uniqueness across all Equipment_Items.
3. THE System SHALL set the initial Equipment_Status of every new Equipment_Item to `AVAILABLE`.
4. WHEN a Production_Manager updates an Equipment_Item's Condition_Status, THE System SHALL persist the new condition without changing the Equipment_Status.
5. WHEN a Production_Manager sets an Equipment_Item's Equipment_Status to `UNDER_MAINTENANCE` or `RETIRED`, THE System SHALL prevent that item from appearing in assignment candidate lists.
6. IF a Production_Manager attempts to set an Equipment_Item to `UNDER_MAINTENANCE` or `RETIRED` while it has an active Equipment_Assignment, THEN THE System SHALL reject the status change and return an error indicating the item is currently assigned.
7. THE System SHALL list all Equipment_Items with their name, category, serial number, Condition_Status, and Equipment_Status, and SHALL support filtering by Equipment_Category and Equipment_Status.

---

### Requirement 3: Task-Level Staff Assignment

**User Story:** As an Admin, I want to assign a specific photographer or video editor to an individual project task, so that each team member knows exactly which task they own and can upload media and request equipment returns for it.

#### Acceptance Criteria

1. WHEN an Admin sets a `ProjectTask.assigneeId`, THE System SHALL validate that the referenced user has `role = STAFF` and `approvalStatus = APPROVED`.
2. WHEN an Admin changes the `ProjectTask.assigneeId` to a different Staff_Member, THE System SHALL update the assignment and preserve all existing Equipment_Assignments and media uploads linked to that task.
3. IF an Admin attempts to assign a `ProjectTask` to a user whose `role` is `CLIENT`, THEN THE System SHALL reject the request and return an error message.
4. THE System SHALL allow a single Task to have at most one Task_Assignee at a time.
5. WHEN an Admin removes a Task_Assignee from a task that has active Equipment_Assignments, THE System SHALL block the removal and return an error indicating outstanding equipment must be returned first.

---

### Requirement 4: Equipment Assignment to Task Assignees

**User Story:** As a Production Manager, I want to assign specific equipment items to the photographer or video editor responsible for a task, so that accountability for physical gear is tracked at the task level.

#### Acceptance Criteria

1. WHEN a Production_Manager creates an Equipment_Assignment, THE System SHALL require a valid Task id, a valid Equipment_Item id, and the Equipment_Item's Equipment_Status MUST be `AVAILABLE`.
2. WHEN an Equipment_Assignment is created successfully, THE System SHALL attempt to set the Equipment_Item's Equipment_Status to `ASSIGNED`; IF that status update fails, THE System SHALL retain the Equipment_Assignment record as the source of truth and SHALL log the failure for operational review.
3. IF a Production_Manager attempts to assign an Equipment_Item whose Equipment_Status is not `AVAILABLE`, THEN THE System SHALL reject the request and return an error stating the item is not available.
4. IF a Production_Manager attempts to create an Equipment_Assignment for a Task that has no Task_Assignee, THEN THE System SHALL reject the request and return an error stating the task has no assignee.
5. THE System SHALL record the date and time the Equipment_Assignment was created.
6. WHILE an Equipment_Assignment is active, THE System SHALL display the assigned item in the task detail view, showing item name, category, serial number, and assignment date.
7. THE System SHALL allow multiple Equipment_Items to be assigned to the same Task.

---

### Requirement 5: Staff Task Dashboard

**User Story:** As a photographer or video editor, I want to see all project tasks assigned to me, so that I know what work I need to complete and what equipment I have been given.

#### Acceptance Criteria

1. WHEN a Staff_Member is authenticated, THE System SHALL display only the `ProjectTask` records where `ProjectTask.assigneeId` equals the authenticated user's id.
2. FOR each assigned Task, THE System SHALL display: task title, task status, project name, associated client name, task due date, and all Equipment_Items currently assigned to that task.
3. WHILE a Task's status is `IN_PROGRESS` or `TODO`, THE System SHALL show action buttons to submit media and to submit a Return_Request for each assigned Equipment_Item.
4. WHEN a Task's status changes to `DONE`, THE System SHALL hide the media submission button for that task.
5. THE System SHALL order the Staff_Member's task list by due date ascending, with tasks that have no due date appearing last.

---

### Requirement 6: Media Submission by Staff

**User Story:** As a photographer or video editor, I want to upload photos or videos for my assigned task directly into the client gallery, so that I can deliver my work without needing admin intervention for each file.

#### Acceptance Criteria

1. WHEN a Staff_Member submits a media file for a Task, THE System SHALL verify that `ProjectTask.assigneeId` equals the authenticated user's id before accepting the upload.
2. IF a Staff_Member attempts to submit media for a Task they are not assigned to, THEN THE System SHALL reject the upload and return an authorisation error.
3. WHEN a valid media file is accepted, THE System SHALL generate a presigned S3 upload URL with an expiry of 15 minutes and return it to the client.
4. AFTER a successful S3 upload is confirmed, THE System SHALL create a `MediaAsset` record in the Gallery linked to the task's Project with `releaseStatus = DRAFT`.
5. THE System SHALL accept JPEG, PNG, WebP, and RAW image formats for Photographers, and MP4, MOV, and MXF video formats for all Staff_Members.
6. IF the Gallery linked to the task's Project does not yet exist, THEN THE System SHALL return an error instructing the staff member to contact an Admin to create the gallery first.
7. WHEN a media file is successfully saved to the Gallery, THE System SHALL trigger watermark preview generation in the same manner as the existing admin upload flow.
8. THE System SHALL record the `uploadedByStaffId` on the `MediaAsset` record to identify which Staff_Member submitted each file.

---

### Requirement 7: Equipment Return Request

**User Story:** As a photographer or video editor, I want to submit an equipment return request for tools assigned to my task, so that the Production Manager can verify the return and mark the item as available again.

#### Acceptance Criteria

1. WHEN a Staff_Member submits a Return_Request, THE System SHALL require the Equipment_Assignment id and SHALL verify that the authenticated user is the Task_Assignee for that assignment's task.
2. IF the authenticated user is not the Task_Assignee for the specified Equipment_Assignment, THEN THE System SHALL reject the request and return an authorisation error.
3. WHEN a Return_Request is created successfully, THE System SHALL set the Return_Request status to `PENDING` and record the submission timestamp.
4. THE System SHALL allow a Staff_Member to include an optional note of up to 500 characters describing the condition of the item on return.
5. WHILE a Return_Request is in `PENDING` status, THE System SHALL prevent the Staff_Member from submitting a duplicate Return_Request for the same Equipment_Assignment.
6. THE System SHALL list all `PENDING` Return_Requests in the Production Manager's dashboard, showing item name, task name, project name, assignee name, submission time, and any return note.

---

### Requirement 8: Return Request Approval

**User Story:** As a Production Manager, I want to approve or reject equipment return requests, so that I can confirm physical receipt of gear and update the inventory status accordingly.

#### Acceptance Criteria

1. WHEN a Production_Manager approves a Return_Request, THE System SHALL set the Return_Request status to `APPROVED`, record the approval timestamp and the Production_Manager's user id, and set the Equipment_Item's Equipment_Status to `AVAILABLE`.
2. WHEN a Production_Manager approves a Return_Request, THE System SHALL close the Equipment_Assignment by setting its `returnedAt` timestamp.
3. WHEN a Production_Manager rejects a Return_Request, THE System SHALL set the Return_Request status to `REJECTED`, record the rejection reason (required, 1–500 characters), and leave the Equipment_Item's Equipment_Status as `ASSIGNED`.
4. IF a Return_Request has already been processed (status is `APPROVED` or `REJECTED`), THEN THE System SHALL reject any further approval or rejection action on the same request and return an error.
5. WHEN a Return_Request has been approved, THE System SHALL allow the Production_Manager to update the Equipment_Item's Condition_Status at any time after approval to reflect the item's physical state, and SHALL NOT restrict this update to the moment of approval only.
6. THE System SHALL display the full approval history for each Equipment_Item, ordered by `returnedAt` descending.

---

### Requirement 9: Production Manager Role Management

**User Story:** As an Admin, I want to designate specific staff members as Production Managers, so that only authorised staff can manage equipment inventory and approve returns.

#### Acceptance Criteria

1. THE System SHALL add an `isProductionManager` boolean field to the `User` model with a default value of `false`.
2. WHEN an Admin sets a Staff_Member's `isProductionManager` to `true`, THE System SHALL immediately grant that user access to equipment management and return approval interfaces.
3. WHEN an Admin sets a Staff_Member's `isProductionManager` to `false`, THE System SHALL immediately revoke access to equipment management and return approval interfaces without affecting other STAFF permissions.
4. IF a Staff_Member whose `isProductionManager` is `false` attempts to access any equipment management endpoint, THEN THE System SHALL return a 403 response.
5. THE System SHALL display the Production Manager designation on the employee management page for Admins, showing current status and a toggle control.

---

### Requirement 10: Equipment Audit Trail

**User Story:** As an Admin, I want a complete history of every equipment assignment and return, so that I can audit accountability and investigate any incidents involving physical gear.

#### Acceptance Criteria

1. WHEN an Equipment_Assignment is created, THE System SHALL write an audit log entry containing: actor id, action `EQUIPMENT_ASSIGNED`, equipment item id, task id, and assignee id.
2. WHEN a Return_Request is approved, THE System SHALL write an audit log entry containing: actor id, action `EQUIPMENT_RETURNED`, equipment item id, task id, assignee id, and final Condition_Status.
3. WHEN an Equipment_Item's Condition_Status changes, THE System SHALL write an audit log entry containing: actor id, action `EQUIPMENT_CONDITION_UPDATED`, item id, previous condition, and new condition.
4. THE System SHALL make equipment audit entries queryable by equipment item id, by project id, and by staff member id; ALL three query methods MUST be implemented before the feature is considered complete.
5. THE System SHALL retain equipment audit entries permanently in the primary queryable system and SHALL NOT archive, move, or allow any user role to delete them.
