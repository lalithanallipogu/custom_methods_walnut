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
  // For File type Data Store references, ctx.args[0] is the artifact ID (e.g., "ART-2")
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
  ctx.log('Artifact ID: ' + artifactId);

  // Resolve the artifact file path - search agent's artifact cache directories
  let localFilePath = artifactId;

  if (!fs.existsSync(localFilePath)) {
    // Search common Walnut Agent artifact cache locations
    const appData = process.env.APPDATA || '';
    const searchPaths = [
      path.join(appData, 'WalnutAgent', 'artifacts'),
      path.join(appData, 'WalnutAgent', 'downloads'),
      path.join(appData, 'WalnutAgent', 'artifact-cache'),
      path.join(appData, 'WalnutAgent'),
      process.env.TEMP || 'C:\\Temp',
    ];

    let found = false;
    for (const searchDir of searchPaths) {
      if (!fs.existsSync(searchDir)) continue;

      // Search recursively for files matching the artifact ID
      const findFile = (dir: string, depth: number): string | null => {
        if (depth > 3) return null;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isFile() && (entry.name.includes(artifactId) || entry.name.includes('member_eligibility'))) {
              return fullPath;
            }
            if (entry.isDirectory() && depth < 3) {
              const result = findFile(fullPath, depth + 1);
              if (result) return result;
            }
          }
        } catch (e) { /* skip inaccessible dirs */ }
        return null;
      };

      const result = findFile(searchDir, 0);
      if (result) {
        localFilePath = result;
        found = true;
        ctx.log('Found artifact file at: ' + localFilePath);
        break;
      }
    }

    if (!found) {
      // Also try ctx.params which may have a resolved path under any key
      for (const key of Object.keys(ctx.params)) {
        const val = ctx.params[key];
        if (typeof val === 'string' && val.includes(path.sep) && fs.existsSync(val)) {
          localFilePath = val;
          found = true;
          ctx.log('Found file via params.' + key + ': ' + localFilePath);
          break;
        }
      }
    }

    if (!found) {
      ctx.log('Artifact ID: ' + artifactId);
      ctx.log('Searched paths: ' + searchPaths.join(', '));
      ctx.log('Available params: ' + JSON.stringify(ctx.params));
      throw new Error('Template file not found for artifact: ' + artifactId + '. File not in agent cache.');
    }
  }

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
