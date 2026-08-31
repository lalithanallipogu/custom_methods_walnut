import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Replace Member ID Claim2 Upload
 * description: Use existing member ID from $[memberId] to replace {{member_id}} in 1 file ${claim2path} and upload to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} storing batch in $[batch]
 * actionType: custom_replace_existing_member_upload_1file
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function replaceMemberUpload1File(ctx: WalnutContext) {
  // ctx.args[0] = "memberId" (from $[memberId]) — runtime variable name to READ the previously generated ID
  // ctx.args[1] = claim2path (from ${claim2path})
  // ctx.args[2] = SFTP host (from ${sftphost})
  // ctx.args[3] = SFTP port (from ${sftpport})
  // ctx.args[4] = SFTP username (from ${sftpusername})
  // ctx.args[5] = SFTP password (from ${sftppassword})
  // ctx.args[6] = "batch" (from $[batch]) — runtime variable name to store batch timestamp

  const memberIdVarName = ctx.args[0];
  const filePath = ctx.args[1];
  const host = ctx.args[2];
  const port = ctx.args[3] || '22';
  const username = ctx.args[4];
  const password = ctx.args[5];
  const batchVarName = ctx.args[6];

  // Step 1: Retrieve the previously generated member ID from runtime variables
  const memberId = ctx.getVariable(memberIdVarName);
  if (!memberId) {
    throw new Error(
      'Member ID not found in runtime variable "' + memberIdVarName + '". Ensure the ID generation step ran first.'
    );
  }
  ctx.log('Using existing ICMEM ID: ' + memberId);

  const remoteDirectory = '/TO_AVER/';

  if (!host || !username || !password) {
    throw new Error(
      'SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.'
    );
  }

  if (!filePath) {
    throw new Error('File path is empty. Nothing to upload.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Original file not found at path: ' + filePath);
  }

  ctx.log('Processing file: ' + filePath);

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];

  // Step 2: Read original file and replace {{member_id}} with the existing member ID
  const originalContent = fs.readFileSync(filePath, 'utf-8');
  const updatedContent = originalContent.replace(/\{\{member_id\}\}/g, memberId);

  // Build filename: strip any existing timestamp from original, append new shifted timestamp
  // Format: baseName_YYYYMMDDHHmmss_epochMillis.ext
  const fileNow = new Date();
  const fileShifted = new Date(fileNow.getTime() + 2686 * 24 * 60 * 60 * 1000);
  const fYyyy = fileShifted.getFullYear().toString();
  const fMM = (fileShifted.getMonth() + 1).toString().padStart(2, '0');
  const fdd = fileShifted.getDate().toString().padStart(2, '0');
  const fHH = fileShifted.getHours().toString().padStart(2, '0');
  const fmm = fileShifted.getMinutes().toString().padStart(2, '0');
  const fss = fileShifted.getSeconds().toString().padStart(2, '0');
  const fileDateTimeStamp = fYyyy + fMM + fdd + fHH + fmm + fss;
  const fileEpochMillis = fileNow.getTime().toString();

  // Store batch (YYYYMMDD) from this file's timestamp for API jobs
  if (batchVarName) {
    const batchValue = fYyyy + fMM + fdd;
    ctx.setVariable(batchVarName, batchValue);
    ctx.log('Stored batch: ' + batchValue);
  }

  const originalExt = path.extname(filePath);
  const originalBase = path.basename(filePath, originalExt);
  // Strip ALL trailing _digits groups from the original filename (remove old timestamps)
  let baseName = originalBase;
  while (/_\d+$/.test(baseName)) {
    baseName = baseName.replace(/_\d+$/, '');
  }
  const fileName = baseName + '_' + fileDateTimeStamp + '_' + fileEpochMillis + originalExt;

  // Write modified content to temp file (original stays untouched)
  const tempFilePath = path.join(tempDir, fileName);
  fs.writeFileSync(tempFilePath, updatedContent, 'utf-8');
  tempFiles.push(tempFilePath);

  const remotePath = remoteDirectory + fileName;
  uploadPairs.push({ local: tempFilePath, remote: remotePath });

  ctx.log('Created temp file: ' + fileName);

  // Step 3: Upload temp file via SFTP to /TO_AVER/
  ctx.log('Uploading 1 file to ' + host + ':' + remoteDirectory + '...');

  // Python script reads credentials from command-line args (never written to disk)
  const pyScript = [
    'import paramiko',
    'import sys',
    'import json',
    '',
    'host = sys.argv[1]',
    'port = int(sys.argv[2])',
    'username = sys.argv[3]',
    'password = sys.argv[4]',
    'file_pairs = json.loads(sys.argv[5])',
    '',
    'transport = paramiko.Transport((host, port))',
    'transport.connect(username=username, password=password)',
    'sftp = paramiko.SFTPClient.from_transport(transport)',
    '',
    'try:',
    '    for i, pair in enumerate(file_pairs):',
    '        print(f"Uploading file {i+1}/{len(file_pairs)}: {pair[1]}")',
    '        sftp.put(pair[0], pair[1])',
    '        print(f"  Upload successful: {pair[1]}")',
    '    print(f"All {len(file_pairs)} files uploaded successfully.")',
    'finally:',
    '    sftp.close()',
    '    transport.close()',
  ].join('\n');

  // File pairs as JSON (no credentials in this data)
  const filePairsJson = JSON.stringify(uploadPairs.map(p => [p.local, p.remote]));

  const tmpScript = path.join(tempDir, 'sftp_upload_member_1file_' + Date.now() + '.py');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    // Credentials passed as arguments — never written to any file
    const result = spawnSync('python', [
      tmpScript,
      host,
      port,
      username,
      password,
      filePairsJson,
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

    ctx.log('File uploaded successfully to ' + remoteDirectory);
    ctx.log(result.stdout);
  } finally {
    // Cleanup: remove temp Python script and temp data files
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}
