import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';

/** @walnut_method
 * name: SFTP Upload 4 Original Files
 * description: Upload 4 files ${localFilePath1} ${localFilePath2} ${localFilePath3} ${localFilePath4} to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword}
 * actionType: custom_sftp_upload_4_files
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function sftpUpload4Files(ctx: WalnutBaseContext) {
  // ctx.args[0] = localFilePath1 (from ${localFilePath1})
  // ctx.args[1] = localFilePath2 (from ${localFilePath2})
  // ctx.args[2] = localFilePath3 (from ${localFilePath3})
  // ctx.args[3] = localFilePath4 (from ${localFilePath4})
  // ctx.args[4] = SFTP host (from ${sftphost})
  // ctx.args[5] = SFTP port (from ${sftpport})
  // ctx.args[6] = SFTP username (from ${sftpusername})
  // ctx.args[7] = SFTP password (from ${sftppassword})

  // Helper to detect Walnut artifact references (ART-13 or 24-char hex ObjectId)
  const isArtifactRef = (v: string) =>
    /^ART-\d+$/i.test(v) || /^[a-f0-9]{24}$/i.test(v);

  // Resolve each file path — if it's an artifact ref, download it to a temp path first
  const rawPaths = [ctx.args[0], ctx.args[1], ctx.args[2], ctx.args[3]];
  const filePaths: string[] = [];
  for (let i = 0; i < rawPaths.length; i++) {
    const raw = rawPaths[i];
    if (!raw) {
      filePaths.push('');
      continue;
    }
    if (isArtifactRef(raw)) {
      ctx.log('File ' + (i + 1) + ' is an artifact reference (' + raw + '), resolving...');
      const resolved = await (ctx as any).resolveArtifact(raw);
      ctx.log('File ' + (i + 1) + ' resolved to: ' + resolved);
      filePaths.push(resolved);
    } else {
      filePaths.push(raw);
    }
  }

  const host = ctx.args[4];
  const port = ctx.args[5] || '22';
  const username = ctx.args[6];
  const password = ctx.args[7];
  const remoteDirectory = '/TO_AVER/';

  if (!host || !username || !password) {
    throw new Error(
      'SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.'
    );
  }

  const uploadPairs: { local: string; remote: string }[] = [];

  // Validate all file paths and build upload pairs
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];

    if (!filePath) {
      ctx.log('File path ' + (i + 1) + ' is empty, skipping...');
      continue;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('File ' + (i + 1) + ' not found at path: ' + filePath);
    }

    const fileName = path.basename(filePath);
    const remotePath = remoteDirectory + fileName;
    uploadPairs.push({ local: filePath, remote: remotePath });

    ctx.log('File ' + (i + 1) + ': ' + fileName);
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid file paths provided. Nothing to upload.');
  }

  // Upload all files via SFTP to /TO_AVER/
  ctx.log('Uploading ' + uploadPairs.length + ' files to ' + host + ':' + remoteDirectory + '...');

  const SftpClient = require('ssh2-sftp-client');
  const sftp = new SftpClient();

  try {
    await sftp.connect({
      host: host,
      port: parseInt(port, 10),
      username: username,
      password: password,
    });

    for (let i = 0; i < uploadPairs.length; i++) {
      const pair = uploadPairs[i];
      ctx.log('Uploading file ' + (i + 1) + '/' + uploadPairs.length + ': ' + pair.remote);
      await sftp.put(pair.local, pair.remote);
      ctx.log('  Upload successful: ' + pair.remote);
    }

    ctx.log('All ' + uploadPairs.length + ' files uploaded successfully to ' + remoteDirectory);
  } catch (err: any) {
    throw new Error('SFTP upload failed: ' + (err.message || err));
  } finally {
    await sftp.end();
  }
}
