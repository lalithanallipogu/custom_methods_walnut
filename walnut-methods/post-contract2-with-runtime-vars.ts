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

  // Ensure request body is a string for placeholder resolution
  // ctx.args[0] may arrive as a parsed object or a string
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

  // Map {{placeholder}} names in the contract JSON to Aver runtime variable names
  // Aver generates: contract2id, rbetin, dsptin, rbeppid, rbenpi
  // JSON uses:      {{contract_id}}, {{rbe_tin}}, {{dsptin}}, {{rbe_ppid}}, {{rbe_npi}}
  const placeholderMap: Record<string, string> = {
    'contract_id': 'contract2id',   // Aver step 4: Join "3011${current_iteration}"
    'rbe_tin': 'rbetin',            // Aver step 5: Create Variable
    'rbe_npi': 'rbenpi',            // Aver step 8: Generate Unique ID
    'rbe_ppid': 'rbeppid',          // Aver step 7: Generate Unique ID
    'dsptin': 'dsptin',             // Aver step 6: Generate Unique ID (same name)
    'dsp_one_tin': 'dsptin',        // alias — same value as {{dsptin}}
    'run_package_filename': 'runpackage_qa',  // Aver step 11: run package filename
  };

  // Resolve all {{placeholder}} in the request body using the Aver variable mapping
  bodyStr = bodyStr.replace(/\{\{([^}]+)\}\}/g, (_match: string, placeholder: string) => {
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
  bodyStr = bodyStr.replace(/\$\[([^\]]+)\]/g, (_match: string, varName: string) => {
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
    body = JSON.parse(bodyStr);
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
