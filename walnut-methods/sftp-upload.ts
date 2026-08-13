import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: SFTP Upload File
 * description: Upload file from ${localFilePath} to /TO_AVER/ on Altarum SFTP with timestamp filename, storing ID in $[icmemId]
 * actionType: custom_sftp_template_upload_v1
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function sftpTemplateUpload(ctx: WalnutContext) {
  // ctx.args[0] = file path (resolved from artifact ID by the agent) from ${localFilePath}
  const localFilePath = ctx.args[0];
  const icmemId = ctx.getVariable(ctx.args[1]);  // args[1] = "icmemId" (from $[icmemId]), read the value
  const remoteDirectory = '/TO_AVER/';

  // SFTP credentials from test data params
  const host = ctx.params.sftpHost || 'altarum.sftp.aver.io';
  const port = ctx.params.sftpPort || '22';
  const username = ctx.params.sftpUsername || 'altarum_qa';
  const password = ctx.params.sftpPassword || 'khq@rtx.crc9jpm*UCZ';

  if (!icmemId) {
    throw new Error('Runtime variable icmemId is empty. Ensure step 1 generated it.');
  }

  if (!localFilePath) {
    throw new Error('localFilePath parameter is empty. Ensure the artifact ID is set in test data.');
  }

  ctx.log('Using ICMEM ID: ' + icmemId);
  ctx.log('Template file path: ' + localFilePath);

  // Verify the file exists
  if (!fs.existsSync(localFilePath)) {
    throw new Error('Template file not found at path: ' + localFilePath + '. Ensure the artifact ID resolves to a valid local file path.');
  }

  // Step 1: Read the template file and replace {{member_id}} with the ICMEM ID
  const templateContent = fs.readFileSync(localFilePath, 'utf-8');
  const updatedContent = templateContent.replace(/\{\{member_id\}\}/g, icmemId);

  // Write the modified file to a temp location for upload
  // Generate filename with date shifted 2,670 days forward in YYYYMMDDHHMMSS format + milliseconds timestamp
  const now = new Date();
  const shifted = new Date(now.getTime() + 2670 * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear().toString();
  const MM = (shifted.getMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getDate().toString().padStart(2, '0');
  const HH = shifted.getHours().toString().padStart(2, '0');
  const mm = shifted.getMinutes().toString().padStart(2, '0');
  const ss = shifted.getSeconds().toString().padStart(2, '0');
  const dateStamp = yyyy + MM + dd + HH + mm + ss;
  const millis = now.getTime().toString();
  const fileName = 'member_eligibility_audit_' + dateStamp + '_' + millis + '.csv';
  const tempDir = process.env.TEMP || 'C:\\Temp';
  const modifiedFilePath = path.join(tempDir, fileName);
  fs.writeFileSync(modifiedFilePath, updatedContent, 'utf-8');

  ctx.log('Replaced {{member_id}} with ' + icmemId + ' in template');

  // Step 2: Upload modified file via SFTP to /TO_AVER/
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
