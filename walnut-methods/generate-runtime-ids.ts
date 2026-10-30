import type { WalnutBaseContext } from './walnut';

/** @walnut_method
 * name: Ortho Monitoring Generate Runtime IDs
 * description: Generate random NPI, PPID and DSPTIN IDs with [A-Z,0-9] suffix, storing them in $[rbenpi] $[rbeppid] $[dsptin] and generate contract IDs from ${current_iteration} storing in $[contract_id1] $[contract_id2] $[rbe_tin]
 * actionType: custom_ortho_monitoring_generate_runtime_ids
 * context: shared
 * needsLocator: false
 * category: Data Generation
 */
export async function orthoMonitoringGenerateRuntimeIds(ctx: WalnutBaseContext) {
  // ctx.args[0] = "rbenpi"           (from $[rbenpi])  — runtime variable name for NPI ID
  // ctx.args[1] = "rbeppid"          (from $[rbeppid]) — runtime variable name for PPID ID
  // ctx.args[2] = "dsptin"           (from $[dsptin])  — runtime variable name for DSPTIN ID
  // ctx.args[3] = current_iteration  (from ${current_iteration}) — e.g. "0094"
  // ctx.args[4] = "contract_id1"     (from $[contract_id1])
  // ctx.args[5] = "contract_id2"     (from $[contract_id2])
  // ctx.args[6] = "rbe_tin"          (from $[rbe_tin])

  const npiVarName = ctx.args[0];
  const ppidVarName = ctx.args[1];
  const dsptinVarName = ctx.args[2];
  const currentIteration = ctx.args[3];
  const contractId1VarName = ctx.args[4];
  const contractId2VarName = ctx.args[5];
  const rbeTinVarName = ctx.args[6];

  if (!npiVarName || !ppidVarName || !dsptinVarName) {
    throw new Error(
      'All three runtime variable names are required: $[rbenpi], $[rbeppid], $[dsptin]'
    );
  }

  if (!currentIteration) {
    throw new Error(
      'current_iteration is required. Ensure it is set in test data.'
    );
  }

  // Generate random [A-Z, 0-9] suffix (6 characters each)
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const SUFFIX_LENGTH = 6;

  function randomSuffix(): string {
    let result = '';
    for (let i = 0; i < SUFFIX_LENGTH; i++) {
      result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return result;
  }

  // Generate IDs with prefixes: NPI, PPID, DSPTIN
  const npiId = 'NPI' + randomSuffix();
  const ppidId = 'PPID' + randomSuffix();
  const dsptinId = 'DSPTIN' + randomSuffix();

  // Ortho fixed prefixes
  const contractId1 = '3001' + currentIteration;   // e.g. "3001" + "0094" = "30010094"
  const contractId2 = '3011' + currentIteration;   // e.g. "3011" + "0094" = "30110094"
  const rbeTin = 'RBETIN000' + currentIteration;   // e.g. "RBETIN000" + "0094" = "RBETIN0000094"

  // Store random IDs in runtime variables
  ctx.setVariable(npiVarName, npiId);
  ctx.setVariable(ppidVarName, ppidId);
  ctx.setVariable(dsptinVarName, dsptinId);

  // Store contract IDs and rbe_tin in runtime variables
  if (contractId1VarName) {
    ctx.setVariable(contractId1VarName, contractId1);
    ctx.log('Generated Contract 1 ID: ' + contractId1 + ' -> $[' + contractId1VarName + ']');
  }
  if (contractId2VarName) {
    ctx.setVariable(contractId2VarName, contractId2);
    ctx.log('Generated Contract 2 ID: ' + contractId2 + ' -> $[' + contractId2VarName + ']');
  }
  if (rbeTinVarName) {
    ctx.setVariable(rbeTinVarName, rbeTin);
    ctx.log('Generated RBE TIN:       ' + rbeTin + ' -> $[' + rbeTinVarName + ']');
  }

  ctx.log('Generated NPI ID:    ' + npiId + '  -> $[' + npiVarName + ']');
  ctx.log('Generated PPID ID:   ' + ppidId + '  -> $[' + ppidVarName + ']');
  ctx.log('Generated DSPTIN ID: ' + dsptinId + ' -> $[' + dsptinVarName + ']');
}
