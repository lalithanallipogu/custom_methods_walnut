import type { WalnutApiContext } from './walnut';

/** @walnut_method
 * name: BETL Validate Job
 * description: POST validate job to ${url} with ${requestBody} using runtime batch $[batch] and session $[averSessionId]
 * actionType: custom_pre_betl_trigger_validate_job
 * context: api
 * needsLocator: false
 * category: BETL Processing
 */
export async function preBetlTriggerValidateJob(ctx: WalnutApiContext) {
  // ctx.args[0] = API URL (from ${url})
  // ctx.args[1] = request body JSON string (from ${requestBody})
  // ctx.args[2] = "batch" (from $[batch]) — runtime variable name
  // ctx.args[3] = "averSessionId" (from $[averSessionId]) — runtime variable name

  const url = ctx.args[0];
  const requestBodyRaw = ctx.args[1];
  const batch = ctx.getVariable(ctx.args[2]);
  const sessionId = ctx.getVariable(ctx.args[3]);

  if (!url) {
    throw new Error('URL is required. Ensure the trigger endpoint URL is set in test data.');
  }

  if (!batch) {
    throw new Error(
      'Batch not found in runtime variable "' + ctx.args[2] + '". Ensure the "Pre BETL Artifact Generate MemberID Replace Upload 2 Files" step ran first.'
    );
  }
  ctx.log('Using runtime batch: ' + batch);

  if (!sessionId) {
    throw new Error(
      'AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.'
    );
  }

  // Parse request body from test data
  let body: any;
  try {
    body = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
  } catch (e) {
    throw new Error('Failed to parse requestBody: ' + requestBodyRaw);
  }

  // Override batch with the runtime variable value
  body.batch = batch;

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  ctx.log('POST ' + url + ' with body: ' + JSON.stringify(body));

  const response = await ctx.post(url, body, { headers });
  ctx.assertStatus(response, 200);

  ctx.log('Validate job triggered successfully. Status: ' + response.status);
  ctx.log('Response body: ' + JSON.stringify(response.body));

  return response;
}
