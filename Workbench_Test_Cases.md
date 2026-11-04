# Workbench Test Cases



## **CASE 1: Create a project**

1. Select Group and Role (privileged role such as Project Admin).
2. Select Workbench tile.
3. Click New Project at top of screen.
4. Enter project name.
5. Choose contents for creating new project -
    1. If creating a totally blank project click save.
    2. Otherwise, select parent project to create a fork from and then click save.
6. Optional: Assign privileges
    1. Within the project list screen (project-branch-selection screen), hover directly to the right of the project name and click edit.
    2. You should see all Group datakeys. Click the group to expand out roles.
    3. Find the correct role and add necessary permissions for R (read\_asset), W (write\_asset), and X (execute\_asset).


## **CASE 2: Build a limiter - member and claim line criteria**

1. Login to project created in case 1 by clicking on orange “Trunk” label from the project list screen. (Use a role with R/W/X permissions such as analyst-internal)
2. Click create new dropdown, under project name in upper left corner.
3. Select Limiter.
4. Enter limiter name (example “Women with Inpatient Knee Replacements”) along the grey bar at the top.
5. Click and drag “+ Step” from the upper right to the middle portion of the screen (the canvas). This will create a single step labelled “Set step specifications”.
6. Click the resulting step box to edit the configuration, above the area with the green check mark and red X.
7. The default configuration when open is a Compare step, with the selection of Element on the left and Value on the right.
    1. Within the first element field, select Gender. This field is a “contains” search across the schema and can be selected when displayed. A single field must be selected to be applied to the portion of the comparison. Text that does not result in a schema field match will be lost when exiting the search functionality.
    2. Within the value blank to the right, enter “F”.
    3. The dropdown in between the two selections is a comparison indicator and may vary based on data type selections in the element field. Select “=” symbol as the comparison.
    4. Click OK to save step.
8. Click on and drag the green check from the resulting step. This will create another step on the canvas, connected to the first step through a green orthogonal line.
    1. Repeat step 6 and 7 to edit and complete the new step.
    2. Use the comparison Medical Claim Header: MS DRG Code is in list 469, 470.
    3. Recognize this creates a chain of AND logic as each criteria must be met.
    4. To create an OR logic step, go back to the prior comparison step and drag another step out of the green checkmark. The branching of two paths expresses the option for the data to match either or both paths to the end point. All directly connected steps above the end point will be evaluated. If any path ends without an end point, that will be ignored and no results will be retrieved from that dead end path of logic.
9. Repeat step 8 to create a new step connected to and following the DRG criteria.
    1. Click the box to edit the new step.
    2. Click on the name “Compare” or corresponding triad symbol at the top of the step.
    3. Select endpoint from the resulting dropdown.
    4. The step will convert into only a single text field. Enter any descriptive name to label results, such as “DRG values, Female Only”.
    5. Click OK to close.
10. The limiter should now offer the option to Save with a button in the lower right of the canvas.
    1. Click the dropdown arrow to the right of the save button and select “Save and Close” to return to the main asset library screen.
    2. The limiter should be able to save as long as there is a name, even if there are other errors. If the limiter is not valid (such as a missing end point), it should display an error message and not be able to run.
11. Search for the limiter by name in the search box in the upper right portion of the resulting asset-list.

## **CASE 3: Build a column set - member, enrollment, and claim criteria**

1. Click Create New and select Column Set from the dropdown.
2. Enter column set name (example “DRG Claim Details”) along the grey bar at the top.
3. Choose a record type using the drop down in the upper right portion, the area labelled “Please select a valid record type”.
    1. In this case choose Medical Claim Line.
    2. This will dictate the granularity of the export rows in the resulting output file. In this case there will be one row per Medical Claim Line that passes the limiter filtering selection (more on this later in the Run Results section).
4. Click on the blank immediately following “Add Column”. This will turn into a searchable dropdown. Type any number of key words into the search, which operates on “Contains” for all of the entered search words.
    1. Clicking any of the resulting fields from the dropdown will add the field to the lowest positiion lower portion of the column set screen.
    2. Select as many fields as desired. In this case choose Member Date of Birth, Enrollment Effective Date, Enrollment Termination Date, Medical Claim Header Claim ID, MS DRG, Medical Claim Line Allowed Amount, Billing Provider Full Name.
    3. Note that the selection is limited by the choice of record type in step 3 above. Choosing Medical Claim Line you are not able to select any child records, such as Diagnosis. If you now edit the record type to Enrollment, then the Claim Header and Claim Line fields will be removed from the list.
