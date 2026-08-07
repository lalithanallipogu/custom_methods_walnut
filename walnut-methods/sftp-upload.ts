import type { WalnutContext } from './walnut';
import SftpClient from 'ssh2-sftp-client';

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

  const host = 'altarum.sftp.aver.io';
  const port = 22;
  const username = 'altarum_qa';
  const password = 'khq@rtx.crc9jpm*UCZ';

  const sftp = new SftpClient();

  try {
    ctx.log(`Connecting to SFTP server ${host}:${port}...`);
    await sftp.connect({
      host,
      port,
      username,
      password,
      retries: 3,
      retry_minTimeout: 2000,
      algorithms: {
        kex: [
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1',
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm@openssh.com',
          'aes256-gcm@openssh.com',
        ],
      },
    });

    ctx.log(`Changing directory to ${remoteDirectory}...`);
    const remoteExists = await sftp.exists(remoteDirectory);
    if (!remoteExists) {
      ctx.log(`Creating remote directory: ${remoteDirectory}`);
      await sftp.mkdir(remoteDirectory, true);
    }

    const fileName = localFilePath.replace(/\\/g, '/').split('/').pop();
    const remotePath = `${remoteDirectory}${fileName}`;

    ctx.log(`Uploading ${localFilePath} to ${remotePath}...`);
    await sftp.put(localFilePath, remotePath);

    ctx.log(`Successfully uploaded file to ${remotePath}`);
  } finally {
    await sftp.end();
  }
}
