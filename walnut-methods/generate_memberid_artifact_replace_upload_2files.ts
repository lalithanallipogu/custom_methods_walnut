import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Mem ActualFile Artifact Upload Generate MemberID Replace Upload 1 File
 * description: Generate unique member ID, replace {{member_id}} in artifact ${memberArtifact} and upload to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} storing ID in $[memberId] and batch in $[batch]
 * actionType: custom_generate_memberid_artifact_replace_upload_2files
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function generateMemberIdArtifactReplaceUpload1File(ctx: WalnutBaseContext) {
  // ctx.args[0] = memberArtifact (from ${memberArtifact}) — artifact ref for member file
  // ctx.args[1] = SFTP host (from ${sftphost})
  // ctx.args[2] = SFTP port (from ${sftpport})
  // ctx.args[3] = SFTP username (from ${sftpusername})
  // ctx.args[4] = SFTP password (from ${sftppassword})
  // ctx.args[5] = "memberId" (from $[memberId]) — runtime variable name to store generated ID
  // ctx.args[6] = "batch" (from $[batch]) — runtime variable name to store batch timestamp

  const artifactRef = ctx.args[0];
  const host = ctx.args[1];
  const port = ctx.args[2] || '22';
  const username = ctx.args[3];
  const password = ctx.args[4];
  const memberIdVarName = ctx.args[5];
  const batchVarName = ctx.args[6];

  // Step 1: Generate a unique ICMEM ID (format: ICMEM-{4 digits}{4 uppercase letters})
  // Example: ICMEM-1902SRXT
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  const letters = Array.from({ length: 4 }, () => {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alpha.charAt(Math.floor(Math.random() * alpha.length));
  }).join('');
  const memberId = 'ICMEM-' + digits + letters;
  ctx.log('Generated unique ICMEM ID: ' + memberId);

  // Store the generated member ID as a runtime variable for use in subsequent steps
  ctx.setVariable(memberIdVarName, memberId);

  const remoteDirectory = '/TO_AVER/';

  if (!host || !username || !password) {
    throw new Error(
      'SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.'
    );
  }

  if (!artifactRef) {
    throw new Error('Artifact reference is required for the member file to upload.');
  }

  const tempDir = process.env.TEMP || '/tmp';

  // Step 2: Process the member artifact file
  ctx.log('Processing member artifact: ' + artifactRef);
  const filePath = await ctx.resolveArtifact(artifactRef);
  ctx.log('Resolved artifact to: ' + filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error('Artifact file not found at resolved path: ' + filePath);
  }

  // Read the original artifact file (original artifact is NEVER modified)
  const originalContent = fs.readFileSync(filePath, 'utf-8');

  // Replace all occurrences of {{member_id}} with the generated member ID
  const updatedContent = originalContent.replace(/\{\{member_id\}\}/g, memberId);

  const replacedCount = (originalContent.match(/\{\{member_id\}\}/g) || []).length;
  if (replacedCount > 0) {
    ctx.log('Replaced ' + replacedCount + ' {{member_id}} placeholder(s) with ' + memberId);
  } else {
    ctx.warn('No {{member_id}} placeholders found in artifact');
  }

  // Build filename: strip any existing timestamp from original, append new shifted timestamp
  // Timestamp is shifted 2706 days forward from today
  // Format: baseName_YYYYMMDDHHmmss_epochMillis.ext
  const fileNow = new Date();
  const fileShifted = new Date(fileNow.getTime() + 2706 * 24 * 60 * 60 * 1000);
  const fYyyy = fileShifted.getFullYear().toString();
  const fMM = (fileShifted.getMonth() + 1).toString().padStart(2, '0');
  const fdd = fileShifted.getDate().toString().padStart(2, '0');
  const fHH = fileShifted.getHours().toString().padStart(2, '0');
  const fmm = fileShifted.getMinutes().toString().padStart(2, '0');
  const fss = fileShifted.getSeconds().toString().padStart(2, '0');
  const fileDateTimeStamp = fYyyy + fMM + fdd + fHH + fmm + fss;
  const fileEpochMillis = fileNow.getTime().toString();

  // Store batch (YYYYMMDD) from the file's timestamp for API jobs
  if (batchVarName) {
    const batchValue = fYyyy + fMM + fdd;
    ctx.setVariable(batchVarName, batchValue);
    ctx.log('Stored batch: ' + batchValue);
  }

  const originalExt = path.extname(filePath) || '.csv';
  const originalBase = path.basename(filePath, originalExt);
  // Strip ALL trailing _digits groups from the original filename (remove old timestamps)
  let baseName = originalBase;
  while (/_\d+$/.test(baseName)) {
    baseName = baseName.replace(/_\d+$/, '');
  }
  const fileName = baseName + '_' + fileDateTimeStamp + '_' + fileEpochMillis + originalExt;

  // Write modified content to temp file (original artifact stays untouched)
  const tempFilePath = path.join(tempDir, fileName);
  fs.writeFileSync(tempFilePath, updatedContent, 'utf-8');
  ctx.log('Created temp file: ' + fileName);

  // Step 3: Upload temp file via SFTP to /TO_AVER/
  const remotePath = remoteDirectory + fileName;
  ctx.log('Uploading to ' + host + ':' + remotePath + '...');

  const pyScript = [
    'import paramiko',
    'import sys',
    '',
    'host = sys.argv[1]',
    'port = int(sys.argv[2])',
    'username = sys.argv[3]',
    'password = sys.argv[4]',
    'local_file = sys.argv[5]',
    'remote_path = sys.argv[6]',
    '',
    'transport = paramiko.Transport((host, port))',
    'transport.connect(username=username, password=password)',
    'sftp = paramiko.SFTPClient.from_transport(transport)',
    '',
    'try:',
    '    sftp.put(local_file, remote_path)',
    '    print("Upload successful: " + remote_path)',
    'finally:',
    '    sftp.close()',
    '    transport.close()',
  ].join('\n');

  const tmpScript = path.join(tempDir, 'sftp_upload_member_artifact_' + Date.now() + '.py');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    // Credentials passed as arguments — never written to any file
    const result = spawnSync('python', [
      tmpScript,
      host,
      port,
      username,
      password,
      tempFilePath,
      remotePath,
    ], {
      timeout: 180000,
      encoding: 'utf-8',
    });

    if (result.error) {
      throw new Error('Python execution error: ' + result.error.message);
    }

    if (result.status !== 0) {
      throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    }

    ctx.log('Successfully uploaded member file to ' + remotePath);
    ctx.log(result.stdout);
  } finally {
    // Cleanup: remove temp Python script and temp data file
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}
