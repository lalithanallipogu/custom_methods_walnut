import type { WalnutContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
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
  // ctx.args[0] = artifact ID (e.g., "ART-2") from ${localFilePath}
  const artifactId = ctx.args[0];
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
  ctx.log('Artifact reference: ' + artifactId);

  // --- Download ART-2 file from Walnut Data Store API ---
  const apiBase = 'https://app.walnutai-poc.enlacehealth.com/api';
  const projectId = '69d4cbdea9876ab3eca8a583';
  const tempDir = process.env.TEMP || 'C:\\Temp';

  // Download the artifact file using the Data Store API
  const downloadUrl = `${apiBase}/projects/${projectId}/data-store/artifacts/${artifactId}/download`;
  ctx.log('Downloading artifact from: ' + downloadUrl);

  const localFilePath = path.join(tempDir, `art2_template_${Date.now()}.csv`);

  await new Promise<void>((resolve, reject) => {
    const makeRequest = (url: string, redirectCount: number) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      const req = https.get(url, { rejectUnauthorized: false }, (res) => {
        // Handle redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          makeRequest(res.headers.location, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            reject(new Error(`Failed to download artifact ${artifactId}: HTTP ${res.statusCode} - ${body.substring(0, 200)}`));
          });
          return;
        }

        const fileStream = fs.createWriteStream(localFilePath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', reject);
      });

      req.on('error', reject);
    };

    makeRequest(downloadUrl, 0);
  });

  if (!fs.existsSync(localFilePath)) {
    throw new Error('Downloaded artifact file not found at: ' + localFilePath);
  }

  const fileSize = fs.statSync(localFilePath).size;
  ctx.log('Downloaded artifact to: ' + localFilePath + ' (' + fileSize + ' bytes)');

  // Step 1: Read the template and replace {{member_id}} with the ICMEM ID
  const templateContent = fs.readFileSync(localFilePath, 'utf-8');
  const updatedContent = templateContent.replace(/\{\{member_id\}\}/g, icmemId);

  // Write the modified file to a temp location for upload
  const fileName = 'member_eligibility_audit_' + icmemId + '.csv';
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
    if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
  }
}
