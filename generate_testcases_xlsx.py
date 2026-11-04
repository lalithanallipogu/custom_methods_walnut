import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Workbench Test Cases"

# Styles
header_font = Font(name='Calibri', bold=True, size=11, color='FFFFFF')
header_fill = PatternFill(start_color='2F5496', end_color='2F5496', fill_type='solid')
header_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
cell_align = Alignment(vertical='top', wrap_text=True)
thin_border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)
pass_fill = PatternFill(start_color='C6EFCE', end_color='C6EFCE', fill_type='solid')
fail_fill = PatternFill(start_color='FFC7CE', end_color='FFC7CE', fill_type='solid')

# Headers
headers = [
    'Test Case ID', 'Module', 'Test Case Title', 'Description',
    'Pre-Conditions', 'Test Steps', 'Expected Result',
    'Priority', 'Severity', 'Test Type', 'Status'
]

for col_idx, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col_idx, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = header_align
    cell.border = thin_border

# Column widths
col_widths = [14, 22, 35, 45, 40, 60, 45, 10, 10, 12, 10]
for i, w in enumerate(col_widths, 1):
    ws.column_dimensions[get_column_letter(i)].width = w

# Freeze header row
ws.freeze_panes = 'A2'

# Auto-filter
ws.auto_filter.ref = f"A1:K1"

# ---- TEST CASE DATA ----
test_cases = []

# ===== CASE 1: Project Management =====
test_cases.extend([
    ['TC-001', 'Project Management', 'Create a blank project',
     'Verify that a user with Project Admin role can create a new blank project.',
     'User has Project Admin role. Workbench tile is accessible.',
     '1. Select Group and privileged Role (Project Admin).\n2. Click the Workbench tile.\n3. Click "New Project" at top of screen.\n4. Enter a project name.\n5. Leave parent project unselected (blank project).\n6. Click Save.',
     'Project is created successfully and appears in the project list screen.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-002', 'Project Management', 'Create a forked project from parent',
     'Verify that a user can create a new project forked from an existing parent project.',
     'User has Project Admin role. At least one existing project is available as parent.',
     '1. Select Group and privileged Role (Project Admin).\n2. Click the Workbench tile.\n3. Click "New Project".\n4. Enter a project name.\n5. Select a parent project from the list.\n6. Click Save.',
     'Forked project is created, inherits parent project contents, and appears in the project list.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-003', 'Project Management', 'Assign R/W/X privileges to a role',
     'Verify that a Project Admin can assign Read, Write, and Execute permissions to roles.',
     'User has Project Admin role. A project exists in the project list.',
     '1. From the project list screen, hover to the right of a project name.\n2. Click the "Edit" button that appears.\n3. Observe all Group datakeys displayed.\n4. Click a group to expand its roles.\n5. Find the target role.\n6. Toggle R (read_asset), W (write_asset), X (execute_asset) permissions.\n7. Save changes.',
     'Permissions are saved. The role now has the assigned R/W/X permissions enforced on next login.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-004', 'Project Management', 'Verify project is accessible via Trunk label',
     'Verify that a user with R/W/X permissions can log into a project by clicking the orange Trunk label.',
     'Project exists with R/W/X permissions assigned to user role (e.g., analyst-internal).',
     '1. Navigate to the project list screen.\n2. Locate the target project.\n3. Click the orange "Trunk" label next to the project name.',
     'User is logged into the project and the main asset library screen is displayed.',
     'High', 'Major', 'Functional', 'Not Run'],
])

