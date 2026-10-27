import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: POST Contract 1 With Runtime Variables
 * description: POST the ${request_body} to ${url2} using batch $[batch] and session $[averSessionId] with iteration ${current_iteration} and run package ${run_package_filename}
 * actionType: custom_post_contract1_with_runtime_vars
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function postContract1WithRuntimeVars(ctx: WalnutApiContext) {
  // ctx.args[0] = request body JSON string (from ${request_body})
  // ctx.args[1] = API URL (from ${url2})
  // ctx.args[2] = "batch" (from $[batch]) — runtime variable name
  // ctx.args[3] = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[4] = current_iteration value (from ${current_iteration}) — test data
  // ctx.args[5] = run_package_filename value (from ${run_package_filename}) — test data

  const requestBodyRaw = ctx.args[0];
  const url = ctx.args[1];
  const batch = ctx.getVariable(ctx.args[2]);
  const sessionId = ctx.getVariable(ctx.args[3]);
  const currentIteration = ctx.args[4];
  const runPackageFilename = ctx.args[5];

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

  // Generate values for Contract 1
  const contractId = '3001' + currentIteration;       // e.g. "30010081"
  const rbetin = 'RBETIN000' + currentIteration;      // e.g. "RBETIN0000081"

  // Read runtime variables set by Step 1 (generate-runtime-ids.ts)
  const dsptin = ctx.getVariable('dsptin');
  const rbenpi = ctx.getVariable('rbenpi');
  const rbeppid = ctx.getVariable('rbeppid');

  ctx.log('contract_id: ' + contractId);
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

  if (batch) {
    body.batch = batch;
    ctx.log('Using runtime batch: ' + batch);
  }

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  ctx.log('POST ' + url);

  const response = await ctx.post(url, body, { headers });
  ctx.assertStatus(response, 200);

  ctx.log('Contract 1 POST successful. Status: ' + response.status);
  ctx.log('Response: ' + JSON.stringify(response.body).substring(0, 500));

  return response;
}
