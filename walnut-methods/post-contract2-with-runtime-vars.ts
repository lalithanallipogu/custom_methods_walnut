import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: POST Contract 2 With Runtime Variables
 * description: POST the ${request_body2} to ${url2} using batch $[batch] and session $[averSessionId]
 * actionType: custom_post_contract2_with_runtime_vars
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function postContract2WithRuntimeVars(ctx: WalnutApiContext) {
  // ctx.args[0] = request body JSON string (from ${request_body2})
  // ctx.args[1] = API URL (from ${url2})
  // ctx.args[2] = "batch" (from $[batch]) — runtime variable name
  // ctx.args[3] = "averSessionId" (from $[averSessionId]) — runtime variable name

  let requestBodyRaw = ctx.args[0];
  const url = ctx.args[1];
  const batch = ctx.getVariable(ctx.args[2]);
  const sessionId = ctx.getVariable(ctx.args[3]);

  if (!url) {
    throw new Error('URL is required. Ensure url2 is set in test data.');
  }

  if (!sessionId) {
    throw new Error(
      'averSessionId not found in runtime variables. Run the "Login setup" and "Extract Aver Session" steps first.'
    );
  }

  // Map {{placeholder}} names in the contract JSON to runtime variable names
  // generate-runtime-ids.ts sets: contract_id1, contract_id2, rbe_tin, dsptin, rbeppid, rbenpi
  // JSON uses: {{contract_id}}, {{rbe_tin}}, {{dsptin}}, {{rbe_ppid}}, {{rbe_npi}}
  const placeholderMap: Record<string, string> = {
    'contract_id': 'contract_id2',  // set by generate-runtime-ids: "3011" + current_iteration
    'rbe_tin': 'rbe_tin',           // set by generate-runtime-ids: "RBETIN000" + current_iteration
    'rbe_npi': 'rbenpi',            // set by generate-runtime-ids: random
    'rbe_ppid': 'rbeppid',          // set by generate-runtime-ids: random
    'dsptin': 'dsptin',             // set by generate-runtime-ids: random
    'dsp_one_tin': 'dsptin',        // alias — same value as {{dsptin}}
    'run_package_filename': 'runpackage_qa',  // Aver step 11: run package filename
  };

  // Resolve all {{placeholder}} in the request body using the runtime variable mapping
  requestBodyRaw = requestBodyRaw.replace(/\{\{([^}]+)\}\}/g, (_match: string, placeholder: string) => {
    const averVarName = placeholderMap[placeholder] || placeholder;
    const value = ctx.getVariable(averVarName);
    if (value === undefined || value === null) {
      ctx.warn('Runtime variable "' + averVarName + '" (for {{' + placeholder + '}}) not found');
      return _match;
    }
    ctx.log('Resolved {{' + placeholder + '}} → ' + value + ' (from $[' + averVarName + '])');
    return value;
  });

  // Also resolve $[variableName] placeholders
  requestBodyRaw = requestBodyRaw.replace(/\$\[([^\]]+)\]/g, (_match: string, varName: string) => {
    const value = ctx.getVariable(varName);
    if (value === undefined || value === null) {
      ctx.warn('Runtime variable "' + varName + '" not found — leaving as-is');
      return _match;
    }
    ctx.log('Resolved $[' + varName + '] → ' + value);
    return value;
  });

  // Parse the resolved request body
  let body: any;
  try {
    body = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
  } catch (e) {
    throw new Error('Failed to parse request_body2 after variable resolution: ' + (e as Error).message);
  }

  if (batch) {
    body.batch = batch;
    ctx.log('Using runtime batch: ' + batch);
  }

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  ctx.log('POST ' + url);
  ctx.log('Body: ' + JSON.stringify(body).substring(0, 500) + '...');

  const response = await ctx.post(url, body, { headers });
  ctx.assertStatus(response, 200);

  ctx.log('Contract 2 POST successful. Status: ' + response.status);
  ctx.log('Response: ' + JSON.stringify(response.body).substring(0, 500));

  return response;
}