# ===== CASE 2: Limiter Builder =====
test_cases.extend([
    ['TC-005', 'Limiter Builder', 'Create a new limiter asset',
     'Verify that a user can initiate creation of a new Limiter from the Create New dropdown.',
     'User is logged into a project with R/W/X permissions.',
     '1. Click the "Create New" dropdown under the project name in the upper left corner.\n2. Select "Limiter" from the dropdown.\n3. Enter a limiter name (e.g., "Women with Inpatient Knee Replacements") in the grey bar at the top.',
     'Limiter editor opens with the entered name displayed in the grey bar. Canvas area is empty and ready for steps.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-006', 'Limiter Builder', 'Add a Compare step via drag-and-drop',
     'Verify that a "+ Step" can be dragged onto the canvas to create a step box.',
     'Limiter editor is open with a name entered.',
     '1. Locate the "+ Step" element in the upper right.\n2. Click and drag "+ Step" to the middle canvas area.\n3. Release on the canvas.',
     'A new step box labelled "Set step specifications" appears on the canvas.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-007', 'Limiter Builder', 'Configure a Compare step with Element and Value',
     'Verify that a step can be configured with an Element (schema field) and a Value comparison.',
     'A step box exists on the limiter canvas.',
     '1. Click the step box to open the configuration editor.\n2. In the Element field on the left, type "Gender".\n3. Select "Gender" from the contains-search dropdown.\n4. In the Value field on the right, enter "F".\n5. Ensure the comparison operator is set to "=".\n6. Click OK.',
     'Step is saved with the comparison: Gender = "F". The step box updates to reflect the configured comparison.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-008', 'Limiter Builder', 'Element field contains-search returns matching schema fields',
     'Verify that the Element field performs a contains search across the schema and displays matching fields.',
     'Step configuration editor is open.',
     '1. Click into the Element field.\n2. Type a partial keyword (e.g., "Date").\n3. Observe the dropdown results.',
     'Dropdown displays all schema fields containing the keyword "Date" (e.g., Date of Birth, First Date of Service, etc.).',
     'Medium', 'Major', 'Functional', 'Not Run'],

    ['TC-009', 'Limiter Builder', 'Unmatched element text is discarded on exit',
     'Verify that text entered in the Element field that does not match a schema field is lost when exiting the search.',
     'Step configuration editor is open.',
     '1. Click into the Element field.\n2. Type a non-existent field name (e.g., "XYZABC123").\n3. Click outside the Element field or press Tab.',
     'The unmatched text is discarded. The Element field reverts to empty or its previous selection.',
     'Medium', 'Minor', 'Functional', 'Not Run'],

    ['TC-010', 'Limiter Builder', 'Create AND logic by chaining steps',
     'Verify that dragging from the green checkmark of a step creates an AND-chained step.',
     'Limiter has at least one configured Compare step (Gender = F).',
     '1. Click and drag from the green checkmark of the first step.\n2. Release on the canvas.\n3. A new step appears connected via a green orthogonal line.\n4. Click the new step to edit.\n5. Configure: Medical Claim Header: MS DRG Code is in list 469, 470.\n6. Click OK.',
     'Second step is created and connected to the first step via green line (AND logic). Both criteria must be met.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-011', 'Limiter Builder', 'Create OR logic by branching steps',
     'Verify that dragging a second step from the same green checkmark creates an OR branch.',
     'Limiter has at least one configured Compare step with one AND-chained step.',
     '1. Navigate back to the first comparison step.\n2. Click and drag from the green checkmark of the first step again.\n3. Release on the canvas.\n4. A second branch step appears.',
     'Two paths branch from the same step, representing OR logic. Data may match either or both paths.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-012', 'Limiter Builder', 'Convert a step to an Endpoint',
     'Verify that a step can be converted into an Endpoint with a descriptive label.',
     'Limiter has AND-chained steps (Gender = F AND DRG in 469, 470).',
     '1. Create a new step after the DRG criteria step.\n2. Click the step box to edit.\n3. Click the step name "Compare" or triad symbol at the top.\n4. Select "Endpoint" from the dropdown.\n5. Enter label: "DRG values, Female Only".\n6. Click OK.',
     'Step converts to an Endpoint with a single text field showing the label "DRG values, Female Only".',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-013', 'Limiter Builder', 'Dead-end path yields no results',
     'Verify that a path ending without an endpoint is a dead-end and yields no results.',
     'Limiter has an OR branch where one path has no endpoint.',
     '1. Create an OR branch from an existing step.\n2. Leave the branch without adding an endpoint.\n3. Save the limiter.\n4. Attempt to run.',
     'The dead-end path is ignored. Only paths with valid endpoints produce results. The limiter may show a validation warning.',
     'Medium', 'Major', 'Functional', 'Not Run'],

    ['TC-014', 'Limiter Builder', 'Save limiter with name only (even with errors)',
     'Verify that a limiter can be saved as long as it has a name, even if there are validation errors.',
     'Limiter has a name but is incomplete (e.g., no endpoint).',
     '1. Ensure the limiter has a name entered.\n2. Observe the Save button appears in the lower right of the canvas.\n3. Click Save.',
     'Limiter saves successfully despite validation errors. An error message indicates the limiter is not valid for running.',
     'High', 'Major', 'Functional', 'Not Run'],

    ['TC-015', 'Limiter Builder', 'Save and Close returns to asset library',
     'Verify that "Save and Close" saves the limiter and returns to the main asset library screen.',
     'Limiter is configured and ready to save.',
     '1. Click the dropdown arrow to the right of the Save button.\n2. Select "Save and Close".',
     'Limiter is saved. User is returned to the main asset library screen.',
     'Medium', 'Major', 'Functional', 'Not Run'],

    ['TC-016', 'Limiter Builder', 'Search for limiter in asset library',
     'Verify that a saved limiter can be found by name in the asset library search.',
     'Limiter has been saved and user is on the asset library screen.',
     '1. Locate the search box in the upper right of the asset list.\n2. Type the limiter name.\n3. Observe the results.',
     'The limiter appears in the search results matching the entered name.',
     'Medium', 'Major', 'Functional', 'Not Run'],

    ['TC-017', 'Limiter Builder', 'Invalid limiter shows error and cannot run',
     'Verify that a limiter without an endpoint displays an error and cannot be executed.',
     'A saved limiter exists that has no endpoint step.',
     '1. Locate the limiter in the asset library.\n2. Click the Run button.\n3. Observe the validation result.',
     'The system displays an error message indicating the limiter is invalid (missing endpoint). The run does not proceed.',
     'High', 'Critical', 'Negative', 'Not Run'],
])

