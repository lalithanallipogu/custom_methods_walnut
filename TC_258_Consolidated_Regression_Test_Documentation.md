# TC_258 - Consolidated Regression Batch Execution Test Documentation

---

## 1. Overview

| Field | Value |
|---|---|
| **Title** | Walnut enabled automation test to consolidate all regression batch execution tests |
| **Category** | Automated |
| **Priority** | Medium |
| **Status** | Completed |
| **Platform** | Walnut (Shared + API + Web contexts) |
| **Total Steps** | 72 |

---

## 2. Consolidated Tests Coverage

This single consolidated test (TC_258) replaces **9 individual regression batch execution tests**:

| # | Test Case ID | Test Name | Folder | Status |
|---|---|---|---|---|
| 1 | TC_229 | OP-737_Duplicate_Ultrasound_Test2_TestAutomation | duplicate_ultrasound_test2 batch execution | Consolidated |
| 2 | TC_214 | OP741_regression_claims_based_orphan_claims batch execution_AutomatedTest | regression_claims_based_orphan_claims batch execution | Consolidated |
| 3 | TC_255 | OP-739_regression_claims_based_paid_facility_triggerpaid_surgeon_trigger batch execution | regression_claims_based_paid_facility_triggerpaid_surgeon_trigger | Consolidated |
| 4 | TC_237 | OP-742_regression_claims_based_truncation | regression_claims_based_truncation batch execution | Consolidated |
| 5 | TC_254 | OP-740_regression_claims_trigger_adjusted_trigger_trigger-regression_exception_3.3 | regression_claims_trigger_adjusted_trigger_trigger-regression_exception_3.3 | Consolidated |
| 6 | TC_227 | OP-692_Duplicate_separate_claim_file_TestAutomation | retrospective_duplicate_claim_separate_file in BETL | Consolidated |
| 7 | TC_257 | OP-744_retrospective_related-nonrbe-claim_trigger-claim batch execution | retrospective_related-nonrbe-claim_trigger-claim batch | Consolidated |
| 8 | TC_250 | OP-738_retrospective_trigger-trigger batch execution test | retrospective_trigger-trigger batch execution test | Consolidated |
| 9 | TC_253 | OP-743_retrospective_trigger_claim_non-trigger-claim_after_runout batch execution | retrospective_trigger_claim_non-trigger-claim_after_runout | Consolidated |

---

## 3. Nested Test Cases Used

TC_258 calls several reusable nested test cases during execution:

### 3.1 Login setup with email and password (TC_252)

| Step | Action | Expected Result |
|---|---|---|
| 1 | Clear all browser cookies to force fresh session | Cookies cleared |
| 2 | Navigate to `${url}` | Successfully navigated to login page |
| 3 | Enter `${email}` in Email | Email entered |
| 4 | Enter `${password}` in Password | Password entered |
| 5 | Click Login | Login clicked |
| 6 | Click Analyst Internal With Automated Test Role Under Aver | Role group selected |
| 7 | Click Analyst-Internal with Automated-Test | Role selected |
| 8 | Click Submit | Role applied |
| 9 | Wait for page navigation to `${dashboardURL}` | Dashboard loaded |
| 10 | Extract AverSessionId cookie from browser and store in `$[averSessionId]` | `averSessionId` populated |

### 3.2 Other Nested Test Cases Referenced

| Nested Test | Description | Called At |
|---|---|---|
| **Timeout_for_JobRun_FileUpload** | Wait period after file upload before triggering jobs | Steps 19, 48 |
| **Timeout_for_JobRun** | Wait period between BETL job stages | Steps 21, 23, 25, 50, 52, 54, 66, 68, 70 |
| **Timeout_for_CDCJobRun** | Extended wait for CDC job completion | Step 64 |
| **Transform Job run** | Trigger BETL Transform job execution | Steps 20, 49, 65 |
| **Validate Job Run** | Trigger BETL Validate job execution | Steps 22, 51, 67 |
| **CDC Job Run** | Trigger BETL CDC BBM job execution | Steps 24, 53, 69 |
| **Login setup with email and password** | Full login + session extraction (TC_252) | Steps 26, 28, 30, 32, 34, 36, 38, 40, 42, 55, 57, 59, 61, 71 |

---

## 4. Complete Step-by-Step Execution Flow (All 72 Steps)

The 72 steps of TC_258 are organized into **3 Batch Rounds**, each following the same pattern:

```
Batch Round Pattern:
  [File Uploads] -> [Wait] -> [Transform Job] -> [Wait] -> [Validate Job] -> [Wait] -> [CDC Job] -> [Wait] -> [Login + Get Member Validations]
```

---

### BATCH ROUND 1 — Dummy ID + 4 Artifact Files + OP-977 Member Files (Steps 1-43)

#### Phase 1A: File Upload — Dummy ID 4-File Batch (Step 1)

