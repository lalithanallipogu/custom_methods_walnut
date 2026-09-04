import type { WalnutContext } from './walnut';

/** @walnut_method
 * name: POST Transform Job API
 * description: POST transform job with ${request_body} to ${url} using batch $[batch] and session $[averSessionId]
 * actionType: custom_post_transform_job
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function postTransformJob(ctx: WalnutContext) {
  // ctx.args[0] = request body JSON string (from ${request_body})
  // ctx.args[1] = API URL (from ${url})
  // ctx.args[2] = "batch" (from $[batch]) — runtime variable name
  // ctx.args[3] = "averSessionId" (from $[averSessionId]) — runtime variable name

  const requestBodyRaw = ctx.args[0];
  const url = ctx.args[1];
  const batchVarName = ctx.args[2];
  const sessionId = ctx.getVariable(ctx.args[3]); // reads runtime variable $[averSessionId]

  // Read batch from runtime variable (captured by the file upload method)
  const batch = ctx.getVariable(batchVarName);
  if (!batch) {
    throw new Error(
      'Batch not found in runtime variable "' + batchVarName + '". Ensure the file upload step ran first.'
    );
  }
  ctx.log('Using batch from file upload: ' + batch);

  if (!sessionId) {
    throw new Error('AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.');
  }

  // Parse request body from test data
  let body: any;
  try {
    body = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
  } catch (e) {
    throw new Error('Failed to parse request_body: ' + requestBodyRaw);
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

  ctx.log('POST successful. Status: ' + response.status);
  ctx.log('Response body: ' + JSON.stringify(response.body));

  return response;
}
