import type { WalnutContext } from './walnut';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/** @walnut_method
 * name: Replace Template Values in File
 * description: Replace template placeholders in artifact file ${filePath} storing result in $[outputFilePath] with ${key1} ${val1} ${key2} ${val2} ${key3} ${val3} ${key4} ${val4} ${key5} ${val5} ${key6} ${val6} ${key7} ${val7} ${key8} ${val8} ${key9} ${val9} ${key10} ${val10}
 * actionType: custom_replace_template_values
 * context: shared
 * needsLocator: false
 * category: Data Processing
 */
export async function replaceTemplateValues(ctx: WalnutContext) {
  // ctx.args[0] = filePath (from ${filePath})
  // ctx.args[1] = "outputFilePath" (from $[outputFilePath]) — runtime variable name to store temp file path
  // ctx.args[2..N] = key/value pairs: args[2]=key1, args[3]=val1, args[4]=key2, args[5]=val2, ...
  // Unused pairs will be empty strings — we skip them.

  const fileRef = ctx.args[0];
  const outputVarName = ctx.args[1];

  if (!fileRef) {
    throw new Error('File path or artifact reference is required as the first argument.');
  }

  // Resolve artifact references ("ART-13", or a legacy 24-hex Mongo id) to a local
  // file path, or use as-is if it's already a file system path. Mirrors walnut-agent's
  // isArtifactRef — kept local since custom methods can't import agent internals directly.
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

  // Build a replacement map from the key/value pairs
  const replacements: Map<string, string> = new Map();
  for (let i = 2; i < ctx.args.length; i += 2) {
    const key = ctx.args[i];
    const value = ctx.args[i + 1];
    // Skip empty or undefined pairs
    if (key !== undefined && key !== '') {
      replacements.set(key, value ?? '');
      ctx.log('Replacement: ${{' + key + '}} -> ' + (value ?? ''));
    }
  }

  if (replacements.size === 0) {
    ctx.warn('No key/value replacement pairs provided. File will not be modified.');
    return;
  }

  // Read the file content
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace each ${{key}} placeholder with its corresponding value
  for (const [key, value] of replacements) {
    const placeholder = '${{' + key + '}}';
    const before = content;
    // Use split/join for literal string replacement (no regex escaping needed)
    content = content.split(placeholder).join(value);
    if (content !== before) {
      ctx.log('Replaced all occurrences of ' + placeholder);
    } else {
      ctx.warn('Placeholder ' + placeholder + ' not found in file.');
    }
  }

  // Check for any unreplaced ${{...}} placeholders remaining in the content
  const unreplaced = [...new Set(content.match(/\$\{\{[^}]+\}\}/g) || [])];
  for (const match of unreplaced) {
    ctx.warn('Unreplaced template value found: ' + match);
  }
  if (unreplaced.length > 0) {
    throw new Error('Templated values found after replacement finished.');
  }

  // Write modified content to a temp file (original artifact is never modified)
  const tempDir = os.tmpdir();
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const tempFilePath = path.join(tempDir, base + '_' + Date.now() + ext);
  fs.writeFileSync(tempFilePath, content, 'utf-8');
  ctx.log('Wrote processed file to: ' + tempFilePath);

  // Store temp file path as a runtime variable for subsequent steps (e.g., upload)
  ctx.setVariable(outputVarName, tempFilePath);
}
 