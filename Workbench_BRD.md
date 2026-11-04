# Business Requirements Document (BRD)

## Aver Workbench Platform

---

| Field | Detail |
|---|---|
| **Document Title** | Business Requirements Document — Aver Workbench Platform |
| **Version** | 1.0 |
| **Date** | October 12, 2026 |
| **Status** | Draft |
| **Prepared By** | QA / Business Analysis Team |
| **Reviewed By** | — |
| **Approved By** | — |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Purpose and Scope](#2-purpose-and-scope)
3. [Stakeholders](#3-stakeholders)
4. [Glossary of Terms](#4-glossary-of-terms)
5. [Functional Requirements](#5-functional-requirements)
   - 5.1 Project Management
   - 5.2 Limiter Builder
   - 5.3 Column Set Builder
   - 5.4 Mapper Extender Builder
   - 5.5 Column Set Updates and Version History
   - 5.6 Limiter Run Execution and CSV Export
   - 5.7 Custom Export to Redshift
   - 5.8 Episode Set Definition
   - 5.9 Function Extender — Episode Totals
   - 5.10 Calculation Extender — Episode Totals
   - 5.11 Table Extender — Diagnosis Flag
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Data Requirements](#7-data-requirements)
8. [Integration Points](#8-integration-points)
9. [User Roles and Permissions](#9-user-roles-and-permissions)
10. [Assumptions and Constraints](#10-assumptions-and-constraints)
11. [Acceptance Criteria Summary](#11-acceptance-criteria-summary)

---

## 1. Executive Summary

The Aver Workbench is a healthcare analytics platform that enables analysts and project administrators to build, configure, and execute complex data filtering logic (limiters), define output formats (column sets), extend data schemas (mapper, function, calculation, and table extenders), and model clinical episodes of care. The platform provides a visual, drag-and-drop interface for constructing conditional logic, supports role-based access control, integrates with cloud data infrastructure (S3, Redshift), and delivers exportable results in CSV and database formats.

This BRD captures the business requirements derived from the core functional workflows of the Workbench platform.

---

## 2. Purpose and Scope

### 2.1 Purpose

This document defines the business requirements for the Aver Workbench platform's core asset management, data filtering, schema extension, episode modeling, and export capabilities. It serves as the authoritative reference for development, QA, and stakeholder alignment.

### 2.2 Scope

**In Scope:**
- Project creation and privilege management
- Limiter creation with AND/OR conditional logic (visual canvas)
- Column set creation with record-type-driven field selection
- Mapper extender creation with conditional case-statement logic
- Function extender creation with aggregation and limiter-based filtering
- Calculation extender creation with formula-based schema extension
- Table extender creation with CSV upload and foreign-key linking
- Episode set definition with timelines, trigger windows, and post-trigger windows
- Limiter run execution, queuing, and status tracking
- CSV export of run results via column sets
- Custom export to Redshift via configurable SQL templates
- Asset versioning and history comparison
- Role-based access control at group and datakey level

**Out of Scope:**
- Underlying EMR engine implementation details
- Infrastructure provisioning (S3 buckets, Redshift clusters)
- Custom export SQL template authoring and deployment
- Client onboarding and data ingestion pipelines

---

## 3. Stakeholders

| Role | Responsibility |
|---|---|
| **Project Admin** | Creates projects, manages privileges, oversees asset library |
| **Analyst (Internal)** | Builds limiters, column sets, extenders, episode sets; executes runs |
| **Data Engineer** | Designs and deploys custom export templates; manages Redshift schemas |
| **QA Team** | Validates all workflows end-to-end against acceptance criteria |
| **Product Owner** | Prioritizes features and approves requirements |

---

## 4. Glossary of Terms

| Term | Definition |
|---|---|
| **Limiter** | A visual, step-based filter asset that defines member/claim selection criteria using AND/OR logic on a canvas |
| **Column Set** | An asset that defines the output columns and their order for CSV/export, tied to a specific record type |
| **Mapper Extender** | An asset that appends a new computed field to a record type based on conditional case-statement logic |
| **Function Extender** | An asset that creates a new aggregated field (SUM, COUNT, etc.) by rolling up child records to a parent record type, optionally filtered by a limiter |
| **Calculation Extender** | An asset that creates a new field from a mathematical formula combining existing schema fields and extender-created fields |
| **Table Extender** | An asset that uploads a CSV reference table and joins it to the schema via foreign-key column linking |
| **Episode Set** | An asset that models clinical episodes of care using trigger limiters, timeline windows, and post-trigger periods |
| **Record Type** | The data granularity level (e.g., Medical Claim Line, Medical Claim Header, Enrollment, Diagnosis, Episode, Pharmacy Claim) |
| **Asset** | Any reusable Workbench object (limiter, column set, extender, episode set) stored in the project library |
| **Canvas** | The visual drag-and-drop workspace where limiter steps are composed |
| **Pickle File** | A serialized snapshot of asset definitions prepared before a limiter run is sent to the EMR engine |
| **Trunk** | The main branch of a project, accessed from the project list screen |
| **Datakey** | A group-level access key used to assign R/W/X permissions to roles |
| **Custom Export** | A pre-deployed SQL template on S3 that can be triggered from run results to write data to Redshift |

---

## 5. Functional Requirements

### 5.1 Project Management

**FR-5.1.1 — Create a New Project**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.1.1 |
| **Priority** | High |
| **Description** | The system shall allow a user with a privileged role (e.g., Project Admin) to create a new project from the Workbench tile. |

**Business Rules:**
- BR-5.1.1.1: The user must select a Group and a privileged Role before accessing the Workbench.
- BR-5.1.1.2: The "New Project" action shall be available at the top of the project list screen.
- BR-5.1.1.3: The user must enter a project name.
- BR-5.1.1.4: The user may create a blank project (no parent) or fork from an existing parent project.
- BR-5.1.1.5: Clicking "Save" shall persist the project and make it visible in the project list.

**FR-5.1.2 — Assign Project Privileges**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.1.2 |
| **Priority** | High |
| **Description** | The system shall allow a privileged user to assign Read (R), Write (W), and Execute (X) permissions to roles within groups for a project. |

**Business Rules:**
- BR-5.1.2.1: From the project list screen, hovering to the right of a project name shall reveal an "Edit" action.
- BR-5.1.2.2: The edit view shall display all Group datakeys. Clicking a group shall expand its roles.
- BR-5.1.2.3: Permissions (R — read_asset, W — write_asset, X — execute_asset) can be toggled per role.

**Acceptance Criteria:**
- AC-5.1.1: A new blank project can be created and appears in the project list.
- AC-5.1.2: A new forked project inherits the parent project's contents.
- AC-5.1.3: R/W/X permissions can be assigned per role and are enforced on subsequent login.

---

### 5.2 Limiter Builder

**FR-5.2.1 — Create a Limiter with Member and Claim Line Criteria**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.2.1 |
| **Priority** | High |
| **Description** | The system shall provide a visual canvas-based builder for creating limiters that filter members and claims using conditional logic steps. |

**Business Rules:**
- BR-5.2.1.1: The user shall log in to a project by clicking the orange "Trunk" label, using a role with R/W/X permissions (e.g., analyst-internal).
- BR-5.2.1.2: The "Create New" dropdown shall include a "Limiter" option.
- BR-5.2.1.3: The limiter name shall be entered along the grey bar at the top of the editor.
- BR-5.2.1.4: A "+ Step" element shall be drag-and-droppable from the upper right onto the canvas, creating a "Set step specifications" box.
- BR-5.2.1.5: Clicking a step box shall open the step configuration editor.
- BR-5.2.1.6: The default step type is "Compare", with an Element selector on the left and a Value input on the right.
- BR-5.2.1.7: The Element field shall be a "contains" search across the schema. A single field must be selected to apply; unmatched text is discarded on exit.
- BR-5.2.1.8: The comparison operator dropdown shall vary based on the data type of the selected element.
- BR-5.2.1.9: Clicking "OK" shall save the step configuration.

**FR-5.2.2 — AND / OR Logic on the Canvas**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.2.2 |
| **Priority** | High |
| **Description** | The system shall support AND logic (sequential chaining) and OR logic (branching) on the limiter canvas. |

**Business Rules:**
- BR-5.2.2.1: Dragging from the green checkmark of an existing step creates a new step connected via a green orthogonal line — this represents AND logic (all criteria in the chain must be met).
- BR-5.2.2.2: Dragging a second step from the same green checkmark creates a branch — this represents OR logic (data may match either or both paths).
- BR-5.2.2.3: All directly connected steps above an endpoint are evaluated. Any path ending without an endpoint is a dead-end and yields no results.

**FR-5.2.3 — Endpoint Step**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.2.3 |
| **Priority** | High |
| **Description** | The system shall allow converting a step into an endpoint that labels the matching results. |

**Business Rules:**
- BR-5.2.3.1: Clicking the step name or triad symbol and selecting "Endpoint" from the dropdown converts the step.
- BR-5.2.3.2: An endpoint step contains only a single text field for a descriptive label (e.g., "DRG values, Female Only").
- BR-5.2.3.3: A limiter without at least one endpoint is invalid and shall display an error message and not be runnable.

**FR-5.2.4 — Save and Validate Limiter**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.2.4 |
| **Priority** | High |
| **Description** | The system shall validate limiter integrity on save and prevent execution of invalid limiters. |

**Business Rules:**
- BR-5.2.4.1: A "Save" button shall appear in the lower right of the canvas once the limiter has a name.
- BR-5.2.4.2: A dropdown arrow to the right of Save shall offer "Save and Close" to return to the asset library.
- BR-5.2.4.3: The limiter shall save as long as it has a name, even if there are validation errors.
- BR-5.2.4.4: If the limiter is invalid (e.g., missing endpoint), it shall display an error message and shall not be runnable.
- BR-5.2.4.5: The limiter shall be searchable by name in the asset library search box.

**Acceptance Criteria:**
- AC-5.2.1: A limiter can be created with a Compare step using Element = "Gender" and Value = "F".
- AC-5.2.2: A second AND-chained step can be added with MS DRG Code in list (469, 470).
- AC-5.2.3: An OR branch can be created from any existing step's green checkmark.
- AC-5.2.4: An endpoint step can be created and labelled.
- AC-5.2.5: The limiter saves successfully and appears in the asset library search results.
- AC-5.2.6: An invalid limiter (no endpoint) shows an error and cannot be run.

---

### 5.3 Column Set Builder

**FR-5.3.1 — Create a Column Set**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.3.1 |
| **Priority** | High |
| **Description** | The system shall allow users to create column sets that define the output columns for exported data, tied to a specific record type. |

**Business Rules:**
- BR-5.3.1.1: The "Create New" dropdown shall include a "Column Set" option.
- BR-5.3.1.2: The column set name shall be entered along the grey bar at the top.
- BR-5.3.1.3: A record type must be selected from the dropdown in the upper right (e.g., Medical Claim Line). This dictates the granularity of output rows and the available fields.
- BR-5.3.1.4: The "Add Column" field shall be a searchable dropdown operating on "Contains" matching for all entered search words.
- BR-5.3.1.5: Clicking a field from the dropdown adds it to the lowest position in the column list.
- BR-5.3.1.6: Multiple fields may be selected (e.g., Member Date of Birth, Enrollment Effective Date, Medical Claim Header Claim ID, MS DRG, Medical Claim Line Allowed Amount, Billing Provider Full Name).
- BR-5.3.1.7: Selection is constrained by the record type — child record fields (e.g., Diagnosis fields when Medical Claim Line is selected) are not available. Changing the record type removes incompatible fields.

**FR-5.3.2 — Column Ordering and Alias Naming**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.3.2 |
| **Priority** | Medium |
| **Description** | The system shall allow drag-and-drop reordering of columns and editing of column aliases. |

**Business Rules:**
- BR-5.3.2.1: The descending order of fields in the list dictates left-to-right column order in the exported CSV.
- BR-5.3.2.2: Columns can be reordered via drag-and-drop.
- BR-5.3.2.3: The default alias is a database-friendly name (lowercase, underscores, double underscore between table and field — e.g., `member__date_of_birth`).
- BR-5.3.2.4: Clicking the alias text allows editing to a custom name (e.g., `member_dob`).

**FR-5.3.3 — Save Column Set**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.3.3 |
| **Priority** | High |
| **Description** | The system shall persist column sets and make them searchable in the asset library. |

**Business Rules:**
- BR-5.3.3.1: Save and "Save and Close" options shall be available in the lower right.
- BR-5.3.3.2: The column set shall be searchable by name in the asset library.

**Acceptance Criteria:**
- AC-5.3.1: A column set with record type "Medical Claim Line" can be created with multiple fields.
- AC-5.3.2: Columns can be reordered via drag-and-drop and the order is reflected in export.
- AC-5.3.3: Column aliases can be edited and persist after save.
- AC-5.3.4: Changing the record type removes incompatible fields from the list.
- AC-5.3.5: The column set appears in asset library search results.

---

### 5.4 Mapper Extender Builder

**FR-5.4.1 — Create a Mapper Extender**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.4.1 |
| **Priority** | High |
| **Description** | The system shall allow users to create mapper extenders that append new computed fields to a record type based on conditional case-statement logic. |

**Business Rules:**
- BR-5.4.1.1: The "Create New" dropdown shall include a "Mapper Extender" option.
- BR-5.4.1.2: The mapper extender name shall be entered along the grey bar at the top.
- BR-5.4.1.3: A field name shall be entered in the grey column under "Column Name", with a data type selected from the preceding dropdown (e.g., Text).
- BR-5.4.1.4: Multiple new fields may be created within a single mapper extender.
- BR-5.4.1.5: A record type must be selected from the "Extends record type" dropdown (e.g., Medical Claim Header).

**FR-5.4.2 — Conditional Case-Statement Rows**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.4.2 |
| **Priority** | High |
| **Description** | The system shall support multiple conditional rows with AND comparisons and a default unmatched row. |

**Business Rules:**
- BR-5.4.2.1: The "Set step specifications" section contains conditional rows. "Add New" duplicates the existing row and inserts it below.
- BR-5.4.2.2: Each row can be expanded/collapsed by clicking the arrow icon or text description.
- BR-5.4.2.3: Each row supports multiple AND comparisons (no OR logic within mapper rows).
- BR-5.4.2.4: Each record is evaluated top-down through each row and may match only one.
- BR-5.4.2.5: The grey column under the field name contains value fields — a label applied to each matching record (e.g., "Before Measurement Period (Before 2030)").
- BR-5.4.2.6: A default row ("Identifiers for unmatched records") captures all records not matching any condition above.

**Acceptance Criteria:**
- AC-5.4.1: A mapper extender with three conditional date-range rows and a default row can be created.
- AC-5.4.2: Each condition row can contain multiple AND comparisons.
- AC-5.4.3: Labels are correctly assigned to the value fields per row.
- AC-5.4.4: The mapper extender saves and appears in the asset library.
- AC-5.4.5: The new field is available in schema field searches in other assets.

---

### 5.5 Column Set Updates and Version History

**FR-5.5.1 — Update a Column Set with Extender Fields**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.5.1 |
| **Priority** | Medium |
| **Description** | The system shall allow users to add extender-created fields to an existing column set. |

**Business Rules:**
- BR-5.5.1.1: Extender fields appear in the "Add Column" search alongside native schema fields, sorted alphabetically.
- BR-5.5.1.2: Extender fields are visually distinguished by an open arrow icon, and their name format is: `[Icon] [Record Type] - [Mapper Extender Name]: [Field Name]`.
- BR-5.5.1.3: Aliases can be set for extender fields (e.g., "Claim Header Measurement Period").

**FR-5.5.2 — Version History and Comparison**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.5.2 |
| **Priority** | Medium |
| **Description** | The system shall maintain a version history for assets and support side-by-side comparison of selected versions. |

**Business Rules:**
- BR-5.5.2.1: After saving, a "History" button (or clock icon) shall be accessible at the top of the asset editor.
- BR-5.5.2.2: The history modal shall display multiple saved versions with date and timestamps.
- BR-5.5.2.3: Users may select two versions via checkboxes and click "Compare Selected Versions".
- BR-5.5.2.4: The comparison view shall highlight changes (e.g., newly added fields).

**Acceptance Criteria:**
- AC-5.5.1: An extender-created field can be added to an existing column set.
- AC-5.5.2: The version history shows multiple saves with correct timestamps.
- AC-5.5.3: Comparing two versions highlights the differences accurately.

---

### 5.6 Limiter Run Execution and CSV Export

**FR-5.6.1 — Run a Limiter**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.6.1 |
| **Priority** | High |
| **Description** | The system shall allow users to execute a limiter run against a selected dataset, with validation, queuing, status tracking, and notification. |

**Business Rules:**
- BR-5.6.1.1: The asset list row for a limiter shall display action buttons (Copy, Run, Debug) as orange boxes on the far right.
- BR-5.6.1.2: Clicking "Run" shall first validate the limiter and all upstream asset dependencies.
- BR-5.6.1.3: If valid, a "Run Asset" modal shall display with a dataset dropdown and an optional Run Reason field (based on internal role).
- BR-5.6.1.4: If invalid, an "Invalid dependency" modal shall display the message "Unable to run due to invalid dependency -- see graph here".
- BR-5.6.1.5: Clicking "Start Run" shall add the run to a queue and display it in "Recent Runs" (bell icon).
- BR-5.6.1.6: A notification "Limiter Run successfully started." shall appear briefly in the upper right.
- BR-5.6.1.7: The run shall proceed through two stages:
  - **Pending** — Workbench prepares a pickle file from current asset definitions.
  - **Running** — EMR accesses client data and executes the limiter logic.
- BR-5.6.1.8: Completed run results shall be accessible via the bell icon or the Limiter Run Dashboard ("View All").
- BR-5.6.1.9: Each run shall be assigned a unique URL based on the run index ID (e.g., `https://portal.aver.io/limiter_run/run-results/#####`).

**FR-5.6.2 — Export Run Results to CSV**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.6.2 |
| **Priority** | High |
| **Description** | The system shall allow users to export limiter run results to CSV using a selected column set. |

**Business Rules:**
- BR-5.6.2.1: The run results page shall include a "Column Sets" tab.
- BR-5.6.2.2: A record type filter dropdown shall limit which column sets are selectable.
- BR-5.6.2.3: The "Pre-Set Columns" dropdown shall list available column sets matching the selected record type.
- BR-5.6.2.4: Selecting a column set shall trigger a screen refresh with the message "Results for [COLUMN SET NAME] are loading..."
- BR-5.6.2.5: The "Export" button shall include an option "Export details to .csv".
- BR-5.6.2.6: The bell icon shall update to show export progress (CSV written to S3).
- BR-5.6.2.7: When export completes, the recent results link shall show a "Download" action to retrieve the CSV via browser download.

**Acceptance Criteria:**
- AC-5.6.1: A valid limiter can be run against a selected dataset.
- AC-5.6.2: An invalid limiter displays the dependency error modal and cannot be run.
- AC-5.6.3: Run status progresses from Pending to Running to Completed.
- AC-5.6.4: Run results are accessible via the bell icon and Run Dashboard.
- AC-5.6.5: CSV export via a column set completes and produces a downloadable file.
- AC-5.6.6: The exported CSV column order and aliases match the column set definition.

---

### 5.7 Custom Export to Redshift

**FR-5.7.1 — Execute a Custom Export**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.7.1 |
| **Priority** | Medium |
| **Description** | The system shall allow users to execute pre-deployed custom SQL exports that write limiter run results to Redshift. |

**Business Rules:**
- BR-5.7.1.1: **Prerequisite:** A custom export template must be designed, deployed to S3, and configured before use.
- BR-5.7.1.2: From the run results page, the "Export" button shall include a "Custom Exports" section listing available custom exports (display names determined by config files).
- BR-5.7.1.3: Selecting a custom export shall refresh the screen with an input form to configure the export.
- BR-5.7.1.4: If the custom export has an input parameter type of `limiter_run_id`, the user shall be prompted with a dropdown of recent run IDs.
- BR-5.7.1.5: If the custom export has input parameter types of `table`, `column`, or `text`, the user shall be prompted with free-text input fields.
- BR-5.7.1.6: Clicking "Export" shall initiate the custom export job.
- BR-5.7.1.7: Custom export statuses shall be reported to a Slack channel following the naming convention `workflow-notifications-[environment]-[client_name]`.
- BR-5.7.1.8: Slack messages shall include "Custom Export Execution: started ..." followed by "Custom Export Execution: succeeded ..." in thread.
- BR-5.7.1.9: Results shall be written to Redshift schema `aver_reporting_[environment]_[client_name]` in the episode database.

**Acceptance Criteria:**
- AC-5.7.1: A custom export can be selected and configured from the run results page.
- AC-5.7.2: The export form correctly prompts for limiter_run_id, table, column, or text parameters.
- AC-5.7.3: Slack notifications are posted for start and success/failure.
- AC-5.7.4: Results are written to the correct Redshift schema.

---

### 5.8 Episode Set Definition

**FR-5.8.1 — Create an Episode Set**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.8.1 |
| **Priority** | High |
| **Description** | The system shall allow users to define clinical episodes of care using trigger limiters, timeline windows, and episode definitions. |

**Business Rules:**
- BR-5.8.1.1: **Prerequisite:** At least one trigger limiter must exist in the project library.
- BR-5.8.1.2: The "Create New" dropdown shall include an "Episode Set" option.
- BR-5.8.1.3: The episode set name shall be entered along the grey bar at the top.

**FR-5.8.2 — Define a Timeline**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.8.2 |
| **Priority** | High |
| **Description** | The system shall allow users to define episode timelines with trigger windows and post-trigger windows. |

**Business Rules:**
- BR-5.8.2.1: Clicking the "[Unnamed]" bar in the Timelines section opens the timeline editor.
- BR-5.8.2.2: A timeline name shall be entered at the top.
- BR-5.8.2.3: The "Limiters" search field shall allow searching for and selecting a trigger limiter. The trigger window is highlighted in green.
- BR-5.8.2.4: The selected limiter name appears as a grey box below the green "Trigger" header.
- BR-5.8.2.5: The user must enter an episode detail title and choose a claim type (Medical Claim Line or Pharmacy Claim).
- BR-5.8.2.6: Expanding "Extra Options" reveals radio buttons; "Trigger" should be selected within the trigger window (typically only once per episode set).
- BR-5.8.2.7: Clicking the "+" icon in the green trigger header creates a new timeline window to the right, defaulting to "No Name Entered".
- BR-5.8.2.8: Clicking the pencil icon on a window opens the "EDIT TIMELINE WINDOW" modal for entering name and window length (in days). The window end date = episode trigger end date + entered days.
- BR-5.8.2.9: Clicking a post-trigger window moves the limiter drop arrows to that window. The user can search for and place additional limiters there.
- BR-5.8.2.10: Post-trigger window limiters require an episode detail title and claim type but should NOT have the "Trigger" radio selected.
- BR-5.8.2.11: Clicking "OK" saves the timeline.

**FR-5.8.3 — Define Episodes and Relationships**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.8.3 |
| **Priority** | High |
| **Description** | The system shall allow users to define named episodes that reference a saved timeline. |

**Business Rules:**
- BR-5.8.3.1: The "[Unnamed]" episode in the "Episodes and Relationships" section requires a saved timeline to reference.
- BR-5.8.3.2: Clicking it opens a modal to enter an episode name under "Level 1 Episodes" and choose a timeline.
- BR-5.8.3.3: The episode name is added to the member schema on the episode record type — it must be unique and specific for use in comparison steps and outputs.
- BR-5.8.3.4: Clicking "Save" saves the individual episode; "Save and Close" saves the entire episode set.

**Acceptance Criteria:**
- AC-5.8.1: An episode set can be created with a named timeline containing a trigger window and a post-trigger window.
- AC-5.8.2: Trigger and post-trigger limiters can be assigned to their respective windows.
- AC-5.8.3: Timeline window length (in days) is configurable and persists.
- AC-5.8.4: A named episode can be defined referencing the saved timeline.
- AC-5.8.5: The episode name appears in the schema for use in other assets.

---

### 5.9 Function Extender — Episode Totals

**FR-5.9.1 — Create a Function Extender**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.9.1 |
| **Priority** | High |
| **Description** | The system shall allow users to create function extenders that aggregate child record values (e.g., SUM, COUNT) up to a parent record type, optionally filtered by a limiter. |

**Business Rules:**
- BR-5.9.1.1: The "Create New" dropdown shall include a "Function Extender" option.
- BR-5.9.1.2: The function extender name shall be entered along the grey bar at the top.
- BR-5.9.1.3: A record type must be selected from the "Extends Record Type" dropdown (determines which parent table is extended — e.g., Episode for aggregating claims within an episode).
- BR-5.9.1.4: Each row under the "Elements" section specifies either a "Group By" dimension or an aggregation function.
- BR-5.9.1.5: The checkbox preceding the first dropdown must be checked to add the field to the schema.
- BR-5.9.1.6: Supported aggregation functions include SUM; the element search field provides schema fields (e.g., Medical Claim Line Allowed Amount).
- BR-5.9.1.7: Each row includes an "Extender Column Name" field for the new field name (e.g., "Total Post Window Medical Allowed").

**FR-5.9.2 — Limiter-Based Filtering for Aggregation**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.9.2 |
| **Priority** | High |
| **Description** | The system shall allow a function extender to filter the child records used for aggregation by referencing an existing limiter. |

**Business Rules:**
- BR-5.9.2.1: The "Limit With" section is expandable and contains an "Import a limiter" search field.
- BR-5.9.2.2: Selecting a limiter may prompt for parameter values (set at save time, not at run time).
- BR-5.9.2.3: The limiter constrains which child records are included in the aggregation.

**Acceptance Criteria:**
- AC-5.9.1: A function extender with SUM aggregation on Medical Claim Line Allowed Amount, extending the Episode record type, can be created.
- AC-5.9.2: A limiter can be applied to filter aggregation to post-trigger claims only.
- AC-5.9.3: The new field appears in schema searches in other assets.
- AC-5.9.4: A second function extender for RX claims (Pharmacy Claim Net Allowed Amount) can be created similarly.

---

### 5.10 Calculation Extender — Episode Totals

**FR-5.10.1 — Create a Calculation Extender**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.10.1 |
| **Priority** | Medium |
| **Description** | The system shall allow users to create calculation extenders that define a mathematical formula combining existing schema fields and extender-created fields into a new computed field. |

**Business Rules:**
- BR-5.10.1.1: The "Create New" dropdown shall include a "Calculator Extender" option.
- BR-5.10.1.2: The calculation extender name shall be entered along the grey bar at the top.
- BR-5.10.1.3: A record type must be selected from the dropdown (e.g., Episode).
- BR-5.10.1.4: A data type must be selected from the small dropdown under the extender name (e.g., Numeric). This validates compatible data types for the formula.
- BR-5.10.1.5: The formula input box supports interactive field and operator entry:
  - Clicking into the white space starts an entry.
  - Typing a field name initiates a schema search; Tab selects the found field.
  - Typing an operator symbol (e.g., `+`) displays it under "Operator"; Tab selects it.
  - Fields and operators are entered sequentially to build the formula.
- BR-5.10.1.6: The formula is validated on entry. "Calculator format is invalid" is displayed if the formula is not valid.
- BR-5.10.1.7: Clicking a field or operator to highlight it and pressing Delete removes it.
- BR-5.10.1.8: Clicking in white space between existing fields allows inserting before, after, or between them.

**Acceptance Criteria:**
- AC-5.10.1: A calculation extender combining "Total Post Window Medical Allowed + Total Post Window RX Allowed" can be created on the Episode record type.
- AC-5.10.2: Invalid formulas display the "Calculator format is invalid" error.
- AC-5.10.3: Fields and operators can be added, removed, and reordered within the formula.
- AC-5.10.4: The calculation extender saves and the resulting field appears in schema searches.

---

### 5.11 Table Extender — Diagnosis Flag

**FR-5.11.1 — Create a Table Extender via CSV Upload**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.11.1 |
| **Priority** | High |
| **Description** | The system shall allow users to upload a CSV reference table and join it to the schema by linking columns as foreign keys. |

**Business Rules:**
- BR-5.11.1.1: **Prerequisite:** The user must have a CSV file with one or more columns that represent a unique foreign key (single or compound).
- BR-5.11.1.2: The "Create New" dropdown shall include a "Table Extender" option.
- BR-5.11.1.3: The table extender name shall be entered along the grey bar at the top.
- BR-5.11.1.4: A record type must be selected from the dropdown (e.g., Diagnosis). This determines which schema table the CSV can join to.
- BR-5.11.1.5: The "Upload Data (CSV)" section shall include a "Browse" button to locate and select a file.
- BR-5.11.1.6: After file selection, the screen shall display "Loading" while ingesting the CSV, followed by a data preview.
- BR-5.11.1.7: A temporary message "Table scan in progress" may appear during processing.

**FR-5.11.2 — Column Configuration and Foreign Key Linking**

| Attribute | Detail |
|---|---|
| **ID** | FR-5.11.2 |
| **Priority** | High |
| **Description** | The system shall allow users to configure CSV columns by setting data types and establishing foreign key links to schema fields. |

**Business Rules:**
- BR-5.11.2.1: Column headers from the CSV are displayed at the top of the preview table.
- BR-5.11.2.2: Clicking a header name or the link icon opens the column characteristics editor.
- BR-5.11.2.3: Columns intended as foreign keys must use "Link Setting" with "Link With Field" and a searchable schema field selector (e.g., `Diagnosis: Code`).
- BR-5.11.2.4: Clicking "OK" saves the link; the column header turns green to indicate it is linked.
- BR-5.11.2.5: Linked fields inherit their data type from the schema.
- BR-5.11.2.6: Non-linked fields default to Text; the data type can be changed to Date, Numeric, or Boolean.
- BR-5.11.2.7: The table extender inherits parent-child relationship constraints from the joined record type.

**Acceptance Criteria:**
- AC-5.11.1: A CSV file can be uploaded and its preview is displayed.
- AC-5.11.2: Columns can be linked to schema fields as foreign keys (header turns green).
- AC-5.11.3: Linked columns inherit the schema data type; non-linked columns default to Text.
- AC-5.11.4: Data types can be changed for non-linked columns (Date, Numeric, Boolean).
- AC-5.11.5: The table extender saves and its columns appear in schema field searches in other assets.
- AC-5.11.6: Schema parent-child relationship constraints are correctly inherited.

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | **Performance** | Limiter run status shall transition from Pending to Running within a reasonable time after pickle file preparation. The bell icon shall update in near real-time. |
| NFR-02 | **Scalability** | The system shall support multiple concurrent limiter runs per project without degradation. |
| NFR-03 | **Usability** | The visual canvas (drag-and-drop) shall be intuitive; steps shall snap into place and connections shall render as clean orthogonal lines. |
| NFR-04 | **Reliability** | CSV exports to S3 shall complete without data loss. Custom exports to Redshift shall report success/failure via Slack. |
| NFR-05 | **Search** | All "contains" search fields across schema elements, asset library, and column search shall return results in under 2 seconds. |
| NFR-06 | **Data Integrity** | Pickle files shall capture the exact state of asset definitions at run time. Changing an asset after a run starts shall not affect in-flight runs. |
| NFR-07 | **Auditability** | All asset saves shall generate version history entries with date/timestamps. Version comparison shall accurately highlight differences. |
| NFR-08 | **Notification** | Slack integration shall deliver custom export start/success/failure messages to the correct channel (`workflow-notifications-[env]-[client]`). |

---

## 7. Data Requirements

### 7.1 Record Types

The platform operates on a hierarchical data model with the following key record types:

| Record Type | Description | Parent |
|---|---|---|
| **Member** | Patient/member demographic data (Date of Birth, Gender, etc.) | — |
| **Enrollment** | Coverage periods (Effective Date, Termination Date) | Member |
| **Medical Claim Header** | Claim-level data (Claim ID, MS DRG, First Date of Service) | Member |
| **Medical Claim Line** | Line-item detail (Allowed Amount, Billing Provider) | Medical Claim Header |
| **Pharmacy Claim** | Prescription claims (Fill Date, Net Allowed Amount) | Member |
| **Diagnosis** | Diagnosis codes (Code, ICD Version) | Medical Claim Line / Header |
| **Episode** | Modeled episodes of care (Episode Name, Trigger End Date) | Member |

### 7.2 Schema Extension Model

Extenders append new fields to existing record types:
- **Mapper Extender** — Adds a text/date/numeric field based on conditional case logic.
- **Function Extender** — Adds an aggregated field (SUM, COUNT, etc.) to a parent record by rolling up child records.
- **Calculation Extender** — Adds a computed field from a formula over existing fields.
- **Table Extender** — Adds columns from a CSV reference table via foreign key joins.

All extender-created fields become available in schema searches across other assets (column sets, limiters, other extenders).

### 7.3 Export Targets

| Target | Format | Storage |
|---|---|---|
| CSV Export | .csv file | Amazon S3 (downloadable via browser) |
| Custom Export | SQL-based write | Amazon Redshift (`aver_reporting_[env]_[client]` schema) |

---

## 8. Integration Points

| System | Integration Type | Description |
|---|---|---|
| **EMR Engine** | Backend Processing | Executes limiter logic against client data using pickle file definitions |
| **Amazon S3** | Storage | Stores CSV export files and custom export SQL templates |
| **Amazon Redshift** | Database | Receives custom export results into `aver_reporting_[env]_[client]` schema |
| **Slack** | Notification | Delivers custom export status messages to `workflow-notifications-[env]-[client]` channels |
| **Aver Portal** | Web UI | Hosts the Workbench application at `https://portal.aver.io/` |

---

## 9. User Roles and Permissions

| Role | Permissions | Typical Activities |
|---|---|---|
| **Project Admin** | Full (create projects, manage privileges) | Create projects, assign R/W/X permissions to roles |
| **Analyst (Internal)** | R/W/X (read, write, execute assets) | Build limiters, column sets, extenders, episode sets; execute runs; export results |
| **Analyst (External)** | R/W or R only (configurable) | View and possibly edit assets; may not execute runs |

**Permission Model:**
- Permissions are assigned at the **Group > Role** level using datakeys.
- Three permission types: **R** (read_asset), **W** (write_asset), **X** (execute_asset).
- A role with R/W/X can build, save, and run assets. A role with only R can view but not modify or execute.

---

## 10. Assumptions and Constraints

### 10.1 Assumptions
- Users have appropriate role-based permissions before accessing Workbench features.
- At least one dataset is available in the environment for limiter runs.
- Custom export SQL templates are pre-deployed to S3 by the data engineering team.
- The Slack workspace and channels (`workflow-notifications-[env]-[client]`) are pre-configured.
- The Redshift cluster and target schema exist before custom exports are run.

### 10.2 Constraints
- Mapper extender conditional rows support AND logic only (no OR logic within a single row).
- Each record evaluated by a mapper extender matches at most one row (top-down evaluation).
- Function extender parameter values are set at save time, not prompted at run time.
- Column set field selection is constrained by the chosen record type — child record fields below the selected level are unavailable.
- Table extender CSV must have distinct column headers.
- Episode names must be unique and specific as they are added directly to the member schema.

---

## 11. Acceptance Criteria Summary

| Requirement Area | Key Acceptance Criteria |
|---|---|
| **Project Management** | Project created, appears in list; privileges assigned and enforced |
| **Limiter Builder** | Steps created via drag-and-drop; AND/OR logic works; endpoints label results; invalid limiter blocked from run |
| **Column Set Builder** | Fields added per record type; columns reorderable; aliases editable; record type change removes incompatible fields |
| **Mapper Extender** | Conditional rows with AND comparisons; labels assigned; default row captures unmatched; new field in schema |
| **Version History** | Multiple versions saved; comparison highlights changes |
| **Limiter Run & CSV Export** | Valid limiter runs; stages tracked; CSV exported and downloadable with correct columns/aliases |
| **Custom Export** | Configured and executed; Slack notifications posted; data written to Redshift |
| **Episode Set** | Timeline with trigger/post-trigger windows; episodes defined with unique names; names appear in schema |
| **Function Extender** | Aggregation (SUM) with limiter filtering; new field on parent record type; schema searchable |
| **Calculation Extender** | Formula validated; fields/operators addable and removable; new computed field in schema |
| **Table Extender** | CSV uploaded and previewed; foreign keys linked (green header); data types configurable; columns in schema |

---

## 12. Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| **Product Owner** | | | |
| **Business Analyst** | | | |
| **Technical Lead** | | | |
| **QA Lead** | | | |

---

*End of Document*
