import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Replace ICMEM ID in Template and SFTP Upload
 * description: Replace {{member_id}} in template ${localFilePath} with $[icmemId] and upload to /TO_AVER/ on Altarum SFTP server
 * actionType: custom_sftp_template_upload
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function sftpTemplateUpload(ctx: WalnutContext) {
  const localFilePath = ctx.args[0];              // args[0] = Data Store file path (from ${localFilePath})
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

  ctx.log('Using ICMEM ID: ' + icmemId);

  // Step 1: Read the ART-2 template file and replace {{member_id}} with the ICMEM ID
  if (!fs.existsSync(localFilePath)) {
    throw new Error('Template file not found: ' + localFilePath);
  }

  const templateContent = fs.readFileSync(localFilePath, 'utf-8');
  // Replace only {{member_id}} placeholders with the generated ICMEM ID
  const updatedContent = templateContent.replace(/\{\{member_id\}\}/g, icmemId);

  // Write the modified file to a temp location for upload
  const fileName = path.basename(localFilePath);
  const tempDir = process.env.TEMP || 'C:\\Temp';
  const modifiedFilePath = path.join(tempDir, 'modified_' + Date.now() + '_' + fileName);
  fs.writeFileSync(modifiedFilePath, updatedContent, 'utf-8');

  ctx.log('Replaced {{member_id}} with ' + icmemId + ' in ' + fileName);

  // Step 2: Upload modified file via SFTP to /TO_AVER/
  const remotePath = remoteDirectory + fileName;
  ctx.log('Uploading ' + modifiedFilePath + ' to ' + host + ':' + remotePath + '...');

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
    if (fs.existsSync(tmpScript)) {
      fs.unlinkSync(tmpScript);
    }
    if (fs.existsSync(modifiedFilePath)) {
      fs.unlinkSync(modifiedFilePath);
    }
  }
}