| Step | Type | Action | Expected Result |
|---|---|---|---|
| **1** | Custom Method | Replace `{{member_id}}` with dummy ID `${dummyId}` in 4 artifact files (`${artifact1}`, `${artifact2}`, `${artifact3}`, `${artifact4}`) and upload to `/TO_AVER/` via SFTP. Store batch in `$[batch]` | All 4 files uploaded successfully, `$[batch]` = YYYYMMDD |

**Method:** `Altarum_artifact_dummyid_replace_upload_4files.ts`
**Output Variables:** `$[batch]`
**Assertions:**
- dummyId must not be empty
- SFTP credentials (host, username, password) must be present
- Each artifact file must exist at resolved path
- SFTP upload exit code = 0
- Original artifact files are NEVER modified (temp copies only)

#### Phase 1B: File Upload — Generate Member ID + Upload Individual Artifacts (Steps 2-18)

| Step | Type | Action | Expected Result |
|---|---|---|---|
| **2** | Custom Method | Generate unique ICMEM ID, replace `{{member_id}}` in artifact `${ActualFileArtifact}`, upload to `/TO_AVER/`. Store ID in `$[memberID_OP-977]` and batch in `$[batch]` | Member file uploaded, `$[memberID_OP-977]` = `ICMEM-XXXXAAAA`, `$[batch]` = YYYYMMDD |
| **3** | Custom Method | Reuse `$[memberID_OP-977]`, replace `{{member_id}}` in `${ActualFileArtifact4}`, upload to `/TO_AVER/` | File uploaded with same member ID |
| **4** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact5}`, upload | File uploaded |
| **5** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact7}`, upload | File uploaded |
| **6** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact8}`, upload | File uploaded |
| **7** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact9}`, upload | File uploaded |
| **8** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact10}`, upload | File uploaded |
| **9** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact11}`, upload | File uploaded |
| **10** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact12}`, upload | File uploaded |
| **11** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact14}`, upload | File uploaded |
| **12** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact15}`, upload | File uploaded |
| **13** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact17}`, upload | File uploaded |
| **14** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact18}`, upload | File uploaded |
| **15** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact19}`, upload | File uploaded |
| **16** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact20}`, upload | File uploaded |
| **17** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact21}`, upload | File uploaded |
| **18** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact22}`, upload | File uploaded |

**Total Files Uploaded in Phase 1B:** 17 files (1 generate + 16 reuse)
**Method (Step 2):** `generate_memberid_artifact_replace_upload_1file.ts`
**Method (Steps 3-18):** `reuse_memberid_artifact_replace_upload_1file.ts`
**Output Variables:** `$[memberID_OP-977]`, `$[batch]`
**Assertions:**
- Generated ICMEM ID format: `ICMEM-{4digits}{4letters}`
- `$[memberId]` must exist for all reuse steps
- All artifact files must resolve and exist
- SFTP upload exit code = 0 for each file
- Timestamp shifted **2716 days** forward from current date

#### Phase 1C: BETL Job Pipeline (Steps 19-25)

| Step | Type | Action | Expected Result |
|---|---|---|---|
| **19** | Nested TC | Execute: **Timeout_for_JobRun_FileUpload** | Wait completed |
| **20** | Nested TC | Execute: **Transform Job run** | Transform job triggered, HTTP 200 |
| **21** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |
| **22** | Nested TC | Execute: **Validate Job Run** | Validate job triggered, HTTP 200 |
| **23** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |
| **24** | Nested TC | Execute: **CDC Job Run** | CDC BBM job triggered, HTTP 200 |
| **25** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |

**Assertions:**
- Each BETL API call returns HTTP 200 (`ctx.assertStatus(response, 200)`)
- `$[batch]` runtime variable must be available for all jobs
- `$[averSessionId]` must be valid for authentication
- Request body must be valid JSON

#### Phase 1D: Member Validations — 9 Individual Get Member Calls (Steps 26-43)

Each validation follows a **Login + Get Member** pair pattern:

| Step | Type | Action | Suffix | Validates Regression Test |
|---|---|---|---|---|
| **26** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **27** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix}` | `${suffix}` | **duplicate_ultrasound_test2** |
| **28** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **29** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix2}` | `${suffix2}` | **regression_claims_based_orphan_claims** |
| **30** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **31** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix3}` | `${suffix3}` | **regression_claims_based_truncation** |
| **32** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **33** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix5}` | `${suffix5}` | **regression_claims_trigger_adjusted_trigger** |
| **34** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **35** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix6}` | `${suffix6}` | **retrospective_duplicate_claim_separate_file** |
| **36** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **37** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix7}` | `${suffix7}` | **retrospective_related-nonrbe-claim_trigger-claim** |
| **38** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **39** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix8}` | `${suffix8}` | **retrospective_trigger-trigger** |
| **40** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **41** | API Call | POST get member with `$[memberID_OP-977]` + `${suffix9}` | `${suffix9}` | **retrospective_trigger_claim_non-trigger-claim** |
| **42** | Nested TC | Execute: Login setup with email and password | — | Session setup |
| **43** | API Call | POST get member with `$[memberId]` + `${suffix10}` | `${suffix10}` | **regression_claims_based_paid_facility_triggerpaid_surgeon_trigger** |

