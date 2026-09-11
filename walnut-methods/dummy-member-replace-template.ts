import type { WalnutContext } from './walnut';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: Artifact Dummy Member ID Replace Template and Upload
 * description: Artifact Replace {{member_id}} with dummy ID ${dummyMemberId} in artifact ${filePath} and upload to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} storing member ID in $[memberId] and batch in $[batch] with ${forwardDays} days forward
 * actionType: custom_artifact_dummy_member_replace_upload
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function artifactDummyMemberReplaceUpload(ctx: WalnutContext) {
  // ctx.args[0] = dummyMemberId (from ${dummyMemberId}) — the dummy ID to use for replacement
  // ctx.args[1] = filePath or artifact ref (from ${filePath})
  // ctx.args[2] = SFTP host (from ${sftphost})
  // ctx.args[3] = SFTP port (from ${sftpport})
  // ctx.args[4] = SFTP username (from ${sftpusername})
  // ctx.args[5] = SFTP password (from ${sftppassword})
  // ctx.args[6] = "memberId" (from $[memberId]) — runtime variable name to store the dummy ID
  // ctx.args[7] = "batch" (from $[batch]) — runtime variable name to store batch date (YYYYMMDD)
  // ctx.args[8] = forward days (from ${forwardDays}) — number of days to shift date forward

  const dummyMemberId = ctx.args[0];
  const fileRef = ctx.args[1];
  const host = ctx.args[2];
  const port = ctx.args[3] || '22';
  const username = ctx.args[4];
  const password = ctx.args[5];
  const memberIdVarName = ctx.args[6];
  const batchVarName = ctx.args[7];
  const forwardDays = parseInt(ctx.args[8], 10) || 2695;
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

  // Step 4: Replace ALL {{key}} placeholders with the dummy member ID
  const beforeMember = content;
  content = content.replace(/\{\{[^}]+\}\}/g, dummyMemberId);
  if (content !== beforeMember) {
    const count = (beforeMember.match(/\{\{[^}]+\}\}/g) || []).length;
    ctx.log('Replaced ' + count + ' {{...}} placeholder(s) with ' + dummyMemberId);
  } else {
    ctx.warn('No {{...}} placeholders found in file.');
  }

  // Step 5: Check for any unreplaced {{...}} placeholders
  const unreplaced = [...new Set(content.match(/\{\{[^}]+\}\}/g) || [])];
  for (const match of unreplaced) {
    ctx.warn('Unreplaced placeholder found: ' + match);
  }
  if (unreplaced.length > 0) {
    throw new Error('Unreplaced placeholders found after replacement finished.');
  }

  // Step 6: Write modified content to a temp file with timestamp filename
  const tempDir = process.env.TEMP || '/tmp';
  const now = new Date();
  const shifted = new Date(now.getTime() + forwardDays * 24 * 60 * 60 * 1000);
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

  const pyScript = [
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
  ].join('\n');

  const tmpScript = path.join(tempDir, 'sftp_upload_' + Date.now() + '.py');

  try {
    fs.writeFileSync(tmpScript, pyScript);

    const result = spawnSync('python', [
      tmpScript,
      host,
      port,
      username,
      password,
      tempFilePath,
      remotePath,
    ], {
      timeout: 180000,
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
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
  }
}
