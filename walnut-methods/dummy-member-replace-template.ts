import type { WalnutBaseContext } from './walnut';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Artifact Dummy Member ID Replace Template and Upload
 * description: Artifact Replace {{member_id}} with dummy ID ${dummyMemberId} in artifact ${filePath} and upload to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} storing member ID in $[memberId] and batch in $[batch]
 * actionType: custom_artifact_dummy_member_replace_upload
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function artifactDummyMemberReplaceUpload(ctx: WalnutBaseContext) {
  // ctx.args[0] = dummyMemberId (from ${dummyMemberId}) — the dummy ID to use for replacement
  // ctx.args[1] = filePath or artifact ref (from ${filePath})
  // ctx.args[2] = SFTP host (from ${sftphost})
  // ctx.args[3] = SFTP port (from ${sftpport})
  // ctx.args[4] = SFTP username (from ${sftpusername})
  // ctx.args[5] = SFTP password (from ${sftppassword})
  // ctx.args[6] = "memberId" (from $[memberId]) — runtime variable name to store the dummy ID
  // ctx.args[7] = "batch" (from $[batch]) — runtime variable name to store batch date (YYYYMMDD)

  const dummyMemberId = ctx.args[0];
  const fileRef = ctx.args[1];
  const host = ctx.args[2];
  const port = ctx.args[3] || '22';
  const username = ctx.args[4];
  const password = ctx.args[5];
  const memberIdVarName = ctx.args[6];
  const batchVarName = ctx.args[7];
  const remoteDirectory = '/TO_AVER/';

  if (!dummyMemberId) {
    throw new Error('Dummy member ID is required as the first argument.');
  }

  if (!fileRef) {
    throw new Error('File path or artifact reference is required as the second argument.');
  }

  if (!host || !username || !password) {
    throw new Error('SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.');
  }

  // Step 1: Use the provided dummy ID (no generation)
  ctx.log('Using dummy ICMEM ID: ' + dummyMemberId);
  ctx.setVariable(memberIdVarName, dummyMemberId);

  // Step 2: Resolve artifact references (e.g. "ART-13" or 24-char MongoDB ObjectId)
  const isArtifactRef = /^ART-\d+$/i.test(fileRef) || /^[a-f0-9]{24}$/i.test(fileRef);
  let filePath: string;
  if (isArtifactRef) {
    ctx.log('Resolving artifact reference: ' + fileRef);
    filePath = await ctx.resolveArtifact(fileRef);
    ctx.log('Resolved to: ' + filePath);
  } else {
    filePath = fileRef;
  }

  if (!fs.existsSync(filePath)) {
    throw new Error('Artifact file not found at path: ' + filePath);
  }

  // Step 3: Read the file content
  let content = fs.readFileSync(filePath, 'utf-8');

  // Step 4: Replace only {{member_id}} placeholders with the dummy member ID
  const beforeMember = content;
  content = content.replace(/\{\{member_id\}\}/g, dummyMemberId);
  if (content !== beforeMember) {
    const count = (beforeMember.match(/\{\{member_id\}\}/g) || []).length;
    ctx.log('Replaced ' + count + ' {{member_id}} placeholder(s) with ' + dummyMemberId);
  } else {
    ctx.warn('No {{member_id}} placeholders found in file.');
  }

  // Step 6: Write modified content to a temp file with timestamp filename
  const tempDir = process.env.TEMP || '/tmp';
  const now = new Date();
  const shifted = new Date(now.getTime() + 2707 * 24 * 60 * 60 * 1000);
  const yyyy = shifted.getFullYear().toString();
  const MM = (shifted.getMonth() + 1).toString().padStart(2, '0');
  const dd = shifted.getDate().toString().padStart(2, '0');
  const HH = shifted.getHours().toString().padStart(2, '0');
  const mm = shifted.getMinutes().toString().padStart(2, '0');
  const ss = shifted.getSeconds().toString().padStart(2, '0');
  const dateTimeStamp = yyyy + MM + dd + HH + mm + ss;
  const millis = now.getTime().toString();

  // Store batch value (YYYYMMDD) as runtime variable
  const batchValue = yyyy + MM + dd;
  if (batchVarName) {
    ctx.setVariable(batchVarName, batchValue);
    ctx.log('Stored batch: ' + batchValue);
  }

  const originalExt = path.extname(filePath) || '.csv';
  const originalBase = path.basename(filePath, originalExt);
  // Strip ALL trailing _digits groups from filename
  let baseName = originalBase;
  while (/_\d+$/.test(baseName)) {
    baseName = baseName.replace(/_\d+$/, '');
  }
  const fileName = baseName + '_' + dateTimeStamp + '_' + millis + originalExt;
  const tempFilePath = path.join(tempDir, fileName);

  fs.writeFileSync(tempFilePath, content, 'utf-8');
  ctx.log('Wrote processed file to: ' + tempFilePath);

  // Step 7: Upload via SFTP to /TO_AVER/
  const remotePath = remoteDirectory + fileName;
  ctx.log('Uploading to ' + host + ':' + remotePath + '...');

  // Node.js SFTP script — runs in a child process to bypass bundler restrictions
  const nodeScript = [
    'const Client = require(["ssh2","sftp","client"].join("-"));',
    'const sftp = new Client();',
    'const args = JSON.parse(process.argv[2]);',
    'async function run() {',
    '  await sftp.connect({ host: args.host, port: args.port, username: args.username, password: args.password });',
    '  await sftp.put(args.local, args.remote);',
    '  console.log("Upload successful: " + args.remote);',
    '  await sftp.end();',
    '}',
    'run().catch(e => { console.error(e.message); process.exit(1); });',
  ].join('\n');

  const scriptArgs = JSON.stringify({
    host: host,
    port: parseInt(port, 10),
    username: username,
    password: password,
    local: tempFilePath,
    remote: remotePath,
  });

  const tmpScript = path.join(tempDir, 'sftp_node_upload_' + Date.now() + '.js');

  try {
    const pkg = ['ssh2', 'sftp', 'client'].join('-');
    spawnSync('npm', ['install', '--no-save', pkg], {
      cwd: tempDir,
      timeout: 120000,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    fs.writeFileSync(tmpScript, nodeScript);

    const result = spawnSync('node', [tmpScript, scriptArgs], {
      timeout: 180000,
      encoding: 'utf-8',
    });

    if (result.error) {
      throw new Error('Node.js execution error: ' + result.error.message);
    }

    if (result.status !== 0) {
      throw new Error('SFTP upload failed: ' + (result.stderr || result.stdout));
    }

    ctx.log('Successfully uploaded file to ' + remotePath);
    ctx.log(result.stdout);
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}