**Method:** `trigger_get_member_with_suffix.ts`
**Assertions:**
- `$[averSessionId]` must be present (fresh login each time)
- `$[memberID_OP-977]` must exist from Step 2
- HTTP response status < 400
- Full member ID = `$[memberID_OP-977]` + suffix (e.g. `ICMEM-7723MFBV-ult_trig_dupe_SCK6tt`)

---

### BATCH ROUND 2 — Additional Artifact Files + Re-trigger BETL (Steps 44-62)

#### Phase 2A: File Upload — 4 More Artifact Files (Steps 44-47)

| Step | Type | Action | Expected Result |
|---|---|---|---|
| **44** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact2}`, upload | File uploaded |
| **45** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact6}`, upload | File uploaded |
| **46** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact13}`, upload | File uploaded |
| **47** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact16}`, upload | File uploaded |

**Total Files Uploaded in Phase 2A:** 4 files

#### Phase 2B: BETL Job Pipeline — Second Trigger (Steps 48-54)

| Step | Type | Action | Expected Result |
|---|---|---|---|
| **48** | Nested TC | Execute: **Timeout_for_JobRun_FileUpload** | Wait completed |
| **49** | Nested TC | Execute: **Transform Job run** | Transform job triggered, HTTP 200 |
| **50** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |
| **51** | Nested TC | Execute: **Validate Job Run** | Validate job triggered, HTTP 200 |
| **52** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |
| **53** | Nested TC | Execute: **CDC Job Run** | CDC BBM job triggered, HTTP 200 |
| **54** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |

#### Phase 2C: Member Validations — Second Round (Steps 55-62)

| Step | Type | Action | Suffix | Validates |
|---|---|---|---|---|
| **55** | Nested TC | Execute: Login setup | — | Session setup |
| **56** | API Call | POST get member + `${suffix}` | `${suffix}` | Re-validates duplicate_ultrasound_test2 |
| **57** | Nested TC | Execute: Login setup | — | Session setup |
| **58** | API Call | POST get member + `${suffix2}` | `${suffix2}` | Re-validates regression_claims_based_orphan_claims |
| **59** | Nested TC | Execute: Login setup | — | Session setup |
| **60** | API Call | POST get member + `${suffix6}` | `${suffix6}` | Re-validates retrospective_duplicate_claim_separate_file |
| **61** | Nested TC | Execute: Login setup | — | Session setup |
| **62** | API Call | POST get member + `${suffix7}` | `${suffix7}` | Re-validates retrospective_related-nonrbe-claim |

---

### BATCH ROUND 3 — Final Artifact File + Third BETL Trigger (Steps 63-72)

#### Phase 3A: File Upload — 1 More Artifact File (Step 63)

| Step | Type | Action | Expected Result |
|---|---|---|---|
| **63** | Custom Method | Reuse `$[memberID_OP-977]`, replace in `${ActualFileArtifact3}`, upload | File uploaded |

#### Phase 3B: BETL Job Pipeline — Third Trigger with CDC-specific Wait (Steps 64-70)

| Step | Type | Action | Expected Result |
|---|---|---|---|
| **64** | Nested TC | Execute: **Timeout_for_CDCJobRun** | Extended CDC wait completed |
| **65** | Nested TC | Execute: **Transform Job run** | Transform job triggered, HTTP 200 |
| **66** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |
| **67** | Nested TC | Execute: **Validate Job Run** | Validate job triggered, HTTP 200 |
| **68** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |
| **69** | Nested TC | Execute: **CDC Job Run** | CDC BBM job triggered, HTTP 200 |
| **70** | Nested TC | Execute: **Timeout_for_JobRun** | Wait completed |

#### Phase 3C: Final Member Validation (Steps 71-72)

| Step | Type | Action | Suffix | Validates |
|---|---|---|---|---|
| **71** | Nested TC | Execute: Login setup | — | Session setup |
| **72** | API Call | POST get member + `${suffix}` | `${suffix}` | Final validation of duplicate_ultrasound_test2 |

---

## 5. Runtime Variables Flow

```
Step 1  --> $[batch]           (from 4-file dummy ID upload timestamp)
Step 2  --> $[memberID_OP-977] (generated ICMEM ID, e.g. ICMEM-1902SRXT)
            $[batch]           (updated from member file upload timestamp)

Each Login (TC_252) --> $[averSessionId] (fresh AverSessionId cookie each time)
```

