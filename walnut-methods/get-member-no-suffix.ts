import type { WalnutContext, WalnutApiContext } from './walnut';

/** @walnut_method
 * name: Get Member No Suffix
 * description: POST get member with ${request_body} to ${url} using session $[averSessionId] and member $[memberId]
 * actionType: custom_get_member_no_suffix
 * context: api
 * needsLocator: false
 * category: API Testing
 */
export async function getMemberNoSuffix(ctx: WalnutContext) {
  // ctx.args[0] = request body JSON string (from ${request_body})
  // ctx.args[1] = API URL (from ${url})
  // ctx.args[2] = "averSessionId" (from $[averSessionId]) — runtime variable name
  // ctx.args[3] = "memberId" (from $[memberId]) — runtime variable name

  const requestBodyRaw = ctx.args[0];
  const url = ctx.args[1];
  const sessionId = ctx.getVariable(ctx.args[2]); // reads runtime variable $[averSessionId]
  const memberId = ctx.getVariable(ctx.args[3]); // reads runtime variable $[memberId]

  if (!sessionId) {
    throw new Error('AverSessionId not found in runtime variables. Run "Extract Aver Session Cookie" step first.');
  }

  if (!memberId) {
    throw new Error('memberId not found in runtime variables. Ensure the file upload step ran first.');
  }

  ctx.log('Getting member: ' + memberId);

  // Parse request body from test data
  let body: any;
  try {
    body = typeof requestBodyRaw === 'string' ? JSON.parse(requestBodyRaw) : requestBodyRaw;
  } catch (e) {
    throw new Error('Failed to parse request_body: ' + requestBodyRaw);
  }

  // Set member_id directly (no suffix)
  body.member_id = memberId;

  const headers: Record<string, string> = {
    'Cookie': sessionId,
    'Content-Type': 'application/json',
  };

  ctx.log('POST ' + url + ' with body: ' + JSON.stringify(body));

  const apiCtx = ctx as WalnutApiContext;
  const response = await apiCtx.post(url, body, { headers });

  ctx.log('Get Member response - Status: ' + response.status + ' ' + response.statusText);
  ctx.log('Response body: ' + JSON.stringify(response.body));

  if (response.status >= 400) {
    throw new Error('Get Member failed: ' + response.status + ' ' + response.statusText);
  }

  ctx.log('Get Member completed successfully.');

  return response;
}
