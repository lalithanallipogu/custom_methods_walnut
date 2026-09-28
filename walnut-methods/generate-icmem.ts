import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Generate ICMEM ID and Upload All Files
 * description: Generate a random ICMEM ID, replace {{member_id}} in templates ${localFilePath1} ${localFilePath2} ${localFilePath3} ${localFilePath4} with SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} and upload to /TO_AVER/ storing ID in $[icmemId]
 * actionType: custom_generate_icmem
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function generateIcmem(ctx: WalnutBaseContext) {
  // ctx.args[0] = localFilePath1 (from ${localFilePath1})
  // ctx.args[1] = localFilePath2 (from ${localFilePath2})
  // ctx.args[2] = localFilePath3 (from ${localFilePath3})
  // ctx.args[3] = localFilePath4 (from ${localFilePath4})
  // ctx.args[4] = SFTP host (from ${sftphost})
  // ctx.args[5] = SFTP port (from ${sftpport})
  // ctx.args[6] = SFTP username (from ${sftpusername})
  // ctx.args[7] = SFTP password (from ${sftppassword})
  // ctx.args[8] = "icmemId" (from $[icmemId])

  const filePaths = [ctx.args[0], ctx.args[1], ctx.args[2], ctx.args[3]];
  const host = ctx.args[4];
  const port = ctx.args[5] || '22';
  const username = ctx.args[6];
  const password = ctx.args[7];
  const remoteDirectory = '/TO_AVER/';

  // Step 1: Generate a random ICMEM ID (format: ICMEM-{4 digits}{4 letters})
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  const letters = Array.from({ length: 4 }, () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join('');
  const icmemId = 'ICMEM-' + digits + letters;
  ctx.log('Generated ICMEM ID: ' + icmemId);
  ctx.setVariable(ctx.args[8], icmemId);  // Store in $[icmemId]

  // Validate SFTP credentials
  if (!host || !username || !password) {
    throw new Error('SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.');
  }

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];

  // Step 2: For each file, read template, replace {{member_id}}, write to temp, prepare for upload
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    if (!filePath) {
      ctx.log('File path ' + (i + 1) + ' is empty, skipping...');
      continue;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Template file ' + (i + 1) + ' not found at path: ' + filePath);
    }

    ctx.log('Processing file ' + (i + 1) + ': ' + filePath);

    // Read the template file (original file is NOT modified)
    const templateContent = fs.readFileSync(filePath, 'utf-8');

    // Replace all occurrences of {{member_id}} with the generated ICMEM ID
    const updatedContent = templateContent.replace(/\{\{member_id\}\}/g, icmemId);

    // Generate unique timestamp per file (date shifted 2707 days forward + unique epoch millis)
    const fileNow = new Date();
    const fileShifted = new Date(fileNow.getTime() + 2707 * 24 * 60 * 60 * 1000);
    const fYyyy = fileShifted.getFullYear().toString();
    const fMM = (fileShifted.getMonth() + 1).toString().padStart(2, '0');
    const fdd = fileShifted.getDate().toString().padStart(2, '0');
    const fHH = fileShifted.getHours().toString().padStart(2, '0');
    const fmm = fileShifted.getMinutes().toString().padStart(2, '0');
    const fss = fileShifted.getSeconds().toString().padStart(2, '0');
    const fileDateTimeStamp = fYyyy + fMM + fdd + fHH + fmm + fss;
    const fileMillis = fileNow.getTime().toString();

    const originalExt = path.extname(filePath) || '.csv';
    const originalBase = path.basename(filePath, originalExt);
    // Strip ALL trailing _digits groups from filename (e.g. _20321101_081997 or _20321101081997)
    let baseName = originalBase;
    while (/_\d+$/.test(baseName)) {
      baseName = baseName.replace(/_\d+$/, '');
    }

    const fileName = baseName + '_' + fileDateTimeStamp + '_' + fileMillis + originalExt;

    // Write modified content to temp file (original stays untouched)
    const modifiedFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(modifiedFilePath, updatedContent, 'utf-8');
    tempFiles.push(modifiedFilePath);

    const remotePath = remoteDirectory + fileName;
    uploadPairs.push({ local: modifiedFilePath, remote: remotePath });

    ctx.log('Replaced {{member_id}} with ' + icmemId + ' in file ' + (i + 1));
    ctx.log('Temp file created: ' + fileName);

    // Small delay to ensure unique epoch millis per file
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid file paths provided. Nothing to upload.');
  }

  // Step 3: Upload all modified temp files via SFTP to /TO_AVER/
  ctx.log('Uploading ' + uploadPairs.length + ' files to ' + host + ':' + remoteDirectory + '...');

  const nodeScript = [
    'const Client = require(["ssh2","sftp","client"].join("-"));',
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
    host: host.trim(), port: parseInt(port.toString().trim(), 10),
    username: username.trim(), password: password.trim(),
    files: uploadPairs,
  });

  const tmpScript = path.join(tempDir, 'sftp_node_upload_' + Date.now() + '.js');

  try {
    const pkg = ['ssh2', 'sftp', 'client'].join('-');
    spawnSync('npm', ['install', '--no-save', pkg], { cwd: tempDir, timeout: 120000, encoding: 'utf-8', stdio: 'pipe' });
    fs.writeFileSync(tmpScript, nodeScript);
    const result = spawnSync('node', [tmpScript, scriptArgs], { timeout: 180000, encoding: 'utf-8' });
    if (result.error) throw new Error('Node.js execution error: ' + result.error.message);
    if (result.status !== 0) throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    ctx.log('All files uploaded successfully to ' + remoteDirectory);
    ctx.log(result.stdout);
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}