| Variable | Set By Step | Format | Used By Steps |
|---|---|---|---|
| `$[batch]` | Step 1 (4-file upload), Step 2 (member upload) | `YYYYMMDD` (e.g. `20341015`) | All BETL job triggers (Steps 20-24, 49-53, 65-69) |
| `$[memberID_OP-977]` | Step 2 (generate member ID) | `ICMEM-{4digits}{4letters}` (e.g. `ICMEM-1902SRXT`) | Steps 3-18, 27-43, 44-47, 56-62, 63, 72 |
| `$[averSessionId]` | Each nested Login (TC_252, Step 10) | Full cookie header string | All API calls (Get Member, BETL triggers) |

---

## 6. Artifact Files Summary

The test processes a total of **22 unique artifact files** across all 3 batch rounds:

### Batch Round 1 — 21 Files

| # | Artifact Parameter | Step | Method |
|---|---|---|---|
| 1 | `${artifact1}` | 1 | Dummy ID 4-file upload |
| 2 | `${artifact2}` | 1 | Dummy ID 4-file upload |
| 3 | `${artifact3}` | 1 | Dummy ID 4-file upload |
| 4 | `${artifact4}` | 1 | Dummy ID 4-file upload |
| 5 | `${ActualFileArtifact}` | 2 | Generate MemberID + upload |
| 6 | `${ActualFileArtifact4}` | 3 | Reuse MemberID + upload |
| 7 | `${ActualFileArtifact5}` | 4 | Reuse MemberID + upload |
| 8 | `${ActualFileArtifact7}` | 5 | Reuse MemberID + upload |
| 9 | `${ActualFileArtifact8}` | 6 | Reuse MemberID + upload |
| 10 | `${ActualFileArtifact9}` | 7 | Reuse MemberID + upload |
| 11 | `${ActualFileArtifact10}` | 8 | Reuse MemberID + upload |
| 12 | `${ActualFileArtifact11}` | 9 | Reuse MemberID + upload |
| 13 | `${ActualFileArtifact12}` | 10 | Reuse MemberID + upload |
| 14 | `${ActualFileArtifact14}` | 11 | Reuse MemberID + upload |
| 15 | `${ActualFileArtifact15}` | 12 | Reuse MemberID + upload |
| 16 | `${ActualFileArtifact17}` | 13 | Reuse MemberID + upload |
| 17 | `${ActualFileArtifact18}` | 14 | Reuse MemberID + upload |
| 18 | `${ActualFileArtifact19}` | 15 | Reuse MemberID + upload |
| 19 | `${ActualFileArtifact20}` | 16 | Reuse MemberID + upload |
| 20 | `${ActualFileArtifact21}` | 17 | Reuse MemberID + upload |
| 21 | `${ActualFileArtifact22}` | 18 | Reuse MemberID + upload |

### Batch Round 2 — 4 Files

| # | Artifact Parameter | Step | Method |
|---|---|---|---|
| 22 | `${ActualFileArtifact2}` | 44 | Reuse MemberID + upload |
| 23 | `${ActualFileArtifact6}` | 45 | Reuse MemberID + upload |
| 24 | `${ActualFileArtifact13}` | 46 | Reuse MemberID + upload |
| 25 | `${ActualFileArtifact16}` | 47 | Reuse MemberID + upload |

### Batch Round 3 — 1 File

| # | Artifact Parameter | Step | Method |
|---|---|---|---|
| 26 | `${ActualFileArtifact3}` | 63 | Reuse MemberID + upload |

**Total Artifact Files Processed:** 26 (4 dummy ID files + 22 member ID files)

---

## 7. Assertions & Validations Summary

### File Upload Assertions

| # | Assertion | Error on Failure |
|---|---|---|
| 1 | `dummyId` must not be empty | `"dummyId is empty. Ensure it is configured in test data."` |
| 2 | SFTP credentials (host, username, password) present | `"SFTP credentials missing."` |
| 3 | Artifact file exists at resolved path | `"Artifact file not found at resolved path: <path>"` |
| 4 | At least 1 valid artifact reference | `"No valid artifact references provided. Nothing to upload."` |
| 5 | SFTP upload exit code = 0 | `"SFTP upload failed: <stderr>"` |
| 6 | `$[memberId]` exists for reuse steps | `"memberId runtime variable not found."` |
| 7 | `{{member_id}}` placeholders found | Warning only (does not fail) |
| 8 | Original artifact NEVER modified | Read-only access; temp copy modified |

### BETL Job Assertions

| # | Assertion | Error on Failure |
|---|---|---|
| 1 | URL must be present | `"URL is required."` |
| 2 | `$[batch]` runtime variable exists | `"Batch not found in runtime variable."` |
| 3 | `$[averSessionId]` exists | `"AverSessionId not found in runtime variables."` |
| 4 | Request body valid JSON | `"Failed to parse requestBody: <raw>"` |
| 5 | **HTTP status = 200** | `ctx.assertStatus(response, 200)` throws |

