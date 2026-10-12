import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: MemberID Generate Replace ActualFile Artifact Upload 2 Files
 * description: Generate unique member ID, replace {{member_id}} in artifacts ${ActualFileArtifact1} ${ActualFileArtifact2} and upload to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} storing ID in $[memberId] and batch in $[batch]
 * actionType: custom_generate_memberid_artifact_replace_upload_2files
 * context: shared
 * modules: path, fs, child_process
 * needsLocator: false
 * category: File Transfer
 */
export async function generateMemberIdArtifactReplaceUpload2Files(ctx: WalnutBaseContext) {
  // ctx.args[0] = ActualFileArtifact1 (from ${ActualFileArtifact1}) — artifact ref for first file
  // ctx.args[1] = ActualFileArtifact2 (from ${ActualFileArtifact2}) — artifact ref for second file
  // ctx.args[2] = SFTP host (from ${sftphost})
  // ctx.args[3] = SFTP port (from ${sftpport})
  // ctx.args[4] = SFTP username (from ${sftpusername})
  // ctx.args[5] = SFTP password (from ${sftppassword})
  // ctx.args[6] = "memberId" (from $[memberId]) — runtime variable name to store generated ID
  // ctx.args[7] = "batch" (from $[batch]) — runtime variable name to store batch timestamp

  const artifactRefs = [ctx.args[0], ctx.args[1]];
  const host = ctx.args[2];
  const port = ctx.args[3] || '22';
  const username = ctx.args[4];
  const password = ctx.args[5];
  const memberIdVarName = ctx.args[6];
  const batchVarName = ctx.args[7];

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

  if (!artifactRefs[0] && !artifactRefs[1]) {
    throw new Error('At least one artifact reference is required. Provide ActualFileArtifact1 and/or ActualFileArtifact2.');
  }

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];

  // Step 2: Process each artifact file — resolve, replace {{member_id}}, build timestamped filename
  for (let i = 0; i < artifactRefs.length; i++) {
    const artifactRef = artifactRefs[i];

    if (!artifactRef) {
      ctx.log('Artifact ' + (i + 1) + ' is empty, skipping...');
      continue;
    }

    ctx.log('Processing artifact ' + (i + 1) + ': ' + artifactRef);
    const filePath = await ctx.resolveArtifact(artifactRef);
    ctx.log('Resolved artifact ' + (i + 1) + ' to: ' + filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('Artifact ' + (i + 1) + ' file not found at resolved path: ' + filePath);
    }

    // Read the original artifact file (original artifact is NEVER modified)
    const originalContent = fs.readFileSync(filePath, 'utf-8');

    // Replace all occurrences of {{member_id}} with the generated member ID
    const updatedContent = originalContent.replace(/\{\{member_id\}\}/g, memberId);

    const replacedCount = (originalContent.match(/\{\{member_id\}\}/g) || []).length;
    if (replacedCount > 0) {
      ctx.log('File ' + (i + 1) + ': Replaced ' + replacedCount + ' {{member_id}} placeholder(s) with ' + memberId);
    } else {
      ctx.warn('File ' + (i + 1) + ': No {{member_id}} placeholders found in artifact');
    }

    // Build filename: strip any existing timestamp from original, append new shifted timestamp
    // Timestamp is shifted 2712 days forward from today
    // Format: baseName_YYYYMMDDHHmmss_epochMillis.ext
    const fileNow = new Date();
    const fileShifted = new Date(fileNow.getTime() + 2712 * 24 * 60 * 60 * 1000);
    const fYyyy = fileShifted.getFullYear().toString();
    const fMM = (fileShifted.getMonth() + 1).toString().padStart(2, '0');
    const fdd = fileShifted.getDate().toString().padStart(2, '0');
    const fHH = fileShifted.getHours().toString().padStart(2, '0');
    const fmm = fileShifted.getMinutes().toString().padStart(2, '0');
    const fss = fileShifted.getSeconds().toString().padStart(2, '0');
    const fileDateTimeStamp = fYyyy + fMM + fdd + fHH + fmm + fss;
    const fileEpochMillis = fileNow.getTime().toString();

    // Store batch (YYYYMMDD) from the first file's timestamp for API jobs
    if (i === 0 && batchVarName) {
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
    tempFiles.push(tempFilePath);

    const remotePath = remoteDirectory + fileName;
    uploadPairs.push({ local: tempFilePath, remote: remotePath });

    ctx.log('Created temp file ' + (i + 1) + ': ' + fileName);

    // Small delay to ensure unique epoch millis per file
    await new Promise(function (resolve) { setTimeout(resolve, 10); });
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid artifact references provided. Nothing to upload.');
  }

  // Step 3: Upload all files via SFTP to /TO_AVER/ using Node.js ssh2-sftp-client
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
    host: host,
    port: parseInt(port, 10),
    username: username,
    password: password,
    files: uploadPairs,
  });

  const tmpScript = path.join(tempDir, 'sftp_node_upload_' + Date.now() + '.js');

  try {
    const nmDir = path.join(__dirname, 'node_modules');
    const sftpModPath = path.join(nmDir, ['ssh2', 'sftp', 'client'].join('-'));
    fs.writeFileSync(tmpScript, nodeScript);
    const result = spawnSync('node', [tmpScript, scriptArgs], {
      timeout: 180000,
      encoding: 'utf-8',
      env: { ...process.env, SFTP_MODULE: sftpModPath },
    });
    if (result.error) throw new Error('Node.js execution error: ' + result.error.message);
    if (result.status !== 0) throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    ctx.log('All ' + uploadPairs.length + ' files uploaded successfully to ' + remoteDirectory);
    ctx.log(result.stdout);
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    for (let j = 0; j < tempFiles.length; j++) {
      if (fs.existsSync(tempFiles[j])) fs.unlinkSync(tempFiles[j]);
    }
  }
}
