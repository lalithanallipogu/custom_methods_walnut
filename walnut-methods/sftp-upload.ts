import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: SFTP Upload File
 * description: Upload file from ${localFilePath} to /TO_AVER/ on Altarum SFTP server
 * actionType: custom_sftp_upload
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function sftpUpload(ctx: WalnutContext) {
  const localFilePath = ctx.args[0];
  const remoteDirectory = '/TO_AVER/';

  const host = ctx.params.sftpHost || 'altarum.sftp.aver.io';
  const port = ctx.params.sftpPort || '22';
  const username = ctx.params.sftpUsername || 'altarum_qa';
  const password = ctx.params.sftpPassword || 'khq@rtx.crc9jpm*UCZ';

  if (!fs.existsSync(localFilePath)) {
    throw new Error('Local file not found: ' + localFilePath);
  }

  const fileName = path.basename(localFilePath);
  const remotePath = remoteDirectory + fileName;

  ctx.log('Uploading ' + localFilePath + ' to ' + host + ':' + remotePath + '...');

  // Build Python script for SFTP upload using paramiko
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
  const tmpScript = path.join(process.env.TEMP || 'C:\\Temp', 'sftp_upload_' + Date.now() + '.py');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    const result = spawnSync('python', [
      tmpScript,
      host,
      port,
      username,
      password,
      localFilePath,
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
    if (fs.existsSync(tmpScript)) {
      fs.unlinkSync(tmpScript);
    }
  }
}