5. The descending order of the fields dictates the order of columns (left to right) in the resulting CSV file. Click and drag the last entry up the first row to include this field and data as the first column.
6. The alias name for the resulting export is shown in the box to the right side of each row. The default alias is a database friendly name with all lower case text and underscores separating words and a double underscore between the table name and the field name.
    1. Click on the text member\_\_date\_of\_birth and enter new text to change the alias to member\_dob for the resulting export.
7. The column set should now offer the option to Save with a button in the lower right.
    1. Click the dropdown arrow to the right of the save button and select “Save and Close” to return to the main asset library screen.
8. Search for the column set by name in the search box in the upper right portion of the resulting asset-list.

## **CASE 4: Build a mapper extender - **

1. Click Create New and select Mapper Extender from the dropdown.
2. Enter mapper extender name (example “Measurement Period”) along the grey bar at the top.
3. Additionally enter a name for the newly defined field at the top of the grey column, found by the text “Column Name”. Often this may be the same as the mapper extender name, but it is optional to have multiple new fields created and uniquely named. Choose a type from the dropdown preceding the name. In this case choose Text.
4. Choose a record type using the drop down in the upper right portion, the area labelled “Extends record type” next to the Description.
    1. In this case choose Medical Claim Header.
5. In the section labelled “Set step specifications” this is the conditional case statement portion of the mapper. To add additional rows of conditions, click “Add New” to duplicate the existing row and insert it one step below.
    1. Click on “Set step specifications” or the arrow icon to expand the step. The default step includes a single compare step, similar to the limiter step. In this case, enter Medical Claim Header: First Date of Service \< 1/1/2030 as the comparison. Multiple AND comparisons can be added to one comparison row. There is no OR logic possible in the comparison step of the mapper as it does not feature the .
    2. After filling out the first row, click Add New to create an identical condition in the second row. The first step can be closed at any time by clicking on either the arrow icon or the text description next to the list icon.
    3. Again click the arrow or the text description to expand the second row. Click to add a new comparison. Add two comparisons: 1. Header: First Date of Service \>= 1/1/2030 and 2. Header: First Date of Service \<= 6/30/2031. This method creates a range of 18 months from 1/1/2030 through 6/30/2031. We will apply a label to this range in the next step.
    4. Repeat steps b and c to add a third row. This time add the comparisons 1. Header: First Date of Service \>= 7/1/2031 and 2. Header: First Date of Service \<= 12/31/2032.
6. In the grey column under the field name, the value fields will be used to specify a value for the new field that will be appended to each record that matches the given step in the conditions. Each record will be evaluated through each row and conditionally may only match one from top down.
    1. Apply the label “Before Measurement Period (Before 2030)” to the field in the first row.
    2. Apply the label “First Measurement Period (2030 to 1st Half 2031 - 18 months measurement)” to the field in the second row.
    3. Apply the label “Second Measurement Period (2nd Half 2031 to 2032 - 18 months measurement)” to the field in the third row.
7. Lastly add a label to the default at the bottom, identified by “Identifiers for unmatched records:”. We will apply the label “After Measurement Period (After 2032)” to this final row. Any records which did not match the conditions of a step above will have this value applied to the newly created field Measurement Period found on the Medical Claim Header table.
8. The mapper extender should now offer the option to Save with a button in the lower right.
    1. Click the dropdown arrow to the right of the save button and select “Save and Close” to return to the main asset library screen.
    2. Search for the mapper extender by name in the search box in the upper right portion of the resulting asset-list.

## **CASE 5: Update a column set - extender**

1. Locate the column set from case 3.
2. Click the name of the column set to open the asset in the edit screen.
3. Select the newly created “Measurement Period” from the Add Column search.
    1. Note that the field name format from left to right is as follows:
        1. An open arrow shape icon to indicate extender field
        2. The record type (Medical Claim Header)
        3. Space Dash Space
        4. Mapper Extender Name
        5. Colon Space
        6. Mapper Extender Field Name
    2. Field names are sorted alphabetically and maybe interspersed between native schema fields and extender created fields.
