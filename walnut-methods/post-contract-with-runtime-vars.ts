import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: POST Contract With Runtime Variables
 * description: POST the ${request_body} to ${url2} using batch $[batch] and session $[averSessionId] with iteration ${current_iteration} and run package ${run_package_filename} replacing placeholders from $[dsptin] $[rbenpi] $[rbeppid] $[contractId] $[rbe_tin]
 * actionType: custom_post_contract_with_runtime_vars
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function postContractWithRuntimeVars(ctx: WalnutApiContext) {
  // ctx.args[0]  = request body JSON string (from ${request_body})
  // ctx.args[1]  = API URL (from ${url2})
  // ctx.args[2]  = "batch" (from $[batch]) — runtime variable name
  // ctx.args[3]  = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[4]  = current_iteration value (from ${current_iteration}) — test data
  // ctx.args[5]  = run_package_filename value (from ${run_package_filename}) — test data
  // ctx.args[6]  = "dsptin" (from $[dsptin]) — runtime variable name
  // ctx.args[7]  = "rbenpi" (from $[rbenpi]) — runtime variable name
  // ctx.args[8]  = "rbeppid" (from $[rbeppid]) — runtime variable name
  // ctx.args[9]  = "contractId" (from $[contractId]) — runtime variable name (e.g. "contract_id1" or "contract_id2")
  // ctx.args[10] = "rbe_tin" (from $[rbe_tin]) — runtime variable name

  const requestBodyRaw = ctx.args[0];
  const url = ctx.args[1];
  const batch = ctx.getVariable(ctx.args[2]);
  const sessionId = ctx.getVariable(ctx.args[3]);
  const currentIteration = ctx.args[4];
  const runPackageFilename = ctx.args[5];
  const contractIdVarName = ctx.args[9];
  const rbeTinVarName = ctx.args[10];

  // Ensure request body is a string for placeholder resolution
  let bodyStr = typeof requestBodyRaw === 'string' ? requestBodyRaw : JSON.stringify(requestBodyRaw);
  ctx.log('Request body type: ' + typeof requestBodyRaw + ', length: ' + bodyStr.length);

  if (!url) {
    throw new Error('URL is required. Ensure url2 is set in test data.');
  }

  if (!sessionId) {
    throw new Error(
      'averSessionId not found in runtime variables. Run the "Login setup" and "Extract Aver Session" steps first.'
    );
  }

  if (!currentIteration) {
    throw new Error('current_iteration is required. Ensure it is set in test data.');
  }

  // Read contract_id and rbe_tin from runtime variables (set by generate-runtime-ids.ts with test data prefixes)
  const contractId = ctx.getVariable(contractIdVarName);
  const rbetin = ctx.getVariable(rbeTinVarName);

  if (!contractId) {
    throw new Error('Runtime variable $[' + contractIdVarName + '] not found. Ensure "Generate Runtime IDs" step ran first.');
  }
  if (!rbetin) {
    throw new Error('Runtime variable $[' + rbeTinVarName + '] not found. Ensure "Generate Runtime IDs" step ran first.');
  }

  // Read other runtime variables set by generate-runtime-ids.ts
  const dsptin = ctx.getVariable('dsptin');
  const rbenpi = ctx.getVariable('rbenpi');
  const rbeppid = ctx.getVariable('rbeppid');

  ctx.log('contract_id ($[' + contractIdVarName + ']): ' + contractId);
  ctx.log('rbe_tin: ' + rbetin);
  ctx.log('dsptin: ' + dsptin);
  ctx.log('rbe_npi: ' + rbenpi);
  ctx.log('rbe_ppid: ' + rbeppid);
  ctx.log('run_package_filename: ' + (runPackageFilename || 'not set'));

  // Build value map for all {{placeholder}} replacements
  const valueMap: Record<string, string> = {
    'contract_id': contractId,
    'rbe_tin': rbetin,
    'dsptin': dsptin || '',
    'dsp_one_tin': dsptin || '',
    'rbe_npi': rbenpi || '',
    'rbe_ppid': rbeppid || '',
    'provider_tin': rbeppid || '',
    'ppid': rbeppid || '',
    'run_package_filename': runPackageFilename || '',
  };

  // Resolve all {{placeholder}} in the request body
  bodyStr = bodyStr.replace(/\{\{([^}]+)\}\}/g, (_match: string, placeholder: string) => {
    const value = valueMap[placeholder];
    if (value === undefined) {
      ctx.warn('No value for {{' + placeholder + '}}');
      return _match;
    }
    ctx.log('Resolved {{' + placeholder + '}} -> ' + value);
    return value;
  });

  // Also resolve $[variableName] placeholders
  bodyStr = bodyStr.replace(/\$\[([^\]]+)\]/g, (_match: string, varName: string) => {
    const value = ctx.getVariable(varName);
    if (value === undefined || value === null) {
      ctx.warn('Runtime variable "' + varName + '" not found');
      return _match;
    }
    ctx.log('Resolved $[' + varName + '] -> ' + value);
    return value;
  });

  // Parse the resolved request body
  let body: any;
  try {
    body = JSON.parse(bodyStr);
  } catch (e) {
    ctx.log('Failed JSON (first 500 chars): ' + bodyStr.substring(0, 500));
    throw new Error('Failed to parse request_body after variable resolution: ' + (e as Error).message);
  }

  // Deep-replace any {{placeholder}} that survived string-level replacement
  // (handles cases where runtime delivers ctx.args[0] as a parsed object)
  function deepReplace(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{([^}]+)\}\}/g, (_m: string, key: string) => {
        const v = valueMap[key];
        if (v !== undefined) {
          ctx.log('Deep-resolved {{' + key + '}} -> ' + v);
          return v;
        }
        return _m;
      });
    }
    if (Array.isArray(obj)) {
      return obj.map(deepReplace);
    }
    if (obj && typeof obj === 'object') {
      const out: Record<string, any> = {};
      for (const k of Object.keys(obj)) {
        out[k] = deepReplace(obj[k]);
      }
      return out;
    }
    return obj;
  }
  body = deepReplace(body);

  if (batch) {
    body.batch = batch;
    ctx.log('Using runtime batch: ' + batch);
  }

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  // Log the final body for debugging
  const finalBodyStr = JSON.stringify(body);
  ctx.log('Final body length: ' + finalBodyStr.length);
  ctx.log('Final body (first 500): ' + finalBodyStr.substring(0, 500));
  ctx.log('Final body id field: ' + JSON.stringify(body.id) + ' (type: ' + typeof body.id + ')');
  ctx.log('POST ' + url);

  const response = await ctx.post(url, body, { headers });
  ctx.log('Response status: ' + response.status);
  ctx.log('Response body: ' + JSON.stringify(response.body).substring(0, 500));
  ctx.assertStatus(response, 200);

  ctx.log('Contract POST successful. Status: ' + response.status);
  ctx.log('Response: ' + JSON.stringify(response.body).substring(0, 500));

  return response;
}
