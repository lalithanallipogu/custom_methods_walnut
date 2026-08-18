import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Generate ICMEM ID and Upload All Files
 * description: Generate a random ICMEM ID, replace {{member_id}} in templates ${localFilePath1} ${localFilePath2} ${localFilePath3} ${localFilePath4} with SFTP host ${sftpHost} port ${sftpPort} user ${sftpUsername} password ${sftpPassword} and upload to /TO_AVER/ storing ID in $[icmemId]
 * actionType: custom_generate_icmem
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function generateIcmem(ctx: WalnutContext) {
  // ctx.args[0] = localFilePath1 (from ${localFilePath1})
  // ctx.args[1] = localFilePath2 (from ${localFilePath2})
  // ctx.args[2] = localFilePath3 (from ${localFilePath3})
  // ctx.args[3] = localFilePath4 (from ${localFilePath4})
  // ctx.args[4] = SFTP host (from ${sftpHost})
  // ctx.args[5] = SFTP port (from ${sftpPort})
  // ctx.args[6] = SFTP username (from ${sftpUsername})
  // ctx.args[7] = SFTP password (from ${sftpPassword})
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
    throw new Error('SFTP credentials missing. Ensure sftpHost, sftpUsername, and sftpPassword are set in test data.');
  }

  const tempDir = process.env.TEMP || '/tmp';
  const tempFiles: string[] = [];
  const uploadPairs: { local: string; remote: string }[] = [];

  // Generate batch timestamp ONCE (shared across all 4 files as batch ID)
  const now = new Date();
  const shifted = new Date(now.getTime() + 2672 * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear().toString();
  const MM = (shifted.getMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getDate().toString().padStart(2, '0');
  const HH = shifted.getHours().toString().padStart(2, '0');
  const mm = shifted.getMinutes().toString().padStart(2, '0');
  const ss = shifted.getSeconds().toString().padStart(2, '0');
  const dateTimeStamp = yyyy + MM + dd + HH + mm + ss;
  const millis = now.getTime().toString();

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

    // Generate filename: baseName_YYYYMMDDhhmmss_epochMillis (same batch ID for all files)
    const originalExt = path.extname(filePath) || '.csv';
    const originalBase = path.basename(filePath, originalExt);
    // Strip ALL trailing _digits groups from filename (e.g. _20321101_081997 or _20321101081997)
    let baseName = originalBase;
    while (/_\d+$/.test(baseName)) {
      baseName = baseName.replace(/_\d+$/, '');
    }

    const fileName = baseName + '_' + dateTimeStamp + '_' + millis + originalExt;

    // Write modified content to temp file (original stays untouched)
    const modifiedFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(modifiedFilePath, updatedContent, 'utf-8');
    tempFiles.push(modifiedFilePath);

    const remotePath = remoteDirectory + fileName;
    uploadPairs.push({ local: modifiedFilePath, remote: remotePath });

    ctx.log('Replaced {{member_id}} with ' + icmemId + ' in file ' + (i + 1));
    ctx.log('Temp file created: ' + fileName);
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid file paths provided. Nothing to upload.');
  }

  // Step 3: Upload all modified temp files via SFTP to /TO_AVER/
  ctx.log('Uploading ' + uploadPairs.length + ' files to ' + host + ':' + remoteDirectory + '...');

  // Build Python script that uploads all files in one SFTP session
  const putCommands = uploadPairs.map((pair, idx) => {
    return [
      'print("Uploading file ' + (idx + 1) + '/' + uploadPairs.length + ': " + remote_paths[' + idx + '])',
      'sftp.put(local_files[' + idx + '], remote_paths[' + idx + '])',
      'print("  Upload successful: " + remote_paths[' + idx + '])',
    ].join('\n');
  }).join('\n');

  const localFilesList = uploadPairs.map(p => "r'" + p.local + "'").join(', ');
  const remotePathsList = uploadPairs.map(p => "'" + p.remote + "'").join(', ');

  const pyScript = [
    'import paramiko',
    '',
    'host = "' + host + '"',
    'port = ' + port,
    'username = "' + username + '"',
    'password = "' + password + '"',
    'local_files = [' + localFilesList + ']',
    'remote_paths = [' + remotePathsList + ']',
    '',
    'transport = paramiko.Transport((host, port))',
    'transport.connect(username=username, password=password)',
    'sftp = paramiko.SFTPClient.from_transport(transport)',
    '',
    'try:',
    '    ' + putCommands.split('\n').join('\n    '),
    '    print("All ' + uploadPairs.length + ' files uploaded successfully.")',
    'finally:',
    '    sftp.close()',
    '    transport.close()',
  ].join('\n');

  const tmpScript = path.join(tempDir, 'sftp_upload_all_' + Date.now() + '.py');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    const result = spawnSync('python', [tmpScript], {
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
    // Cleanup all temp files
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}
