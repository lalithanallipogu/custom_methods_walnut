import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Altarum Artifact file upload DummyID Replace Upload 4 Files
 * description: Replace {{member_id}} with dummy ID ${dummyId} in 4 artifact files ${artifact1} ${artifact2} ${artifact3} ${artifact4} and upload to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} storing batch in $[batch]
 * actionType: custom_artifact_dummyid_replace_upload_4files
 * context: shared
 * modules: path, fs, child_process
 * needsLocator: false
 * category: File Transfer
 */
export async function artifactDummyIdReplaceUpload4Files(ctx: WalnutBaseContext) {
  // ctx.args[0] = dummyId (from ${dummyId}) — dummy member ID from test data
  // ctx.args[1] = artifact1 (from ${artifact1}) — artifact ref for file 1
  // ctx.args[2] = artifact2 (from ${artifact2}) — artifact ref for file 2
  // ctx.args[3] = artifact3 (from ${artifact3}) — artifact ref for file 3
  // ctx.args[4] = artifact4 (from ${artifact4}) — artifact ref for file 4
  // ctx.args[5] = SFTP host (from ${sftphost})
  // ctx.args[6] = SFTP port (from ${sftpport})
  // ctx.args[7] = SFTP username (from ${sftpusername})
  // ctx.args[8] = SFTP password (from ${sftppassword})
  // ctx.args[9] = "batch" (from $[batch]) — runtime variable name to store batch timestamp

  const dummyId = ctx.args[0];
  const artifactRefs = [ctx.args[1], ctx.args[2], ctx.args[3], ctx.args[4]];
  const host = ctx.args[5];
  const port = ctx.args[6] || '22';
  const username = ctx.args[7];
  const password = ctx.args[8];
  const batchVarName = ctx.args[9];

  if (!dummyId) {
    throw new Error(
      'dummyId is empty. Ensure it is configured in test data.'
    );
  }
  ctx.log('Using dummy ID from test data: ' + dummyId);

  const remoteDirectory = '/TO_AVER/';

  if (!host || !username || !password) {
    throw new Error(
      'SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.'
    );
  }

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];

  // Process each of the 4 artifact files
  for (let i = 0; i < artifactRefs.length; i++) {
    const artifactRef = artifactRefs[i];

    if (!artifactRef) {
      ctx.log('Artifact ref ' + (i + 1) + ' is empty, skipping...');
      continue;
    }

    ctx.log('Processing artifact ' + (i + 1) + ' of 4: ' + artifactRef);

    // Resolve artifact reference to a local file path
    const filePath = await ctx.resolveArtifact(artifactRef);
    ctx.log('Resolved artifact to: ' + filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('Artifact file ' + (i + 1) + ' not found at resolved path: ' + filePath);
    }

    // Read the original artifact file (original artifact is NEVER modified)
    const originalContent = fs.readFileSync(filePath, 'utf-8');

    // Replace all occurrences of {{member_id}} with the dummy ID
    const updatedContent = originalContent.replace(/\{\{member_id\}\}/g, dummyId);

    const replacedCount = (originalContent.match(/\{\{member_id\}\}/g) || []).length;
    if (replacedCount > 0) {
      ctx.log('Replaced ' + replacedCount + ' {{member_id}} placeholder(s) with ' + dummyId + ' in artifact ' + (i + 1));
    } else {
      ctx.warn('No {{member_id}} placeholders found in artifact ' + (i + 1));
    }

    // Build filename: strip any existing timestamp from original, append new shifted timestamp
    // Timestamp is shifted 2713 days forward from today
    // Format: baseName_YYYYMMDDHHmmss_epochMillis.ext (unique epoch per file)
    const fileNow = new Date();
    const fileShifted = new Date(fileNow.getTime() + 2713 * 24 * 60 * 60 * 1000);
    const fYyyy = fileShifted.getFullYear().toString();
    const fMM = (fileShifted.getMonth() + 1).toString().padStart(2, '0');
    const fdd = fileShifted.getDate().toString().padStart(2, '0');
    const fHH = fileShifted.getHours().toString().padStart(2, '0');
    const fmm = fileShifted.getMinutes().toString().padStart(2, '0');
    const fss = fileShifted.getSeconds().toString().padStart(2, '0');
    const fileDateTimeStamp = fYyyy + fMM + fdd + fHH + fmm + fss;
    const fileEpochMillis = fileNow.getTime().toString();

    // Store batch (YYYYMMDD) from first file's timestamp for API jobs
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

    ctx.log('Created temp file: ' + fileName);

    // Small delay to ensure unique epoch millis per file
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid artifact references provided. Nothing to upload.');
  }

  // Upload all 4 temp files via SFTP to /TO_AVER/
  ctx.log('Uploading ' + uploadPairs.length + ' files to ' + host + ':' + remoteDirectory + '...');

  // Node.js SFTP script — runs in a child process with bundled node_modules
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
    // Use bundled node_modules — no npm install needed
    const nmDir = path.join(__dirname, 'node_modules');
    const sftpModPath = path.join(nmDir, ['ssh2', 'sftp', 'client'].join('-'));

    fs.writeFileSync(tmpScript, nodeScript);

    const result = spawnSync('node', [tmpScript, scriptArgs], {
      timeout: 180000,
      encoding: 'utf-8',
      env: { ...process.env, SFTP_MODULE: sftpModPath },
    });

    if (result.error) {
      throw new Error('Node.js execution error: ' + result.error.message);
    }

    if (result.status !== 0) {
      throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    }

    ctx.log(result.stdout);
    ctx.log('All ' + uploadPairs.length + ' files uploaded successfully to ' + remoteDirectory);
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    // Cleanup temp data files
    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}
