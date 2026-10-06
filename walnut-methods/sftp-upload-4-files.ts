import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: SFTP Upload 4 Original Files
 * description: Upload 4 files ${localFilePath1} ${localFilePath2} ${localFilePath3} ${localFilePath4} to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword}
 * actionType: custom_sftp_upload_4_files
 * context: shared
 * modules: path, fs, child_process
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

  // Node.js SFTP script — runs in a child process with bundled node_modules
  const nodeScript = [
    'const Client = require(process.env.SFTP_MODULE);',
    'const sftp = new Client();',
    'const args = JSON.parse(process.argv[2]);',
    'async function run() {',
    '  await sftp.connect({ host: args.host, port: args.port, username: args.username, password: args.password });',
    '  for (let i = 0; i < args.files.length; i++) {',
    '    const f = args.files[i];',
    '    console.log("Uploading file " + (i+1) + "/" + args.files.length + ": " + f.remote);',
    '    await sftp.put(f.local, f.remote);',
    '    console.log("  Upload successful: " + f.remote);',
    '  }',
    '  await sftp.end();',
    '  console.log("All " + args.files.length + " files uploaded successfully.");',
    '}',
    'run().catch(e => { console.error(e.message); process.exit(1); });',
  ].join('\n');

  const scriptArgs = JSON.stringify({
    host: host,
    port: parseInt(port, 10),
    username: username,
    password: password,
    files: uploadPairs,
  });

  const tempDir = process.env.TEMP || '/tmp';
  const tmpScript = path.join(tempDir, 'sftp_node_upload_' + Date.now() + '.js');

  try {
    const nmDir = path.join(__dirname, 'node_modules');
    const sftpModPath = path.join(nmDir, ['ssh2', 'sftp', 'client'].join('-'));

    fs.writeFileSync(tmpScript, nodeScript);

    const result = spawnSync('node', [tmpScript, scriptArgs], {
      timeout: 180000,
      encoding: 'utf-8',
      env: { ...process.env, SFTP_MODULE: sftpModPath },
    });

    if (result.error) {
      throw new Error('Node.js execution error: ' + result.error.message);
    }

    if (result.status !== 0) {
      throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    }

    ctx.log(result.stdout);
    ctx.log('All ' + uploadPairs.length + ' files uploaded successfully to ' + remoteDirectory);
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
  }
}
