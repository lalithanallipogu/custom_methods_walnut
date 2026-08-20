import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Replace Files With Dummy Data and Upload
 * description: Read 4 files ${filePath1} ${filePath2} ${filePath3} ${filePath4}, replace {{member_id}} with ${dummyId} in temp copies, and upload to /To_AVER/ via SFTP host ${sftpHost} port ${sftpPort} user ${sftpUsername} password ${sftpPassword}
 * actionType: custom_replace_files_with_dummy_data
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function replaceFilesWithDummyData(ctx: WalnutContext) {
  // ctx.args[0] = filePath1 (from ${filePath1})
  // ctx.args[1] = filePath2 (from ${filePath2})
  // ctx.args[2] = filePath3 (from ${filePath3})
  // ctx.args[3] = filePath4 (from ${filePath4})
  // ctx.args[4] = dummyId value (from ${dummyId}) — local variable from test data

  const filePaths = [ctx.args[0], ctx.args[1], ctx.args[2], ctx.args[3]];
  const dummyId = ctx.args[4];
  const host = ctx.args[5];
  const port = ctx.args[6] || '22';
  const username = ctx.args[7];
  const password = ctx.args[8];
  const remoteDirectory = '/To_AVER/';

  if (!dummyId) {
    throw new Error(
      'dummyId is empty. Ensure it is configured as a local variable in WalnutAI test data management.'
    );
  }
  ctx.log('Using dummy ID from test data: ' + dummyId);

  if (!host || !username || !password) {
    throw new Error(
      'SFTP credentials missing. Ensure sftpHost, sftpUsername, and sftpPassword are set in test data.'
    );
  }

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];

  // Generate timestamp: current date shifted 2670 days forward (YYYYMMDDHHmmss) + epoch millis
  // Format: baseName_20331203456789_1556481675555.ext
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

  // Process each of the 4 original files
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

    // Replace all occurrences of {{member_id}} with the dummy ID in the temp copy
    const updatedContent = originalContent.replace(/\{\{member_id\}\}/g, dummyId);

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

  // Upload all temp files via SFTP to /To_AVER/
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

  const tmpScript = path.join(tempDir, 'sftp_upload_dummy_' + Date.now() + '.py');

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
