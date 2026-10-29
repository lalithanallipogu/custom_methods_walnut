import type { WalnutBaseContext } from './walnut';

/** @walnut_method
 * name: Ortho Monitoring Generate Runtime IDs
 * description: Generate random NPI, PPID and DSPTIN IDs with [A-Z,0-9] suffix, storing them in $[rbenpi] $[rbeppid] $[dsptin] and generate contract IDs from ${current_iteration} with prefixes ${contractPrefix1} ${contractPrefix2} ${rbeTinPrefix} storing in $[contract_id1] $[contract_id2] $[rbe_tin]
 * actionType: custom_ortho_monitoring_generate_runtime_ids
 * context: shared
 * needsLocator: false
 * category: Data Generation
 */
export async function orthoMonitoringGenerateRuntimeIds(ctx: WalnutBaseContext) {
  // ctx.args[0] = "rbenpi"           (from $[rbenpi])
  // ctx.args[1] = "rbeppid"          (from $[rbeppid])
  // ctx.args[2] = "dsptin"           (from $[dsptin])
  // ctx.args[3] = current_iteration  (from ${current_iteration}) — e.g. "0086"
  // ctx.args[4] = contractPrefix1    (from ${contractPrefix1})  — e.g. "3001"
  // ctx.args[5] = contractPrefix2    (from ${contractPrefix2})  — e.g. "3011"
  // ctx.args[6] = rbeTinPrefix       (from ${rbeTinPrefix})     — e.g. "RBETIN000"
  // ctx.args[7] = "contract_id1"     (from $[contract_id1])
  // ctx.args[8] = "contract_id2"     (from $[contract_id2])
  // ctx.args[9] = "rbe_tin"          (from $[rbe_tin])

  const npiVarName = ctx.args[0];
  const ppidVarName = ctx.args[1];
  const dsptinVarName = ctx.args[2];
  const currentIteration = ctx.args[3];
  const contractPrefix1 = ctx.args[4];
  const contractPrefix2 = ctx.args[5];
  const rbeTinPrefix = ctx.args[6];
  const contractId1VarName = ctx.args[7];
  const contractId2VarName = ctx.args[8];
  const rbeTinVarName = ctx.args[9];

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

  // Validate prefixes
  if (!contractPrefix1 || !contractPrefix2 || !rbeTinPrefix) {
    throw new Error(
      'Contract prefixes required. Ensure contractPrefix1, contractPrefix2, and rbeTinPrefix are set in test data.'
    );
  }

  // Generate contract IDs and rbe_tin from prefix (test data) + current_iteration
  const contractId1 = contractPrefix1 + currentIteration;   // e.g. "3001" + "0086" = "30010086"
  const contractId2 = contractPrefix2 + currentIteration;   // e.g. "3011" + "0086" = "30110086"
  const rbeTin = rbeTinPrefix + currentIteration;            // e.g. "RBETIN000" + "0086" = "RBETIN0000086"

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