4. Name the alias as desired (“Claim Header Measurement Period”) and click save (not save and close).
5.  After save is complete, navigate to top of column set. Click History or associated clock icon.
6. The modal that displays should show multiple saved versions with associated date and timestamps.
7. Select the check box in front of the two desired versions and click Compare Selected Versions.
    1. Note the change description showing the newly added mapper extender field.

## **CASE 6: Run Limiter Results - Export to CSV**

1. From the main library screen, locate the limiter from case 2. This can be done using the search box in the upper right.
2. Note the orange boxes to the far right in the asset list row.
    1. For a limiter, the options should be Copy, Run, and Debug.
    2. Choose Run.
3. The limiter will first run through validation.
    1. Assuming the limiter and related upstream assets are valid, the Run Asset modal should be displayed with a dropdown for the dataset.
    2. If the limiter is not valid, the Invalid dependency modal will display the message “Unable to run due to invalid dependency -- see graph here”.
4. Choose the dataset and a Run Reason (if applicable based on internal role).
5. Click Start Run
    1. The Run will be added to the queue and displayed in the recent runs, found using the bell icon in the upper right.
    2. There should be a brief message “Limiter Run successfully started.” shown in the upper right notification portion.
    3. The first stage of a limiter run will be listed as Pending. During this stage, workbench is preparing a pickle file using the current definitions of the assets used by the run.
    4. Once the pickle is prepared, the run should commence to the Running stage (which involves accessing the client results and running the logic using EMR).
6. When the results are completed running, they will be accessible via the bell icon or the limiter run dashboard (accessed through the bell icon, clicking view all).
7. The run results will be assigned a unique URL based on the run index ID, example URL structure below

```
https://portal.aver.io/limiter_run/run-results/#####
```

1. Navigate to run results using bell icon or Run Dashboard.
2. Click on the Column Sets tab.
3. Select a record type from the dropdown. This will limit what Column Sets are avaialble for selection to export - only those of the filtered record type will be selectable.
4. Click the Pre-Set Columns dropdown on the right side. Select a column set, for example the column set from Case 3 above.
5. The screen will refresh and indicate “Results for \[COLUMN SET NAME\] are loading...”
6. Click the Export button and choose “Export details to .csv”.
7. The bell icon will again update to show the results writing to CSV (stored on S3).
8. When completed exporting, the recent results link will show “Download” to retrieve the CSV and download through the browser.

## **CASE 7: Custom Export - Export to Redshift**

1. Prerequisite - Required custom export must be designed and deployed to S3. If a very simple test is needed, use the “Copy to Redshift” custom export. The SQL loads results into Redshift and renames the table to the user input name at time of export. There are no specific field requirements for this export.
2. Navigate to run results using bell icon or Run Dashboard.
3. Click on the Column Sets tab.
4. Click the Export button and locate the desired custom export under the “Custom Exports” portion of the dropdown. Note that the specific display name is determined by the config file.
    1. Example: 
5. The screen will refresh with an input to kick off the custom export.
6. If the custom export has an input parameter type of limiter\_run\_id, the user will be prompted to select from recent run IDs from a dropdown.
7. If the custom export has an input parameter type of table, column, or text then the user will be prompted to input a value to be used in the SQL.
    1. For other options that may be used in custom exports see readme: 
8. When completed filling out configuration, click Export.
9. Custom export statuses are alerted to the slack channel, workflow-notifications-\[environment\]-\[client\_name\], example workflow-notifications-prod-cambia. Look for “Custom Export Execution: started …” message and then “Custom Export Execution: succeeded …” in thread.
10. Results on Redshift are written to schema `aver_reporting_[environment]_[client_name]` in the episode database.

## **CASE 8: Define episode**