### Get Member Assertions

| # | Assertion | Error on Failure |
|---|---|---|
| 1 | `$[averSessionId]` exists | `"AverSessionId not found in runtime variables."` |
| 2 | `$[memberId]` / `$[memberID_OP-977]` exists | `"memberId not found in runtime variables."` |
| 3 | HTTP status < 400 | `"Get Member failed: <status> <statusText>"` |
| 4 | Member data present (retry variant) | `"member data still empty after 20 attempts (600s)"` |
| 5 | Full member ID = base + suffix | Logs `"Getting member by generated ID with suffix: <fullId>"` |

### Login Assertions (TC_252 Nested)

| # | Assertion | Error on Failure |
|---|---|---|
| 1 | Browser cookies cleared | Playwright context `clearCookies()` |
| 2 | Login page navigable | Playwright navigation timeout |
| 3 | Role selection successful | Element click timeout |
| 4 | Dashboard navigation completes | `waitForNavigation` timeout |
| 5 | `$[averSessionId]` cookie captured | `"Could not capture cookie header from get_session_user request."` |

---

## 8. Filename Generation Logic

All file upload methods use a consistent timestamping strategy:

| Component | Logic |
|---|---|
| **Base name** | Original filename with all trailing `_digits` groups stripped |
| **Timestamp shift** | Current date + **2716 days** forward |
| **Format** | `{baseName}_{YYYYMMDDHHmmss}_{epochMillis}.{ext}` |
| **Uniqueness** | 10ms delay between files ensures unique epoch per file |
| **Batch derivation** | `YYYYMMDD` portion of the shifted timestamp (from first file) |

**Example:**
```
Original:  member_enrollment_20230101_1672531200000.csv
Stripped:  member_enrollment
Output:    member_enrollment_20341015143022_1729000222345.csv
Batch:     20341015
```

---

## 9. SFTP Upload Architecture

```
Custom Method (Node.js)
  |
  +-- Writes temp Node.js script
  |     |
  |     +-- require('ssh2-sftp-client')   <-- from bundled node_modules
  |     +-- Connect to SFTP host
  |     +-- PUT each file to /TO_AVER/
  |     +-- End connection
  |
  +-- spawnSync('node', [script, args])   <-- 180s timeout
  |
  +-- finally: cleanup temp script + temp data files
```

| Config | Value |
|---|---|
| Remote directory | `/TO_AVER/` |
| SFTP library | `ssh2-sftp-client` (bundled in `walnut-methods/node_modules/`) |
| Upload timeout | 180 seconds |
| Temp file cleanup | Always (in `finally` block, even on failure) |

---

## 10. Custom Methods Used

| # | Method Name | File | Context | actionType |
|---|---|---|---|---|
| 1 | Altarum Artifact DummyID Replace Upload 4 Files | `Altarum_artifact_dummyid_replace_upload_4files.ts` | shared | `custom_artifact_dummyid_replace_upload_4files` |
| 2 | MemberID Generate Replace Upload 1 File | `generate_memberid_artifact_replace_upload_1file.ts` | shared | `custom_generate_memberid_artifact_replace_upload_1file` |
| 3 | Reuse MemberID Replace Upload 1 File | `reuse_memberid_artifact_replace_upload_1file.ts` | shared | `custom_reuse_memberid_artifact_replace_upload_1file` |
| 4 | Trigger CDC Job | `pre_betl_trigger_cdc_bbm_job.ts` | api | `custom_pre_betl_trigger_cdc_bbm_job` |
| 5 | Trigger Validate Job | `pre_betl_trigger_validate_job.ts` | api | `custom_pre_betl_trigger_validate_job` |
| 6 | Trigger Transform Job | `pre_betl_trigger_transform_job.ts` | api | `custom_pre_betl_trigger_transform_job` |
| 7 | Trigger Get Member With Suffix | `trigger_get_member_with_suffix.ts` | api | `custom_trigger_get_member_with_suffix` |
| 8 | Extract Aver Session Cookie | `extract-aver-session.ts` | web | `custom_extract_aver_session` |
| 9 | Clear Browser Cookies | `clear-browser-cookies.ts` | web | `custom_clear_browser_cookies` |

---

## 11. Test Data Parameters Required

| Parameter | Type | Description |
|---|---|---|
| `dummyId` | string | Pre-configured dummy member ID for 4-file batch |
| `artifact1` - `artifact4` | artifact ref | 4 artifact references for dummy ID batch |
| `ActualFileArtifact` - `ActualFileArtifact22` | artifact ref | 22 artifact references for member-specific files |
| `sftphost` | string | SFTP server hostname |
| `sftpport` | string | SFTP port (default: 22) |
| `sftpusername` | string | SFTP username |
| `sftppassword` | credential | SFTP password |
| `url` | string | Login page URL |
| `url2` | string | Get Member API endpoint URL |
| `email` | string | Login email |
| `password` | credential | Login password |
| `dashboardURL` | string | Dashboard URL for navigation verification |
| `requestBody2` - `requestBody10` | JSON string | Request body templates for each Get Member call |
| `suffix` - `suffix10` | string | Member ID suffixes for each regression test variant |