# ===== CASE 3: Column Set Builder =====
test_cases.extend([
    ['TC-018', 'Column Set Builder', 'Create a new Column Set',
     'Verify that a user can create a new Column Set from the Create New dropdown.',
     'User is logged into a project with R/W/X permissions.',
     '1. Click "Create New" dropdown.\n2. Select "Column Set".\n3. Enter column set name (e.g., "DRG Claim Details") in the grey bar.',
     'Column Set editor opens with the name displayed. Record type dropdown and Add Column field are available.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-019', 'Column Set Builder', 'Select a record type for column set',
     'Verify that selecting a record type limits available fields and dictates output granularity.',
     'Column Set editor is open.',
     '1. Click the record type dropdown in the upper right ("Please select a valid record type").\n2. Select "Medical Claim Line".',
     'Record type is set to Medical Claim Line. Available fields in Add Column are limited to this record type and its parents. Child record fields (e.g., Diagnosis) are not available.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-020', 'Column Set Builder', 'Add columns via contains-search',
     'Verify that the Add Column search operates on contains matching and adds fields to the column list.',
     'Column Set has a record type selected.',
     '1. Click the blank after "Add Column".\n2. Type a keyword (e.g., "Date of Birth").\n3. Click "Member Date of Birth" from the dropdown.\n4. Repeat for: Enrollment Effective Date, Enrollment Termination Date, Medical Claim Header Claim ID, MS DRG, Medical Claim Line Allowed Amount, Billing Provider Full Name.',
     'All selected fields are added to the column list in the lower portion of the screen.',
     'High', 'Critical', 'Functional', 'Not Run'],

    ['TC-021', 'Column Set Builder', 'Reorder columns via drag-and-drop',
     'Verify that columns can be reordered by dragging and the order reflects in CSV export.',
     'Column set has multiple columns added.',
     '1. Locate the last entry in the column list.\n2. Click and drag it to the first row position.\n3. Release.',
     'Column moves to the first position. The descending order dictates left-to-right column order in the exported CSV.',
     'Medium', 'Major', 'Functional', 'Not Run'],

    ['TC-022', 'Column Set Builder', 'Edit column alias name',
     'Verify that the default alias can be edited to a custom name.',
     'Column set has columns with default aliases (e.g., member__date_of_birth).',
     '1. Locate the alias text for a column (e.g., "member__date_of_birth").\n2. Click on the alias text.\n3. Clear the text and enter "member_dob".\n4. Click outside to confirm.',
     'Alias is updated to "member_dob". The new alias will be used as the column header in the exported CSV.',
     'Medium', 'Major', 'Functional', 'Not Run'],

    ['TC-023', 'Column Set Builder', 'Changing record type removes incompatible fields',
     'Verify that changing the record type removes fields that are not compatible with the new type.',
     'Column set with record type "Medical Claim Line" has Claim Header and Claim Line fields added.',
     '1. Edit the record type dropdown.\n2. Change from "Medical Claim Line" to "Enrollment".',
     'Claim Header and Claim Line fields are automatically removed from the column list. Only fields compatible with Enrollment remain.',
     'High', 'Major', 'Functional', 'Not Run'],

    ['TC-024', 'Column Set Builder', 'Save and search column set in asset library',
     'Verify that a column set saves successfully and is searchable in the asset library.',
     'Column set is configured with name, record type, and columns.',
     '1. Click "Save and Close" from the lower right.\n2. On the asset library screen, type the column set name in the search box.',
     'Column set saves and appears in the asset library search results.',
     'High', 'Major', 'Functional', 'Not Run'],
])

# Write first batch of test cases
for row_idx, tc in enumerate(test_cases, 2):
    for col_idx, val in enumerate(tc, 1):
        cell = ws.cell(row=row_idx, column=col_idx, value=val)
        cell.alignment = cell_align
        cell.border = thin_border

wb.save('Workbench_Test_Cases_partial.xlsx')
print(f"Partial file saved with {len(test_cases)} test cases (TC-001 to TC-024)")