1. Prerequisite - Required limiters must be designed saved in library. At least one trigger limiter is required to build episodes.
2. Click create new dropdown, under project name in upper left corner.
3. Select Episode Set.
4. Enter episode set name (example “IP Knee Replacements”) along the grey bar at the top.
5. Click \[Unnamed\] bar within Timelines portion to edit the episode timeline. Note, the \[Unnamed\] episode in the bottom portion will require a saved timeline to select. Episode definitions cannot be created within the Episodes and Relationships section.
6. Enter a name for the timeline at the top. This will be shown to the user later when selecting the timeline for the episode in the bottom portion.
7. Enter a search term for the name of the triggering limiter into the “Limiters” field. When displayed in the dropdown, click the name of the limiter for the trigger window. Note that the trigger window is highlighted in green, indicating that is where the selected limiter will be placed.
8. The limiter name will show up in a grey box below the green Trigger header. Enter an episode detail title into the blank and then choose Medical Claim Line or Pharmacy Claim from the dropdown to indicate the type of claim used for the trigger. Lastly, click extra options to expand the radio buttons and choose Trigger. 
9. Click the addition symbol in the upper right portion of the green header labelled Trigger. This will add a new timeline window to the right of the green trigger window. It will default to No Name Entered. Click the pencil icon to open the EDIT TIMELINE WINDOW modal. Enter a name and then desired window length in number of days. The window end date will be defined as the episode trigger end date plus the number of days entered here.
10. Click save to save the window attributes.
11. Click the newly name window to the right of the trigger.
    1. Note that the arrows pointing down from the header have moved to the new window. This indicates the drop location for the limiter selection.
    2. Enter a new search term into the Limiters field and select a limiter to place into the episode window.
    3. The newly added limiter will show as a grey box below the window after the trigger.
    4. As in step 8 above, the limiter name will show up in a grey box below the lighter green episode window header (for the post window). Enter an episode detail title into the blank and then choose Medical Claim Line or Pharmacy Claim from the dropdown to indicate the type of claim used for the trigger. In this case, do not select the extra options dropdown. The trigger radio button should only be set within the trigger window and likely one once per episode set.
12. Click OK to save the episode timeline.
13. Click on the \[Unnamed\] episode below in the Episodes and Relationships section. This will display a modal to enter an episode name and choose a timeline. Under the heading “Level 1 Episodes”, enter the name for the episode. The exact name entered here will be added to the member schema on the episode record type, so it is important to make it unique and specific so that it may be used effectively in comparison steps and outputs.
14. Click save to save the individual episode and then when completed click save or save and close in the lower right of the Episode Set editor screen.

## **CASE 9: Function Extender - Episode Totals**

1. Follow steps from case 2 to build a new medical claim selection limiter.
    1. Include a step that indicates “Episode Name = \[episode name from case 8\]”.
    2. Include a step that indicates “Claim Line Start Date \> Episode Trigger End Date”
    3. Include an end point labelled “All Post-Trigger Medical Claims”.
    4. Save and close limiter.
2. Follow steps from case 2 to build a new rx claim selection limiter.
    1. Include a step that indicates “Episode Name = \[episode name from case 8\]”.
    2. Include a step that indicates “Fill Date \> Episode Trigger End Date”
    3. Include an end point labelled “All Post-Trigger RX Claims”.
    4. Save and close limiter.
3. Click Create New and select Function Extender from the dropdown.
4. Enter function extender name (example “Total Post Window Episode Costs - Medical”) along the grey bar at the top.
5. Choose a record type for the function extender in the upper right corner.
    1. The record type will determine where the new field is added to, i.e. which table is being extended.
    2. Aggregation requires a combination of the child records of a single parent record, where the parent record type is indicated by the “Extends Record Type” dropdown, i.e. aggregating the claims that belong a single member would dictate extending the member record.
    3. In this case choose episode since we will be aggregating claims within the episode up to the single episode record.
6. Each row under the elements section will indicate either a “group by” dimension or an aggregation.
    1. Click the checkbox preceding the first dropdown. This is required to add the field to the schema upon creation.
    2. Choose group from the dropdown and then use the element text field to search for a schema element, example Provider Specialty.
    3. In this example we will not use a group by, but just a total SUM. Select SUM from the dropdown and then Medical Claim Line Allowed Amount in the search field.
    4. In the same row, use the field labelled “Extender Column Name” to enter a new field name. In this case, enter “Total Post Window Medical Allowed” 
