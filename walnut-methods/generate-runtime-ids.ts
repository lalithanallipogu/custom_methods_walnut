import type { WalnutBaseContext } from './walnut';

/** @walnut_method
 * name: Monitoring Generate Runtime IDs
 * description: Generate random NPI, PPID and DSPTIN IDs with [A-Z,0-9] suffix, storing them in $[rbenpi] $[rbeppid] $[dsptin] and generate contract IDs from ${contract_prefix1} ${contract_prefix2} ${rbe_tin_prefix} ${rbe2_tin_prefix} ${current_iteration} storing in $[contract_id1] $[contract_id2] $[rbe_tin] $[rbe2tin]
 * actionType: custom_monitoring_generate_runtime_ids
 * context: shared
 * needsLocator: false
 * category: Data Generation
 */
export async function monitoringGenerateRuntimeIds(ctx: WalnutBaseContext) {
  // ctx.args[0]  = "rbenpi"           (from $[rbenpi])  — runtime variable name for NPI ID
  // ctx.args[1]  = "rbeppid"          (from $[rbeppid]) — runtime variable name for PPID ID
  // ctx.args[2]  = "dsptin"           (from $[dsptin])  — runtime variable name for DSPTIN ID
  // ctx.args[3]  = contract_prefix1   (from ${contract_prefix1}) — e.g. "3001", "3003"
  // ctx.args[4]  = contract_prefix2   (from ${contract_prefix2}) — e.g. "3011", "3013"
  // ctx.args[5]  = rbe_tin_prefix     (from ${rbe_tin_prefix})   — e.g. "RBETIN000", "RBETIN003"
  // ctx.args[6]  = rbe2_tin_prefix    (from ${rbe2_tin_prefix})  — e.g. "RBE2TIN00", "RBE2TIN03"
  // ctx.args[7]  = current_iteration  (from ${current_iteration}) — e.g. "0094"
  // ctx.args[8]  = "contract_id1"     (from $[contract_id1])
  // ctx.args[9]  = "contract_id2"     (from $[contract_id2])
  // ctx.args[10] = "rbe_tin"          (from $[rbe_tin])
  // ctx.args[11] = "rbe2tin"          (from $[rbe2tin])

  const npiVarName = ctx.args[0];
  const ppidVarName = ctx.args[1];
  const dsptinVarName = ctx.args[2];
  const contractPrefix1 = ctx.args[3];
  const contractPrefix2 = ctx.args[4];
  const rbeTinPrefix = ctx.args[5];
  const rbe2TinPrefix = ctx.args[6];
  const currentIteration = ctx.args[7];
  const contractId1VarName = ctx.args[8];
  const contractId2VarName = ctx.args[9];
  const rbeTinVarName = ctx.args[10];
  const rbe2TinVarName = ctx.args[11];

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

  if (!contractPrefix1 || !contractPrefix2) {
    throw new Error(
      'contract_prefix1 and contract_prefix2 are required. Ensure they are set in test data.'
    );
  }

  if (!rbeTinPrefix) {
    throw new Error(
      'rbe_tin_prefix is required. Ensure it is set in test data.'
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

  // Generate IDs with prefixes: NPI, PPID, DSPTIN (these are always random)
  const npiId = 'NPI' + randomSuffix();
  const ppidId = 'PPID' + randomSuffix();
  const dsptinId = 'DSPTIN' + randomSuffix();

  // Generate contract IDs and TINs using test-data prefixes + iteration
  const contractId1 = contractPrefix1 + currentIteration;
  const contractId2 = contractPrefix2 + currentIteration;
  const rbeTin = rbeTinPrefix + currentIteration;
  const rbe2Tin = (rbe2TinPrefix || 'RBE2TIN00') + currentIteration;

  ctx.log('Using prefixes from test data:');
  ctx.log('  contract_prefix1: ' + contractPrefix1);
  ctx.log('  contract_prefix2: ' + contractPrefix2);
  ctx.log('  rbe_tin_prefix:   ' + rbeTinPrefix);
  ctx.log('  rbe2_tin_prefix:  ' + (rbe2TinPrefix || 'RBE2TIN00 (default)'));
  ctx.log('  current_iteration: ' + currentIteration);

  // Store random IDs in runtime variables
  ctx.setVariable(npiVarName, npiId);
  ctx.setVariable(ppidVarName, ppidId);
  ctx.setVariable(dsptinVarName, dsptinId);

  // Store contract IDs and TINs in runtime variables
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
  if (rbe2TinVarName) {
    ctx.setVariable(rbe2TinVarName, rbe2Tin);
    ctx.log('Generated RBE2 TIN:      ' + rbe2Tin + ' -> $[' + rbe2TinVarName + ']');
  }

  ctx.log('Generated NPI ID:    ' + npiId + '  -> $[' + npiVarName + ']');
  ctx.log('Generated PPID ID:   ' + ppidId + '  -> $[' + ppidVarName + ']');
  ctx.log('Generated DSPTIN ID: ' + dsptinId + ' -> $[' + dsptinVarName + ']');
}
