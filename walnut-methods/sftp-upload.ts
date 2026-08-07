import type { WalnutContext } from './walnut';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';

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
    throw new Error(`Local file not found: ${localFilePath}`);
  }

  const fileName = path.basename(localFilePath);
  const remotePath = `${remoteDirectory}${fileName}`;

  ctx.log(`Uploading ${localFilePath} to ${host}:${remotePath}...`);

  // Create a temporary batch file for sftp commands
  const batchContent = `put "${localFilePath}" "${remotePath}"`;
  const batchFile = path.join(process.env.TEMP || '/tmp', `sftp_batch_${Date.now()}.txt`);

  try {
    fs.writeFileSync(batchFile, batchContent);

    // Use sshpass + sftp for password-based authentication
    const command = `sshpass -p "${password}" sftp -P ${port} -oBatchMode=no -oStrictHostKeyChecking=no -b "${batchFile}" ${username}@${host}`;

    execSync(command, {
      timeout: 120000,
      stdio: 'pipe',
    });

    ctx.log(`Successfully uploaded file to ${remotePath}`);
  } finally {
    if (fs.existsSync(batchFile)) {
      fs.unlinkSync(batchFile);
    }
  }
}