7. The function extender requires a limiter to select the child records that are used for aggregation.
    1. In this case, we are going to limit to the post window medical claims.
    2. Click to expand the Limit With: section and then enter the limiter name from step 1 (All Post-Trigger Medical Claims) into the Import a limiter search field.
    3. Click select to choose the limiter. If there are any parameter values that must be entered at run time, they will be prompted here. The parameter values within an extender are set at the time of saving and not prompted when running the outputs.
8. After validating the function extender is ready, the Save or Save and Close options should be displayed in the lower right corner.
9. Repeat steps 4 through 8 for the “Total Post Window RX Allowed” 
    1. Choose episode again for the extender record type.
    2. Choose “All Post-Trigger RX Claims” from step 2 for the Limit with section.
    3. Choose Pharmacy Claim Net Allowed Amount for the SUM field.
    4. Save and close.

## **CASE 10: Calculation Extender - Episode Totals**

1. Following the creation of the individual components for Total Post Window RX Allowed and Total Post Window Medical Allowed, they can be combined by a calculation.
2.  Click Create New and select Calculator Extender from the dropdown.
3. Enter calculation extender name (example “Total Post Window Episode Costs - Medical and RX”) along the grey bar at the top.
4. Choose the record type for the extender from the dropdown in the upper right corner. In this case choose episode.
5. Choose the data type using the small dropdown under the extender name. In this case choose numeric. This will be used to validate the relevant datatypes of the calculation expression and the resulting value.
6. Within the long box below the data type selection, click into the white space to start an entry.
    1. Type Total Post Window Medical Allowed to start the search for the schema field created by the function extender. Tab to select when found.
    2. Type + symbol into the next white space. The symbol will be displayed under a section labelled “Operator”. Tab to select.
    3. Type Total Post Window RX Allowed to start the search for the schema field created by the function extender. Tab to select when found.
    4. When all values are entered, the calculation will be validated and the message “Calculator format is invalid” will be displayed if determined to not be a valid data format.
7. To remove a field or operator, click on the value to highlight and then use the Delete key on the keyboard.
8. To enter a field or operator before, after, or between other fields, click in the white space that separates or precedes the existing field names.

## **CASE 11: Table Extender - Diagnosis Flag**

1. Prerequisite - User should have a CSV file available. The CSV should contain one or more columns that should be unique and represent a foreign key. The key may be either a single column or a compound concat key across multiple columns. Example, the complication diagnosis reference table within a given episode are unique on a combination of Diagnosis Code, Episode Name, and Diagnosis ICD Version Number.
2. Click create new dropdown, under project name in upper left corner.
3. Select Table Extender.
4. Enter table extender name (example “Knee Replacement Flag Codes”) along the grey bar at the top.
5. Choose a record type using the drop down in the upper right portion, the area next to the description icon and label.
    1. In this case choose Diagnosis.
    2. This will dictate the ability to join to a record in a schema record type. For example, if you wanted to select members that had specific diagnoses from a table list, the row containing diagnosis could not join to a member record directly. The table would first need to join to Diagnosis Code, or Primary Diagnosis at the Claim Line or Claim Header records and then flag the member based on the presence of one of those claims.
6. Within the Upload Data (CSV) section, click browse to locate and select the file.
    1. The screen will refresh and indicate “Loading” while ingesting the CSV.
    2. When the loading message goes away the screen will load a preview of the CSV data.
    3. It may take awhile to load the data and a temporary message may display “Table scan in progress”
7. The CSV processing expects distinct column headers and will display the column name at the top of the table. Click the header name or the associated link icon next to the name to edit the column characteristics.
    1. Any column which is intended to act as a foreign key should be linked using the Link Setting. 
    2. In this case edit the column that contains Diagnosis Codes and then choose Link With Field with Diagnosis: Code in the linked field search blank.
    3. Click OK and note that the column header is now green, indicating it is linked.
    4. Repeat for any other linked fields.
    5. For any linked fields, the data type is inherited from the schema via the linked field. The default data type for any non-linked field is Text. Click the header name and choose Date or Numeric or Boolean as appropriate for each field.
8. When all columns are updated, click Save or Save and Close from the lower right corner.
9. The table extender columns will subsequently be returned during schema field selection (used in other assets). The field will extend the diagnosis table and therefore inherit any limitations of schema parent child relationships applied to diagnosis records.
