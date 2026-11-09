import type { WalnutBaseContext } from './walnut';

/** @walnut_method
 * name: Monitoring Generate Runtime IDs
 * description: Generate random NPI, PPID and DSPTIN IDs with [A-Z,0-9] suffix, storing them in $[rbenpi] $[rbeppid] $[dsptin] and generate contract IDs from ${current_iteration} using contractPrefix_N and rbeTinPrefix_N from test data
 * actionType: custom_monitoring_generate_runtime_ids
 * context: shared
 * needsLocator: false
 * category: Data Generation
 */
export async function monitoringGenerateRuntimeIds(ctx: WalnutBaseContext) {
  // ctx.args[0] = "rbenpi"           (from $[rbenpi])  — runtime variable name for NPI ID
  // ctx.args[1] = "rbeppid"          (from $[rbeppid]) — runtime variable name for PPID ID
  // ctx.args[2] = "dsptin"           (from $[dsptin])  — runtime variable name for DSPTIN ID
  // ctx.args[3] = current_iteration  (from ${current_iteration}) — e.g. "0094"

  const npiVarName = ctx.args[0];
  const ppidVarName = ctx.args[1];
  const dsptinVarName = ctx.args[2];
  const currentIteration = ctx.args[3];

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

  // Generate IDs with prefixes: NPI, PPID, DSPTIN (these are always random)
  const npiId = 'NPI' + randomSuffix();
  const ppidId = 'PPID' + randomSuffix();
  const dsptinId = 'DSPTIN' + randomSuffix();

  // Store random IDs in runtime variables
  ctx.setVariable(npiVarName, npiId);
  ctx.setVariable(ppidVarName, ppidId);
  ctx.setVariable(dsptinVarName, dsptinId);

  ctx.log('Generated NPI ID:    ' + npiId + '  -> $[' + npiVarName + ']');
  ctx.log('Generated PPID ID:   ' + ppidId + '  -> $[' + ppidVarName + ']');
  ctx.log('Generated DSPTIN ID: ' + dsptinId + ' -> $[' + dsptinVarName + ']');

  // --- Dynamic contract ID and TIN generation from test data ---
  // Scans ctx.params for keys matching contractPrefix_N and rbeTinPrefix_N
  // For each match, generates: contract_id_N = prefix + currentIteration
  //                             rbe_tin_N     = prefix + currentIteration
  //
  // Also sets backward-compatible variable names for N=1 and N=2:
  //   contract_id_1 -> also sets contract_id1
  //   contract_id_2 -> also sets contract_id2
  //   rbe_tin_1     -> also sets rbe_tin
  //   rbe_tin_2     -> also sets rbe_tin2
  //
  // To add a 3rd contract, just add to test data:
  //   contractPrefix_3: 3021
  //   rbeTinPrefix_3:   RBETIN003
  // This creates $[contract_id_3] and $[rbe_tin_3] — no method change needed.

  let contractCount = 0;
  let tinCount = 0;

  // Collect and sort keys so output order is predictable (1, 2, 3, ...)
  const paramKeys = Object.keys(ctx.params).sort();

  for (const key of paramKeys) {
    // Match contractPrefix_N (e.g. contractPrefix_1, contractPrefix_2, contractPrefix_3)
    const contractMatch = key.match(/^contractPrefix_(\d+)$/);
    if (contractMatch) {
      const n = contractMatch[1];
      const prefix = ctx.params[key];
      if (!prefix) {
        ctx.warn('Skipping ' + key + ': empty value');
        continue;
      }
      const contractId = prefix + currentIteration;
      ctx.setVariable('contract_id_' + n, contractId);
      ctx.log('Generated contract_id_' + n + ': ' + contractId + ' (prefix: ' + prefix + ')');

      // Backward compatibility: contract_id_1 -> contract_id1, contract_id_2 -> contract_id2
      if (n === '1') ctx.setVariable('contract_id1', contractId);
      if (n === '2') ctx.setVariable('contract_id2', contractId);
      contractCount++;
    }

    // Match rbeTinPrefix_N (e.g. rbeTinPrefix_1, rbeTinPrefix_2, rbeTinPrefix_3)
    const tinMatch = key.match(/^rbeTinPrefix_(\d+)$/);
    if (tinMatch) {
      const n = tinMatch[1];
      const prefix = ctx.params[key];
      if (!prefix) {
        ctx.warn('Skipping ' + key + ': empty value');
        continue;
      }
      const rbeTin = prefix + currentIteration;
      ctx.setVariable('rbe_tin_' + n, rbeTin);
      ctx.log('Generated rbe_tin_' + n + ': ' + rbeTin + ' (prefix: ' + prefix + ')');

      // Backward compatibility: rbe_tin_1 -> rbe_tin, rbe_tin_2 -> rbe_tin2
      if (n === '1') ctx.setVariable('rbe_tin', rbeTin);
      if (n === '2') ctx.setVariable('rbe_tin2', rbeTin);
      tinCount++;
    }
  }

  // Fallback: support old-style keys (contractPrefix1, contractPrefix2, rbeTinPrefix, rbeTinPrefix2)
  // if no new-style contractPrefix_N keys were found
  if (contractCount === 0) {
    const oldPrefix1 = ctx.params.contractPrefix1;
    const oldPrefix2 = ctx.params.contractPrefix2;
    if (oldPrefix1) {
      const id = oldPrefix1 + currentIteration;
      ctx.setVariable('contract_id1', id);
      ctx.setVariable('contract_id_1', id);
      ctx.log('Generated contract_id1 (legacy): ' + id);
      contractCount++;
    }
    if (oldPrefix2) {
      const id = oldPrefix2 + currentIteration;
      ctx.setVariable('contract_id2', id);
      ctx.setVariable('contract_id_2', id);
      ctx.log('Generated contract_id2 (legacy): ' + id);
      contractCount++;
    }
  }

  if (tinCount === 0) {
    const oldTin1 = ctx.params.rbeTinPrefix;
    const oldTin2 = ctx.params.rbeTinPrefix2;
    if (oldTin1) {
      const tin = oldTin1 + currentIteration;
      ctx.setVariable('rbe_tin', tin);
      ctx.setVariable('rbe_tin_1', tin);
      ctx.log('Generated rbe_tin (legacy): ' + tin);
      tinCount++;
    }
    if (oldTin2) {
      const tin = (oldTin2 || 'RBE2TIN00') + currentIteration;
      ctx.setVariable('rbe_tin2', tin);
      ctx.setVariable('rbe_tin_2', tin);
      ctx.log('Generated rbe_tin2 (legacy): ' + tin);
      tinCount++;
    }
  }

  if (contractCount === 0) {
    ctx.warn('No contract prefixes found in test data. Add contractPrefix_1, contractPrefix_2, etc.');
  }
  if (tinCount === 0) {
    ctx.warn('No TIN prefixes found in test data. Add rbeTinPrefix_1, rbeTinPrefix_2, etc.');
  }

  ctx.log('Summary: ' + contractCount + ' contract IDs, ' + tinCount + ' TINs, current_iteration: ' + currentIteration);
}
