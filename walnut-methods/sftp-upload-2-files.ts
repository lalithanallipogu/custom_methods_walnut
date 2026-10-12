import type { WalnutBaseContext } from './walnut';
import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

/** @walnut_method
 * name: SFTP Upload 2 Files With Generated Member ID
 * description: Upload 2 files ${localFilePath1} ${localFilePath2} to /TO_AVER/ via SFTP host ${sftphost} port ${sftpport} user ${sftpusername} password ${sftppassword} storing ID in $[memberId]
 * actionType: custom_sftp_upload_2_files
 * context: shared
 * needsLocator: false
 * category: File Transfer
 */
export async function sftpUpload2Files(ctx: WalnutBaseContext) {
  // ctx.args[0] = localFilePath1 (from ${localFilePath1})
  // ctx.args[1] = localFilePath2 (from ${localFilePath2})
  // ctx.args[2] = SFTP host (from ${sftphost})
  // ctx.args[3] = SFTP port (from ${sftpport})
  // ctx.args[4] = SFTP username (from ${sftpusername})
  // ctx.args[5] = SFTP password (from ${sftppassword})
  // ctx.args[6] = "memberId" (from $[memberId]) — runtime variable name to store generated ID

  // Step 1: Generate a unique ICMEM ID (format: ICMEM-{4 digits}{4 uppercase letters})
  const digits = Array.from({ length: 4 }, function () {
    return Math.floor(Math.random() * 10);
  }).join('');
  const letters = Array.from({ length: 4 }, function () {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return alpha.charAt(Math.floor(Math.random() * alpha.length));
  }).join('');
  const memberId = 'ICMEM-' + digits + letters;
  ctx.log('Generated unique ICMEM ID: ' + memberId);

  // Store the generated member ID as a runtime variable for use in subsequent steps
  const memberIdVarName = ctx.args[6];
  if (memberIdVarName) {
    ctx.setVariable(memberIdVarName, memberId);
    ctx.log('Stored member ID in runtime variable: ' + memberIdVarName + ' = ' + memberId);
  }

  // Helper to detect Walnut artifact references (ART-13 or 24-char hex ObjectId)
  var isArtifactRef = function (v: string) {
    return /^ART-\d+$/i.test(v) || /^[a-f0-9]{24}$/i.test(v);
  };

  // Resolve each file path — if it's an artifact ref, download it to a temp path first
  var rawPaths = [ctx.args[0], ctx.args[1]];
  var filePaths: string[] = [];
  for (var i = 0; i < rawPaths.length; i++) {
    var raw = rawPaths[i];
    if (!raw) {
      filePaths.push('');
      continue;
    }
    if (isArtifactRef(raw)) {
      ctx.log('File ' + (i + 1) + ' is an artifact reference (' + raw + '), resolving...');
      var resolved = await (ctx as any).resolveArtifact(raw);
      ctx.log('File ' + (i + 1) + ' resolved to: ' + resolved);
      filePaths.push(resolved);
    } else {
      filePaths.push(raw);
    }
  }

  var host = ctx.args[2];
  var port = ctx.args[3] || '22';
  var username = ctx.args[4];
  var password = ctx.args[5];
  var remoteDirectory = '/TO_AVER/';

  if (!host || !username || !password) {
    throw new Error(
      'SFTP credentials missing. Ensure sftphost, sftpusername, and sftppassword are set in test data.'
    );
  }

  var tempDir = process.env.TEMP || '/tmp';
  var tempFiles: string[] = [];
  var uploadPairs: { local: string; remote: string }[] = [];

  // Step 2: Process each file — replace {{member_id}} and build timestamped filenames
  for (var i = 0; i < filePaths.length; i++) {
    var filePath = filePaths[i];

    if (!filePath) {
      ctx.log('File path ' + (i + 1) + ' is empty, skipping...');
      continue;
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('File ' + (i + 1) + ' not found at path: ' + filePath);
    }

    ctx.log('Processing file ' + (i + 1) + ': ' + filePath);

    // Read the original file (original file is NEVER modified)
    var originalContent = fs.readFileSync(filePath, 'utf-8');

    // Replace all occurrences of {{member_id}} with the generated member ID
    var updatedContent = originalContent.replace(/\{\{member_id\}\}/g, memberId);

    var replacedCount = (originalContent.match(/\{\{member_id\}\}/g) || []).length;
    if (replacedCount > 0) {
      ctx.log('Replaced ' + replacedCount + ' {{member_id}} placeholder(s) with ' + memberId);
    } else {
      ctx.log('No {{member_id}} placeholders in file ' + (i + 1) + ' — uploading as-is.');
    }

    // Build filename with shifted timestamp
    var fileNow = new Date();
    var fileShifted = new Date(fileNow.getTime() + 2670 * 24 * 60 * 60 * 1000);
    var fYyyy = fileShifted.getFullYear().toString();
    var fMM = (fileShifted.getMonth() + 1).toString().padStart(2, '0');
    var fdd = fileShifted.getDate().toString().padStart(2, '0');
    var fHH = fileShifted.getHours().toString().padStart(2, '0');
    var fmm = fileShifted.getMinutes().toString().padStart(2, '0');
    var fss = fileShifted.getSeconds().toString().padStart(2, '0');
    var fileDateTimeStamp = fYyyy + fMM + fdd + fHH + fmm + fss;
    var fileEpochMillis = fileNow.getTime().toString();

    var originalExt = path.extname(filePath) || '.csv';
    var originalBase = path.basename(filePath, originalExt);
    // Strip ALL trailing _digits groups from the original filename (remove old timestamps)
    var baseName = originalBase;
    while (/_\d+$/.test(baseName)) {
      baseName = baseName.replace(/_\d+$/, '');
    }
    var fileName = baseName + '_' + fileDateTimeStamp + '_' + fileEpochMillis + originalExt;

    // Write modified content to temp file (original stays untouched)
    var tempFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(tempFilePath, updatedContent, 'utf-8');
    tempFiles.push(tempFilePath);

    var remotePath = remoteDirectory + fileName;
    uploadPairs.push({ local: tempFilePath, remote: remotePath });

    ctx.log('Created temp file: ' + fileName);

    // Small delay to ensure unique epoch millis per file
    await new Promise(function (resolve) { setTimeout(resolve, 10); });
  }

  if (uploadPairs.length === 0) {
    throw new Error('No valid file paths provided. Nothing to upload.');
  }

  // Step 3: Upload all files via SFTP to /TO_AVER/ using Node.js ssh2-sftp-client
  ctx.log('Uploading ' + uploadPairs.length + ' files to ' + host + ':' + remoteDirectory + '...');

  var nodeScript = [
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

  var scriptArgs = JSON.stringify({
    host: host,
    port: parseInt(port, 10),
    username: username,
    password: password,
    files: uploadPairs,
  });

  var tmpScript = path.join(tempDir, 'sftp_node_upload_' + Date.now() + '.js');

  try {
    var sftpModPath = 'ssh2-sftp-client';

    fs.writeFileSync(tmpScript, nodeScript);

    var result = spawnSync('node', [tmpScript, scriptArgs], {
      timeout: 180000,
      encoding: 'utf-8',
      env: Object.assign({}, process.env, { SFTP_MODULE: sftpModPath }),
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
    for (var j = 0; j < tempFiles.length; j++) {
      if (fs.existsSync(tempFiles[j])) fs.unlinkSync(tempFiles[j]);
    }
  }
}