---

## 12. Individual Test Details & Get Member Expected Outcomes

Each of the 9 original individual tests followed its own file-upload + BETL pipeline + Get Member validation flow. The consolidated test (TC_258) covers all of them using a shared member ID ($[memberID_OP-977]) with unique suffixes per regression scenario.

**API Endpoint for all Get Member calls:** `POST https://portal-qa.aver.io/api/command-center/get_member`

---

### 12.1 TC_227 — OP-692: Duplicate Separate Claim File (retrospective_duplicate_claim_separate_file in BETL)

| Field | Value |
|---|---|
| **Original Test** | TC_227: OP-692_Duplicate_separate_claim_file_TestAutomation |
| **Status** | Approved |
| **Original Steps** | 31 (3 batch rounds with 3 separate Get Member calls) |
| **Scenario** | Validates that when a duplicate claim is submitted in a separate file, the BETL pipeline correctly processes it without data corruption. Member enrollment + claim file uploaded, then a second claim file (duplicate) uploaded in a separate batch, then a third file in a third batch. |
| **Original Artifacts** | 3 member-specific files (ActualFileArtifact, ActualFileArtifact2, ActualFileArtifact3) uploaded across 3 rounds |
| **Original Batch Rounds** | 3 (each with full Transform → Validate → CDC pipeline) |
| **Suffix in Consolidated** | `-dupe_sep_claim` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 27 | `{"member_id":"$[memberID_OP-977]-dupe_sep_claim"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data is ingested correctly after initial enrollment + claim file batch. |
| Round 2 | Step 56 | `{"member_id":"$[memberID_OP-977]-dupe_sep_claim"}` | HTTP < 400. Member data remains intact and consistent after second batch ingestion with duplicate claim in separate file. No data corruption or duplication errors. |
| Round 3 | Step 72 | `{"member_id":"$[memberID_OP-977]-dupe_sep_claim"}` | HTTP < 400. Member data persists correctly through all 3 BETL cycles. Final validation confirms duplicate claim handling across multiple batches. |

---

### 12.2 TC_229 — OP-737: Duplicate Ultrasound Test2 (duplicate_ultrasound_test2 batch execution)

| Field | Value |
|---|---|
| **Original Test** | TC_229: OP-737_Duplicate_Ultrasound_Test2_TestAutomation |
| **Status** | Draft |
| **Original Steps** | 23 (2 batch rounds with 2 Get Member calls) |
| **Scenario** | Validates that duplicate ultrasound claims are handled correctly by the BETL pipeline. Member enrollment + initial claim file uploaded, then a second file with duplicate ultrasound data uploaded in a second batch. |
| **Original Artifacts** | 3 member-specific files uploaded across 2 rounds |
| **Original Batch Rounds** | 2 (each with full Transform → Validate → CDC pipeline) |
| **Suffix in Consolidated** | `-ult_trig_dupe_SCK6tt` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 29 | `{"member_id":"$[memberID_OP-977]-ult_trig_dupe_SCK6tt"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data is ingested correctly after initial batch with ultrasound claim. |
| Round 2 | Step 58 | `{"member_id":"$[memberID_OP-977]-ult_trig_dupe_SCK6tt"}` | HTTP < 400. Member data remains intact after second batch with duplicate ultrasound data. No duplicate processing errors. |

---

### 12.3 TC_250 — OP-738: Retrospective Trigger-Trigger (retrospective_trigger-trigger batch execution test)

| Field | Value |
|---|---|
| **Original Test** | TC_250: OP-738_retrospective_trigger-trigger batch execution test |
| **Status** | Draft |
| **Original Steps** | 12 (1 batch round with 1 Get Member call) |
| **Scenario** | Validates the retrospective trigger-trigger scenario where a claim triggers a retrospective review, which in turn triggers another retrospective event. Tests that the BETL pipeline correctly chains trigger events without infinite loops or data loss. |
| **Original Artifacts** | 2 member-specific files (ActualFileArtifact, ActualFileArtifact2) uploaded in 1 round |
| **Original Batch Rounds** | 1 (Transform → Validate → CDC) |
| **Suffix in Consolidated** | `-retro_trig_trig` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 31 | `{"member_id":"$[memberID_OP-977]-retro_trig_trig"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data correctly reflects chained retrospective trigger events without data loss or infinite trigger loops. |

---

### 12.4 TC_255 — OP-739: Paid Facility Trigger / Paid Surgeon Trigger (regression_claims_based_paid_facility_triggerpaid_surgeon_trigger)

| Field | Value |
|---|---|
| **Original Test** | TC_255: OP-739_regression_claims_based_paid_facility_triggerpaid_surgeon_trigger batch execution |
| **Status** | Draft |
| **Original Steps** | 12 (1 batch round with 1 Get Member call) |
| **Scenario** | Validates that when a claim has both a paid facility trigger and a paid surgeon trigger, the BETL pipeline processes both triggers correctly without conflict. Tests the regression where dual payment triggers on a single claim caused processing errors. |
| **Original Artifacts** | 2 member-specific files (ActualFileArtifact, ActualFileArtifact2) uploaded in 1 round |
| **Original Batch Rounds** | 1 (Transform → Validate → CDC) |
| **Suffix in Consolidated** | `-paid_fac_triggerpaid_surg` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 33 | `{"member_id":"$[memberID_OP-977]-paid_fac_triggerpaid_surg"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data correctly reflects both paid facility and paid surgeon triggers on the same claim without conflict. |

---

### 12.5 TC_254 — OP-740: Claims Trigger Adjusted Trigger Regression Exception 3.3 (regression_claims_trigger_adjusted_trigger_trigger-regression_exception_3.3)

| Field | Value |
|---|---|
| **Original Test** | TC_254: OP-740_regression_claims_trigger_adjusted_trigger_trigger-regression_exception_3.3 |
| **Status** | Draft |
| **Original Steps** | 22 (2 batch rounds with 2 Get Member calls) |
| **Scenario** | Validates the regression exception 3.3 scenario where a claim's trigger is adjusted, which itself triggers another event. Tests that the adjusted trigger chain processes correctly through the BETL pipeline without the known exception condition. |
| **Original Artifacts** | 3 member-specific files (ActualFileArtifact, ActualFileArtifact2, ActualFileArtifact3) uploaded across 2 rounds |
| **Original Batch Rounds** | 2 (each with full Transform → Validate → CDC pipeline) |
| **Suffix in Consolidated** | `-trig_adj_trig_trig` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 35 | `{"member_id":"$[memberID_OP-977]-trig_adj_trig_trig"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data correctly reflects adjusted trigger chain after initial batch. |
| Round 2 | Step 60 | `{"member_id":"$[memberID_OP-977]-trig_adj_trig_trig"}` | HTTP < 400. Member data remains intact after second batch. Adjusted trigger regression exception 3.3 does not occur. |

---

### 12.6 TC_214 — OP-741: Regression Claims Based Orphan Claims (regression_claims_based_orphan_claims batch execution)

| Field | Value |
|---|---|
| **Original Test** | TC_214: OP741_regression_claims_based_orphan_claims batch execution_AutomatedTest |
| **Status** | Draft |
| **Original Steps** | 22 (2 batch rounds with 2 Get Member calls) |
| **Scenario** | Validates that orphan claims (claims without a matching member enrollment record at time of processing) are handled correctly by the BETL pipeline. Tests the regression where orphan claims caused processing failures or data inconsistencies. |
| **Original Artifacts** | 3 member-specific files (ActualFileArtifact, ActualFileArtifact2, ActualFileArtifact3) uploaded across 2 rounds |
| **Original Batch Rounds** | 2 (each with full Transform → Validate → CDC pipeline) |
| **Suffix in Consolidated** | `-orphan_claims` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 37 | `{"member_id":"$[memberID_OP-977]-orphan_claims"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data correctly present even when claims arrived before enrollment in the batch. Orphan claims are reconciled. |
| Round 2 | Step 62 | `{"member_id":"$[memberID_OP-977]-orphan_claims"}` | HTTP < 400. Member data remains intact after second batch. Orphan claim reconciliation is stable across multiple ingestion cycles. |

---

### 12.7 TC_237 — OP-742: Regression Claims Based Truncation (regression_claims_based_truncation batch execution)

| Field | Value |
|---|---|
| **Original Test** | TC_237: OP-742_regression_claims_based_truncation |
| **Status** | Draft |
| **Original Steps** | 12 (1 batch round with 1 Get Member call) |
| **Scenario** | Validates that claims with truncated data fields are processed correctly by the BETL pipeline. Tests the regression where claims with data exceeding field length limits caused truncation errors or pipeline failures. |
| **Original Artifacts** | 2 member-specific files (ActualFileArtifact, ActualFileArtifact2) uploaded in 1 round |
| **Original Batch Rounds** | 1 (Transform → Validate → CDC) |
| **Suffix in Consolidated** | `-claims_trunc` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 39 | `{"member_id":"$[memberID_OP-977]-claims_trunc"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data is correctly ingested despite truncated claim data fields. No pipeline failure from truncation. |

---

### 12.8 TC_253 — OP-743: Trigger Claim Non-Trigger Claim After Runout (retrospective_trigger_claim_non-trigger-claim_after_runout)

| Field | Value |
|---|---|
| **Original Test** | TC_253: OP-743_retrospective_trigger_claim_non-trigger-claim_after_runout batch execution |
| **Status** | Draft |
| **Original Steps** | 12 (1 batch round with 1 Get Member call) |
| **Scenario** | Validates the scenario where a trigger claim is followed by a non-trigger claim after a runout period. Tests that the BETL pipeline correctly distinguishes between trigger and non-trigger claims after the runout window expires. |
| **Original Artifacts** | 2 member-specific files (ActualFileArtifact, ActualFileArtifact2) uploaded in 1 round |
| **Original Batch Rounds** | 1 (Transform → Validate → CDC) |
| **Suffix in Consolidated** | `-trig_claim_non_trig_claim_runout` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 41 | `{"member_id":"$[memberID_OP-977]-trig_claim_non_trig_claim_runout"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data correctly reflects trigger claim followed by non-trigger claim after runout. Runout period boundary is respected. |

---

### 12.9 TC_257 — OP-744: Retrospective Related Non-RBE Claim Trigger-Claim (retrospective_related-nonrbe-claim_trigger-claim batch)

| Field | Value |
|---|---|
| **Original Test** | TC_257: OP-744_retrospective_related-nonrbe-claim_trigger-claim batch execution |
| **Status** | Draft |
| **Original Steps** | 12 (1 batch round with 1 Get Member call) |
| **Scenario** | Validates that a non-RBE (Risk-Based Entity) claim that is related to a trigger claim is processed correctly by the BETL pipeline. Tests the scenario where retrospective processing must correctly link a non-RBE claim to its trigger claim without misclassification. |
| **Original Artifacts** | 2 member-specific files (ActualFileArtifact, ActualFileArtifact2) uploaded in 1 round |
| **Original Batch Rounds** | 1 (Transform → Validate → CDC) |
| **Suffix in Consolidated** | `-nonrbe_claim_trig` |

**Get Member Expected Outcome:**

| Round | Consolidated Step | Request Body | Expected Outcome |
|---|---|---|---|
| Round 1 | Step 43 | `{"member_id":"$[memberID_OP-977]-nonrbe_claim_trig"}` | HTTP < 400. Response body contains non-empty `member_id`. Member data correctly reflects the non-RBE claim linked to its trigger claim. No misclassification of RBE vs non-RBE claims. |

---

### 12.10 Consolidated Get Member Validation Summary

| # | Regression Test | Suffix | Original Rounds | Consolidated Round 1 | Consolidated Round 2 | Consolidated Round 3 | Total Validations |
|---|---|---|---|---|---|---|---|
| 1 | TC_227: OP-692 Duplicate separate claim file | `-dupe_sep_claim` | 3 | Step 27 | Step 56 | Step 72 | 3 |
| 2 | TC_229: OP-737 Duplicate Ultrasound Test2 | `-ult_trig_dupe_SCK6tt` | 2 | Step 29 | Step 58 | — | 2 |
| 3 | TC_250: OP-738 Retrospective trigger-trigger | `-retro_trig_trig` | 1 | Step 31 | — | — | 1 |
| 4 | TC_255: OP-739 Paid facility / paid surgeon trigger | `-paid_fac_triggerpaid_surg` | 1 | Step 33 | — | — | 1 |
| 5 | TC_254: OP-740 Claims trigger adjusted trigger exception 3.3 | `-trig_adj_trig_trig` | 2 | Step 35 | Step 60 | — | 2 |
| 6 | TC_214: OP-741 Orphan claims | `-orphan_claims` | 2 | Step 37 | Step 62 | — | 2 |
| 7 | TC_237: OP-742 Claims truncation | `-claims_trunc` | 1 | Step 39 | — | — | 1 |
| 8 | TC_253: OP-743 Trigger claim non-trigger after runout | `-trig_claim_non_trig_claim_runout` | 1 | Step 41 | — | — | 1 |
| 9 | TC_257: OP-744 Non-RBE claim trigger | `-nonrbe_claim_trig` | 1 | Step 43 | — | — | 1 |
| | **Totals** | | | **9 calls** | **4 calls** | **1 call** | **14 calls** |

---

## 13. Execution Summary

| Metric | Count |
|---|---|
| **Total Steps** | 72 |
| **Batch Rounds** | 3 |
| **BETL Pipeline Triggers** | 3 (Transform + Validate + CDC per round = 9 total job triggers) |
| **File Uploads** | 26 files total (4 dummy + 22 member-specific) |
| **Login Cycles** | 14 (fresh login before each Get Member validation) |
| **Get Member Validations** | 13 API calls with member ID + suffix |
| **Nested Test Case Executions** | 32 |
| **Unique Suffixes Tested** | 10 (suffix through suffix10) |
| **Individual Tests Consolidated** | 9 regression batch execution tests |
| **Custom Methods Invoked** | 9 distinct methods |
