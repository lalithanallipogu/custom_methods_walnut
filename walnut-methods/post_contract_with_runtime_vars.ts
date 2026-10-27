import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: POST Contract With Runtime Variables
 * description: POST the ${request_body} to ${url2} using batch $[batch] and session $[averSessionId]
 * actionType: custom_post_contract_with_runtime_vars
 * context: api
 * needsLocator: false
 * category: Contract API
 */
export async function postContractWithRuntimeVars(ctx: WalnutApiContext) {
  // ctx.args[0] = request body JSON string (from ${request_body})
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

  // Resolve all $[variableName] placeholders inside the request body
  // This handles $[dsptin], $[rbenpi], $[rbeppid], $[batch], $[memberID_OP-1039], etc.
  requestBodyRaw = requestBodyRaw.replace(/\$\[([^\]]+)\]/g, (_match: string, varName: string) => {
    const value = ctx.getVariable(varName);
    if (value === undefined || value === null) {
      ctx.warn('Runtime variable "' + varName + '" not found — leaving placeholder as-is');
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
    throw new Error('Failed to parse request_body after variable resolution: ' + (e as Error).message);
  }

  // Override batch with the runtime variable value if available
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

  ctx.log('Contract POST successful. Status: ' + response.status);
  ctx.log('Response: ' + JSON.stringify(response.body).substring(0, 500));

  return response;
}
