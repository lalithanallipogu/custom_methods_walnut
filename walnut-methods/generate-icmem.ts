import type { WalnutContext } from './walnut';
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
export async function generateIcmem(ctx: WalnutContext) {
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

    // Generate unique timestamp per file (date shifted 2675 days forward + unique epoch millis)
    const fileNow = new Date();
    const fileShifted = new Date(fileNow.getTime() + 2675 * 24 * 60 * 60 * 1000);
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

  const tmpScript = path.join(tempDir, 'sftp_upload_all_' + Date.now() + '.py');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    // Credentials passed as arguments — never written to any file
    const result = spawnSync('python', [
      tmpScript,
      host.trim(),
      port.toString().trim(),
      username.trim(),
      password.trim(),
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
    // Cleanup all temp files
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    for (const tempFile of tempFiles) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  }
}
