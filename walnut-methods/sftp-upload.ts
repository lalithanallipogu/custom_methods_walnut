import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from 'ssh2';

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
  const port = Number(ctx.params.sftpPort || 22);
  const username = ctx.params.sftpUsername || 'altarum_qa';
  const password = ctx.params.sftpPassword || 'khq@rtx.crc9jpm*UCZ';

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found: ${localFilePath}`);
  }

  const fileName = path.basename(localFilePath);
  const remotePath = `${remoteDirectory}${fileName}`;

  ctx.log(`Uploading ${localFilePath} to ${host}:${remotePath}...`);

  return new Promise<void>((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      ctx.log('SSH connection established, starting SFTP session...');
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(new Error(`SFTP session error: ${err.message}`));
        }

        const readStream = fs.createReadStream(localFilePath);
        const writeStream = sftp.createWriteStream(remotePath);

        writeStream.on('close', () => {
          ctx.log(`Successfully uploaded file to ${remotePath}`);
          conn.end();
          resolve();
        });

        writeStream.on('error', (uploadErr: Error) => {
          conn.end();
          reject(new Error(`Upload error: ${uploadErr.message}`));
        });

        readStream.on('error', (readErr: Error) => {
          conn.end();
          reject(new Error(`Read error: ${readErr.message}`));
        });

        readStream.pipe(writeStream);
      });
    });

    conn.on('error', (connErr) => {
      reject(new Error(`SSH connection error: ${connErr.message}`));
    });

    conn.connect({
      host,
      port,
      username,
      password,
      readyTimeout: 30000,
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
  });
}
