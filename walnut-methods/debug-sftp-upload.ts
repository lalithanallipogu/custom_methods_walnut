/**
 * LOCAL DEBUG SCRIPT — Run in VS Code terminal:
 *   npx ts-node walnut-methods/debug-sftp-upload.ts
 *
 * Or with plain Node (compile first):
 *   npx tsc walnut-methods/debug-sftp-upload.ts --esModuleInterop --outDir dist
 *   node dist/debug-sftp-upload.js
 *
 * This mocks WalnutContext so you can test the method locally.
 */

import * as path from 'path';
import * as fs from 'fs';

// --- Mock WalnutContext ---
const variables: Record<string, string> = {};

const mockCtx: any = {
  platform: 'shared',
  testBaseUrl: '',
  // Simulate args: [localFilePath, "icmemId"]
  args: [
    // PUT YOUR LOCAL TEMPLATE FILE PATH HERE for testing:
    path.resolve(__dirname, 'test-template.csv'),
    'icmemId',
  ],
  params: {
    sftpHost: 'altarum.sftp.aver.io',
    sftpPort: '22',
    sftpUsername: 'altarum_qa',
    sftpPassword: 'khq@rtx.crc9jpm*UCZ',
  },
  variableContext: variables,
  log: (msg: string) => console.log('[LOG]', msg),
  warn: (msg: string) => console.warn('[WARN]', msg),
  setVariable: (name: string, value: string) => {
    variables[name] = value;
    console.log(`[VAR SET] ${name} = ${value}`);
  },
  getVariable: (name: string) => variables[name],
  replacePlaceholders: (text: string) => text,
};

// --- Create a sample template file for testing ---
const testTemplatePath = path.resolve(__dirname, 'test-template.csv');
if (!fs.existsSync(testTemplatePath)) {
  fs.writeFileSync(testTemplatePath, 'ID,Name,Value\n{{ICMEM_ID}},TestRecord,100\n{{ICMEM_ID}},TestRecord2,200\n');
  console.log('Created test template:', testTemplatePath);
}

// --- Import and run the method ---
import { sftpTemplateUpload } from './sftp-upload';

async function main() {
  console.log('=== Starting debug run ===\n');
  try {
    await sftpTemplateUpload(mockCtx);
    console.log('\n=== Method completed successfully ===');
    console.log('Variables:', variables);
  } catch (err: any) {
    console.error('\n=== Method FAILED ===');
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

main();
