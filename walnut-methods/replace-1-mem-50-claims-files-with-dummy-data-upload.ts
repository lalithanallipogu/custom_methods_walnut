import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Replace Files With Dummy Data and Upload
 * description: Read 4 files ${filePath1} ${filePath2} ${filePath3} ${filePath4}, replace {{member_id}} with ${dummyId} in temp copies, upload to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} and store batch in $[batch]
 * actionType: custom_replace_files_with_dummy_data
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function replaceFilesWithDummyData(ctx: WalnutBaseContext) {
  // ctx.args[0] = filePath1 (from ${filePath1})
  // ctx.args[1] = filePath2 (from ${filePath2})
  // ctx.args[2] = filePath3 (from ${filePath3})
  // ctx.args[3] = filePath4 (from ${filePath4})
  // ctx.args[4] = dummyId value (from ${dummyId}) — local variable from test data
  // ctx.args[5] = sftphost (from ${sftphost})
  // ctx.args[6] = sftpport (from ${sftpport})
  // ctx.args[7] = sftpusername (from ${sftpusername})
  // ctx.args[8] = sftppassword (from ${sftppassword})
  // ctx.args[9] = "batch" (from $[batch]) — runtime variable name to store the batch value

  const filePaths = [ctx.args[0], ctx.args[1], ctx.args[2], ctx.args[3]];
  const dummyId = ctx.args[4];
  const host = ctx.args[5];
  const port = ctx.args[6] || '22';
  const username = ctx.args[7];
  const password = ctx.args[8];
  const batchVarName = ctx.args[9]; // "batch" from $[batch]
  const remoteDirectory = '/TO_AVER/';

  if (!dummyId) {
    throw new Error(
      'dummyId is empty. Ensure it is configured as a local variable in WalnutAI test data management.'
    );
  }
  ctx.log('Using dummy ID from test data: ' + dummyId);

  if (!host || !username || !password) {
    throw new Error(
      'SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.'
    );
  }

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];
  let batchValue = '';

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
    // Format: baseName_YYYYMMDDHHmmss_epochMillis.ext (unique epoch per file)
    const fileNow = new Date();
    const fileShifted = new Date(fileNow.getTime() + 2707 * 24 * 60 * 60 * 1000);
    const fYyyy = fileShifted.getFullYear().toString();
    const fMM = (fileShifted.getMonth() + 1).toString().padStart(2, '0');
    const fdd = fileShifted.getDate().toString().padStart(2, '0');
    const fHH = fileShifted.getHours().toString().padStart(2, '0');
    const fmm = fileShifted.getMinutes().toString().padStart(2, '0');
    const fss = fileShifted.getSeconds().toString().padStart(2, '0');
    const fileDateTimeStamp = fYyyy + fMM + fdd + fHH + fmm + fss;
    const fileEpochMillis = fileNow.getTime().toString();

    // Capture the batch value (YYYYMMDD) from the first file processed
    if (!batchValue) {
      batchValue = fYyyy + fMM + fdd;
    }

    const originalExt = path.extname(filePath);
    const originalBase = path.basename(filePath, originalExt);
    // Strip ALL trailing _digits groups from the original filename (remove old timestamps)
    let baseName = originalBase;
    while (/_\d+$/.test(baseName)) {
      baseName = baseName.replace(/_\d+$/, '');
    }
    const fileName = baseName + '_' + fileDateTimeStamp + '_' + fileEpochMillis + originalExt;

    const tempFilePath = path.join(tempDir, fileName);

    fs.writeFileSync(tempFilePath, updatedContent, 'utf-8');
    tempFiles.push(tempFilePath);

    const remotePath = remoteDirectory + fileName;
    uploadPairs.push({ local: tempFilePath, remote: remotePath });

    ctx.log('Created temp file: ' + fileName);

    // Small delay to ensure unique epoch millis per file
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid file paths provided. Nothing to upload.');
  }

  // Upload all temp files via SFTP to /TO_AVER/
  ctx.log('Uploading ' + uploadPairs.length + ' files to ' + host + ':' + remoteDirectory + '...');

  const nodeScript = [
    'const Client = require(process.env.SFTP_MODULE);',
    'const sftp = new Client();',
    'const args = JSON.parse(process.argv[2]);',
    'async function run() {',
    '  await sftp.connect({ host: args.host, port: args.port, username: args.username, password: args.password });',
    '  for (let i = 0; i < args.files.length; i++) {',
    '    const f = args.files[i];',
    '    console.log("Uploading file " + (i+1) + "/" + args.files.length + ": " + f.remote);',
    '    await sftp.put(f.local, f.remote);',
    '    console.log("  Upload successful: " + f.remote);',
    '  }',
    '  await sftp.end();',
    '  console.log("All " + args.files.length + " files uploaded successfully.");',
    '}',
    'run().catch(e => { console.error(e.message); process.exit(1); });',
  ].join('\n');

  const scriptArgs = JSON.stringify({
    host: host, port: parseInt(port, 10), username: username, password: password,
    files: uploadPairs,
  });

  const tmpScript = path.join(tempDir, 'sftp_node_upload_' + Date.now() + '.js');

  try {
    const nmDir = path.join(__dirname, 'node_modules');
    const sftpModPath = path.join(nmDir, ['ssh2', 'sftp', 'client'].join('-'));
    fs.writeFileSync(tmpScript, nodeScript);
    const result = spawnSync('node', [tmpScript, scriptArgs], { timeout: 180000, encoding: 'utf-8', env: { ...process.env, SFTP_MODULE: sftpModPath } });
    if (result.error) throw new Error('Node.js execution error: ' + result.error.message);
    if (result.status !== 0) throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    ctx.log('All files uploaded successfully to ' + remoteDirectory);
    ctx.log(result.stdout);

    // Store the batch value (YYYYMMDD) as a runtime variable for use in subsequent steps
    if (batchVarName && batchValue) {
      ctx.setVariable(batchVarName, batchValue);
      ctx.log('Stored batch value: ' + batchValue + ' in variable: ' + batchVarName);
    }
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}
