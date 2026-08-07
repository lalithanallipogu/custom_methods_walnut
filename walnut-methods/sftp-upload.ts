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

  // Create SFTP batch file
  const batchFile = path.join(
    process.env.TEMP || 'C:\\Temp',
    'sftp_batch_' + Date.now() + '.txt'
  );
  const batchContent = 'put "' + localFilePath.replace(/\\/g, '/') + '" "' + remotePath + '"';
  fs.writeFileSync(batchFile, batchContent);

  try {
    // Use PowerShell to run sftp with password via environment variable
    const psCommand = [
      '$env:SSH_ASKPASS = "' + batchFile.replace(/\\/g, '\\\\') + '";',
      'echo y |',
      'sftp -P ' + port,
      '-oStrictHostKeyChecking=no',
      '-oUserKnownHostsFile=NUL',
      '-oBatchMode=no',
      '-b "' + batchFile.replace(/\\/g, '\\\\') + '"',
      username + '@' + host
    ].join(' ');

    const result = spawnSync('powershell', [
      '-ExecutionPolicy', 'Bypass',
      '-NoProfile',
      '-Command', psCommand
    ], {
      timeout: 120000,
      encoding: 'utf-8',
    });

    if (result.error) {
      throw new Error('PowerShell execution error: ' + result.error.message);
    }

    if (result.status !== 0) {
      const errorMsg = result.stderr || result.stdout || 'Unknown error';
      throw new Error('SFTP upload failed: ' + errorMsg);
    }

    ctx.log('Successfully uploaded file to ' + remotePath);
  } finally {
    if (fs.existsSync(batchFile)) {
      fs.unlinkSync(batchFile);
    }
  }
}
