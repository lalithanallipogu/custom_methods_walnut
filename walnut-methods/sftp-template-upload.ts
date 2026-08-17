import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Generate ICMEM ID Replace and Upload
 * description: Generate ICMEM ID, replace in template ${localFilePath} with SFTP host ${sftpHost} port ${sftpPort} user ${sftpUsername} password ${sftpPassword} and upload to /TO_AVER/ storing ID in $[icmemId]
 * actionType: custom_sftp_template_upload
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function sftpTemplateUpload(ctx: WalnutContext) {
  // ctx.args[0] = file path from ${localFilePath}
  // ctx.args[1] = SFTP host from ${sftpHost}
  // ctx.args[2] = SFTP port from ${sftpPort}
  // ctx.args[3] = SFTP username from ${sftpUsername}
  // ctx.args[4] = SFTP password from ${sftpPassword}
  // ctx.args[5] = "icmemId" (from $[icmemId])
  const localFilePath = ctx.args[0];
  const remoteDirectory = '/TO_AVER/';

  // Step 1: Generate a random ICMEM ID
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  const letters = Array.from({ length: 4 }, () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join('');
  const icmemId = 'ICMEM-' + digits + letters;
  ctx.log('Generated ICMEM ID: ' + icmemId);
  ctx.setVariable(ctx.args[5], icmemId);  // Store in $[icmemId]

  // SFTP credentials from description placeholders
  const host = ctx.args[1];
  const port = ctx.args[2] || '22';
  const username = ctx.args[3];
  const password = ctx.args[4];

  if (!host || !username || !password) {
    throw new Error('SFTP credentials missing. Ensure sftpHost, sftpUsername, and sftpPassword are set in test data.');
  }

  if (!localFilePath) {
    throw new Error('localFilePath parameter is empty. Ensure the file path is set in test data.');
  }

  ctx.log('Template file path: ' + localFilePath);

  // Verify the file exists
  if (!fs.existsSync(localFilePath)) {
    throw new Error('Template file not found at path: ' + localFilePath);
  }

  // Step 2: Read the template file and replace {{member_id}} with the ICMEM ID
  const templateContent = fs.readFileSync(localFilePath, 'utf-8');
  const updatedContent = templateContent.replace(/\{\{member_id\}\}/g, icmemId);

  // Step 3: Generate filename with date shifted 2,671 days forward in YYYYMMDDHHMMSS format + milliseconds timestamp
  const now = new Date();
  const shifted = new Date(now.getTime() + 2671 * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear().toString();
  const MM = (shifted.getMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getDate().toString().padStart(2, '0');
  const HH = shifted.getHours().toString().padStart(2, '0');
  const mm = shifted.getMinutes().toString().padStart(2, '0');
  const ss = shifted.getSeconds().toString().padStart(2, '0');
  const dateStamp = yyyy + MM + dd + HH + mm + ss;
  const millis = now.getTime().toString();
  const fileName = 'member_eligibility_audit_' + dateStamp + '_' + millis + '.csv';
  const tempDir = process.env.TEMP || '/tmp';
  const modifiedFilePath = path.join(tempDir, fileName);
  fs.writeFileSync(modifiedFilePath, updatedContent, 'utf-8');

  ctx.log('Replaced {{member_id}} with ' + icmemId + ' in template');
  ctx.log('Generated timestamp filename: ' + fileName);

  // Step 4: Upload modified file via SFTP to /TO_AVER/
  const remotePath = remoteDirectory + fileName;
  ctx.log('Uploading to ' + host + ':' + remotePath + '...');

  const pyLines = [
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
  ];

  const pyScript = pyLines.join('\n');
  const tmpScript = path.join(tempDir, 'sftp_upload_' + Date.now() + '.py');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    const result = spawnSync('python', [
      tmpScript,
      host,
      port,
      username,
      password,
      modifiedFilePath,
      remotePath
    ], {
      timeout: 120000,
      encoding: 'utf-8',
    });

    if (result.error) {
      throw new Error('Python execution error: ' + result.error.message);
    }

    if (result.status !== 0) {
      throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    }

    ctx.log('Successfully uploaded file to ' + remotePath);
    ctx.log(result.stdout);
  } finally {
    // Cleanup temp files
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    if (fs.existsSync(modifiedFilePath)) fs.unlinkSync(modifiedFilePath);
  }
}
