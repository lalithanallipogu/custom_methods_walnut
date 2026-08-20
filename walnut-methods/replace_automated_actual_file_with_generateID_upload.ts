import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Generate Member ID Replace and Upload
 * description: Generate unique member ID, replace {{member_id}} in 3 files ${actualfilePath1} ${actualfilePath2} ${actualfilePath3} and upload to /TO_AVER/ via SFTP host ${sftpHost} port ${sftpPort} user ${sftpUsername} pass ${sftpPassword} storing ID in $[memberId]
 * actionType: custom_generate_member_replace_upload
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function generateMemberReplaceUpload(ctx: WalnutContext) {
  // ctx.args[0] = actualfilePath1 (from ${actualfilePath1})
  // ctx.args[1] = actualfilePath2 (from ${actualfilePath2})
  // ctx.args[2] = actualfilePath3 (from ${actualfilePath3})
  // ctx.args[3] = SFTP host (from ${sftpHost})
  // ctx.args[4] = SFTP port (from ${sftpPort})
  // ctx.args[5] = SFTP username (from ${sftpUsername})
  // ctx.args[6] = SFTP password (from ${sftpPassword})
  // ctx.args[7] = "memberId" (from $[memberId]) — runtime variable name to store generated ID

  const filePaths = [ctx.args[0], ctx.args[1], ctx.args[2]];
  const host = ctx.args[3];
  const port = ctx.args[4] || '22';
  const username = ctx.args[5];
  const password = ctx.args[6];
  const memberIdVarName = ctx.args[7];

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
      'SFTP credentials missing. Ensure sftpHost, sftpUsername, and sftpPassword are set in test data.'
    );
  }

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];

  // Generate timestamp: current date shifted 2670 days forward (YYYYMMDDHHmmss) + epoch millis
  const now = new Date();
  const shifted = new Date(now.getTime() + 2670 * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear().toString();
  const MM = (shifted.getMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getDate().toString().padStart(2, '0');
  const HH = shifted.getHours().toString().padStart(2, '0');
  const mm = shifted.getMinutes().toString().padStart(2, '0');
  const ss = shifted.getSeconds().toString().padStart(2, '0');
  const dateTimeStamp = yyyy + MM + dd + HH + mm + ss;
  const epochMillis = now.getTime().toString();

  // Step 2: Process each of the 3 original files
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    if (!filePath) {
      ctx.log('File path ' + (i + 1) + ' is empty, skipping...');
      continue;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Original file ' + (i + 1) + ' not found at path: ' + filePath);
    }

    ctx.log('Processing file ' + (i + 1) + ': ' + filePath);

    // Read the original file (original file is NEVER modified)
    const originalContent = fs.readFileSync(filePath, 'utf-8');

    // Replace all occurrences of {{member_id}} with the generated member ID
    const updatedContent = originalContent.replace(/\{\{member_id\}\}/g, memberId);

    // Build filename: strip any existing timestamp from original, append new shifted timestamp
    // Format: baseName_YYYYMMDDHHmmss_epochMillis.ext
    const originalExt = path.extname(filePath);
    const originalBase = path.basename(filePath, originalExt);
    // Strip ALL trailing _digits groups from the original filename (remove old timestamps)
    let baseName = originalBase;
    while (/_\d+$/.test(baseName)) {
      baseName = baseName.replace(/_\d+$/, '');
    }
    const fileName = baseName + '_' + dateTimeStamp + '_' + epochMillis + originalExt;

    // Write modified content to temp file (original stays untouched)
    const tempFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(tempFilePath, updatedContent, 'utf-8');
    tempFiles.push(tempFilePath);

    const remotePath = remoteDirectory + fileName;
    uploadPairs.push({ local: tempFilePath, remote: remotePath });

    ctx.log('Created temp file: ' + fileName);
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid file paths provided. Nothing to upload.');
  }

  // Step 3: Upload all temp files via SFTP to /TO_AVER/
  ctx.log('Uploading ' + uploadPairs.length + ' files to ' + host + ':' + remoteDirectory + '...');

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

  const tmpScript = path.join(tempDir, 'sftp_upload_member_' + Date.now() + '.py');

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

    ctx.log('All files uploaded successfully to ' + remoteDirectory);
    ctx.log(result.stdout);
  } finally {
    // Cleanup: remove temp Python script and temp data files
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}
